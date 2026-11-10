import {
  addressOf,
  drawnFor,
  GRID,
  HOME,
  isSwept,
  keyOf,
  OFF_GRID,
  RUN_WINDOWS,
  sizeOf,
  type Win,
} from "./trials";
import {
  answerOf,
  type COPY,
  cornerOf,
  depthOf,
  frameTitleOf,
  MEASURING,
  RECORD,
  settledOf,
  signedOf,
  type Trial,
  titleFor,
  trialAt,
  VERDICT,
} from "./trials-answer";

// The trials page's controller (.crew/sprint/64/contract.md, T10 to T14; .crew/sprint/64/spike.md;
// Iris's placement.md and words.md): the frame's corner drags, `/` reflows in the frame under the
// hand, and the contact links' freeboard is measured from the frame's own document as it goes. A
// release, a key or an edited size settles on a swept window (call 1): the page then shows the
// sweep's number and the record's answer for it (calls 2 and 3), replaces the address, and the
// live region says it once. The frame stays scriptless (call 4): this module sizes its box and
// reads its document. It loads on the first touch (components/trials-corner.tsx) and requests a
// frame only while a hand drags.

/** What the server hands the controller, read from content/ and the specs, which it never loads. */
export type Hands = {
  /** His name, for the window's title and the frame's. */
  name: string;
  /** The contact links' hrefs, as the freeboard's rule finds them in the title block. */
  links: readonly string[];
  /** Each check's link to its test at the build's commit, by its code. */
  hrefs: Readonly<Record<string, string>>;
  /** Copy link's words, which the corner's listener says. */
  copy: typeof COPY;
};

const { width: W, height: H } = GRID;
const clamp = (v: number, axis: typeof W | typeof H) =>
  Math.min(axis.to, Math.max(axis.from, Math.round(v)));

/**
 * The swept window a release or a key lands on (call 1): the window itself if it is swept; else a
 * pinned or named window within half a grid step of it on both sides, the nearest if several, so
 * 390 × 664 and 320 × 568 can be reached by hand; else the grid's rounding, as the addresses round.
 */
function settleOn([x, y]: Win): Win {
  const raw: Win = [clamp(x, W), clamp(y, H)];
  if (isSwept(raw)) return raw;
  let best: Win | undefined;
  let near = 3;
  for (const pin of OFF_GRID) {
    const dw = Math.abs(pin[0] - raw[0]) / (W.step / 2);
    const dh = Math.abs(pin[1] - raw[1]) / (H.step / 2);
    if (dw <= 1 && dh <= 1 && dw + dh < near) [best, near] = [pin, dw + dh];
  }
  return best ?? drawnFor(raw) ?? HOME;
}

/** The corner's keys (T12): one grid step, ten of height, or a corner of the grid. */
const KEYS: Record<string, (win: Win) => Win> = {
  ArrowLeft: ([w, h]) => [w - W.step, h],
  ArrowRight: ([w, h]) => [w + W.step, h],
  ArrowUp: ([w, h]) => [w, h - H.step],
  ArrowDown: ([w, h]) => [w, h + H.step],
  PageUp: ([w, h]) => [w, h - 10 * H.step],
  PageDown: ([w, h]) => [w, h + 10 * H.step],
  Home: () => [W.from, H.from],
  End: () => [W.to, H.to],
};

const RUN = new Set(RUN_WINDOWS.map(keyOf));

/**
 * A live measure to 0.1 by Ta's rule (the sweep's tenthOf, .crew/sprint/63/trials-sweep.mjs): a
 * window that sinks reads at least −0.1 and a near miss at most 0.9, so the sign and the kind read
 * as the unrounded value does (words.md, 3).
 */
function tenthOf(f: number) {
  const tenth = Math.round(f * 10) / 10;
  if (f < 0 && tenth >= 0) return -0.1;
  if (f >= 0 && f < 1 && tenth >= 1) return 0.9;
  return tenth;
}

/** Full motion, as / stores it (components/model.tsx), else the system's: only it eases. */
function full() {
  try {
    const mode = localStorage.getItem("theseus:motion");
    if (mode) return mode === "full";
  } catch {
    // Storage is blocked: the hints decide.
  }
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The page's parts the controller writes, found once. */
type Page = {
  hands: Hands;
  main: HTMLElement;
  drawing: HTMLElement;
  frame: HTMLIFrameElement;
  corner: HTMLElement;
  /** `[data-freeboard]`, the readout's number. */
  shown: HTMLElement;
  inputs: readonly HTMLInputElement[];
};

/** A drag in hand: where it began, the drawing's scale then, and the window under the hand now. */
type Drag = {
  id: number;
  x: number;
  y: number;
  scale: number;
  at: Win;
  /** Whether the hand has moved the window: a press with no movement isn't a settle. */
  moved: boolean;
};

let page: Page | undefined;
/** The settled window, whose address the page has. */
let rest: Win = HOME;
/** The window the frame is laid out at now: the one at rest, or the one under the hand. */
let placed: Win = HOME;
let drag: Drag | undefined;
/** A release waiting a frame to settle: no new drag or key until it has. */
let settling = false;
let frameAsked = 0;
let hand = { x: 0, y: 0 };

const one = (selector: string) => page?.main.querySelector(selector) ?? null;

function text(selector: string, value: string) {
  const node = one(selector);
  if (node) node.textContent = value;
}

function element(tag: string, className: string, value?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

/** The freeboard's rule (.crew/sprint/63/contract.md), read in the frame's document now. */
function measure({ frame, hands }: Page) {
  const doc = frame.contentDocument;
  const header = doc?.querySelector("main > header");
  if (!doc || !header || !frame.contentWindow) return undefined;
  const range = doc.createRange();
  let foot = Number.NEGATIVE_INFINITY;
  for (const href of hands.links) {
    const link = header.querySelector(`a[href="${href}"]`);
    if (!link) continue;
    range.selectNodeContents(link);
    for (const rect of range.getClientRects())
      foot = Math.max(foot, rect.bottom);
  }
  return foot > Number.NEGATIVE_INFINITY
    ? frame.contentWindow.innerHeight - foot
    : undefined;
}

/** The frame laid out at a window, and every number of its size with it (placement.md, 3). */
function place({ drawing, frame, inputs }: Page, [w, h]: Win) {
  placed = [w, h];
  drawing.style.setProperty("--w", String(w));
  drawing.style.setProperty("--h", String(h));
  frame.width = String(w);
  frame.height = String(h);
  text("[data-size]", sizeOf([w, h]));
  text(".trials-figure figcaption > span", sizeOf([w, h]));
  text(".trials-dim-w > span", String(w));
  text(".trials-dim-h > span", String(h));
  const [width, height] = inputs;
  if (width) width.value = String(w);
  if (height) height.value = String(h);
}

/** The freeboard drawn and read out: the sweep's at rest, the live measure in a hand (call 2). */
function mark(
  { drawing, shown }: Page,
  h: number,
  reading: Pick<Trial, "freeboard" | "kind">,
) {
  const f = reading.freeboard;
  drawing.style.setProperty("--fa", Math.min(1 - f / h, 1).toFixed(5));
  drawing.style.setProperty("--fs", (Math.abs(f) / h).toFixed(5));
  const signed = signedOf(reading);
  text(".trials-freeboard-label", signed);
  if (shown.firstElementChild)
    shown.firstElementChild.textContent = `${signed} px`;
  shown.setAttribute("data-freeboard", f.toFixed(1));
}

/** At the grab: the verdict's slot holds the marker and the answer its line (words.md, 3). */
function measuring({ shown }: Page, on: boolean) {
  const verdict = one("[data-verdict]");
  const answer = one("[data-answer]");
  verdict?.toggleAttribute("data-measuring", on);
  answer?.toggleAttribute("data-measuring", on);
  if (!on) return shown.removeAttribute("data-measure");
  shown.setAttribute("data-measure", "live");
  if (verdict) verdict.textContent = MEASURING.verdict;
  if (answer) answer.textContent = MEASURING.answer;
}

/** The answer, as the server writes it: its depth and the gap's margin each unbroken. */
function answer(trial: Trial) {
  const node = one("[data-answer]");
  if (!node) return;
  const { before, after, margin } = answerOf(trial);
  const nowrap = (value: string) => element("span", "whitespace-nowrap", value);
  node.setAttribute("data-kind", trial.kind);
  node.replaceChildren(
    before,
    nowrap(`${depthOf(trial)} px`),
    after,
    ...(margin ? [nowrap(margin.before), margin.after] : []),
  );
}

/** The record, as the server writes it: each check's rule linked to its test, or the one line. */
function record({ hands }: Page, trial: Trial) {
  const section = one("[aria-labelledby=trials-record]");
  const heading = section?.firstElementChild;
  if (!section || !heading) return;
  if (trial.rules.length === 0) {
    const note = element("p", "trials-note", RECORD.unclaimed);
    note.setAttribute("data-unclaimed", "");
    return section.replaceChildren(heading, note);
  }
  const list = element("ol", "trials-rules");
  for (const rule of trial.rules) {
    const item = document.createElement("li");
    item.setAttribute("data-rule", "");
    item.setAttribute("data-check", rule.code);
    const link = element("a", "trials-rule-link", rule.sentence);
    link.setAttribute("href", hands.hrefs[rule.code] ?? "");
    item.append(
      link,
      element("span", "trials-rule-sprint", `Sprint ${rule.sprint}`),
    );
    list.append(item);
  }
  section.replaceChildren(
    heading,
    element("p", "trials-note", RECORD.note),
    list,
  );
}

/** The crew's windows: the shown one current, and the run of one-pixel steps open if it's there. */
function windows({ main }: Page, key: string) {
  for (const link of main.querySelectorAll("a[data-window]")) {
    if (link.getAttribute("data-window") === key)
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const run = one(".trials-run");
  if (run instanceof HTMLDetailsElement && RUN.has(key)) run.open = true;
}

/**
 * A swept window, settled (placement.md, 3, "Once, at a settle"): the sweep's number, the record's
 * answer, the address, said once. `said` is false for a press that moved nothing, which restores
 * the page from its marker and says nothing (words.md, 4).
 */
function settle(win: Win, said = true) {
  const trial = trialAt(win);
  if (!page || !trial) return;
  const key = keyOf(win);
  const same = key === keyOf(rest) && key === keyOf(placed);
  // The window shown already, at rest: nothing to settle, and nothing to say.
  if (same && !page.shown.hasAttribute("data-measure")) return;
  rest = win;
  place(page, win);
  measuring(page, false);
  mark(page, win[1], trial);
  text("[data-verdict]", VERDICT[trial.kind]);
  answer(trial);
  if (!said) return;
  record(page, trial);
  windows(page, key);
  page.corner.setAttribute("aria-label", cornerOf(win));
  page.frame.title = frameTitleOf(win, page.hands.name);
  document.title = titleFor(trial, page.hands.name);
  const canonical = document.querySelector("link[rel=canonical]");
  const address = addressOf(win);
  if (canonical instanceof HTMLLinkElement)
    canonical.href = new URL(address, canonical.href).href;
  if (location.pathname !== address) history.replaceState(null, "", address);
  text("[data-copied]", "");
  text("[data-trials-live]", settledOf(trial));
}

/** The window under the hand: the grab's window plus the hand's travel at the grab's scale. */
const under = ({ x, y, scale }: Drag): Win => [
  clamp(rest[0] + (hand.x - x) / scale, W),
  clamp(rest[1] + (hand.y - y) / scale, H),
];

/** The live measure in the readout and the drawing, in Ta's format (words.md, 3). */
function live(target: Page, win: Win) {
  const f = measure(target);
  if (f !== undefined)
    mark(target, win[1], {
      freeboard: tenthOf(f),
      kind: f < 0 ? "under" : "afloat",
    });
}

/** One frame of a drag: the window under the hand, laid out in the frame and measured. */
function step() {
  frameAsked = 0;
  if (!page || !drag) return;
  const win = under(drag);
  if (keyOf(win) === keyOf(drag.at)) return;
  drag.at = win;
  drag.moved = true;
  place(page, win);
  live(page, win);
}

function begin(event: PointerEvent) {
  if (!page || drag || settling) return;
  // The drawing keeps the grab's scale, so the corner stays under the hand; it shrinks below that
  // only to stay inside the field (app/globals.css, --scale; placement.md, 3).
  const scale = page.frame.getBoundingClientRect().width / rest[0];
  hand = { x: event.clientX, y: event.clientY };
  drag = { id: event.pointerId, ...hand, scale, at: rest, moved: false };
  page.drawing.style.setProperty("--scale", String(scale));
  page.corner.setAttribute("data-dragging", "");
  measuring(page, true);
  live(page, rest);
}

/**
 * The release's re-fit, from the drag's scale to Ta's fit for the settled window: eased in Full
 * only, at most 180 ms from the frame's top left (placement.md, 3), by a transition on --scale
 * (app/globals.css), so it requests no frames of its own. Calm, Off and reduced motion snap.
 */
function refit({ drawing, frame }: Page, w: number) {
  const from = frame.getBoundingClientRect().width / w;
  drawing.style.removeProperty("--scale");
  const to = frame.getBoundingClientRect().width / w;
  if (!full() || Math.abs(to - from) < 0.002) return;
  drawing.style.setProperty("--scale", String(from));
  drawing.getBoundingClientRect();
  drawing.setAttribute("data-refit", "");
  drawing.style.setProperty("--scale", String(to));
  setTimeout(() => {
    drawing.removeAttribute("data-refit");
    drawing.style.removeProperty("--scale");
  }, 200);
}

function end(event: PointerEvent) {
  if (!page || !drag || event.pointerId !== drag.id) return;
  const { corner } = page;
  cancelAnimationFrame(frameAsked);
  frameAsked = 0;
  hand = { x: event.clientX, y: event.clientY };
  const { x, y, scale, moved } = drag;
  const win = moved
    ? settleOn([rest[0] + (hand.x - x) / scale, rest[1] + (hand.y - y) / scale])
    : rest;
  drag = undefined;
  settling = true;
  // Paint the release first and settle in the task after it: the settle lays the frame out
  // again, and done in pointerup's handler it would hold that event's next paint (T14).
  requestAnimationFrame(() =>
    setTimeout(() => {
      if (!page) return;
      settle(win, moved);
      refit(page, win[0]);
      corner.removeAttribute("data-dragging");
      settling = false;
    }),
  );
}

function key(event: KeyboardEvent) {
  const next = KEYS[event.key];
  if (!next || drag || settling) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  settle(settleOn(next(rest)));
}

/**
 * An edited size settles as the form's own address would (lib/trials.ts, goTo), in place. A step
 * of one, from an input's own arrows or spinner, goes on to the next swept window that way, or a
 * 1 px step from 1440 would snap straight back to it (placement.md, 3).
 */
function typed() {
  const [w, h] = page?.inputs ?? [];
  if (!w || !h || !w.checkValidity() || !h.checkValidity()) return false;
  const typed: Win = [Number(w.value), Number(h.value)];
  const [dw, dh] = [typed[0] - rest[0], typed[1] - rest[1]];
  if (Math.abs(dw) + Math.abs(dh) === 1)
    settle(settleOn([rest[0] + dw * W.step, rest[1] + dh * H.step]));
  else settle(drawnFor(typed) ?? rest);
  return true;
}

/** Takes the page over from the corner's listener, with the touch that woke it. */
export function start(hands: Hands, first: Event) {
  const main = document.getElementById("main");
  const drawing = main?.querySelector<HTMLElement>(".trials-drawing");
  const frame = main?.querySelector("iframe");
  const corner = main?.querySelector<HTMLElement>("[data-corner]");
  const shown = main?.querySelector<HTMLElement>("[data-freeboard]");
  const form = main?.querySelector(".trials-form");
  if (page || !main || !drawing || !frame || !corner || !shown || !form) return;
  const inputs = [
    ...main.querySelectorAll<HTMLInputElement>("input[name=w], input[name=h]"),
  ];
  page = { hands, main, drawing, frame, corner, shown, inputs };
  rest = placed =
    drawnFor([
      Number(drawing.style.getPropertyValue("--w")),
      Number(drawing.style.getPropertyValue("--h")),
    ]) ?? HOME;

  corner.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    corner.setPointerCapture(event.pointerId);
    begin(event);
  });
  corner.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    hand = { x: event.clientX, y: event.clientY };
    frameAsked ||= requestAnimationFrame(step);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    corner.addEventListener(type, (event) => end(event as PointerEvent));
  corner.addEventListener("keydown", key);
  for (const input of inputs) input.addEventListener("change", typed);
  form.addEventListener("submit", (event) => {
    if (typed()) event.preventDefault();
  });

  // The touch that loaded this: a drag already in hand, unless it let go while this loaded.
  if (first instanceof PointerEvent && first.type === "pointerdown") {
    if (corner.hasPointerCapture(first.pointerId)) begin(first);
    else corner.removeAttribute("data-dragging");
  }
}
