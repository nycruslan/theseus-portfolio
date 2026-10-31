import type { Page } from "@playwright/test";

// The 2D drawing as a browser has it, shared by plan.spec.ts (B1.4's seats and lettering) and
// live-layer.spec.ts (B4b's pencil plank and its number): moved here from plan.spec.ts unchanged.

export const PLAN = "[data-plan]";

type Rect = { left: number; top: number; right: number; bottom: number };

/** The drawing as a visitor's browser has it: its planks, its lettering and its rect. */
export async function readPlan(page: Page) {
  return page.evaluate((selector) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const box = (el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const plans = document.querySelectorAll(selector);
    const plan = plans[0];
    if (!plan) return null;
    const shown = (el: Element) =>
      el.getClientRects().length > 0 &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const geometry = (el: Element) =>
      el instanceof SVGGeometryElement
        ? [el]
        : [
            ...el.querySelectorAll(
              "path, polygon, rect, polyline, ellipse, circle",
            ),
          ].filter(
            (g): g is SVGGeometryElement => g instanceof SVGGeometryElement,
          );
    const svgs = [...plan.querySelectorAll("svg")].filter(shown);
    const planks = [...plan.querySelectorAll("[data-plank]")]
      .filter(shown)
      .map((el) => {
        const svg = el.closest("svg");
        const geo = geometry(el)[0];
        const s = geo ? getComputedStyle(geo) : null;
        const fill = s && rgba ? rgba(s.fill) : null;
        const alpha = s ? Number(s.fillOpacity) * Number(s.opacity) : 1;
        return {
          id: el.getAttribute("data-plank") ?? "",
          sprint: el.getAttribute("data-sprint"),
          box: box(el),
          svg: svg ? box(svg) : null,
          fill: fill
            ? [fill[0] ?? 0, fill[1] ?? 0, fill[2] ?? 0, (fill[3] ?? 1) * alpha]
            : null,
          fillValue: s?.fill ?? "",
        };
      });
    // Whether a screen point is in a plank's painted fill: inside its geometry and inside every
    // clipPath an ancestor applies (the planks are boxes cut by the hull's outline).
    const inPlank = (plank: Element, x: number, y: number) =>
      geometry(plank).some((g) => {
        const m = g.getScreenCTM();
        if (
          !m ||
          !g.isPointInFill(new DOMPoint(x, y).matrixTransform(m.inverse()))
        ) {
          return false;
        }
        for (
          let el: Element | null = g;
          el && el !== plan;
          el = el.parentElement
        ) {
          const ref = getComputedStyle(el).clipPath.match(
            /url\(["']?#([^"')]+)["']?\)/,
          )?.[1];
          const clip = ref ? document.getElementById(ref) : null;
          if (!ref) continue;
          const owner =
            el instanceof SVGGraphicsElement ? el.getScreenCTM() : null;
          if (!clip || !owner) return false;
          const local = new DOMPoint(x, y).matrixTransform(owner.inverse());
          if (!geometry(clip).some((c) => c.isPointInFill(local))) return false;
        }
        return true;
      });
    const shownPlanks = [...plan.querySelectorAll("[data-plank]")].filter(
      shown,
    );
    // Leaders (fix round 1, decision 5): each absolute-M subpath of a rendered path.ln-leader, its
    // two ends on screen, and the plank whose fill holds its far end.
    const leaders = [...plan.querySelectorAll("path.ln-leader")]
      .filter(
        (el): el is SVGPathElement => el instanceof SVGPathElement && shown(el),
      )
      .flatMap((leader) => {
        const m = leader.getScreenCTM();
        const svg = leader.ownerSVGElement;
        if (!m || !svg) return [];
        return (leader.getAttribute("d") ?? "")
          .split(/(?=M)/)
          .filter((d) => d.trim() !== "")
          .map((d) => {
            const probe = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            probe.setAttribute("d", d);
            svg.append(probe);
            const length = probe.getTotalLength();
            const [a, b] = [
              probe.getPointAtLength(0),
              probe.getPointAtLength(length),
            ];
            probe.remove();
            const start = new DOMPoint(a.x, a.y).matrixTransform(m);
            const end = new DOMPoint(b.x, b.y).matrixTransform(m);
            const into = shownPlanks.find((p) => inPlank(p, end.x, end.y));
            return { start, into: into?.getAttribute("data-plank") ?? null };
          });
      });
    const LEADER_GAP = 6;
    // Lettering: anything in the drawing that holds text of its own.
    const texts = [...plan.querySelectorAll("*")]
      .filter(
        (el) =>
          shown(el) &&
          [...el.childNodes].some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          ),
      )
      .map((el) => {
        const s = getComputedStyle(el);
        const svg = el instanceof SVGGraphicsElement;
        const ctm = svg ? el.getScreenCTM() : null;
        const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // The plank whose fill holds the lettering's centre.
        const on = shownPlanks.find((p) => inPlank(p, cx, cy));
        // The planks a leader joins it to: one that starts within a few px of its box.
        const led = leaders
          .filter(
            ({ start }) =>
              Math.max(r.left - start.x, 0, start.x - r.right) ** 2 +
                Math.max(r.top - start.y, 0, start.y - r.bottom) ** 2 <=
              LEADER_GAP ** 2,
          )
          .flatMap(({ into }) => (into ? [into] : []));
        return {
          text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
          color: rgba ? rgba(svg ? s.fill : s.color) : null,
          opacity: Number(svg ? s.fillOpacity : 1) * Number(s.opacity),
          size: Number.parseFloat(s.fontSize) * scale,
          on: on?.getAttribute("data-plank") ?? null,
          led,
        };
      });
    const focusable = plan.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]',
    ).length;
    return {
      count: plans.length,
      ariaHidden: plan.getAttribute("aria-hidden"),
      svgs: svgs.length,
      focusable,
      planks,
      texts,
      rect: box(plan),
      cw: document.documentElement.clientWidth,
    };
  }, PLAN);
}
