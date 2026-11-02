import { expect, type Page } from "@playwright/test";
import { expected } from "./crew";
import {
  type Crew,
  STATE_WAIT,
  crewTest as test,
  untilHome,
  untilState,
} from "./crew-feed";
import { layerFor } from "./live-layer";
import {
  box,
  drawingAt,
  profile as hullOf,
  modelCoverage,
  outlineCoverage,
  whole,
} from "./model";
import { edges, hausdorff } from "./pixels";
import { PLAN } from "./plan";

// The window checks' shared reads, for window.spec.ts (Wa), phone-window.spec.ts (Wb) and
// tablet-window.spec.ts (Wc, .crew/sprint/45/contract.md). Moved here from the two older specs,
// which import them: BLOCK, LETTERING, at, FIXTURES, reachHome (keyed by spec, as each keyed its
// own), drawingReads and registration. Copied, with each spec keeping its own: openHome and
// shownOn, which hold an expect( each, so moving them would read as fewer assertions in those
// specs (.crew/scope.mjs).

export const BLOCK = "dl[data-particulars]";
/** The drawing's lettering, HTML spans over its SVG (.crew/sprint/39/decisions.md, 5). */
export const LETTERING = "[data-plan] .plan-view > span";

export const at = (width: number, height: number) => `${width} x ${height}`;

/** `/` from `base` at a size, with the web fonts in. */
export async function openHome(
  page: Page,
  width: number,
  height: number,
  base = "",
) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}/`);
  expect(
    response?.status(),
    `status of ${base || "the default server"}/ at ${at(width, height)}`,
  ).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

// ---------------------------------------------------------------------------------------------
// The feed's states, as B4.22 reaches them. A check that reads them runs in a describe that skips
// under PLAYWRIGHT_BASE_URL (the sites are copies of this checkout's build), and its default-server
// pass runs outside it (.crew/sprint/45/contract.md, W15).

export const FIXTURES = ["live", "open", "resting"] as const;
export type FixtureName = (typeof FIXTURES)[number];

/** The default server's state, the one every window check reads first. */
export const DEFAULT_SERVER = { base: "", where: "the default server" };

/** Why a describe of fixture states skips under PLAYWRIGHT_BASE_URL. */
export const FIXTURES_NEED_BUILD =
  "PLAYWRIGHT_BASE_URL is set: the live, open and resting states need this checkout's build served from copies pointed at the fixture server (B4.22's harness)";

/**
 * The fixture's site, as B4.22 reaches it: live-layer.spec.ts's kept site by name and answer, read
 * until `/crew` shows the oracle's state, then `/` until it shows the layer's hooks. Once per
 * worker under `${spec} ${fixture}`; it asserts nothing.
 */
export function reachHome(crew: Crew, fixture: FixtureName, spec: string) {
  return crew.once(`${spec} ${fixture}`, async () => {
    const name = `home-${fixture}`;
    const site = await crew.site(name, { fixture }, true);
    const body = crew.feed.body(name);
    const want = layerFor(body, crew.feed.origin).home;
    const crewShown = await untilState(
      site.baseURL,
      expected(body, crew.feed.origin).state,
      STATE_WAIT,
    );
    const home = await untilHome(site.baseURL, want, STATE_WAIT);
    return { base: site.baseURL, body, want, crewShown, home };
  });
}

/** A fixture's site, asserted to show its state on `/`. */
export async function shownOn(crew: Crew, fixture: FixtureName, spec: string) {
  const reached = await reachHome(crew, fixture, spec);
  test.info().annotations.push({
    type: "state-wait",
    description: `${fixture}: /crew ${reached.crewShown.seen} after ${reached.crewShown.ms} ms, then / ${reached.home.seen} after ${reached.home.ms} ms`,
  });
  expect(
    reached.home.seen,
    `the state / shows on the home-${fixture} site within ${STATE_WAIT} ms`,
  ).toBe(reached.want);
  return {
    base: reached.base,
    body: reached.body,
    where: `the ${fixture} fixture`,
  };
}

// ---------------------------------------------------------------------------------------------

/** W3's reads: the drawing's planks and lettering against its box, the viewport and any clip. */
export function drawingReads(page: Page, shown: string) {
  return page.evaluate(
    ({ plan, lettering, block, shown }) => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return el.getClientRects().length > 0 && (r.width > 0 || r.height > 0);
      };
      const edgesOf = (el: Element, by = 0) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - by,
          top: r.top - by,
          right: r.right + by,
          bottom: r.bottom + by,
        };
      };
      type E = ReturnType<typeof edgesOf>;
      const inside = (a: E, b: E) =>
        a.left >= b.left - 0.5 &&
        a.top >= b.top - 0.5 &&
        a.right <= b.right + 0.5 &&
        a.bottom <= b.bottom + 0.5;
      const meets = (a: E, b: E) =>
        a.left < b.right &&
        b.left < a.right &&
        a.top < b.bottom &&
        b.top < a.bottom;
      const host = document.querySelector(plan);
      const drawing = document.querySelector(shown);
      if (!host || !drawing) return null;
      const box = edgesOf(host);
      const view = {
        left: 0,
        top: 0,
        right: document.documentElement.clientWidth,
        bottom: innerHeight,
      };
      const planks = [...host.querySelectorAll("[data-plank]")].filter(visible);
      const texts = [...document.querySelectorAll(lettering)].filter(visible);
      const name = (el: Element) =>
        el.hasAttribute("data-plank")
          ? `plank ${el.getAttribute("data-plank")}`
          : `lettering "${(el.textContent ?? "").trim()}"`;
      const cut: string[] = [];
      for (const el of [...planks, ...texts]) {
        const e = edgesOf(el);
        if (!inside(e, box)) cut.push(`${name(el)} outside [data-plan]`);
        if (!inside(e, view)) cut.push(`${name(el)} outside the viewport`);
        // Anything that clips (overflow other than visible) between it and the body holds it whole.
        for (
          let a = el.parentElement;
          a && a !== document.body;
          a = a.parentElement
        ) {
          const s = getComputedStyle(a);
          if (s.overflowX === "visible" && s.overflowY === "visible") continue;
          if (!inside(e, edgesOf(a)))
            cut.push(
              `${name(el)} clipped by <${a.tagName.toLowerCase()}> (overflow ${s.overflowX} ${s.overflowY})`,
            );
        }
      }
      const dl = document.querySelector(block);
      const dlBox = dl ? edgesOf(dl) : null;
      const met = dlBox
        ? [
            ...planks
              .filter((p) => meets(dlBox, edgesOf(p, 24)))
              .map((p) => `${name(p)} (+24 px)`),
            ...texts.filter((t) => meets(dlBox, edgesOf(t))).map(name),
          ]
        : [];
      const d = drawing.getBoundingClientRect();
      return {
        planks: planks.length,
        texts: texts.length,
        cut,
        dl: dlBox,
        met,
        height: d.height,
        hostHeight: box.bottom - box.top,
      };
    },
    { plan: PLAN, lettering: LETTERING, block: BLOCK, shown },
  );
}

/**
 * B3.1's measure on a page held at `landed`: the canvas's silhouette against `.ln-outline` filled,
 * on the shown drawing, both read in the same page (B3.17's way), in CSS px.
 */
export async function registration(page: Page, width: number, dpr: number) {
  const drawing = drawingAt(width);
  const planBox = await box(page, drawing);
  const geometry = await hullOf(page, drawing);
  if (!planBox || !geometry) return null;
  const clip = whole(planBox);
  const svg = await outlineCoverage(page, clip, drawing);
  const model = await modelCoverage(page, clip);
  const [w, h] = [model.image.width, model.image.height];
  const cut = Math.round((geometry.limit - clip.x) * dpr);
  const d = hausdorff(
    edges(svg.alpha, w, h),
    edges(model.alpha, w, h),
    w,
    h,
    cut,
  );
  return { max: d.max / dpr, p99: d.p99 / dpr, a: d.a, b: d.b, clip };
}
