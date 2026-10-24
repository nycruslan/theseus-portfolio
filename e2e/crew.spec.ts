import { test as base, expect } from "@playwright/test";
import {
  type Answer,
  type Feed,
  type Site,
  startFeed,
  startSite,
  untilState,
} from "./crew-feed";

// Sprint 31, B4a (.crew/sprint/31/contract.md): `/crew` from the Studio's feed. The feed can't be
// reached from CI or the cloud, so these checks serve fixtures of its shape (e2e/fixtures/crew,
// .crew/sprint/28/feed-contract.md) from e2e/crew-feed.ts and start a `next start` of their own on
// the checkout's build with CREW_FEED_URL pointed at them. The suite's webServer has no feed URL,
// so the down state is checked there.
//
// The wait: CI builds once without CREW_FEED_URL, so a site serves the build's prerender (down)
// until the cached read revalidates; each check reads `/crew` until it shows the state it expects,
// at most STATE_WAIT ms, and reports how long it took.

const STATE_WAIT = 45_000;

type Crew = {
  feed: Feed;
  /** A site reading the channel `name`, set to `answer`; one per name in a worker. */
  site(name: string, answer?: Partial<Answer>): Promise<Site>;
};

// One fixture server per worker, and one site per channel, shared by the tests that only read it.
const test = base.extend<object, { crew: Crew }>({
  crew: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright reads a fixture's dependencies from this pattern, and this one has none.
    async ({}, use) => {
      const feed = await startFeed();
      const sites = new Map<string, Promise<Site>>();
      await use({
        feed,
        site(name, answer) {
          const known = sites.get(name);
          if (known !== undefined) return known;
          const started = startSite(feed.set(name, answer), feed.ca);
          sites.set(name, started);
          return started;
        },
      });
      for (const site of sites.values()) {
        await site.then((s) => s.stop()).catch(() => undefined);
      }
      await feed.stop();
    },
    { scope: "worker" },
  ],
});

test("B4 harness: the fixture server answers each fixture with the Studio's headers and a fresh asOf, a 503 with no-store, a stale asOf and a late answer as set; a site of its own pointed at the live fixture shows live on /crew", async ({
  crew,
  request,
}, testInfo) => {
  test.setTimeout(120_000);
  const { feed } = crew;
  // The Playwright request context trusts no test CA, so it reads the feed without checking it.
  const read = async (url: string) => {
    const started = Date.now();
    const response = await request.get(url, { ignoreHTTPSErrors: true });
    return {
      status: response.status(),
      cache: response.headers()["cache-control"],
      type: response.headers()["content-type"],
      json: (await response.json()) as Record<string, unknown>,
      ms: Date.now() - started,
    };
  };
  for (const fixture of ["live", "open", "resting"] as const) {
    const answer = await read(feed.set(`check-${fixture}`, { fixture }));
    expect.soft(answer.status, `status of the ${fixture} fixture`).toBe(200);
    expect
      .soft(answer.cache, `cache-control of the ${fixture} fixture`)
      .toBe("public, max-age=0, s-maxage=15, stale-while-revalidate=45");
    expect
      .soft(answer.type, `content-type of the ${fixture} fixture`)
      .toBe("application/json");
    expect.soft(answer.json.version, `version of ${fixture}`).toBe(1);
    expect
      .soft(
        Math.abs(Date.now() - Date.parse(String(answer.json.asOf))),
        `asOf of ${fixture}, ms from now`,
      )
      .toBeLessThan(5_000);
    expect
      .soft(
        JSON.stringify(answer.json).includes(feed.origin),
        `${fixture}'s Studio links on the server's own origin`,
      )
      .toBe(true);
  }
  const failed = await read(feed.set("check-503", { status: 503 }));
  expect
    .soft([failed.status, failed.cache], "a 503")
    .toEqual([503, "no-store"]);
  const stale = await read(feed.set("check-stale", { ageMs: 11 * 60_000 }));
  expect
    .soft(
      Date.now() - Date.parse(String(stale.json.asOf)),
      "a stale asOf, ms old",
    )
    .toBeGreaterThan(600_000);
  const late = await read(feed.set("check-late", { delayMs: 2_500 }));
  expect.soft(late.ms, "a late answer, ms").toBeGreaterThanOrEqual(2_500);

  const site = await crew.site("live", { fixture: "live" });
  const shown = await untilState(site.baseURL, "live", STATE_WAIT);
  testInfo.annotations.push({
    type: "state-wait",
    description: `live showed on a site of its own after ${shown.ms} ms (${feed.reads("live")} feed reads)`,
  });
  expect(
    shown.seen,
    `/crew's [data-crew-state] on a site pointed at the live fixture, after ${shown.ms} ms`,
  ).toBe("live");
  expect(feed.reads("live"), "reads of the live fixture").toBeGreaterThan(0);
});
