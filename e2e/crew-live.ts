import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, Route } from "@playwright/test";
import { expected, readPanel } from "./crew";

// The oracle and the harness for /crew live in the browser (.crew/sprint/35/contract.md, B4.25 to
// B4.31), written from the contract's words with this file's own lines, never by importing the
// page's code. `toAnswer` is "The route"; `announcement` is "The announcement". The page is driven
// by `livePage`: Playwright's clock installed and paused before `goto` (the page uses only
// setTimeout, clearTimeout and Date.now(), which it fakes), `page.route` answering `/api/crew`,
// and an init script standing in for the tab's visibility.

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown) => (typeof value === "string" ? value : null);

/** The roster's keys and names, in roster order (B4a's table). */
const ROSTER: [string, string][] = [
  ["lead", "Atlas"],
  ["product-owner", "Quill"],
  ["engineer", "Forge"],
  ["creative-engineer", "Pixel"],
  ["code-reviewer", "Lens"],
  ["qa-engineer", "Probe"],
  ["design-director", "Iris"],
];
const AGENT_STATES = ["working", "waiting", "done", "not-called"];
const KINDS = [
  "kickoff",
  "ticket",
  "contract",
  "decision",
  "report",
  "verdict",
  "gate",
  "pr",
  "merge",
  "end",
];

export type AnswerRun = {
  sprint: number | null;
  goal: string | null;
  pr: { number: number; url: string | null } | null;
  health: { state: string; line: string | null; quote: boolean };
  now: string | null;
  roles: { role: string; state: string; line: string | null }[];
  moments: { kind: string; at: string; text: string }[];
  url: string | null;
  mergedAt: string | null;
};
export type CrewAnswer =
  | { version: 1; state: "down"; run: null }
  | { version: 1; state: "live" | "open" | "resting"; run: AnswerRun };

/** The origin the fixtures name for the Studio's run pages. */
export const FIXTURE_STUDIO = "https://theseus-studio.vercel.app";

/** A patch to a fixture: shallow merges by top-level key, then into `current` and `last`. */
export type Patch = { top?: Json; current?: Json; last?: Json };

/**
 * A fixture as the feed would answer it now (e2e/fixtures/crew; asOf fresh), patched, for checks
 * that answer `/api/crew` themselves and need no fixture server: its Studio links keep the
 * fixtures' origin, FIXTURE_STUDIO.
 */
export function feedOf(
  fixture: "live" | "open" | "resting",
  patch: Patch = {},
) {
  const feed = JSON.parse(
    readFileSync(
      join(process.cwd(), "e2e", "fixtures", "crew", `${fixture}.json`),
      "utf8",
    ),
  ) as Json;
  feed.asOf = new Date().toISOString();
  for (const part of ["current", "last"] as const) {
    const value = feed[part];
    const more = patch[part];
    if (more && isObject(value)) feed[part] = { ...value, ...more };
  }
  return { ...feed, ...patch.top };
}

/** The keys "The route" allows, at each level of an answer. */
const ANSWER_KEYS = {
  top: ["run", "state", "version"],
  run: [
    "goal",
    "health",
    "mergedAt",
    "moments",
    "now",
    "pr",
    "roles",
    "sprint",
    "url",
  ],
  pr: ["number", "url"],
  health: ["line", "quote", "state"],
  role: ["line", "role", "state"],
  moment: ["at", "kind", "text"],
};

/** A count: a positive whole number, as readCrew's sprint and PR numbers. */
const count = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;

/**
 * "The route": the body `/api/crew` answers for the feed answer `feed`, served from `origin` (the
 * feed URL's origin) and judged at `clock`. The state is B4a's (crew.ts's oracle); the run's
 * fields are the read's, under the feed contract's names, and nothing else.
 */
export function toAnswer(
  feed: unknown,
  origin: string,
  clock = Date.now(),
): CrewAnswer {
  const state = expected(feed, origin, clock).state;
  if (state === "down" || !isObject(feed))
    return { version: 1, state: "down", run: null };
  const run = (state === "resting" ? feed.last : feed.current) as Json;
  const health = run.health as Json;
  const goal = str(run.goal);
  const pr = isObject(run.pr) ? run.pr : null;
  const number = pr ? count(pr.number) : null;

  const roles = new Map<
    string,
    { role: string; state: string; line: string | null }
  >();
  for (const entry of run.roles as unknown[]) {
    if (!isObject(entry)) continue;
    const role = str(entry.role);
    const agentState = str(entry.state);
    if (
      !role ||
      !ROSTER.some(([key]) => key === role) ||
      !agentState ||
      !AGENT_STATES.includes(agentState) ||
      roles.has(role)
    )
      continue;
    roles.set(role, { role, state: agentState, line: str(entry.line) });
  }

  const moments = (run.moments as unknown[])
    .flatMap((m) => {
      if (!isObject(m)) return [];
      const kind = str(m.kind);
      const at = str(m.at);
      const text = str(m.text);
      if (!kind || !KINDS.includes(kind) || !at || Number.isNaN(Date.parse(at)))
        return [];
      if (!text) return [];
      return [{ kind, at, text }];
    })
    // Newest first; Array.prototype.sort is stable, so ties keep the feed's order.
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 10);

  let url: string | null = null;
  const runUrl = str(run.url);
  if (runUrl && URL.canParse(runUrl)) {
    const parsed = new URL(runUrl);
    if (
      parsed.protocol === "https:" &&
      parsed.origin === origin &&
      parsed.pathname.startsWith("/studio/runs/")
    )
      url = runUrl;
  }

  return {
    version: 1,
    state,
    run: {
      sprint: count(run.sprint),
      // A blank goal is no goal; otherwise the string whole, untrimmed.
      goal: goal !== null && goal.trim() !== "" ? goal : null,
      pr: number === null ? null : { number, url: str(pr?.url) },
      health: {
        state: String(health.state),
        line: str(health.line),
        quote: health.quote === true,
      },
      now: str(run.now),
      roles: [...roles.values()],
      moments,
      url,
      mergedAt: str(run.mergedAt),
    },
  };
}

/** Each object in an answer whose keys aren't exactly "The route"'s, by its path. */
export function wrongKeys(answer: unknown) {
  const wrong: string[] = [];
  const keysOf = (value: unknown) =>
    isObject(value) ? Object.keys(value).sort() : null;
  const check = (path: string, value: unknown, keys: string[]) => {
    const found = keysOf(value);
    if (found?.join() !== keys.join())
      wrong.push(`${path}: ${JSON.stringify(found)}`);
  };
  check("answer", answer, ANSWER_KEYS.top);
  const run = isObject(answer) ? answer.run : undefined;
  if (run === null) return wrong;
  check("run", run, ANSWER_KEYS.run);
  if (!isObject(run)) return wrong;
  if (run.pr !== null) check("run.pr", run.pr, ANSWER_KEYS.pr);
  check("run.health", run.health, ANSWER_KEYS.health);
  for (const [i, role] of (Array.isArray(run.roles) ? run.roles : []).entries())
    check(`run.roles[${i}]`, role, ANSWER_KEYS.role);
  for (const [i, m] of (Array.isArray(run.moments)
    ? run.moments
    : []
  ).entries())
    check(`run.moments[${i}]`, m, ANSWER_KEYS.moment);
  return wrong;
}

/** Every string in a JSON value, with its path. */
export function stringsOf(value: unknown, path = "answer"): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value))
    return value.flatMap((v, i) => stringsOf(v, `${path}[${i}]`));
  if (isObject(value))
    return Object.entries(value).flatMap(([k, v]) =>
      stringsOf(v, `${path}.${k}`),
    );
  return [];
}

/** The roster keys Working in an answer: a role `working` in a `live` answer (B4a's words). */
function working(answer: CrewAnswer) {
  if (answer.state !== "live") return new Set<string>();
  return new Set(
    answer.run.roles.filter((r) => r.state === "working").map((r) => r.role),
  );
}

/**
 * "The announcement": the region's text after a told answer replaces a told panel, or null when
 * nothing is announced (either side down, or no role started or stopped working), so the text is
 * left as it was.
 */
export function announcement(before: CrewAnswer, after: CrewAnswer) {
  if (before.state === "down" || after.state === "down") return null;
  const was = working(before);
  const now = working(after);
  const sentences: string[] = [];
  for (const [key, name] of ROSTER) {
    if (now.has(key) && !was.has(key))
      sentences.push(`${name} started working.`);
    if (was.has(key) && !now.has(key))
      sentences.push(`${name} stopped working.`);
  }
  return sentences.length > 0 ? sentences.join(" ") : null;
}

// ---------------------------------------------------------------------------------------------
// The harness

/** What the route answers a poll with. */
export type Reply =
  | { json: unknown; status?: number }
  | { raw: string; status?: number }
  | { status: number }
  | { abort: true }
  | { hold: true };

/**
 * An init script standing in for the tab's visibility: `document.visibilityState` and
 * `document.hidden` read a value `window.__setVisibility(state)` sets, and setting it dispatches
 * `visibilitychange` on `document`, as Chromium does.
 */
function visibilityShim() {
  let state: DocumentVisibilityState = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => state !== "visible",
  });
  (
    window as Window & {
      __setVisibility?: (next: DocumentVisibilityState) => void;
    }
  ).__setVisibility = (next) => {
    state = next;
    document.dispatchEvent(new Event("visibilitychange"));
  };
}

/**
 * An init script: from DOMContentLoaded, every mutation in `main` that touches `.crew` (inside
 * it, or adding or removing it) in `window.__mutations`, but `button[data-pause]`'s own attribute
 * changes, which go to `window.__pauseMutations`; and every CSS transition or animation that starts
 * inside `.crew` in `window.__moved`. Mutations the parser makes before DOMContentLoaded can't be
 * told from the page's own, so they aren't recorded.
 */
export function recordMutations() {
  const win = window as Window & {
    __mutations?: string[];
    __pauseMutations?: string[];
    __moved?: string[];
  };
  win.__mutations = [];
  win.__pauseMutations = [];
  win.__moved = [];
  const name = (node: Node | null) => {
    if (!node) return "?";
    if (!(node instanceof Element))
      return `#text "${(node.textContent ?? "").slice(0, 30)}"`;
    const hooks = [...node.attributes]
      .filter((a) => a.name.startsWith("data-") || a.name === "class")
      .map((a) => `${a.name}="${a.value.slice(0, 20)}"`)
      .join(" ");
    return `<${node.tagName.toLowerCase()}${hooks ? ` ${hooks}` : ""}>`;
  };
  const inPanel = (node: Node | null) => {
    const el = node instanceof Element ? node : (node?.parentElement ?? null);
    return Boolean(el?.closest(".crew"));
  };
  const holdsPanel = (nodes: NodeList) =>
    [...nodes].some(
      (n) =>
        n instanceof Element &&
        (n.matches(".crew") || n.querySelector(".crew")),
    );
  for (const type of ["transitionrun", "animationstart"]) {
    document.addEventListener(
      type,
      (event) => {
        if (inPanel(event.target as Node))
          win.__moved?.push(`${type} on ${name(event.target as Node)}`);
      },
      true,
    );
  }
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const main = document.querySelector("main");
      if (!main) return;
      new MutationObserver((records) => {
        for (const r of records) {
          const touches =
            inPanel(r.target) ||
            holdsPanel(r.addedNodes) ||
            holdsPanel(r.removedNodes);
          if (!touches) continue;
          if (
            r.type === "attributes" &&
            r.target instanceof Element &&
            r.target.matches("button[data-pause]")
          ) {
            win.__pauseMutations?.push(r.attributeName ?? "");
            continue;
          }
          const detail =
            r.type === "attributes"
              ? ` ${r.attributeName}`
              : r.type === "childList"
                ? ` +${r.addedNodes.length} -${r.removedNodes.length}`
                : "";
          win.__mutations?.push(`${r.type} on ${name(r.target)}${detail}`);
        }
      }).observe(main, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    },
    { once: true },
  );
}

/** What recordMutations saw since the last call, and clears it. */
export function takeMutations(page: Page) {
  return page.evaluate(() => {
    const win = window as Window & {
      __mutations?: string[];
      __pauseMutations?: string[];
      __moved?: string[];
    };
    const out = {
      panel: win.__mutations ?? ["(no recorder)"],
      pause: win.__pauseMutations ?? [],
      moved: win.__moved ?? [],
    };
    win.__mutations = [];
    win.__pauseMutations = [];
    win.__moved = [];
    return out;
  });
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Real time a poll may take to reach the route after the clock fires it. */
const REACH = 800;
/** Real time the page is given to apply an answer before the clock moves again. */
const SETTLE = 250;

export type Live = {
  /** Polls the route has seen. */
  polls(): number;
  /** What the route answers from now on. */
  answer(reply: Reply): void;
  /** Runs the clock `ms` and waits for a poll that fires to reach the route and settle; the new polls. */
  tick(ms: number): Promise<number>;
  /**
   * Waits up to 3 s, in real time, for a poll that needs no clock (shown again, unpaused): the new
   * polls since the last `visibility`, `press` or `mark`, which may have come before this call.
   */
  settle(): Promise<number>;
  /** Marks the poll count before an action taken outside the harness (a key press). */
  mark(): void;
  /** Answers every held poll with `reply`. */
  release(reply: Reply): Promise<void>;
  /** Sets the shim's visibility, dispatching visibilitychange. */
  visibility(state: "visible" | "hidden"): Promise<void>;
  /** Clicks Pause updates at its centre (with the clock paused, a locator's checks would wait). */
  press(): Promise<string | null>;
  /** The panel's textContent. */
  text(): Promise<string>;
  /** `[data-crew-state]`. */
  state(): Promise<string | null>;
  /** Whether the poller marked Pause ready. */
  ready: boolean;
  /** The page's own and other origins it requested. */
  origins: Set<string>;
};

async function fulfil(route: Route, reply: Reply) {
  if ("hold" in reply) return;
  if ("abort" in reply) {
    await route.abort("failed").catch(() => undefined);
    return;
  }
  const status = reply.status ?? 200;
  const body =
    "json" in reply
      ? JSON.stringify(reply.json)
      : "raw" in reply
        ? reply.raw
        : '{"error":"Not answering"}';
  await route
    .fulfill({
      status,
      contentType: "application/json",
      headers: { "cache-control": "public, max-age=0, s-maxage=30" },
      body,
    })
    .catch(() => undefined);
}

/**
 * Opens `url` (a /crew) with the clock installed and paused, the visibility shim, and the route
 * answering `/api/crew` with `first`, then waits for the poller to mark Pause ready and the
 * hydration poll to settle. Nothing here asserts: the checks read `ready` and `polls()`.
 */
export async function livePage(
  page: Page,
  url: string,
  first: Reply,
): Promise<Live> {
  let next = first;
  let seen = 0;
  let mark = 0;
  const held: Route[] = [];
  const answering: Promise<void>[] = [];
  const origins = new Set<string>();
  page.on("request", (request) => origins.add(new URL(request.url()).origin));
  await page.addInitScript(visibilityShim);
  await page.route("**/api/crew", (route) => {
    if (route.request().method() !== "GET") return route.continue();
    seen += 1;
    if ("hold" in next) {
      held.push(route);
      return;
    }
    const done = fulfil(route, next);
    answering.push(done);
    return done;
  });
  const now = Date.now();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now + 1_000);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const ready = await page
    .locator("button[data-pause][data-ready]")
    .waitFor({ state: "attached", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  const waitPoll = async (before: number, ms: number) => {
    const started = Date.now();
    while (seen === before && Date.now() - started < ms) await sleep(25);
    await Promise.all(answering);
    await sleep(SETTLE);
    return seen - before;
  };
  await waitPoll(0, 3_000);

  const live: Live = {
    ready,
    origins,
    polls: () => seen,
    answer(reply) {
      next = reply;
    },
    async tick(ms) {
      await Promise.all(answering);
      const before = seen;
      await page.clock.runFor(ms);
      return waitPoll(before, REACH);
    },
    settle: () => waitPoll(mark, 3_000),
    mark() {
      mark = seen;
    },
    async release(reply) {
      const routes = held.splice(0);
      await Promise.all(routes.map((route) => fulfil(route, reply)));
      await sleep(SETTLE);
    },
    async visibility(state) {
      mark = seen;
      await page.evaluate(
        (s) =>
          (
            window as Window & {
              __setVisibility?: (next: string) => void;
            }
          ).__setVisibility?.(s),
        state,
      );
    },
    async press() {
      const box = await page.evaluate(() => {
        const b = document.querySelector("button[data-pause]");
        if (!b || b.getClientRects().length === 0) return null;
        // Into view first, as a visitor's click is: a focus loop can leave it scrolled off, and a
        // click at off-screen coordinates presses nothing (Forge's trace of B4.30 on sprint 36).
        // Instant: a smooth scroll runs on frames, which a paused clock never gives.
        b.scrollIntoView({ block: "center", behavior: "instant" });
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      mark = seen;
      if (box) await page.mouse.click(box.x, box.y);
      return page.evaluate(
        () =>
          document
            .querySelector("button[data-pause]")
            ?.getAttribute("aria-pressed") ?? null,
      );
    },
    text: () =>
      page.evaluate(
        () =>
          document.querySelector('section[aria-labelledby="crew"]')
            ?.textContent ?? "",
      ),
    state: () =>
      page.evaluate(
        () =>
          document
            .querySelector('section[aria-labelledby="crew"]')
            ?.getAttribute("data-crew-state") ?? null,
      ),
  };
  return live;
}

/** The panel as readPanel reads it, in the oracle's terms, for one comparison. */
export async function panelAgainst(
  page: Page,
  feed: unknown,
  origin: string | null,
) {
  const exp = expected(feed, origin);
  const found = await readPanel(page);
  const bare = (text: string) => text.replace(/\s+/g, "");
  return {
    found: {
      state: found.state,
      status: found.status,
      chip: bare(found.chip),
      rows: found.rows,
      now: found.now
        ? { text: bare(found.now.text), quotes: found.now.quotes }
        : null,
      heading: found.heading,
      moments: found.moments,
      links: [...found.links].sort(),
      evidence: exp.evidenceText.filter((w) => !found.evidence.includes(w)),
      approval: found.approval,
      rules: found.rules,
    },
    expected: {
      state: exp.state,
      status: exp.status,
      chip: bare(exp.chip),
      rows: exp.rows,
      now: exp.now
        ? {
            text: bare(exp.now.text),
            quotes: exp.now.quoted ? [exp.now.quoted] : [],
          }
        : null,
      heading: exp.heading,
      moments: exp.moments,
      links: [...exp.links].sort(),
      evidence: [] as string[],
      approval: exp.approval,
      rules: exp.rules,
    },
  };
}
