// What a Bash command may do on GitHub and to the remote, for the guard (guard.mjs). The rules hold
// for every agent, the lead included:
// - Merging: only `node .studio/merge.mjs <number>`, run on its own. Any other command whose text
//   has both a gh word and a merge word, or calls a pulls/<n>/merge endpoint, is refused, however
//   it's spelled: quoted, escaped, in any order, with -R, through an alias, env, bash -c, eval,
//   $(…) or an interpreter.
// - gh: the read-only subcommands, and `gh api`. Its writes (another method than GET, or any
//   -f/-F/--input) go only to this repository's pulls (to open one), pulls/<n> (title and body),
//   issues/<n>/comments and issues/<n>/labels (adding, never owner-approved).
// - Never in a command: statuses, owner-approved, git refs, contents, rulesets, branch protection,
//   secrets, api.github.com, `gh auth token`, a GitHub token assignment, or curl with an
//   Authorization header. A mention in a message is refused too: put such text in a file.
// - git push: never to main or master, never forced, deleting or mirroring, and never a plain push
//   from main.
// Layered defence against shortcuts, not a security boundary: the team acts as the owner's GitHub
// identity, and a script or a program can still do what a command can't. Branch protection that
// requires CI and scope from GitHub Actions is what makes those binding.

import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { basename, resolve } from "node:path";

export const SANCTIONED = "node .studio/merge.mjs <number>";
const DENIED_TEXT = [
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
    "GitHub's API is reached through `gh api` alone, so the guard can read the call",
  ],
  [/\bgh\W+auth\W+token\b/i, "the owner's token stays with gh"],
  [
    /\b(GH|GITHUB)(_ENTERPRISE)?_TOKEN=/,
    "GitHub tokens aren't set in commands",
  ],
];
const AUTHORIZED =
  /\b(curl|wget|xh)\b[\s\S]*authorization|authorization[\s\S]*\b(curl|wget|xh)\b/i;
const GH_WORD = /(^|[^\w.@-])gh([^\w.-]|$)/;
const MERGE = /merge/i;
const MERGE_ENDPOINT = /pulls\/[^/\s"']*\/merge/i;
const INTERPRETERS = /^(node|bun|deno|python\d*(\.\d+)?|perl|ruby|php)$/;
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
]);
const FIELDS = new Set(["-f", "--raw-field", "-F", "--field"]);
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
const MAIN = /^(refs\/heads\/)?(main|master)$/i;
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
 * Why this command may not run, or null.
 * @param read readCommand's result, or null when the command couldn't be read.
 * @param where the project root, the checkout's owner/repo, and the agent's working directory.
 */
export function remoteRefusal(command, read, { project, repo }) {
  return (
    deniedText(command) ??
    mergeRefusal(command, read, project) ??
    (read ? parsedRefusal(read, repo) : unread(command))
  );
}

function deniedText(command) {
  for (const [pattern, why] of DENIED_TEXT) {
    const found = command.match(pattern);
    if (found) {
      return `This command mentions \`${found[0]}\`: ${why}. If you only meant to write the word (a message, a search), put the text in a file and pass the file.`;
    }
  }
  if (AUTHORIZED.test(command)) {
    return "This command sends an Authorization header with curl or a like tool: GitHub is reached through `gh api` alone, so the guard can read the call.";
  }
  return null;
}

// Fail closed: a merge word together with gh, an interpreter, a program named at run time, or a
// merge endpoint is a merge attempt unless it is exactly the sanctioned form.
function mergeRefusal(command, read, project) {
  const words = read?.commands.flatMap((c) => c.words) ?? [];
  const merging =
    MERGE.test(command) || words.some(({ text }) => MERGE.test(text));
  if (!merging) return null;
  const runner =
    GH_WORD.test(command) ||
    MERGE_ENDPOINT.test(command) ||
    words.some(({ text }) => basename(text) === "gh") ||
    read?.commands.some(
      ({ name, dynamicName }) => dynamicName || INTERPRETERS.test(name),
    );
  if (!runner || sanctioned(read, project)) return null;
  return `Merging goes through \`${SANCTIONED}\` alone, run on its own from the repository: it checks the PR, waits for CI and merges the head it checked. This command could merge another way (it has a merge word with gh, an interpreter or a merge endpoint), so it was refused. If it only mentions merging, put that text in a file.`;
}

// One command, `node <path to this project's .studio/merge.mjs> <number>`, nothing else.
function sanctioned(read, project) {
  if (read?.commands.length !== 1 || read.writes.length) return false;
  const [{ name, args, words, dir, dynamicName }] = read.commands;
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
  for (const command of read.commands) {
    const found =
      command.name === "gh"
        ? ghRefusal(command, repo)
        : command.name === "git push"
          ? pushRefusal(command)
          : null;
    if (found) return found;
  }
  return null;
}

// A command the reader couldn't follow is refused when it could reach GitHub or push.
function unread(command) {
  return GH_WORD.test(command) || /\bgit\b[\s\S]*\bpush\b/.test(command)
    ? "This command couldn't be read, and it calls gh or git push, so it was refused. Split it into simpler commands."
    : null;
}

function ghRefusal({ args }, repo) {
  // -R and --repo work before or after the subcommand.
  for (let j = 0; j < args.length; j++) {
    const [option, attached] = splitOption(args[j].text);
    if (option !== "-R" && option !== "--repo") continue;
    const named = attached ?? args[j + 1]?.text;
    if (!sameRepo(named, repo)) {
      return `\`gh ${option}\` points gh at ${named ?? "another repository"}: the team works on ${repo ?? "this checkout's repository"} only.`;
    }
  }
  let i = 0;
  while (args[i]?.text.startsWith("-")) {
    const [option, attached] = splitOption(args[i].text);
    if ((option === "-R" || option === "--repo") && attached === undefined) i++;
    i++;
  }
  const group = args[i];
  const sub = args[i + 1];
  if (!group) return null;
  if (group.dynamic)
    return "`gh` with a subcommand built at run time can't be checked: write it out.";
  if (group.text === "api") return apiRefusal(args.slice(i + 1), repo);
  const reads = GH_READS[group.text];
  if (reads === true) return null;
  if (reads && sub && !sub.dynamic && reads.has(sub.text)) {
    return selectorRefusal(args.slice(i + 2), repo);
  }
  const what = `gh ${group.text}${/^[a-z][\w-]*$/.test(sub?.text ?? "") ? ` ${sub.text}` : ""}`;
  return `\`${what}\` isn't a command the team runs. gh pr and gh issue go through GraphQL, which cloud sessions can't reach, and writes are limited to the REST calls in the sprint skill: \`gh api repos/<owner>/<repo>/pulls\` to open a PR, \`…/issues/<n>/comments\` and \`…/issues/<n>/labels\` to comment and label.`;
}

// R10: a PR named by URL, or as owner/repo#n, may be another repository's.
function selectorRefusal(args, repo) {
  for (const { text } of args) {
    if (/^https?:\/\//.test(text) || /^[\w.-]+\/[\w.-]+#\d+$/.test(text)) {
      const named =
        text.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? text.split("#")[0];
      if (!sameRepo(named, repo)) {
        return `${text} names another repository than ${repo ?? "this checkout's"}: give the PR's bare number.`;
      }
    }
  }
  return null;
}

function apiRefusal(args, repo) {
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
      else if (FIELDS.has(flag)) fields.push(word);
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
  if (!write) return null;
  if (!verb || !endpoint || endpoint.dynamic) {
    return "This `gh api` call writes, and its method or endpoint is built at run time, so the guard can't check it: write it out.";
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
    if (allowed.what === "add a label" && field.dynamic) {
      return "A label built at run time can't be checked: name it.";
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

function pushRefusal({ args, dir }) {
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
  const branch = currentBranch(dir);
  for (const { text } of refspecs) {
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
