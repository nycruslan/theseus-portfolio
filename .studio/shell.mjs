// Reads a Bash command for the guard (guard.mjs), best-effort: which files it would write, which
// processes it would kill, every simple command it runs (for the GitHub and push rules), and the
// commands whose writes it can't read.
// - Writes: redirections (>, >>, &>, N>), tee, touch, truncate, sed -i, perl -i, cp, mv, ln,
//   install, rsync, rm, rmdir, unlink, dd of=, git rm, git mv, and `git checkout`/`git restore` of
//   paths. Restoring from another commit reaches everything under a directory, as removals do.
// - It follows cd and git -C, reads inside $(…), backticks, bash -c and eval, skips here-document
//   bodies, expands braces, and resolves $TMPDIR, $HOME, $PWD, $CLAUDE_PROJECT_DIR and ~. A target
//   it still can't resolve (another variable, $(…)) is reported as dynamic, with its text.
// - Unsure: commands that write files the reader can't name: find -delete or -exec, xargs or a
//   shell fed a command, inline interpreters (node -e, python -c…), sourced scripts, patch,
//   git apply, curl -o, archives. The guard refuses those when the command mentions a path the
//   agent may not write.
// - Kills: pkill, killall, fuser -k, kill-port, xargs kill, and kill with anything but literal PIDs
//   (or $!, the job the same command started).
// It narrows the shell hole without closing it: a script file it runs, a program that writes
// files itself (a formatter, a build tool), or text built at run time can still write anywhere.
// Review and CI's scope check stay the backstop.

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
const SHELLS = new Set(["bash", "sh", "zsh", "dash", "ksh"]);
// How each command writes: to its file arguments, by removing them, by copying or moving its
// sources to a destination, or by syncing into one.
const WRITERS = {
  tee: "files",
  touch: "files",
  truncate: "files",
  rm: "trees",
  rmdir: "trees",
  unlink: "trees",
  "git rm": "trees",
  mv: "move",
  "git mv": "move",
  cp: "copy",
  ln: "copy",
  install: "copy",
  rsync: "sync",
};
// Options that take a value, per command, so the value isn't read as a path.
const SUFFIX = ["-S", "--suffix"];
const VALUE_OPTIONS = {
  cp: SUFFIX,
  mv: SUFFIX,
  ln: SUFFIX,
  install: [...SUFFIX, "-m", "--mode", "-o", "--owner", "-g", "--group"],
  truncate: ["-s", "--size", "-r", "--reference"],
  touch: ["-t", "-d", "-r", "--reference", "--date"],
  rsync: [
    "-e",
    "--rsh",
    "-f",
    "--filter",
    "--exclude",
    "--include",
    "-T",
    "-B",
  ],
  "git checkout": ["-b", "-B", "--orphan", "--conflict"],
  "git restore": ["-s", "--source"],
};
const KILLERS = new Set(["pkill", "killall", "killall5", "kill-port", "fkill"]);
// Commands that run another one named in their arguments: xargs kill, npx kill-port, pnpm dlx fkill.
const RUNNERS = new Set(["xargs", "npx", "bunx", "pnpm", "yarn", "npm"]);
// Inline code, per interpreter: the option that carries it.
const INLINE = [
  [/^node$|^bun$/, /^(-e|--eval|-p|--print|-pe|-ep)$|^--(eval|print)=/],
  [/^python\d*(\.\d+)?$/, /^-[a-zA-Z]*c$/],
  [/^perl$/, /^-[a-zA-Z]*[eE]$/],
  [/^ruby$/, /^-[a-zA-Z]*e$/],
  [/^php$/, /^-r$/],
  [/^deno$/, /^eval$/],
];
// Actions that make find write or run something per file.
const FIND_ACTIONS = /^-(delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)$/;
// Programs that write files the reader can't name.
const OPAQUE = new Set([
  "patch",
  "git apply",
  "git am",
  "git clean",
  "unzip",
  "wget",
  "source",
  ".",
]);
// Variables whose value the guard knows, so a path built from them isn't dynamic.
const KNOWN = /\$\{?(TMPDIR|HOME|PWD|CLAUDE_PROJECT_DIR)\}?(?!\w)/g;
const MAX_DEPTH = 4;
const MAX_BRACES = 64;

/**
 * @returns {{
 *   writes: ({ path: string, tree: boolean } | { text: string, tree: boolean, dynamic: true })[],
 *   kill: string | null,
 *   commands: { name: string, args: Word[], words: Word[], dir: string | null, dynamicName: boolean }[],
 *   unsure: string[],
 * }} the absolute paths the command writes (or the text of targets it can't resolve), the kill it
 *   refuses, if any, every simple command it runs, and the writers it can't read.
 * @typedef {{ text: string, dynamic: boolean }} Word
 */
export function readCommand(command, cwd) {
  const found = { writes: [], kill: null, commands: [], unsure: [] };
  read(String(command ?? ""), cwd, found, 0);
  return found;
}

function read(command, cwd, found, depth) {
  let dir = cwd;
  for (const { words: raw, redirects } of lex(command, 0, false).commands) {
    const at = (path, base = dir) => {
      if (path.startsWith("/")) return path;
      if (path === "~" || path.startsWith("~/")) {
        return resolve(process.env.HOME ?? "/", path.slice(2));
      }
      return base ? resolve(base, path) : null;
    };
    const expand = (word) => expandWord(word, dir);
    const keep = (word, tree, base = dir) => {
      const path = word.dynamic ? null : at(word.text, base);
      found.writes.push(
        path ? { path, tree } : { text: word.text, tree, dynamic: true },
      );
    };
    for (const target of redirects.flatMap(expand)) keep(target, false);

    const words = raw.flatMap(expand);
    const [name, args, here, dynamicName] = unwrap(words, at);
    if (!name) continue;
    const base = here ?? dir;
    found.commands.push({ name, args, words, dir: base, dynamicName });
    found.kill ??= killIn(name, args);
    if (name === "cd" || name === "pushd") {
      const [to] = args;
      dir = to && !to.dynamic && to.text !== "-" ? at(to.text) : null;
    } else if (SHELLS.has(name)) {
      const script = scriptOf(args);
      if (script && !script.dynamic && depth < MAX_DEPTH) {
        read(script.text, base, found, depth + 1);
      } else {
        found.unsure.push(`${name} running a script the guard can't read`);
      }
    } else if (name === "eval") {
      if (args.some((arg) => arg.dynamic) || depth >= MAX_DEPTH) {
        found.unsure.push("eval of text built at run time");
      } else {
        read(args.map((arg) => arg.text).join(" "), base, found, depth + 1);
      }
    } else {
      const exists = (word) => {
        const absolute = word.dynamic ? null : at(word.text, base);
        return absolute ? statSync(absolute, { throwIfNoEntry: false }) : null;
      };
      const unsure = unsureOf(name, args);
      if (unsure) found.unsure.push(unsure);
      for (const { word, tree } of writesOf(name, args, exists)) {
        keep(word, tree, base);
      }
    }
  }
}

// The script a shell runs with -c (bash -c "…", bash -lc "…", bash -c -- "…"). Null when it
// reads its commands from a file or from its input instead.
function scriptOf(args) {
  const flag = args.findIndex((arg) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(arg.text));
  if (flag < 0) return null;
  const next = args[flag + 1];
  return next?.text === "--" ? args[flag + 2] : next;
}

// Strips assignments, reserved words and wrappers. Returns the command's name, its arguments, the
// directory it runs in for git -C, and whether the name itself is built at run time.
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
        // nice -n 5, timeout -s KILL, env -u NAME: skip the value too.
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
  if (name !== "git") return [name, args, undefined, command.dynamic];
  // git's global options come before its subcommand.
  let here;
  let j = 0;
  while (args[j]?.text.startsWith("-")) {
    if (args[j].text === "-C") here = args[j + 1] && at(args[j + 1].text);
    j += ["-C", "-c", "--git-dir", "--work-tree"].includes(args[j].text)
      ? 2
      : 1;
  }
  return [
    `git ${args[j]?.text ?? ""}`,
    args.slice(j + 1),
    here,
    command.dynamic,
  ];
}

// A word as the shell would hand it over: braces expanded, known variables and ~ resolved. What
// stays built at run time keeps `dynamic`.
function expandWord(word, dir) {
  const texts = word.braced ? braces(word.text) : [word.text];
  return texts.map((text) => {
    if (!word.dynamic && !/\{[^{}]*\.\.[^{}]*\}/.test(text))
      return { text, dynamic: false };
    const known = {
      TMPDIR: process.env.TMPDIR,
      HOME: process.env.HOME,
      PWD: dir,
      CLAUDE_PROJECT_DIR: process.env.CLAUDE_PROJECT_DIR,
    };
    const resolved = text.replace(KNOWN, (all, name) => known[name] ?? all);
    const dynamic =
      /[$`]/.test(resolved) || /\{[^{}]*\.\.[^{}]*\}/.test(resolved);
    return { text: resolved, dynamic };
  });
}

// {a,b}c → ac bc, nested too. Ranges ({1..3}) stay as they are, and read as dynamic.
function braces(text) {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" && depth++ === 0) start = i;
    else if (text[i] === "}" && depth > 0 && --depth === 0) {
      const parts = splitTop(text.slice(start + 1, i));
      if (parts.length > 1) {
        const before = text.slice(0, start);
        const after = text.slice(i + 1);
        return parts
          .flatMap((part) => braces(`${before}${part}${after}`))
          .slice(0, MAX_BRACES);
      }
    }
  }
  return [text];
}

function splitTop(inner) {
  const parts = [""];
  let depth = 0;
  for (const c of inner) {
    if (c === "{") depth++;
    if (c === "}") depth--;
    if (c === "," && depth === 0) parts.push("");
    else parts[parts.length - 1] += c;
  }
  return parts;
}

// The paths a command writes. `tree` marks a write that reaches everything under a directory or a
// glob (a removal, a sync, a restore from another commit): the guard then checks those files too.
function writesOf(name, args, exists) {
  const of = (words, tree = false) => words.map((word) => ({ word, tree }));
  const texts = args.map((arg) => arg.text);
  const valued = new Set(VALUE_OPTIONS[name]);
  if (name === "git checkout") {
    const end = texts.indexOf("--");
    if (end >= 0) {
      const source = operands(args.slice(0, end), valued).length > 0;
      return of(args.slice(end + 1), source);
    }
    // Without --, the first operand is a branch or commit unless it names a file; the rest are
    // paths restored from it.
    const found = operands(args, valued);
    if (found.length > 1) return of(found.slice(1), true);
    return found.length && exists(found[0]) ? of(found) : [];
  }
  if (name === "git restore") {
    const source = texts.some((t) => /^(-s|--source)(=|$)|^-s./.test(t));
    return of(operands(args, valued), source);
  }
  if (name === "dd") {
    return of(
      args
        .filter((arg) => arg.text.startsWith("of="))
        .map((arg) => ({ ...arg, text: arg.text.slice(3) })),
    );
  }
  if (name === "sed") {
    return of(
      inPlace(
        args,
        /^-[a-zA-Z]*i|^--in-place/,
        /^-[a-zA-Z]*[ef]$|^--(expression|file)/,
        ["-e", "-f", "-l", "--expression", "--file"],
      ),
    );
  }
  if (name === "perl") {
    return of(inPlace(args, /^-[a-zA-Z]*i/, /^-[a-zA-Z]*[eE]$/, ["-e", "-E"]));
  }
  const kind = WRITERS[name];
  const paths = operands(args, valued);
  if (kind === "files") return of(paths);
  if (kind === "trees") return of(paths, true);
  if (kind === "sync") {
    const moved = texts.includes("--remove-source-files");
    return [
      ...of(paths.slice(-1), true),
      ...(moved ? of(paths.slice(0, -1), true) : []),
    ];
  }
  if (!kind) return [];
  // cp, ln, install and mv write into -t DIR, into a destination directory, or onto a file.
  const option = texts
    .find(
      (t, i) => texts[i - 1] === "-t" || t.startsWith("--target-directory="),
    )
    ?.replace(/^--target-directory=/, "");
  const last = paths.at(-1);
  const sources = option
    ? paths.filter((path) => path.text !== option)
    : paths.slice(0, -1);
  const into =
    option ??
    (paths.length > 2 ||
    (last && (exists(last)?.isDirectory() || last.text.endsWith("/")))
      ? last.text
      : null);
  const landed = into
    ? sources.map((source) => ({
        text: `${into}/${basename(source.text)}`,
        dynamic: /[$`]/.test(into) || source.dynamic,
      }))
    : sources.length
      ? [last]
      : [];
  return [...of(landed), ...(kind === "move" ? of(sources, true) : [])];
}

// sed and perl write their files only in place (-i, -i.bak, -pi, --in-place). The script is the
// first operand unless an option (-e, -f) gave it.
function inPlace(args, editsInPlace, givesScript, scriptOptions) {
  const texts = args.map((arg) => arg.text);
  if (!texts.some((t) => editsInPlace.test(t))) return [];
  const scripted = texts.some((t) => givesScript.test(t));
  const valued = new Set([
    ...scriptOptions,
    ...texts.filter((t) => givesScript.test(t)),
  ]);
  const files = operands(args, valued);
  return scripted ? files : files.slice(1);
}

function operands(args, valued) {
  const out = [];
  let options = true;
  for (let i = 0; i < args.length; i++) {
    const { text } = args[i];
    if (options && text === "--") options = false;
    else if (options && valued.has(text)) i++;
    // BSD sed's `-i ''` leaves an empty word, which names no file.
    else if (text && (!options || !text.startsWith("-") || text === "-")) {
      out.push(args[i]);
    }
  }
  return out;
}

// Commands that write files without naming them in a way this reader follows.
function unsureOf(name, args) {
  const texts = args.map((arg) => arg.text);
  for (const [program, option] of INLINE) {
    if (program.test(name) && texts.some((t) => option.test(t))) {
      return `${name} running inline code`;
    }
  }
  if (name === "find") {
    const action = texts.find((t) => FIND_ACTIONS.test(t));
    if (action) return `find … ${action}`;
  }
  if (name === "xargs" || name === "parallel") {
    const writer = texts.find((t) => {
      const program = basename(t);
      return (
        program in WRITERS || ["sed", "perl", "dd", "git"].includes(program)
      );
    });
    if (writer) return `${name} ${basename(writer)}`;
  }
  if (OPAQUE.has(name)) return name;
  if (name === "git stash" && /^(pop|apply)$/.test(texts[0] ?? "")) {
    return `git stash ${texts[0]}`;
  }
  if (name === "git reset" && texts.includes("--hard"))
    return "git reset --hard";
  if (
    name === "curl" &&
    texts.some((t) => /^(-[a-zA-Z]*[oO]|--output|--remote-name)/.test(t))
  ) {
    return "curl -o";
  }
  // tar's mode comes first: x, -x, -xzf; or --extract anywhere.
  if (
    name === "tar" &&
    (/^-?[a-zA-Z]*x/.test(texts[0] ?? "") || texts.includes("--extract"))
  ) {
    return "tar -x";
  }
  return null;
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
// Quotes, escapes, comments, here-documents and $(…) are handled; everything else is a word. A
// word notes whether it holds anything expanded at run time ($, backticks) and any unquoted brace.
function lex(src, start, nested) {
  const commands = [];
  const heredocs = [];
  let words = [];
  let redirects = [];
  let word = null;
  let dynamic = false;
  let braced = false;
  let redirect = null;
  let depth = 0;
  let i = start;

  const add = (text, isDynamic = false) => {
    word = (word ?? "") + text;
    dynamic ||= isDynamic;
  };
  const flush = () => {
    if (word === null) return;
    const lexed = { text: word, dynamic, braced };
    if (redirect === "write") redirects.push(lexed);
    else if (redirect === "heredoc") heredocs.push(word);
    else if (!redirect) words.push(lexed);
    redirect = null;
    word = null;
    dynamic = false;
    braced = false;
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
      braced ||= c === "{";
      add(c);
      i++;
    }
  }
  end();
  return { commands, end: i };
}
