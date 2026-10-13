// What a Bash line may do on GitHub and to the remote, for the guard (guard.mjs). The rules hold
// for every agent, the lead included, and read the line as shell.mjs parses it:
// - Merging: only `node .studio/merge.mjs <number>`, on its own (a `cd` before it is fine). A line
//   that could write to GitHub (a gh call that writes, gh fed its arguments by xargs, find -exec or
//   a file, curl, or code the guard can't read: inline interpreters, a shell fed its input, a
//   program named at run time) and has a merge word anywhere, quoted, escaped or split, is refused.
//   Reads that only mention merging (`--jq .mergeable`, `git merge-base`) pass.
// - gh: the read-only subcommands, also against other repositories, and `gh api`. Its writes
//   (another method than GET, or any -f/-F/--input) go only to this repository's pulls (to open
//   one), pulls/<n> (title and body), issues/<n>/comments and issues/<n>/labels (literal labels,
//   never owner-approved). Only a body or title may come from a file.
// - A line that could write to GitHub may not mention statuses, owner-approved, git refs,
//   contents, rulesets, branch protection, secrets or api.github.com. No line may run
//   `gh auth token`, set a GitHub token, or send curl an Authorization header.
// - git push: never to main or master or a glob, never forced, deleting or mirroring, never a plain
//   push from main, and never a push that doesn't name its branch after the line switched one.
// Script files a line runs are read with the same rules by the guard. Layered defence against
// shortcuts, not a security boundary: the team acts as the owner's GitHub identity, and text
// encoded past these rules, a program that writes files itself, or an older checkout of the
// harness still gets through. A required check in the base branch's ruleset is what's binding.

import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { basename, resolve } from "node:path";

export const SANCTIONED = "node .studio/merge.mjs <number>";
// Files carry message text, never commands or endpoints: the guard reads the command, not the file.
const IN_A_FILE =
  "If you only meant the word in a message (a PR body, a comment, a commit message), put that text in a file and pass it with `-F body=@<file>` or `git commit -F <file>`: files carry message text only, never commands or endpoints.";
const DENIED = [
  [
    /statuses/i,
    "commit statuses carry the reviewers' verdicts, which only the hooks post",
  ],
  [/owner-approved/i, "the owner-approved label is the owner's alone"],
  [/git\/refs/i, "git refs change branches behind the merge gate"],
  [/\/contents\//i, "the contents API writes files behind the guard"],
  [/rulesets/i, "rulesets are the owner's settings"],
  [/branches\/\S*\/protection/i, "branch protection is the owner's setting"],
  [/actions\/secrets/i, "secrets are the owner's"],
  [
    /api\.github\.com/i,
    "GitHub's API is reached through `gh api <path>`, which the guard can read; `gh api repos/<owner>/<repo>/…` reads other repositories too",
  ],
];
const ALWAYS = [
  [/\bgh\W+auth\W+token\b/i, "the owner's token stays with gh"],
  [
    /\b(GH|GITHUB)(_ENTERPRISE)?_TOKEN=/,
    "GitHub tokens aren't set in commands",
  ],
  [
    /\b(curl|wget|xh)\b[\s\S]*authorization|authorization[\s\S]*\b(curl|wget|xh)\b/i,
    "an Authorization header bypasses `gh api`, which the guard can read",
  ],
];
const GH_WORD = /(^|[^\w.@-])gh([^\w.-]|$)/;
// Words that only read about merging: GitHub's fields, git's merge-base and --merges, the test.
const MERGE_READS =
  /merge(able_state|able|d_at|d_by|d|_commit_sha|-base)\b|--(no-)?merge[sd]\b|[\w./-]*merge[\w.-]*\.test\.[cm]?[jt]s/gi;
const MERGE = /merge/i;
const GIT_MERGE = /^git merge/;
const GIT_MERGE_TEXT = /\bgit\s+(-\S+\s+)*merge(-base|-file|-tree)?\b/g;
const MERGE_ENDPOINT = /pulls\/[^/\s"']*\/merge/i;
const HTTP_CLIENTS = new Set(["curl", "wget", "xh", "http"]);
// Programs that run a command named in their arguments, completing it from their input.
const FEEDERS = new Set([
  "xargs",
  "parallel",
  "find",
  "watch",
  "flock",
  "entr",
  "npx",
  "bunx",
  "pnpm",
  "yarn",
  "npm",
]);
// Commands that change which branch is checked out, or where a plain push goes.
const MOVES_BRANCH =
  /^git (checkout|switch|reset|branch|update-ref|symbolic-ref|config|worktree)$/;
// gh's read-only subcommands, by command group; a group mapped to true is read-only throughout.
const GH_READS = {
  pr: new Set(["view", "list", "diff", "checks", "status", "checkout"]),
  issue: new Set(["view", "list", "status"]),
  run: new Set(["view", "list", "watch"]),
  workflow: new Set(["view", "list"]),
  repo: new Set(["view"]),
  label: new Set(["list"]),
  release: new Set(["view", "list"]),
  search: true,
  status: true,
  help: true,
  version: true,
};
// gh's global and `gh api` options that take a value.
const API_VALUES = new Set([
  "-X",
  "--method",
  "-H",
  "--header",
  "-f",
  "--raw-field",
  "-F",
  "--field",
  "--input",
  "-q",
  "--jq",
  "-t",
  "--template",
  "--hostname",
  "-p",
  "--preview",
  "--cache",
  "-R",
  "--repo",
]);
const FIELDS = new Set(["-f", "--raw-field", "-F", "--field"]);
const WRITE_FLAGS =
  /^(-X|--method|-f|-F|--field|--raw-field|--input)(=|$)|^-[XfF]./;
// The writes agents may make, and the fields each may set.
const WRITES = [
  {
    path: /^pulls$/,
    methods: ["POST"],
    fields: ["title", "head", "base", "body", "maintainer_can_modify"],
    what: "open a PR",
  },
  {
    path: /^pulls\/\d+$/,
    methods: ["PATCH"],
    fields: ["title", "body"],
    what: "edit a PR's title or body",
  },
  {
    path: /^issues\/\d+\/comments$/,
    methods: ["POST"],
    fields: ["body"],
    what: "comment on a PR",
  },
  {
    path: /^issues\/\d+\/labels$/,
    methods: ["POST"],
    fields: ["labels", "labels[]"],
    what: "add a label",
  },
];
// Only message text may come from a file.
const FROM_FILE = new Set(["body", "title"]);
const MAIN = /^(refs\/heads\/)?(main|master)$/i;
const REACHES_MAIN =
  /refs\/heads\/(main|master)\b|^(push\.|remote\.[^=]*\.push|branch\.[^=]*\.merge)/i;
const PUSH_FORCE =
  /^(--force|--force-with-lease|--force-if-includes|--delete|--mirror|--all|--prune)(=.*)?$|^-[a-zA-Z0-9]*[fd][a-zA-Z0-9]*$/;
const PUSH_VALUES = new Set([
  "-o",
  "--push-option",
  "--repo",
  "--receive-pack",
  "--exec",
]);

/**
 * Why this line may not run, or null.
 * @param read readCommand's result, or null when the line couldn't be read.
 * @param where the project root, the checkout's owner/repo, and whether the line runs code the
 *   guard couldn't read (a script file too large or missing).
 */
export function remoteRefusal(
  command,
  read,
  { project, repo, unreadable = false },
) {
  for (const [pattern, why] of ALWAYS) {
    const found = command.match(pattern);
    if (found) {
      return `This command has \`${found[0].slice(0, 60)}\`: ${why}.`;
    }
  }
  if (!read || unreadable || canWrite(read)) {
    const found = deniedText(command) ?? mergeRefusal(command, read);
    if (found) return found;
  }
  if (runsMerge(read) && !sanctioned(read, project)) {
    return `Run \`${SANCTIONED}\` on its own, from the repository (a \`cd\` before it is fine): nothing piped, redirected or chained, so what it says is what the lead reads.`;
  }
  return read ? parsedRefusal(read, repo) : unread(command);
}

/**
 * Whether the line could write to GitHub: a gh call that writes, gh fed by another program, an HTTP
 * client, or code the guard can't read.
 */
function canWrite(read) {
  return (
    read.opaque ||
    read.commands.some(
      (command) =>
        command.dynamicName ||
        HTTP_CLIENTS.has(command.name) ||
        (command.name === "gh" && ghWrites(command.args)) ||
        ghArgs(command) !== null,
    )
  );
}

function deniedText(command) {
  for (const [pattern, why] of DENIED) {
    const found = command.match(pattern);
    if (found) {
      return `This command could write to GitHub, and it mentions \`${found[0]}\`: ${why}. ${IN_A_FILE}`;
    }
  }
  return null;
}

// Fail closed: a merge word anywhere in a line that could write to GitHub is a merge attempt. Words
// of git's own merge commands, and reads about merging, don't count.
function mergeRefusal(command, read) {
  // The raw text catches what lexing drops (an assignment like x=merge); the lexed words catch
  // what quoting and escapes split (m\erge, "me""rge"). git's own merge commands don't count.
  const words = read
    ? read.commands
        .filter(({ name }) => !GIT_MERGE.test(name))
        .flatMap(({ words: all }) => all.map(({ text }) => text))
        .join(" ")
    : "";
  const text = `${command.replace(GIT_MERGE_TEXT, " ")} ${words}`;
  const merging =
    MERGE.test(text.replace(MERGE_READS, "")) || MERGE_ENDPOINT.test(command);
  if (!merging) return null;
  return `Merging goes through \`${SANCTIONED}\` alone, run on its own from the repository: it checks the PR, waits for CI and merges the head it checked. This line could merge another way (a merge word with a gh call that writes, gh fed by another program, curl, or code the guard can't read), so it was refused. ${IN_A_FILE}`;
}

// Runs a merge.mjs: node with it as the script, not just checking its syntax.
function runsMerge(read) {
  return Boolean(
    read?.commands.some(
      ({ name, args }) =>
        name === "node" &&
        !args.some(({ text }) => /^(--check|-c)$/.test(text)) &&
        basename(args.find(({ text }) => !text.startsWith("-"))?.text ?? "") ===
          "merge.mjs",
    ),
  );
}

// `node <path to this project's .studio/merge.mjs> <number>`, after any literal `cd`, and nothing
// else: no other command, no file written.
function sanctioned(read, project) {
  if (!read || read.writes.length) return false;
  const rest = read.commands.filter(
    ({ name, args }) =>
      !(name === "cd" && args.length === 1 && !args[0].dynamic),
  );
  if (rest.length !== 1) return false;
  const [{ name, args, words, dir, dynamicName }] = rest;
  if (name !== "node" || dynamicName || words.length !== 3 || args.length !== 2)
    return false;
  const [script, number] = args;
  if (script.dynamic || number.dynamic || !/^[1-9]\d*$/.test(number.text))
    return false;
  if (!dir || !project) return false;
  try {
    return (
      realpathSync(resolve(dir, script.text)) ===
      realpathSync(resolve(project, ".studio/merge.mjs"))
    );
  } catch {
    return false;
  }
}

function parsedRefusal(read, repo) {
  let moved = false;
  for (const command of read.commands) {
    const fed = ghArgs(command);
    const found =
      command.name === "gh"
        ? ghRefusal(command, repo)
        : fed
          ? fedRefusal(command.name, fed)
          : command.name === "git push"
            ? pushRefusal(command, moved)
            : null;
    if (found) return found;
    moved ||= MOVES_BRANCH.test(command.name);
  }
  return null;
}

// A line the reader couldn't follow is refused when it could reach GitHub or push.
function unread(command) {
  return GH_WORD.test(command) || /\bgit\b[\s\S]*\bpush\b/.test(command)
    ? "This command couldn't be read, and it calls gh or git push, so it was refused. Split it into simpler commands."
    : null;
}

// gh named as another program's argument (xargs gh, parallel gh, find -exec gh): the arguments
// after it, which that program completes from its input or the files it finds. Null otherwise.
function ghArgs({ name, args }) {
  if (!FEEDERS.has(name)) return null;
  const at = args.findIndex(
    ({ text }, i) =>
      basename(text) === "gh" &&
      (name !== "find" ||
        /^-(exec|execdir|ok|okdir)$/.test(args[i - 1]?.text ?? "")),
  );
  if (at < 0) return null;
  const rest = args.slice(at + 1);
  const end = rest.findIndex(({ text }) => text === ";" || text === "+");
  return end < 0 ? rest : rest.slice(0, end);
}

function fedRefusal(runner, args) {
  const [group, sub] = args;
  const writes =
    group?.text === "api"
      ? args.some(({ text }) => WRITE_FLAGS.test(text))
      : !isRead(group, sub);
  return writes
    ? `\`${runner} gh …\` completes the gh call from its input or the files it finds, so the guard can't check what it writes: write the gh call out in full.`
    : null;
}

function isRead(group, sub) {
  const reads = GH_READS[group?.text];
  return (
    reads === true ||
    Boolean(reads && sub && !sub.dynamic && reads.has(sub.text))
  );
}

// The gh subcommand: its group, the word after it, and the arguments after the group.
function subcommand(args) {
  let i = 0;
  while (args[i]?.text.startsWith("-")) {
    const [option, attached] = splitOption(args[i].text);
    if ((option === "-R" || option === "--repo") && attached === undefined) i++;
    i++;
  }
  return { group: args[i], sub: args[i + 1], rest: args.slice(i + 1) };
}

function ghWrites(args) {
  const { group, sub, rest } = subcommand(args);
  if (!group) return false;
  if (group.dynamic) return true;
  if (group.text === "api") return apiCall(rest).write;
  return !isRead(group, sub);
}

function ghRefusal({ args }, repo) {
  const { group, sub, rest } = subcommand(args);
  if (!group) return null;
  if (group.dynamic) {
    return "`gh` with a subcommand built at run time can't be checked: write it out.";
  }
  if (group.text !== "api" && isRead(group, sub)) return null;
  // -R and --repo work before or after the subcommand; reads of other repositories are fine.
  for (let j = 0; j < args.length; j++) {
    const [option, attached] = splitOption(args[j].text);
    if (option !== "-R" && option !== "--repo") continue;
    const named = attached ?? args[j + 1]?.text;
    if (!sameRepo(named, repo)) {
      return `\`gh ${option}\` points a gh call that writes at ${named ?? "another repository"}: the team writes to ${repo ?? "this checkout's repository"} only.`;
    }
  }
  if (group.text === "api") return apiRefusal(rest, repo);
  const what = `gh ${group.text}${/^[a-z][\w-]*$/.test(sub?.text ?? "") ? ` ${sub.text}` : ""}`;
  return `\`${what}\` isn't a command the team runs. gh pr and gh issue go through GraphQL, which cloud sessions can't reach, and writes are limited to the REST calls in the sprint skill: \`gh api repos/<owner>/<repo>/pulls\` to open a PR, \`…/issues/<n>/comments\` and \`…/issues/<n>/labels\` to comment and label.`;
}

// A `gh api` call read from its arguments: the endpoint, the method, the fields and whether it
// writes (another method than GET, or any field or input).
function apiCall(args) {
  let endpoint;
  let method;
  const fields = [];
  let input = false;
  let host = false;
  for (let i = 0; i < args.length; i++) {
    const { text } = args[i];
    const [flag, attached] = splitOption(text);
    if (API_VALUES.has(flag)) {
      const value = attached ?? args[++i];
      const word =
        typeof value === "string"
          ? { text: value, dynamic: /[$`]/.test(value) }
          : value;
      if (flag === "-X" || flag === "--method") method = word;
      else if (FIELDS.has(flag)) fields.push({ flag, ...word });
      else if (flag === "--input") input = true;
      else if (flag === "--hostname") host = true;
    } else if (!text.startsWith("-") && !endpoint) {
      endpoint = args[i];
    }
  }
  const verb = method?.dynamic
    ? null
    : (method?.text ?? (fields.length || input ? "POST" : "GET")).toUpperCase();
  const write = verb !== "GET" || fields.length > 0 || input;
  return { endpoint, verb, fields, input, host, write };
}

function apiRefusal(args, repo) {
  const { endpoint, verb, fields, input, host, write } = apiCall(args);
  // A read may name its endpoint with variables: a GET can't write.
  if (!write) return null;
  if (!verb || !endpoint || endpoint.dynamic) {
    return "This `gh api` call writes, and its method or endpoint is built at run time, so the guard can't check it: write the endpoint out literally (shell variables don't carry from one command to the next anyway).";
  }
  if (input || host) {
    return "`gh api` writes from the team use -f/-F fields on github.com, so the guard can read them: no --input or --hostname.";
  }
  const path = endpoint.text.replace(/^\//, "").split("?")[0];
  const prefix = repo ? `repos/${repo}/` : null;
  if (!prefix || !path.toLowerCase().startsWith(prefix.toLowerCase())) {
    return `\`gh api\` writes go to this repository only, as \`repos/${repo ?? "<owner>/<repo>"}/…\` (no {owner}/{repo} placeholders, which don't resolve in the cloud): ${endpoint.text} isn't one.`;
  }
  const rest = path.slice(prefix.length);
  const allowed = WRITES.find((rule) => rule.path.test(rest));
  if (!allowed?.methods.includes(verb)) {
    return `\`gh api --method ${verb} ${path}\` isn't a write the team makes. Allowed, under repos/${repo}/: POST pulls (open a PR), PATCH pulls/<n> (title and body), POST issues/<n>/comments, POST issues/<n>/labels.`;
  }
  for (const field of fields) {
    const [key, value = ""] = field.text.split(/=(.*)/s);
    if (/[$`]/.test(key) || !allowed.fields.includes(key)) {
      return `\`${key}\` isn't a field the team sets when it ${allowed.what}: only ${allowed.fields.join(", ")}.${key === "draft" ? ' Open a normal PR and say "work in progress" in its body: REST can\'t mark a draft ready.' : ""}${key === "base" || key === "state" ? " Retargeting or closing a PR is the owner's call." : ""}`;
    }
    if (value.startsWith("@") && !FROM_FILE.has(key)) {
      return `\`${key}\` comes from a file here, which the guard can't read: only a body or title may. Name it literally.`;
    }
    if (allowed.what === "add a label" && field.dynamic) {
      return "A label built at run time can't be checked: name it literally.";
    }
    if (allowed.what === "add a label" && /owner-approved/i.test(value)) {
      return "The owner-approved label is the owner's alone.";
    }
  }
  return null;
}

// --method=PUT and -XPUT carry their value; -X PUT carries it in the next word.
function splitOption(text) {
  const long = text.match(/^(--[\w-]+)=(.*)$/s);
  if (long) return [long[1], long[2]];
  const short = text.match(/^(-[XHfFqtpR])(.+)$/s);
  if (short) return [short[1], short[2]];
  return [text, undefined];
}

function pushRefusal({ args, words, dir }, moved) {
  if (words.some(({ text }) => REACHES_MAIN.test(text))) return mainRefusal();
  const operands = [];
  for (let i = 0; i < args.length; i++) {
    const { text } = args[i];
    if (PUSH_FORCE.test(text)) {
      return `\`git push ${text}\` can rewrite or delete history on the remote: push new commits to the sprint branch instead.`;
    }
    if (PUSH_VALUES.has(text)) i++;
    else if (!text.startsWith("-")) operands.push(args[i]);
  }
  const [remote, ...refspecs] = operands;
  if (remote?.dynamic || refspecs.some((spec) => spec.dynamic)) {
    return "`git push` with a remote or branch built at run time can't be checked: name the branch.";
  }
  const unnamed =
    !refspecs.length ||
    refspecs.some(({ text }) =>
      /^(HEAD|@)(:|$)/i.test(text.replace(/^\+/, "")),
    );
  if (moved && unnamed) {
    return "This line switches or resets a branch and then pushes without naming one, so the guard can't tell which branch it pushes: name it, as in `git push -u origin <branch>`.";
  }
  const branch = currentBranch(dir);
  for (const { text } of refspecs) {
    if (text.includes("*")) {
      return `\`git push ${text}\` pushes every branch the pattern matches, main included: name the branch.`;
    }
    if (text.startsWith("+")) {
      return `\`git push ${text}\` forces the push: push new commits instead.`;
    }
    if (text.startsWith(":")) {
      return `\`git push ${text}\` deletes a remote branch: that's the owner's call.`;
    }
    const target = text.includes(":") ? text.split(":")[1] : text;
    const lands = /^(HEAD|@)$/i.test(target) ? branch?.name : target;
    if (MAIN.test(lands ?? "")) return mainRefusal();
    if (lands === undefined) {
      return "`git push HEAD` here can't be checked: the guard can't tell which branch is checked out. Name the branch.";
    }
  }
  if (!refspecs.length) {
    if (!branch) {
      return "A plain `git push` here can't be checked: the guard can't tell which branch is checked out. Name the branch: `git push -u origin <branch>`.";
    }
    if (MAIN.test(branch.name) || MAIN.test(branch.upstream ?? ""))
      return mainRefusal();
  }
  return null;
}

function mainRefusal() {
  return "Never push to main or master: push the sprint branch, open a PR, and merge it with `node .studio/merge.mjs <number>`.";
}

// The checked-out branch and the branch it pushes to; null when unknown. A detached HEAD has no
// name, and a plain push from it fails anyway.
function currentBranch(dir) {
  if (!dir) return null;
  const git = (...args) => {
    const run = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    return run.status === 0 ? run.stdout.trim() : null;
  };
  if (git("rev-parse", "--git-dir") === null) return null;
  const name = git("symbolic-ref", "--short", "-q", "HEAD") ?? "";
  const upstream = git(
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  );
  return { name, upstream: upstream?.replace(/^[^/]+\//, "") };
}

function sameRepo(named, repo) {
  return Boolean(named && repo && named.toLowerCase() === repo.toLowerCase());
}
