import type { Page } from "@playwright/test";
import { expected as crewExpected } from "./crew";
import { cellsOf, MERGED, ORDER, PLANK_IDS, SEATED } from "./retros";

// The oracle for B4b, the live layer on `/` (.crew/sprint/34/contract.md, "Data rules"), in this
// suite's own lines, never the page's reader: the state from B4a's oracle (crew.ts), the seats from
// the build's retros and ORDER (retros.ts), the row and the rest line from the fixture's answer.
// Iris's calls (.crew/sprint/34/notes-iris.md): the rest line is `/crew`'s resting status line,
// word for word, at the revision block's head; the block keeps five rows in every state.

export type Home = "live" | "open" | "resting" | "down";

const NONE = "—";
const WAITING_FOR_OWNER = "Waiting for owner";
export const DRAWING_NOW = "drawing now";
/** The block's rows in every state (Iris's call 1: no row trade). */
export const ROWS_SHOWN = 5;

const ROSTER = [
  "lead",
  "product-owner",
  "engineer",
  "creative-engineer",
  "code-reviewer",
  "qa-engineer",
  "design-director",
];
const AGENT_STATES = ["working", "waiting", "done", "not-called"];

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The told run's roles by B4a's rule: a known key and state, the first entry per key. */
function rolesOf(run: Json) {
  const states = new Map<string, string>();
  for (const entry of Array.isArray(run.roles) ? run.roles : []) {
    if (!isObject(entry)) continue;
    const { role, state } = entry;
    if (typeof role !== "string" || typeof state !== "string") continue;
    if (!ROSTER.includes(role) || !AGENT_STATES.includes(state)) continue;
    if (!states.has(role)) states.set(role, state);
  }
  return states;
}

/**
 * The pencil seat for sprint n: the seat n's retro holds when the build has it (ORDER[i mod 22],
 * i its index in the ascending retros), else the next seat, ORDER[k mod 22].
 */
export function pencilSeat(n: number) {
  const i = MERGED.findIndex((retro) => retro.sprint === n);
  return ORDER[(i >= 0 ? i : MERGED.length) % ORDER.length] ?? "";
}

export type Row = {
  rev: string;
  description: string;
  drawn: string;
  checked: string;
  tested: string;
  approved: string;
};

export type Layer = {
  home: Home;
  /** The in-progress sprint (live and open). */
  n: number | null;
  seat: string | null;
  /** Each seat's data-sprint as `/` must show it: null for an original plank. */
  seats: Record<string, string | null>;
  /** The pencil row's cells (Description without "drawing now"), and its link's text. */
  pencilRow: (Row & { link: string }) | null;
  /** Every row's six cells, the pencil row first while in progress. */
  rows: string[][];
  rest: string | null;
  /** The legend's `li[data-key]`s, in order. */
  keys: string[];
};

const rowCells = (row: Row) => [
  row.rev,
  row.description,
  row.drawn,
  row.checked,
  row.tested,
  row.approved,
];

const SEATS_TODAY: Record<string, string | null> = Object.fromEntries(
  PLANK_IDS.map((id) => [
    id,
    SEATED[id] === undefined ? null : String(SEATED[id]),
  ]),
);

/** What `/` must show for the feed answer `feed` (null: no feed URL), served from `origin`. */
export function layerFor(feed: unknown, origin: string | null): Layer {
  const crew = crewExpected(feed, origin);
  const newest = [...MERGED].reverse();
  const today: Layer = {
    home: "down",
    n: null,
    seat: null,
    seats: SEATS_TODAY,
    pencilRow: null,
    rows: newest.slice(0, ROWS_SHOWN).map((r) => rowCells(cellsOf(r))),
    rest: null,
    keys: [],
  };
  if (crew.state === "down" || !isObject(feed)) return today;
  if (crew.state === "resting") {
    return { ...today, home: "resting", rest: crew.status };
  }
  const run = feed.current;
  if (!isObject(run)) return today;
  const n = typeof run.sprint === "number" ? run.sprint : null;
  if (n === null) return today;
  const live = crew.state === "live";
  const roles = rolesOf(run);
  const took = (key: string) =>
    ["working", "waiting", "done"].includes(roles.get(key) ?? "");
  const builders = [
    ["engineer", "Forge"],
    ["creative-engineer", "Pixel"],
  ].filter(([key]) => took(key ?? ""));
  const designers = [
    ["design-director", "Iris"],
    ["product-owner", "Quill"],
  ].filter(([key]) => took(key ?? ""));
  const drawn = (builders.length > 0 ? builders : designers).map(
    ([, name]) => name,
  );
  const health = isObject(run.health) ? run.health.state : null;
  const goal = typeof run.goal === "string" ? run.goal : null;
  const link = goal ?? "In progress";
  const pencilRow = {
    rev: String(n),
    description: link,
    link,
    drawn: drawn.length > 0 ? drawn.join(", ") : NONE,
    checked: roles.get("code-reviewer") === "done" ? "Lens" : NONE,
    tested: roles.get("qa-engineer") === "done" ? "Probe" : NONE,
    approved: !live && health === "waiting" ? WAITING_FOR_OWNER : NONE,
  };
  const seat = pencilSeat(n);
  return {
    home: live ? "live" : "open",
    n,
    seat,
    seats: { ...SEATS_TODAY, [seat]: String(n) },
    pencilRow,
    rows: [
      rowCells(pencilRow),
      ...newest
        .filter((r) => r.sprint !== n)
        .slice(0, ROWS_SHOWN - 1)
        .map((r) => rowCells(cellsOf(r))),
    ],
    rest: null,
    keys: live ? ["pencil", "copper"] : ["pencil"],
  };
}

// ---------------------------------------------------------------------------------------------
// What `/` shows

export const REVISIONS = 'section[aria-labelledby="revisions"]';

/** The layer's hooks on the page, counted. */
export function hooks(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      [
        "data-pencil",
        "data-live",
        "data-tip",
        "data-drawing",
        "data-rest",
        "data-key",
        "data-crew-state",
      ].map((name) => [name, document.querySelectorAll(`[${name}]`).length]),
    ),
  );
}

/** Both drawings' planks in the DOM, by view: seat, data-sprint, class and the pencil's hooks. */
export function planksByView(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-plan] .plan-view")].map((view) => ({
      view:
        [...view.classList].find((c) => /^plan-(wide|narrow)$/.test(c)) ?? "",
      planks: [...view.querySelectorAll("path[data-plank]")].map((p) => ({
        id: p.getAttribute("data-plank") ?? "",
        sprint: p.getAttribute("data-sprint"),
        className: p.getAttribute("class") ?? "",
        pencil: p.hasAttribute("data-pencil"),
        live: p.hasAttribute("data-live"),
      })),
      tips: [...view.querySelectorAll("[data-tip]")].map((t) => ({
        inSvg: Boolean(t.closest("svg")),
      })),
    })),
  );
}

/** The revision block as shown: the rest line, each row's cells and parts, and the legend. */
export function revisionBlock(page: Page) {
  return page.evaluate((selector) => {
    const squash = (el: Element | null | undefined) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const box = (el: Element | null | undefined) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const block = document.querySelector(selector);
    const table = block?.querySelector("table");
    const rows = [...(block?.querySelectorAll("table tbody tr") ?? [])];
    const legend = [...(block?.querySelectorAll("ul") ?? [])].find((ul) =>
      /Original/.test(ul.textContent ?? ""),
    );
    const rest = block?.querySelector("p[data-rest]");
    return {
      rest: [...document.querySelectorAll("[data-rest]")].map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: squash(el),
        inBlock: Boolean(block?.contains(el)),
        beforeTable: Boolean(
          table &&
            el.compareDocumentPosition(table) &
              Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        box: box(el),
      })),
      restBox: box(rest),
      rows: rows.map((tr) => {
        const description = tr.children[1];
        const links = [...tr.querySelectorAll("a[href]")];
        const drawing = tr.querySelector("[data-drawing]");
        return {
          pencil: tr.hasAttribute("data-pencil"),
          live: tr.hasAttribute("data-live"),
          // Each cell's text without "drawing now", which the drawing hook reports on its own.
          cells: [...tr.querySelectorAll(":scope > th, :scope > td")].map(
            (c) => {
              const copy = c.cloneNode(true) as Element;
              for (const d of copy.querySelectorAll("[data-drawing]"))
                d.remove();
              return squash(copy);
            },
          ),
          rowHeader: tr.firstElementChild?.matches('th[scope="row"]') ?? false,
          labels: [...tr.querySelectorAll(":scope > td[data-label]")].map(
            (td) => ({
              label: td.getAttribute("data-label"),
              translate: td.getAttribute("translate"),
            }),
          ),
          links: links.map((a) => ({
            href: a.getAttribute("href"),
            text: squash(a),
            inDescription: Boolean(description?.contains(a)),
            height: a.getBoundingClientRect().height,
            width: a.getBoundingClientRect().width,
          })),
          drawing: drawing
            ? {
                text: squash(drawing),
                inDescription: Boolean(description?.contains(drawing)),
                box: box(drawing),
                // Shown whole: not cut by an ancestor that clips, up to the row.
                clipped: (() => {
                  const d = drawing.getBoundingClientRect();
                  for (
                    let el: Element | null = drawing.parentElement;
                    el && el !== tr.parentElement;
                    el = el.parentElement
                  ) {
                    const s = getComputedStyle(el);
                    if (s.overflowX === "visible" && s.overflowY === "visible")
                      continue;
                    const r = el.getBoundingClientRect();
                    if (
                      d.left < r.left - 0.5 ||
                      d.right > r.right + 0.5 ||
                      d.top < r.top - 0.5 ||
                      d.bottom > r.bottom + 0.5
                    )
                      return `<${el.tagName.toLowerCase()}> clips it`;
                  }
                  return null;
                })(),
              }
            : null,
          box: box(tr),
        };
      }),
      legend: [...(legend?.querySelectorAll(":scope > li") ?? [])].map((li) => {
        const swatch = li.querySelector("[aria-hidden]");
        const s = swatch ? getComputedStyle(swatch) : null;
        return {
          key: li.getAttribute("data-key"),
          text: squash(li),
          swatch: s
            ? {
                background: s.backgroundColor,
                image: s.backgroundImage,
                border: s.borderTopStyle,
                borderColor: s.borderTopColor,
              }
            : null,
        };
      }),
      legendText: squash(legend),
    };
  }, REVISIONS);
}

export type Hit = {
  zone: "layer" | "other";
  /** The layer's part it sits in: the tip, "drawing now" (and its dot) or the copper swatch. */
  part: "tip" | "drawing" | "swatch" | null;
  where: string;
  property: string;
  text: string;
};

/**
 * Every element on `/` painted in `accent` ([r, g, b, a]; B1.6's properties: text colour where it
 * shows text, background, borders, outline, decoration, fill and stroke, pseudo-elements included),
 * and whether it is the layer's copper: `[data-drawing]` and its dot, a `[data-tip]` or the copper
 * swatch. Needs installRgba as an init script.
 */
export function copperOnHome(page: Page, accent: number[]) {
  return page.evaluate((target) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    if (!rgba)
      return [
        {
          zone: "other",
          part: null,
          where: "page",
          property: "no __rgba",
          text: "",
        },
      ];
    const same = (value: string) => {
      const c = rgba(value);
      return Boolean(
        c?.every(
          (v, i) => Math.abs(v - (target[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
        ),
      );
    };
    const ownText = (el: Element) =>
      [...el.childNodes].some(
        (n) =>
          n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
    const hits: Hit[] = [];
    for (const el of [
      document.documentElement,
      ...document.body.querySelectorAll("*"),
    ]) {
      if (el.getClientRects().length === 0 && el !== document.documentElement)
        continue;
      const part: Hit["part"] = el.closest("[data-tip]")
        ? "tip"
        : el.closest("[data-drawing]")
          ? "drawing"
          : el.closest('li[data-key="copper"]')
            ? "swatch"
            : null;
      const layer = part !== null;
      const name = `<${el.tagName.toLowerCase()}${el.hasAttribute("data-plank") ? ` data-plank="${el.getAttribute("data-plank")}"` : ""}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
      for (const pseudo of [null, "::before", "::after"] as const) {
        const s = getComputedStyle(el, pseudo);
        if (pseudo && ["none", "normal"].includes(s.content)) continue;
        const check = (property: string, value: string, painted = true) => {
          if (painted && same(value))
            hits.push({
              zone: layer ? "layer" : "other",
              part,
              where: `${name}${pseudo ?? ""}`,
              property,
              text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
            });
        };
        check(
          "color",
          s.color,
          pseudo !== null || ownText(el) || el.tagName === "A",
        );
        check("background-color", s.backgroundColor);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          check(
            `border-${side.toLowerCase()}-color`,
            s[`border${side}Color`],
            s[`border${side}Style`] !== "none" &&
              Number.parseFloat(s[`border${side}Width`]) > 0,
          );
        }
        check(
          "outline-color",
          s.outlineColor,
          s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0,
        );
        check(
          "text-decoration-color",
          s.textDecorationColor,
          s.textDecorationLine !== "none",
        );
        if (el instanceof SVGElement && !pseudo) {
          check("fill", s.fill, s.fill !== "none");
          check("stroke", s.stroke, s.stroke !== "none");
        }
      }
    }
    return hits;
  }, accent);
}

/** The pencil plank's paint in the shown drawing, and `--pencil` as rgba. */
export function pencilPaint(page: Page) {
  return page.evaluate(() => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const probe = document.createElement("div");
    probe.style.color = "var(--pencil)";
    document.body.append(probe);
    const pencil = getComputedStyle(probe).color;
    probe.remove();
    const card = document.createElement("div");
    card.style.color = "var(--card)";
    document.body.append(card);
    const cardColor = getComputedStyle(card).color;
    card.remove();
    return [...document.querySelectorAll("[data-plan] .plan-view")]
      .filter((view) => view.getClientRects().length > 0)
      .flatMap((view) =>
        [...view.querySelectorAll("path[data-plank][data-pencil]")].map((p) => {
          const s = getComputedStyle(p);
          return {
            stroke: rgba ? rgba(s.stroke) : null,
            pencil: rgba ? rgba(pencil) : null,
            dash: s.strokeDasharray,
            strokeWidth: Number.parseFloat(s.strokeWidth),
            fill: s.fill,
            card: cardColor,
            flat: rgba ? rgba(s.fill) : null,
          };
        }),
      );
  });
}
