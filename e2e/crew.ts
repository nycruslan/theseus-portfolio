import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { profile } from "../content/profile";
import { MERGED } from "./retros";

// The oracle for /crew (.crew/sprint/31/contract.md, "Data rules"), implemented from the
// contract's words with this file's own lines, never by importing the page's reader. It reads the
// answer the fixture server sent (Feed.body) and the retros in the checkout under test.

export type CrewState = "live" | "open" | "resting" | "down";

/** The roster: key, name and role word, in roster order. */
const ROSTER = [
  ["lead", "Atlas", "Lead"],
  ["product-owner", "Quill", "Roadmap"],
  ["engineer", "Forge", "Code"],
  ["creative-engineer", "Pixel", "Motion"],
  ["code-reviewer", "Lens", "Review"],
  ["qa-engineer", "Probe", "Tests"],
  ["design-director", "Iris", "Design"],
] as const;

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
const WORDS = ["Working", "Waiting", "Done", "Not on this sprint"] as const;
const OWNER = profile.name;
const PR_PAGE =
  /^https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/(\d+)$/;
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

const STATUS_DOWN =
  "The live feed isn't answering. Here is the latest revision on record.";
export const RULES =
  "Only real events from the crew's sessions, as they happen. Its briefs and words are public; credentials are masked before anything is stored. Visitors watch: they can't start or steer the crew.";
const CLOSE_OUT = "The pull request opens at the end of the sprint.";
const APPROVAL_LIVE = `Not given yet. The pull request merges only after the checks, Lens's review and ${OWNER}'s rules pass; what his rules leave to him waits for him.`;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown) => (typeof value === "string" ? value : null);

/** "HH:MM" in UTC, 24-hour, zero-padded. */
const hhmm = (at: number) => new Date(at).toISOString().slice(11, 16);
/** "{d Mon}" in UTC: the day without a leading zero, the English three-letter month. */
const dayMon = (at: number) => {
  const d = new Date(at);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** The shape check: true when the answer is down by the data rules' list (the clock at `now`). */
function isDown(feed: unknown, now: number) {
  if (!isObject(feed) || feed.version !== 1) return true;
  const asOf = typeof feed.asOf === "string" ? Date.parse(feed.asOf) : NaN;
  if (Number.isNaN(asOf) || now - asOf > 600_000) return true;
  for (const part of [feed.current, feed.last]) {
    if (part === null) continue;
    if (
      !isObject(part) ||
      typeof part.live !== "boolean" ||
      !Array.isArray(part.roles) ||
      !Array.isArray(part.moments) ||
      !isObject(part.health) ||
      typeof part.health.state !== "string"
    ) {
      return true;
    }
  }
  return feed.current === null && feed.last === null;
}

/** The record: the newest merged retro, with its PR from its file. */
function record() {
  const newest = MERGED.at(-1);
  if (!newest) throw new Error("no merged retro");
  const file = join(
    process.cwd(),
    ".crew",
    "sprint",
    String(newest.sprint),
    "retro.json",
  );
  const raw = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as Json)
    : {};
  const pr =
    typeof raw.pr === "number" && Number.isInteger(raw.pr) && raw.pr > 0
      ? raw.pr
      : null;
  return { ...newest, pr };
}

export type Row = { name: string; role: string; state: string; line: string };
export type Moment = {
  kind: string;
  datetime: string;
  shown: string;
  text: string;
};
export type Expected = {
  state: CrewState;
  status: string;
  chip: string;
  rows: Row[];
  /** [data-now]'s text, squashed, and whether it quotes (one q holding `quoted`). */
  now: { text: string; quoted: string | null } | null;
  heading: string | null;
  moments: Moment[];
  /** Evidence's links, as [text, href], and its PR item's words when it isn't linked. */
  links: [string, string][];
  evidenceText: string[];
  approval: string;
  rules: string;
};

function approvalAt(sprint: number | null) {
  const retro = MERGED.find((r) => r.sprint === sprint);
  if (!retro) return "Merged.";
  return retro.ownersCall
    ? `${OWNER}, on the pull request.`
    : `Merged behind the checks, Lens's review and ${OWNER}'s rules.`;
}

/**
 * What /crew must show for the feed answer `feed` (null: no feed URL), served from `origin` (the
 * feed URL's origin), judged at `clock`.
 */
export function expected(
  feed: unknown,
  origin: string | null,
  clock = Date.now(),
): Expected {
  if (feed === null || origin === null || isDown(feed, clock)) {
    const r = record();
    return {
      state: "down",
      status: STATUS_DOWN,
      chip: `${r.sprint} ${r.goal}`,
      rows: ROSTER.map(([, name, role]) => ({
        name,
        role,
        state: "",
        line: "",
      })),
      now: null,
      heading: null,
      moments: [],
      links:
        r.pr === null
          ? []
          : [
              [
                `Pull request #${r.pr}`,
                `https://github.com/nycruslan/theseus-portfolio/pull/${r.pr}`,
              ],
            ],
      evidenceText: r.pr === null ? [] : [`Pull request #${r.pr}`],
      approval: approvalAt(r.sprint),
      rules: RULES,
    };
  }
  const answer = feed as Json;
  const current = answer.current as Json | null;
  const run = (current ?? answer.last) as Json;
  const state: CrewState = current
    ? current.live === true
      ? "live"
      : "open"
    : "resting";
  const health = run.health as Json;
  const sprint = typeof run.sprint === "number" ? run.sprint : null;
  // A blank goal is no goal (.crew/sprint/35/contract.md, "The read"): the string whole otherwise.
  const goal = str(run.goal)?.trim() ? str(run.goal) : null;

  // The roles: the first valid entry per key.
  const entries = new Map<string, { state: string; line: string | null }>();
  for (const entry of run.roles as unknown[]) {
    if (!isObject(entry)) continue;
    const key = str(entry.role);
    const agentState = str(entry.state);
    if (
      !key ||
      !ROSTER.some(([k]) => k === key) ||
      !agentState ||
      !AGENT_STATES.includes(agentState) ||
      entries.has(key)
    ) {
      continue;
    }
    entries.set(key, { state: agentState, line: str(entry.line) });
  }
  const word = (agentState: string | undefined) => {
    if (!agentState || agentState === "not-called") return WORDS[3];
    if (agentState === "done") return WORDS[2];
    if (state === "resting") return WORDS[2];
    if (agentState === "waiting" || state === "open") return WORDS[1];
    return WORDS[0];
  };
  const rows = ROSTER.map(([key, name, role]) => {
    const entry = entries.get(key);
    return {
      name,
      role,
      state: word(entry?.state),
      line: entry?.line ?? "",
    };
  });
  const rank = (row: Row) => WORDS.indexOf(row.state as (typeof WORDS)[number]);
  // Array.prototype.sort is stable, so roster order holds within a state.
  rows.sort((a, b) => rank(a) - rank(b));

  // The moments: valid ones, newest first (ties keep the feed's order), at most 10.
  const valid = (run.moments as unknown[]).flatMap((m) => {
    if (!isObject(m)) return [];
    const kind = str(m.kind);
    const at = typeof m.at === "string" ? Date.parse(m.at) : NaN;
    const text = str(m.text);
    if (!kind || !KINDS.includes(kind) || Number.isNaN(at) || !text) return [];
    return [{ kind, at, text }];
  });
  valid.sort((a, b) => b.at - a.at);
  const shown = valid.slice(0, 10);
  const day = shown[0] ? dayMon(shown[0].at) : null;
  const moments = shown.map((m) => ({
    kind: m.kind,
    datetime: new Date(m.at).toISOString(),
    shown: dayMon(m.at) === day ? hhmm(m.at) : `${dayMon(m.at)} ${hhmm(m.at)}`,
    text: m.text,
  }));

  const nowText = str(current?.now);
  const now =
    state === "live" && nowText
      ? health.quote === true && nowText === str(health.line)
        ? { text: `now Atlas: ${nowText}`, quoted: nowText }
        : { text: `now ${nowText}`, quoted: null }
      : null;

  const links: [string, string][] = [];
  const evidenceText: string[] = [];
  const url = str(run.url);
  if (url) {
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol === "https:" &&
        parsed.origin === origin &&
        parsed.pathname.startsWith("/studio/runs/")
      ) {
        links.push(["This run on the Studio", url]);
        evidenceText.push("This run on the Studio");
      }
    } catch {
      // Not a URL: nothing.
    }
  }
  const pr = isObject(run.pr) ? run.pr : null;
  if (pr && typeof pr.number === "number") {
    const words = `Pull request #${pr.number}`;
    evidenceText.push(words);
    const match = str(pr.url)?.match(PR_PAGE);
    if (match && Number(match[1]) === pr.number) {
      links.push([words, str(pr.url) ?? ""]);
    }
  } else if (state !== "resting") {
    evidenceText.push(CLOSE_OUT);
  }

  let status = "Live";
  let approval = APPROVAL_LIVE;
  if (state === "open") {
    const waiting = health.state === "waiting";
    // Iris's word since sprint 35 (.crew/sprint/35/contract.md, "The status words").
    status = waiting ? "Waiting on the owner" : "Between sessions";
    approval = waiting
      ? `${OWNER}, on the pull request. Not given yet.`
      : APPROVAL_LIVE;
  } else if (state === "resting") {
    const merged =
      typeof run.mergedAt === "string" ? Date.parse(run.mergedAt) : NaN;
    status =
      sprint === null
        ? "Crew resting."
        : Number.isNaN(merged)
          ? `Crew resting. Sprint ${sprint} merged.`
          : `Crew resting. Sprint ${sprint} merged ${dayMon(merged)}, ${hhmm(merged)} UTC.`;
    approval = approvalAt(sprint);
  }

  return {
    state,
    status,
    chip: [sprint === null ? "" : String(sprint), goal ?? ""]
      .filter(Boolean)
      .join(" "),
    rows,
    now,
    heading: day ? `Activity, ${day} (UTC)` : null,
    moments,
    links,
    evidenceText,
    approval,
    rules: RULES,
  };
}

/** What the panel shows, in the shape of Expected, read from the DOM (scripts on or off). */
export function readPanel(page: Page) {
  return page.evaluate(() => {
    const squashed = (text: string | null | undefined) =>
      (text ?? "").replace(/\s+/g, " ").replace(/[‘’]/g, "'").trim();
    const panel = document.querySelector('section[aria-labelledby="crew"]');
    // A hook may sit on a dd or on a group holding its dt: the label word is not the value.
    const value = (selector: string, label: string) => {
      const el = panel?.querySelector(selector);
      if (!el) return null;
      const text = squashed(el.textContent);
      return text.startsWith(`${label} `) ? text.slice(label.length + 1) : text;
    };
    const now = panel?.querySelector("[data-now]");
    const evidence = panel?.querySelector("[data-evidence]");
    return {
      panels: document.querySelectorAll('section[aria-labelledby="crew"]')
        .length,
      state: panel?.getAttribute("data-crew-state") ?? null,
      h1: squashed(document.querySelector("h1")?.textContent),
      statuses: document.querySelectorAll("[data-status]").length,
      status: squashed(panel?.querySelector("[data-status]")?.textContent),
      chip: squashed(panel?.querySelector("[data-chip]")?.textContent),
      rows: [...(panel?.querySelectorAll("table tr") ?? [])]
        .filter((tr) => tr.querySelector('th[scope="row"]'))
        .map((tr) => {
          const cells = [...tr.querySelectorAll("td")];
          const stateCell = tr.querySelector("td[data-state]");
          const at = stateCell
            ? cells.indexOf(stateCell as HTMLTableCellElement)
            : -1;
          return {
            name: squashed(tr.querySelector("th")?.textContent),
            role: squashed(cells[0] === stateCell ? "" : cells[0]?.textContent),
            state: squashed(stateCell?.textContent),
            line: squashed(at >= 0 ? cells[at + 1]?.textContent : ""),
          };
        }),
      now: now
        ? {
            text: squashed(now.textContent),
            quotes: [...now.querySelectorAll("q")].map((q) =>
              squashed(q.textContent),
            ),
            beforeList: Boolean(
              panel?.querySelector("ol[data-moments]") &&
                now.compareDocumentPosition(
                  panel.querySelector("ol[data-moments]") as Element,
                ) & Node.DOCUMENT_POSITION_FOLLOWING,
            ),
          }
        : null,
      nows: document.querySelectorAll("[data-now]").length,
      heading:
        [...(panel?.querySelectorAll("h2") ?? [])]
          .map((h) => squashed(h.textContent))
          .find((t) => t.startsWith("Activity")) ?? null,
      lists: panel?.querySelectorAll("ol[data-moments]").length ?? 0,
      moments: [
        ...(panel?.querySelectorAll("ol[data-moments] > li") ?? []),
      ].map((li) => {
        const time = li.querySelector("time");
        const shown = squashed(time?.textContent);
        const all = squashed(li.textContent);
        return {
          kind: li.getAttribute("data-kind") ?? "",
          datetime: time?.getAttribute("datetime") ?? "",
          shown,
          text: all.startsWith(shown) ? all.slice(shown.length).trim() : all,
        };
      }),
      links: [...(evidence?.querySelectorAll("a") ?? [])].map(
        (a) =>
          [squashed(a.textContent), a.getAttribute("href") ?? ""] as [
            string,
            string,
          ],
      ),
      evidence: squashed(evidence?.textContent),
      approval: value("[data-approval]", "Approval"),
      rules: value("[data-rules]", "Rules"),
      bold: panel?.querySelectorAll("b").length ?? -1,
    };
  });
}

/**
 * Every painted property on the page that resolves to `accent` ([r, g, b, a]): text colour (where
 * the element shows text), background, borders, outline, text decoration, fill and stroke, pseudo-
 * elements included. `allowed` when it sits in a Working row's state cell or in [data-now]; `layer`
 * when it is B4b's copper on `/`.
 * Needs installRgba as an init script.
 */
export function copperPaint(page: Page, accent: number[]) {
  return page.evaluate((target) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    if (!rgba)
      return [
        { where: "page", property: "no __rgba", allowed: false, layer: false },
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
    const working = (el: Element) => {
      const cell = el.closest("td[data-state]");
      return Boolean(
        cell &&
          (cell.textContent ?? "").replace(/\s+/g, " ").trim() === "Working",
      );
    };
    const hits: {
      where: string;
      property: string;
      allowed: boolean;
      layer: boolean;
    }[] = [];
    for (const el of [
      document.documentElement,
      ...document.body.querySelectorAll("*"),
    ]) {
      if (el.getClientRects().length === 0 && el !== document.documentElement)
        continue;
      const allowed = working(el) || Boolean(el.closest("[data-now]"));
      // B4b's copper on / (.crew/sprint/34/contract.md, "Copper on /"): "drawing now" and its dot,
      // the tips and the copper swatch itself, not the legend's words beside it (Lens on 415b4c0).
      const layer = Boolean(
        el.closest(
          '[data-drawing], [data-tip], li[data-key="copper"] .swatch-tip',
        ),
      );
      const name = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
      for (const pseudo of [null, "::before", "::after", "::marker"] as const) {
        const s = getComputedStyle(el, pseudo);
        if (
          pseudo &&
          pseudo !== "::marker" &&
          ["none", "normal"].includes(s.content)
        )
          continue;
        if (pseudo === "::marker" && el.tagName !== "LI") continue;
        const where = `${name}${pseudo ?? ""}`;
        const check = (property: string, value: string, painted = true) => {
          if (painted && same(value))
            hits.push({ where, property, allowed, layer });
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

/**
 * Each visible text's contrast against the background painted behind it (the nearest ancestor
 * with an opaque-enough background, else the page's), and the floor WCAG sets for its size:
 * 3:1 from 24 px, or 18.66 px bold; 4.5:1 below.
 */
export function textContrast(page: Page) {
  return page.evaluate(() => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    if (!rgba) return [{ text: "no __rgba", ratio: 0, floor: 4.5 }];
    const lum = (c: number[]) => {
      const ch = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return (
        0.2126 * ch(c[0] ?? 0) + 0.7152 * ch(c[1] ?? 0) + 0.0722 * ch(c[2] ?? 0)
      );
    };
    const over = (top: number[], bottom: number[]) => {
      const a = top[3] ?? 1;
      return [0, 1, 2].map(
        (i) => (top[i] ?? 0) * a + (bottom[i] ?? 0) * (1 - a),
      );
    };
    const page_ = rgba(getComputedStyle(document.body).backgroundColor) ??
      rgba(getComputedStyle(document.documentElement).backgroundColor) ?? [
        255, 255, 255, 1,
      ];
    const groundOf = (el: Element) => {
      const layers: number[][] = [];
      for (let a: Element | null = el; a; a = a.parentElement) {
        const c = rgba(getComputedStyle(a).backgroundColor);
        if (c) layers.push(c);
        if (c && (c[3] ?? 0) >= 0.99) break;
      }
      let ground = [...page_.slice(0, 3)];
      for (const layer of layers.reverse()) ground = over(layer, ground);
      return ground;
    };
    return [...document.body.querySelectorAll("*")]
      .filter(
        (el) =>
          el.getClientRects().length > 0 &&
          !el.closest("[data-plan]") &&
          [...el.childNodes].some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          ),
      )
      .map((el) => {
        const s = getComputedStyle(el);
        const ground = groundOf(el);
        const ink = over(rgba(s.color) ?? [0, 0, 0, 1], ground);
        const [hi, lo] = [lum(ink), lum(ground)].sort((x, y) => y - x);
        const size = Number.parseFloat(s.fontSize);
        const large =
          size >= 24 ||
          (size >= 18.66 && Number.parseInt(s.fontWeight, 10) >= 700);
        return {
          text: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
          ratio: ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05),
          floor: large ? 3 : 4.5,
        };
      });
  });
}
