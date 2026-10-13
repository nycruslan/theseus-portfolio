// Reads a Bash command for the guard (guard.mjs), best-effort: which files it would write, and
// whether it kills processes it can't name by PID.
// - Writes: redirections (>, >>, &>, N>), tee, sed -i, cp, mv, ln, install, rm, rmdir, unlink,
//   truncate, dd of=, `git checkout … -- paths` and `git restore`. It follows cd and git -C, reads
//   inside $(…), backticks, bash -c and eval, and skips here-document bodies.
// - Kills: pkill, killall, fuser -k, kill-port, xargs kill, and kill with anything but literal PIDs
//   (or $!, the job the same command started).
// It narrows the shell hole without closing it: it can't see through variables, unexpanded globs
// in odd places, interpreters (node -e, python -c), scripts, or programs that write files
// themselves (curl -o, git apply, patch). Review and CI's scope check stay the backstop.

import { statSync } from "node:fs";
import { basename, resolve } from "node:path";

const RESERVED = new Set([
  "!",
  "{",
  "}",
  "if",
  "then",
  "else",
  "elif",
  "do",
  "while",
  "until",
  "time",
]);
// Commands that run the command after their own options.
const WRAPPERS = new Set([
  "sudo",
  "command",
  "builtin",
  "exec",
  "nohup",
  "setsid",
  "stdbuf",
  "env",
  "nice",
  "timeout",
]);
const SHELLS = new Set(["bash", "sh", "zsh", "dash"]);
// How each command writes: to its file arguments, by removing them, or by copying or moving
// its sources to a destination.
const WRITERS = {
  tee: "files",
  truncate: "files",
  rm: "trees",
  rmdir: "trees",
  unlink: "trees",
  mv: "move",
  cp: "copy",
  ln: "copy",
  install: "copy",
};
// Options that take a value, per command, so the value isn't read as a path.
const SUFFIX = ["-S", "--suffix"];
const VALUE_OPTIONS = {
  cp: SUFFIX,
  mv: SUFFIX,
  ln: SUFFIX,
  install: [...SUFFIX, "-m", "--mode", "-o", "--owner", "-g", "--group"],
  truncate: ["-s", "--size", "-r", "--reference"],
};
const KILLERS = new Set(["pkill", "killall", "killall5", "kill-port", "fkill"]);
// Commands that run another one named in their arguments: xargs kill, npx kill-port, pnpm dlx fkill.
const RUNNERS = new Set(["xargs", "npx", "bunx", "pnpm", "yarn", "npm"]);
const MAX_DEPTH = 4;

/**
 * @returns {{ writes: { path: string, tree: boolean }[], kill: string | null }} the absolute paths
 *   the command writes, and the kill it refuses, if any. After a cd it can't follow, relative paths
 *   are unknown and left out.
 */
export function readCommand(command, cwd) {
  const found = { writes: [], kill: null };
  read(String(command ?? ""), cwd, found, 0);
  return found;
}

function read(command, cwd, found, depth) {
  let dir = cwd;
  for (const { words, redirects } of lex(command, 0, false).commands) {
    const at = (path, base = dir) => {
      if (path.startsWith("/")) return path;
      if (path.startsWith("~/")) {
        return resolve(process.env.HOME ?? "/", path.slice(2));
      }
      return base ? resolve(base, path) : null;
    };
    const keep = (path, tree) => {
      if (path) found.writes.push({ path, tree });
    };
    for (const { text, dynamic } of redirects) {
      if (!dynamic) keep(at(text), false);
    }

    const [name, args, here] = unwrap(words, at);
    if (!name) continue;
    found.kill ??= killIn(name, args);
    const base = here ?? dir;
    if (name === "cd" || name === "pushd") {
      const [to] = args;
      dir = to && !to.dynamic && to.text !== "-" ? at(to.text) : null;
    } else if (SHELLS.has(name) && depth < MAX_DEPTH) {
      const script = args.findIndex((arg) => /^-[a-z]*c[a-z]*$/.test(arg.text));
      if (script >= 0 && args[script + 1]) {
        read(args[script + 1].text, base, found, depth + 1);
      }
    } else if (name === "eval" && depth < MAX_DEPTH) {
      read(args.map((arg) => arg.text).join(" "), base, found, depth + 1);
    } else {
      const isDir = (path) => {
        const absolute = at(path, base);
        return Boolean(
          absolute &&
            statSync(absolute, { throwIfNoEntry: false })?.isDirectory(),
        );
      };
      for (const { path, tree } of writesOf(name, args, isDir)) {
        keep(at(path, base), tree);
      }
    }
  }
}

// Strips assignments, reserved words and wrappers. Returns the command's name, its arguments and,
// for git -C, the directory it runs in.
function unwrap(words, at) {
  let i = 0;
  while (i < words.length) {
    const word = words[i].text;
    const name = basename(word);
    if (RESERVED.has(word) || /^[A-Za-z_]\w*=/.test(word)) i++;
    // `command -v pkill` only looks a command up.
    else if (name === "command" && /^-[vV]$/.test(words[i + 1]?.text))
      return [];
    else if (WRAPPERS.has(name)) {
      i++;
      while (words[i] && /^-|^[A-Za-z_]\w*=/.test(words[i].text)) {
        // nice -n 5, timeout -s KILL: skip the value too.
        if (/^-(n|s|k|u)$/.test(words[i].text)) i++;
        i++;
      }
      // timeout's duration comes before the command.
      if (name === "timeout") i++;
    } else break;
  }
  const [command, ...args] = words.slice(i);
  if (!command) return [];
  const name = basename(command.text);
  if (name !== "git") return [name, args];
  // git's global options come before its subcommand.
  let here;
  let j = 0;
  while (args[j]?.text.startsWith("-")) {
    if (args[j].text === "-C") here = args[j + 1] && at(args[j + 1].text);
    j += ["-C", "-c", "--git-dir", "--work-tree"].includes(args[j].text)
      ? 2
      : 1;
  }
  return [`git ${args[j]?.text ?? ""}`, args.slice(j + 1), here];
}

// The paths a command writes. `tree` marks a removal, which reaches everything under a directory
// or a glob: the guard then checks the tracked files there too.
function writesOf(name, args, isDir) {
  const texts = args.filter((arg) => !arg.dynamic).map((arg) => arg.text);
  const files = (paths, tree = false) => paths.map((path) => ({ path, tree }));
  if (name === "git checkout") {
    const end = texts.indexOf("--");
    return end >= 0 ? files(texts.slice(end + 1)) : [];
  }
  if (name === "git restore") {
    return files(operands(texts, new Set(["-s", "--source"])));
  }
  if (name === "dd") {
    return files(
      texts.filter((t) => t.startsWith("of=")).map((t) => t.slice(3)),
    );
  }
  if (name === "sed") return files(sedTargets(texts));
  const kind = WRITERS[name];
  const paths = operands(texts, new Set(VALUE_OPTIONS[name]));
  if (kind === "files") return files(paths);
  if (kind === "trees") return files(paths, true);
  if (!kind) return [];
  // cp, ln, install and mv write into -t DIR, into a destination directory, or onto a file.
  const option = texts
    .find(
      (t, i) => texts[i - 1] === "-t" || t.startsWith("--target-directory="),
    )
    ?.replace(/^--target-directory=/, "");
  const last = paths.at(-1);
  const sources = option
    ? paths.filter((path) => path !== option)
    : paths.slice(0, -1);
  const into =
    option ??
    (paths.length > 2 || (last && (isDir(last) || last.endsWith("/")))
      ? last
      : null);
  const landed = into
    ? sources.map((source) => `${into}/${basename(source)}`)
    : sources.length
      ? [last]
      : [];
  return [...files(landed), ...(kind === "move" ? files(sources, true) : [])];
}

// sed writes its files only in place (-i, -i.bak, -Ei, --in-place). The script is the first
// operand unless -e or -f gave it.
function sedTargets(texts) {
  if (!texts.some((t) => /^-[a-zA-Z]*i|^--in-place/.test(t))) return [];
  const scripted = texts.some((t) =>
    /^-[a-zA-Z]*[ef]$|^--(expression|file)/.test(t),
  );
  const files = operands(
    texts,
    new Set(["-e", "-f", "-l", "--expression", "--file"]),
  );
  return scripted ? files : files.slice(1);
}

function operands(texts, valued) {
  const out = [];
  let options = true;
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (options && text === "--") options = false;
    else if (options && valued.has(text)) i++;
    // BSD sed's `-i ''` leaves an empty word, which names no file.
    else if (text && (!options || !text.startsWith("-") || text === "-")) {
      out.push(text);
    }
  }
  return out;
}

function killIn(name, args) {
  const texts = args.map((arg) => arg.text);
  if (KILLERS.has(name)) return name;
  if (name === "fuser" && texts.some((t) => /^-[a-zA-Z]*k|^--kill$/.test(t))) {
    return "fuser -k";
  }
  if (RUNNERS.has(name)) {
    const killer = texts
      .map((text) => basename(text).replace(/@.*/, ""))
      .find(
        (text) => KILLERS.has(text) || (name === "xargs" && text === "kill"),
      );
    return killer ? `${name} ${killer}` : null;
  }
  if (name !== "kill") return null;
  // kill [-SIG | -s SIG | -n N] [--] pid…: what follows the options must be literal PIDs.
  let i = 0;
  while (args[i]?.text.startsWith("-") && !args[i].dynamic) {
    const option = args[i].text;
    if (option === "-l" || option === "-L") return null;
    // After the signal, a negative number is a process group, and -1 is every process.
    if (i > 0 && /^-\d+$/.test(option)) break;
    i += option === "-s" || option === "-n" ? 2 : 1;
    if (option === "--") break;
  }
  const pids = args.slice(i);
  const named = ({ text, dynamic }) =>
    (!dynamic && /^[1-9]\d*$/.test(text)) || text === "$!";
  return pids.every(named)
    ? null
    : `kill ${pids.map(({ text }) => text).join(" ")}`;
}

// A small shell lexer: simple commands with their words and the files their redirections write.
// Quotes, escapes, comments, here-documents and $(…) are handled; everything else is a word.
function lex(src, start, nested) {
  const commands = [];
  const heredocs = [];
  let words = [];
  let redirects = [];
  let word = null;
  let dynamic = false;
  let redirect = null;
  let depth = 0;
  let i = start;

  const add = (text, isDynamic = false) => {
    word = (word ?? "") + text;
    dynamic ||= isDynamic;
  };
  const flush = () => {
    if (word === null) return;
    if (redirect === "write") redirects.push({ text: word, dynamic });
    else if (redirect === "heredoc") heredocs.push(word);
    else if (!redirect) words.push({ text: word, dynamic });
    redirect = null;
    word = null;
    dynamic = false;
  };
  const end = () => {
    flush();
    if (words.length || redirects.length) commands.push({ words, redirects });
    words = [];
    redirects = [];
    redirect = null;
  };
  const substitute = () => {
    const inner = lex(src, i + 2, true);
    commands.push(...inner.commands);
    add("$(…)", true);
    i = inner.end;
  };
  const backtick = () => {
    const close = src.indexOf("`", i + 1);
    const stop = close < 0 ? src.length : close;
    commands.push(...lex(src.slice(i + 1, stop), 0, false).commands);
    add("`…`", true);
    i = stop + 1;
  };
  const skipHeredocs = () => {
    while (heredocs.length) {
      const delimiter = heredocs.shift();
      while (i < src.length) {
        const eol = src.indexOf("\n", i);
        const line = src.slice(i, eol < 0 ? src.length : eol);
        i = eol < 0 ? src.length : eol + 1;
        if (line.replace(/^\t+/, "") === delimiter) break;
      }
    }
  };

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "\n") {
      end();
      i++;
      skipHeredocs();
    } else if (c === " " || c === "\t") {
      flush();
      i++;
    } else if (c === "#" && word === null) {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "\\") {
      if (next !== "\n") add(next ?? "");
      i += 2;
    } else if (c === "'") {
      const close = src.indexOf("'", i + 1);
      const stop = close < 0 ? src.length : close;
      add(src.slice(i + 1, stop));
      i = stop + 1;
    } else if (c === '"') {
      add("");
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\" && '"\\$`'.includes(src[i + 1])) {
          add(src[i + 1]);
          i += 2;
        } else if (src[i] === "$" && src[i + 1] === "(") substitute();
        else if (src[i] === "`") backtick();
        else {
          add(src[i], src[i] === "$");
          i++;
        }
      }
      i++;
    } else if (c === "$" && next === "(") {
      substitute();
    } else if (c === "`") {
      backtick();
    } else if (c === "$") {
      add(c, true);
      i++;
    } else if (c === ";" || c === "|" || (c === "&" && next !== ">")) {
      end();
      i += next === c || (c === "|" && next === "&") ? 2 : 1;
    } else if (c === "(") {
      end();
      depth++;
      i++;
    } else if (c === ")") {
      end();
      i++;
      if (nested && depth === 0) return { commands, end: i };
      depth--;
    } else if (c === ">" || c === "<" || c === "&") {
      // A number right before the operator is a file descriptor, not a word.
      if (word !== null && /^\d+$/.test(word) && !dynamic) word = null;
      flush();
      const op = src
        .slice(i)
        .match(/^(&>>?|>>|>\||>&|>|<<<|<<-|<<|<>|<&|<)/)[0];
      i += op.length;
      if (op === ">&" || op === "<&") {
        // Duplicating a descriptor (2>&1, >&-) writes no file; `>& file` does.
        const target = src.slice(i).match(/^\s*(\d+|-)(?=\s|$|[;&|)])/);
        if (target) i += target[0].length;
        else if (op === ">&") redirect = "write";
        else redirect = "read";
      } else if (op === "<<" || op === "<<-") redirect = "heredoc";
      else if (op.startsWith("<") && op !== "<>") redirect = "read";
      else redirect = "write";
      while (src[i] === " " || src[i] === "\t") i++;
    } else {
      add(c);
      i++;
    }
  }
  end();
  return { commands, end: i };
}
