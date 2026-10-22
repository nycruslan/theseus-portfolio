// SubagentStop hook for the builders, Forge and Pixel: settings.json's matcher runs it for engineer
// and creative-engineer alone. A builder can't end its turn until `pnpm verify` passes in its
// working directory, or until it has been told once what failed: on that second stop
// (stop_hook_active) it may stop, so it reports the failure honestly instead of looping. The run
// is time-boxed by the first argument, in seconds, and everything it started is killed at the
// limit.
// It blocks with JSON (`decision: "block"`), not exit 2: on SubagentStop an exit 2 whose message
// mentions a missing file counts as a non-blocking error
// (https://code.claude.com/docs/en/hooks#exit-code-output), and build output often does.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { broadcast } from "./post.mjs";

const TAIL_LINES = 40;
const TAIL_CHARS = 3000;
const KEEP_CHARS = 200_000;
// Colour codes, in case a step ignores NO_COLOR. Built from the code, since a literal escape in a
// regular expression reads as a mistake.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const limit = Number(process.argv[2] || 300);

const hook = JSON.parse(readFileSync(0, "utf8"));
const scripts = scriptsOf(hook.cwd);
if (hook.stop_hook_active || !scripts?.verify) process.exit(0);
const run = await verify(hook.cwd);
if (run.code !== 0) {
  const step = failedStep(run.output, scripts);
  const what = run.timedOut
    ? `\`pnpm verify\` didn't finish within ${limit} s, so it was stopped`
    : `\`pnpm verify\` failed${step ? ` at \`${step}\`` : ""} (exit ${run.code})`;
  const reason = [
    `${what}. Fix it and run \`pnpm verify\` until it passes before you stop. If you can't make it pass, stop and report exactly what still fails.`,
    "",
    "Last lines:",
    tail(run.output),
  ].join("\n");
  broadcast({
    ...hook,
    hook_event_name: "StudioVerifyBlocked",
    verify: { step, timedOut: run.timedOut, seconds: run.seconds },
  });
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
}

// The scripts of the package `cwd` is in. Only a project that defines `verify` has anything to run.
function scriptsOf(cwd) {
  for (let dir = cwd; dir; dir = dirname(dir) === dir ? null : dirname(dir)) {
    const manifest = join(dir, "package.json");
    if (!existsSync(manifest)) continue;
    try {
      return JSON.parse(readFileSync(manifest, "utf8")).scripts ?? {};
    } catch {
      return null;
    }
  }
  return null;
}

// The script that was running when verify stopped. pnpm (12, as packageManager pins) prints each
// script's command as `$ <command>` before it runs it, which maps back to its name.
function failedStep(output, scripts) {
  const last = [...output.matchAll(/^\$ (.+)$/gm)].at(-1)?.[1].trim();
  return Object.keys(scripts).find(
    (name) => name !== "verify" && scripts[name].trim() === last,
  );
}

// Runs in its own process group, so the time-box can stop pnpm and every step it started.
function verify(cwd) {
  const started = Date.now();
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;
    const child = spawn("pnpm", ["verify"], {
      cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });
    const collect = (chunk) => {
      output = (output + chunk).slice(-KEEP_CHARS);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }, limit * 1000);
    const done = (code) => {
      clearTimeout(timer);
      resolve({
        code: timedOut ? "timeout" : code,
        output,
        timedOut,
        seconds: Math.round((Date.now() - started) / 1000),
      });
    };
    child.on("error", (error) => {
      collect(String(error.message));
      done(127);
    });
    child.on("close", (code, signal) => done(code ?? signal));
  });
}

function tail(output) {
  const clean = output.replace(ANSI, "").trimEnd();
  const lines = clean.split("\n").slice(-TAIL_LINES).join("\n");
  return lines.length > TAIL_CHARS ? `…${lines.slice(-TAIL_CHARS)}` : lines;
}
