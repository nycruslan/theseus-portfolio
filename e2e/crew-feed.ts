import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import type { IncomingMessage } from "node:http";
import { createServer, type Server } from "node:https";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test as base } from "@playwright/test";

// The crew feed's harness (.crew/sprint/31/contract.md, "Data rules"; the feed's shape is
// .crew/sprint/28/feed-contract.md). Nothing in the cloud or in CI can reach the Studio, so the
// checks serve fixtures of the feed's shape from a server of their own and point a `next start` of
// their own at it through CREW_FEED_URL. The suite's one webServer has no feed URL: it is the down
// state.
//
// - The feed is served over https with a certificate made for the run (openssl), since the run's
//   link "This run on the Studio" is shown only for an https URL on the feed's own origin. The
//   fixtures name the Studio's production origin and the server swaps in its own as it answers.
// - Each site runs from a temporary folder: a copy of the checkout's `.next` and links to
//   everything else, so a page it regenerates from a fixture never lands in the `.next` the suite's
//   webServer serves, and two sites never share a cache.
// - The fixtures' edge cases, each one a data rule: in live.json a role entry with an unknown key,
//   one with an unknown state and a second entry for a key (all dropped), a moment of an unknown
//   kind, one whose `at` doesn't parse and one with no text (dropped), one whose `who` isn't a
//   roster key (kept), one whose text is markup, one on the UTC day before the newest, and another
//   repository's PR (not linked); in open.json a working role (Waiting when not live), this
//   repository's PR (linked), a run URL on another origin (not linked) and moments out of order;
//   in resting.json sprint 29 (a merged retro), a waiting and a working role (Done at rest) and a
//   PR whose URL's number isn't its own (not linked).

/** The feed's three fixture states (e2e/fixtures/crew). */
export type Fixture = "live" | "open" | "resting";

/** What a channel answers: a fixture, as it is or patched, or an error, fresh or late or stale. */
export type Answer = {
  fixture: Fixture;
  /** 200 serves the fixture; anything else answers `{ "error": … }` with no-store, as the Studio. */
  status: number;
  /** How old `asOf` is when served, in ms: over 600,000 is stale (the contract's down rule). */
  ageMs: number;
  /** How long the answer waits before it is sent, in ms: over 6,000 is down. */
  delayMs: number;
  /** Shallow merges applied to the fixture, by top-level key, then by `current`'s and `last`'s. */
  patch?: {
    top?: Record<string, unknown>;
    current?: Record<string, unknown>;
    last?: Record<string, unknown>;
  };
  /** A body sent instead of the fixture, verbatim (bad JSON, a wrong shape). */
  raw?: string;
};

/** The origin the fixtures name for the Studio's run pages; the server answers with its own. */
const FIXTURE_STUDIO = "https://theseus-studio.vercel.app";
const ROOT = process.cwd();
const OPENSSL = process.env.OPENSSL_BIN || "openssl";
const FIXTURES = join(ROOT, "e2e", "fixtures", "crew");

/** A free TCP port on this machine, from the OS. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

export type Feed = {
  origin: string;
  /** The CA file a site trusts the feed's certificate through (NODE_EXTRA_CA_CERTS). */
  ca: string;
  /** Sets a channel's answer (a new channel starts as the live fixture) and returns its URL. */
  set(channel: string, answer?: Partial<Answer>): string;
  /** The body a channel would answer now, as JSON, for the oracle (the fixture after its patch). */
  body(channel: string): Record<string, unknown>;
  /** How many reads the channel has answered. */
  reads(channel: string): number;
  stop(): Promise<void>;
};

/**
 * Starts the fixture server: `GET /<channel>/api/crew` answers as the channel is set, with the
 * Studio's headers; `POST /<channel>/control` with a JSON `Answer` sets it from outside the run.
 */
async function startFeed(): Promise<Feed> {
  const dir = mkdtempSync(join(tmpdir(), "crew-feed-"));
  const key = join(dir, "key.pem");
  const cert = join(dir, "cert.pem");
  // openssl is on CI's Ubuntu, the cloud's sessions and macOS; where it isn't, say so plainly.
  try {
    execFileSync(
      OPENSSL,
      [
        "req",
        "-x509",
        "-newkey",
        "ec",
        "-pkeyopt",
        "ec_paramgen_curve:prime256v1",
        "-nodes",
        "-days",
        "2",
        "-subj",
        "/CN=127.0.0.1",
        "-addext",
        "subjectAltName=IP:127.0.0.1",
        "-keyout",
        key,
        "-out",
        cert,
      ],
      { stdio: "ignore" },
    );
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(
      `The crew feed's fixture server needs openssl (or OPENSSL_BIN) to make its https certificate: ${String(error)}`,
    );
  }
  const port = await freePort();
  const origin = `https://127.0.0.1:${port}`;
  const channels = new Map<string, Answer>();
  const counts = new Map<string, number>();

  const body = (channel: string) => {
    const answer = channels.get(channel);
    if (!answer) throw new Error(`no channel ${channel}`);
    const text = readFileSync(
      join(FIXTURES, `${answer.fixture}.json`),
      "utf8",
    ).replaceAll(FIXTURE_STUDIO, origin);
    const feed = JSON.parse(text) as Record<string, unknown>;
    feed.asOf = new Date(Date.now() - answer.ageMs).toISOString();
    for (const part of ["current", "last"] as const) {
      const value = feed[part];
      const patch = answer.patch?.[part];
      if (patch && value && typeof value === "object") {
        feed[part] = { ...value, ...patch };
      }
    }
    return { ...feed, ...answer.patch?.top };
  };

  const readBody = (request: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let data = "";
      request.on("data", (chunk: Buffer) => {
        data += chunk;
      });
      request.on("end", () => resolve(data));
    });

  const server: Server = createServer(
    { key: readFileSync(key), cert: readFileSync(cert) },
    async (request, response) => {
      const match = (request.url ?? "").match(
        /^\/([\w-]+)\/(api\/crew|control)$/,
      );
      const channel = match?.[1] ?? "";
      if (match?.[2] === "control" && request.method === "POST") {
        const answer = JSON.parse(await readBody(request)) as Partial<Answer>;
        set(channel, answer);
        response.writeHead(204).end();
        return;
      }
      const answer = channels.get(channel);
      if (!match || request.method !== "GET" || !answer) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end('{"error":"Not found"}');
        return;
      }
      counts.set(channel, (counts.get(channel) ?? 0) + 1);
      if (answer.delayMs > 0) await pause(answer.delayMs);
      if (answer.status !== 200) {
        response.writeHead(answer.status, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        response.end('{"error":"The telling failed"}');
        return;
      }
      response.writeHead(200, {
        "content-type": "application/json",
        "cache-control":
          "public, max-age=0, s-maxage=15, stale-while-revalidate=45",
      });
      response.end(answer.raw ?? JSON.stringify(body(channel)));
    },
  );
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );

  function set(channel: string, answer: Partial<Answer> = {}) {
    const was = channels.get(channel) ?? {
      fixture: "live",
      status: 200,
      ageMs: 0,
      delayMs: 0,
    };
    channels.set(channel, { ...was, ...answer });
    return `${origin}/${channel}/api/crew`;
  }

  return {
    origin,
    ca: cert,
    set,
    body,
    reads: (channel) => counts.get(channel) ?? 0,
    stop: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => {
          rmSync(dir, { recursive: true, force: true });
          resolve();
        });
      }),
  };
}

export type Site = {
  baseURL: string;
  /** What the server printed, for a failure's message. */
  log(): string;
  stop(): Promise<void>;
  /** Kills the server's process group and removes its folder, synchronously (the worker's exit). */
  kill(): void;
};

/**
 * Starts `next start` on the checkout's build from a folder of its own, with CREW_FEED_URL set
 * (unset when `feedUrl` is null) and the server's clock at UTC+14 (B4.7), so a time shown in the
 * server's zone instead of UTC is off by hours and, near midnight, by a day.
 */
async function startSite(feedUrl: string | null, ca?: string): Promise<Site> {
  // freePort closes its probe before `next start` binds, so another process can take the port in
  // between, and `next start` binds every interface where the probe only tried one.
  for (let tries = 2; ; tries--) {
    try {
      return await startSiteOnce(feedUrl, ca);
    } catch (error) {
      if (tries === 0 || !String(error).includes("EADDRINUSE")) throw error;
    }
  }
}

async function startSiteOnce(
  feedUrl: string | null,
  ca?: string,
): Promise<Site> {
  const dir = mkdtempSync(join(tmpdir(), "crew-site-"));
  for (const entry of readdirSync(ROOT)) {
    if (entry === ".next") continue;
    symlinkSync(join(ROOT, entry), join(dir, entry));
  }
  // The build's times kept: the prerender's age decides when the first regeneration reads the feed.
  cpSync(join(ROOT, ".next"), join(dir, ".next"), {
    recursive: true,
    preserveTimestamps: true,
    filter: (source) => !source.startsWith(join(ROOT, ".next", "cache")),
  });
  const port = await freePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TZ: "Pacific/Kiritimati",
    NODE_ENV: "production",
  };
  delete env.CREW_FEED_URL;
  if (feedUrl !== null) env.CREW_FEED_URL = feedUrl;
  if (ca) env.NODE_EXTRA_CA_CERTS = ca;
  let output = "";
  // Its own process group, so stopping it stops the next-server child too (AGENTS.md).
  const child: ChildProcess = spawn(
    process.execPath,
    [
      join(ROOT, "node_modules", "next", "dist", "bin", "next"),
      "start",
      "--port",
      String(port),
    ],
    { cwd: dir, env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout?.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    output += chunk;
  });
  const baseURL = `http://127.0.0.1:${port}`;
  const stop = async () => {
    if (child.pid && child.exitCode === null) {
      const exited = new Promise((done) => child.once("exit", done));
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // Already gone.
      }
      await Promise.race([exited, pause(5000)]);
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Gone after SIGTERM, as it should be.
      }
    }
    rmSync(dir, { recursive: true, force: true });
  };
  const kill = () => {
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
    rmSync(dir, { recursive: true, force: true });
  };
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    if (child.exitCode !== null) break;
    const up = await fetch(`${baseURL}/robots.txt`)
      .then((r) => r.ok)
      .catch(() => false);
    if (up) return { baseURL, log: () => output, stop, kill };
    await pause(200);
  }
  await stop();
  throw new Error(`next start didn't answer on ${baseURL}:\n${output}`);
}

/** The state `/crew` shows: `[data-crew-state]` in its HTML, or what answered instead. */
async function servedState(baseURL: string) {
  const response = await fetch(`${baseURL}/crew`).catch(() => null);
  if (!response) return "no answer";
  const html = await response.text();
  const state = html.match(/data-crew-state="([^"]*)"/)?.[1];
  return state ?? `${response.status} without [data-crew-state]`;
}

/**
 * Reads `/crew` until it shows `expected`, at most `timeout` ms: a site built without a feed URL
 * serves the build's prerender (down) until the cached read revalidates (the contract's harness).
 * Returns how long it took and what it showed last.
 */
export async function untilState(
  baseURL: string,
  expected: string,
  timeout = 45_000,
) {
  const started = Date.now();
  let seen = await servedState(baseURL);
  while (seen !== expected && Date.now() - started < timeout) {
    await pause(1000);
    seen = await servedState(baseURL);
  }
  return { seen, ms: Date.now() - started };
}

/**
 * The polling rule's deadline (.crew/sprint/31/contract.md, "The polling rule": 44 s, named in the
 * test). A switch is followed on the request after the next stale one, about 30 s at worst, and a
 * late answer takes the read's 6 s more, so a poll a second apart shows it inside 44 s.
 */
export const STATE_WAIT = 44_000;

/**
 * The state `/` shows, from its HTML, by the hooks the polling rule names (.crew/sprint/34/
 * contract.md, "Checks"): `live`, a `tr[data-pencil][data-live]`; `open`, a `tr[data-pencil]`
 * without it; `resting`, a `p[data-rest]`; `down`, none of them.
 */
export function homeStateOf(html: string) {
  const has = (tag: string, attribute: string) =>
    new RegExp(`\\s${attribute}(?:=|\\s|/?>)`).test(tag);
  const rows = [...html.matchAll(/<tr\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => has(tag, "data-pencil"));
  if (rows.some((tag) => has(tag, "data-live"))) return "live";
  if (rows.length > 0) return "open";
  const rests = [...html.matchAll(/<p\b[^>]*>/g)].filter((m) =>
    has(m[0], "data-rest"),
  );
  return rests.length > 0 ? "resting" : "down";
}

/** The state `/` shows now, or what answered instead. */
async function servedHome(baseURL: string) {
  const response = await fetch(`${baseURL}/`).catch(() => null);
  if (!response) return "no answer";
  if (response.status !== 200) return `${response.status}`;
  return homeStateOf(await response.text());
}

/**
 * Reads `/` until it shows `expected`, at most `timeout` ms, as `untilState` reads `/crew`: `/` is
 * regenerated on its own, so a site that shows a state on `/crew` may still serve the old `/`.
 */
export async function untilHome(
  baseURL: string,
  expected: string,
  timeout = STATE_WAIT,
) {
  const started = Date.now();
  let seen = await servedHome(baseURL);
  while (seen !== expected && Date.now() - started < timeout) {
    await pause(1000);
    seen = await servedHome(baseURL);
  }
  return { seen, ms: Date.now() - started };
}

export type Crew = {
  feed: Feed;
  /**
   * A site reading the channel `name`, set to `answer`. The three fixtures' sites, and any a spec
   * asks to `keep`, are kept until the worker ends; a variant's site replaces the worker's previous
   * variant site. So a worker runs one `next start` per kept site, across every feed spec it ran,
   * plus one variant: crew.spec.ts keeps 15 and live-layer.spec.ts 11 (each scenario's own), and
   * crew-live.spec.ts reuses crew.spec.ts's live, open and resting (Lens on 415b4c0).
   */
  site(name: string, answer?: Partial<Answer>, keep?: boolean): Promise<Site>;
  /**
   * `make()` once per worker under `key`, its promise shared: a spec starts the scenarios that wait
   * on the feed (a site's first state, a switch's 30 s revalidation) together in a beforeAll, and
   * each check awaits its own, so the waits overlap instead of adding up. A scenario only reads
   * and returns what it saw; the check asserts on it.
   */
  once<T>(key: string, make: () => Promise<T>): Promise<T>;
};

const KEPT = ["live", "open", "resting"];

/** The worker's feed server and sites, made on first use (`crewOf`). */
let shared: Promise<Crew> | null = null;

/**
 * The worker's feed server, a site per kept channel, and one variant site at a time, for the specs
 * that read the feed: made once per worker process on first use, its promise shared, and its sites
 * killed as the worker exits. A spec's beforeAll takes it from here; a check, from `crewTest`'s
 * `crew`.
 *
 * Sprint 36 (decision 10) moved it out of a worker-scoped fixture: Playwright keys a worker by its
 * worker fixtures, and runs a free worker's own kind of job first, so every feed spec waited until
 * the rest of the suite was done and then ran as one long tail, with a worker idle at the end. As
 * a module's value and a test-scoped fixture, the feed specs run in the suite's order with the rest.
 */
export function crewOf(): Promise<Crew> {
  shared ??= makeCrew();
  return shared;
}

async function makeCrew(): Promise<Crew> {
  const feed = await startFeed();
  const sites = new Map<string, Promise<Site>>();
  const scenarios = new Map<string, Promise<unknown>>();
  const made: Site[] = [];
  let variant: Promise<Site> | null = null;
  const start = (url: string | null) =>
    startSite(url, feed.ca).then((site) => {
      made.push(site);
      return site;
    });
  // The worker's exit: each site's process group killed and its folder removed, synchronously,
  // since an exit handler can't wait (the feed server goes with the process).
  process.once("exit", () => {
    for (const site of made) site.kill();
  });
  return {
    feed,
    once<T>(key: string, make: () => Promise<T>) {
      let started = scenarios.get(key);
      if (started === undefined) {
        started = make();
        // Awaited by its check, which reports a failure; unawaited here, it mustn't crash the run.
        started.catch(() => undefined);
        scenarios.set(key, started);
      }
      return started as Promise<T>;
    },
    site(name, answer, keep = KEPT.includes(name)) {
      if (keep) {
        const known = sites.get(name);
        if (known !== undefined) return known;
        const started = start(feed.set(name, answer));
        sites.set(name, started);
        return started;
      }
      const previous = variant;
      // A fresh answer for the channel: nothing carried over from an earlier switch.
      const fresh: Partial<Answer> = {
        fixture: "live",
        status: 200,
        ageMs: 0,
        delayMs: 0,
        patch: undefined,
        raw: undefined,
        ...answer,
      };
      variant = (async () => {
        await previous?.then((s) => s.stop()).catch(() => undefined);
        return start(feed.set(name, fresh));
      })();
      return variant;
    },
  };
}

/** The specs that read the feed take `crew`, the worker's (`crewOf`), from this test. */
export const crewTest = base.extend<{ crew: Crew }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads a fixture's dependencies from this pattern, and this one has none.
  crew: async ({}, use) => {
    await use(await crewOf());
  },
});
