// A stand-in for gh in the harness tests (kit.mjs puts it first on PATH). It fakes `gh api` from
// GH_ROUTES, a JSON object keyed by "METHOD path", or by a bare path for GET. The query string is
// ignored, and * matches within one path segment. A value is the response body;
// {"$seq": [...]} answers each call with the next item and then keeps the last;
// {"$error": 405, "message": "..."} fails as gh does, with the body on stdout and
// "gh: message (HTTP 405)" on stderr. It applies the two --jq forms the harness uses,
// `.[] | @json` and `.key[] | @json`. An unknown route is a 404. GH_FAIL fails every call, and
// GH_LOG gets each call's arguments, followed by the request body for `--input -`.

const {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const args = process.argv.slice(2);
const env = process.env;
const input = args.includes("--input") ? readFileSync(0, "utf8") : undefined;
if (env.GH_LOG) {
  const logged = input === undefined ? args : [...args, input];
  appendFileSync(env.GH_LOG, `${JSON.stringify(logged)}\n`);
}

function fail(status, message) {
  process.stdout.write(JSON.stringify({ message, status: String(status) }));
  process.stderr.write(`gh: ${message} (HTTP ${status})\n`);
  process.exit(1);
}

if (env.GH_FAIL) {
  process.stderr.write(`${env.GH_FAIL}\n`);
  process.exit(1);
}
if (args[0] !== "api") fail(400, "the fake gh answers gh api alone");

let method;
let jq;
let path;
let fields = false;
for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-X" || arg === "--method") method = args[++i];
  else if (arg === "--jq" || arg === "-q") jq = args[++i];
  else if (["-f", "-F", "--field", "--raw-field", "--input"].includes(arg)) {
    fields = true;
    i++;
  } else if (arg === "-H" || arg === "--header") i++;
  else if (!arg.startsWith("-") && path === undefined) path = arg;
}
method = (method ?? (fields ? "POST" : "GET")).toUpperCase();
const bare = String(path).replace(/^\//, "").split("?")[0];

const routes = JSON.parse(env.GH_ROUTES || "{}");
const literal = (text) => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
const key = Object.keys(routes).find((candidate) => {
  const [verb, route] = candidate.includes(" ")
    ? candidate.split(" ")
    : ["GET", candidate];
  const pattern = new RegExp(
    `^${route.split("*").map(literal).join("[^/]*")}$`,
  );
  return verb === method && pattern.test(bare);
});
if (key === undefined) fail(404, "Not Found");

let value = routes[key];
if (value?.$seq) {
  const name = `gh-seq-${Buffer.from(key).toString("hex").slice(0, 100)}`;
  const state = join(env.GH_STATE || tmpdir(), name);
  const count = existsSync(state) ? Number(readFileSync(state, "utf8")) : 0;
  writeFileSync(state, String(count + 1));
  value = value.$seq[Math.min(count, value.$seq.length - 1)];
}
if (value?.$error) fail(value.$error, value.message ?? "error");

const each = jq?.match(/^\.(\w*)\[\] \| @json$/);
if (each) {
  for (const item of each[1] ? value[each[1]] : value) {
    process.stdout.write(`${JSON.stringify(item)}\n`);
  }
} else {
  process.stdout.write(JSON.stringify(value));
}
