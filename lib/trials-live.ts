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
// frame only while a hand drags or a tap settles. Tc (.crew/sprint/65/contract.md, T18 and T21;
// decisions.md, 4) adds the chart under it: a tap tries a window in place, the ring follows the
// frame, and the fits the frame's document enters are stamped and found for the visit.

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
  /** The chart's plot, whose user units are window px (.crew/sprint/65/decisions.md, 4). */
  plot: SVGGraphicsElement | null;
  /** `circle[data-ring]`, at the window the frame is laid out at. */
  ring: Element | null;
};

/** The visit's found fits, as digits: sessionStorage's one key (T21), the loader's too. */
const FOUND = "theseus:found";

/** A drag in hand: where it began, the drawing's scale then, and the window under the hand now. */
type Drag = {
  id: number;
  x: number;
  y: number;
  scale: number;
  at: Win;
};

let page: Page | undefined;
/** The settled window: the address, the canonical and Copy link name it. */
let rest: Win = HOME;
/** The window the frame is laid out at now: the one at rest, or the one under the hand. */
let placed: Win = HOME;
let drag: Drag | undefined;
/** A release waiting a frame to settle: no new drag or key until it has. */
let settling = false;
let frameAsked = 0;
/** The re-fit's end, pending for 200 ms after a release: a grab in that time cancels it. */
let refitting: ReturnType<typeof setTimeout> | undefined;
/** The address's writes left to make at once, when they were counted, and a write held back. */
let writes = 8;
let counted = 0;
let held: ReturnType<typeof setTimeout> | undefined;
let hand = { x: 0, y: 0 };
/** Fits found since the last settle that spoke: its one message names them (T21). */
let news: HTMLElement[] = [];

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
function place({ drawing, frame, inputs, ring }: Page, [w, h]: Win) {
  placed = [w, h];
  drawing.style.setProperty("--w", String(w));
  drawing.style.setProperty("--h", String(h));
  frame.width = String(w);
  frame.height = String(h);
  // The chart's ring follows the frame, in a hand and at rest (T18).
  ring?.setAttribute("cx", String(w));
  ring?.setAttribute("cy", String(h));
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
 * The address, replaced with the settled window's (T13). WebKit throws past 100 history writes in
 * 10 s, and Next's patched replaceState can add a write of its own to each of ours, in the router's
 * effect, where a throw takes the page down to its error. So a held key or a run of taps writes 8
 * at once, then one each 300 ms at most, and the last window always lands. Copy link reads the
 * canonical, which is never held back.
 */
function address() {
  clearTimeout(held);
  const now = performance.now();
  writes = Math.min(8, writes + (now - counted) / 300);
  counted = now;
  if (writes < 1) held = setTimeout(address, 300);
  else if (location.pathname !== addressOf(rest)) {
    writes--;
    try {
      history.replaceState(null, "", addressOf(rest));
    } catch {
      // Past the limit, Next's own write has thrown too: the next settle tries again.
    }
  }
}

/**
 * A fit the frame's document has entered, stamped and found for the visit (T21): its stamp and its
 * region on the chart shown, the count and sessionStorage's key rewritten. A shown stamp is found:
 * the loader showed the ones found before. Silent, since a drag says nothing: the next settle that
 * speaks names it. It presses in with full motion only (app/globals.css, [data-pressed]).
 */
function find(stamp: HTMLElement) {
  if (!page || !stamp.hidden) return;
  stamp.hidden = false;
  one(`[data-fit-region="${stamp.dataset.fit}"]`)?.removeAttribute("hidden");
  news.push(stamp);
  // The count line's plank takes the newest find's sprint, and presses in with full motion only:
  // several finds in one frame press once (placement.md, 5 and 7).
  const plank = one(".trials-found-plank");
  const sprint = stamp.closest<HTMLElement>("[data-sprint]")?.dataset.sprint;
  if (plank && sprint) plank.setAttribute("data-newest", sprint);
  if (full()) plank?.setAttribute("data-pressed", "");
  let found = "";
  for (const fit of page.main.querySelectorAll<HTMLElement>("[data-fit]"))
    if (!fit.hidden) found += fit.dataset.fit;
  try {
    sessionStorage.setItem(FOUND, found);
  } catch {
    // Storage is blocked: the visit's count holds for this page only.
  }
  text("[data-found-count]", String(found.length));
}

const stamps = ({ main }: Page) =>
  main.querySelectorAll<HTMLElement>("[data-fit][data-query]");

/**
 * Each fit's query, from its stamp (call 3), listened to on the frame's window: a frame's resize
 * reports it at the next frame's media step, before its animation frames, so a drag stamps a fit
 * as its frame paints there, and nothing runs at rest. Each list is read once, here: in Chromium a
 * read after a resize takes the place of its change event (.crew/sprint/65/, Pixel's spike). A
 * fit's region is graphite while the frame is in it, entering and leaving, mid-drag too
 * (placement.md, 4).
 */
function listen(target: Page) {
  const { frame } = target;
  // The lists belong to the frame's document: one still loading is listened to once it has.
  if (frame.contentDocument?.URL === "about:blank")
    return frame.addEventListener("load", () => listen(target), { once: true });
  const win = frame.contentWindow;
  if (!win) return;
  for (const stamp of stamps(target)) {
    const list = win.matchMedia(stamp.dataset.query ?? "");
    const region = one(`[data-fit-region="${stamp.dataset.fit}"]`);
    const here = ({ matches }: { matches: boolean }) => {
      region?.toggleAttribute("data-here", matches);
      if (matches) find(stamp);
    };
    here(list);
    list.addEventListener("change", here);
  }
}

/**
 * The fits the settled window enters, found before its message is said: its change events come a
 * frame after the settle. Fresh lists, so the listened ones keep their events.
 */
function entered(target: Page) {
  const win = target.frame.contentWindow;
  for (const stamp of stamps(target))
    if (win?.matchMedia(stamp.dataset.query ?? "").matches) find(stamp);
}

/**
 * The settle's one message (T21; words.md, 5): Tb's sentence for a window that moved, then each
 * fit found since the last that spoke, in fit order, then the visit's count, its words from
 * `[data-found]`.
 */
function message(trial?: Trial) {
  const found = news
    .toSorted((a, b) => Number(a.dataset.fit) - Number(b.dataset.fit))
    .map((stamp) => stamp.dataset.said);
  const line = one("[data-found]") as HTMLElement | null;
  const n = one("[data-found-count]")?.textContent;
  const count =
    news.length === 0
      ? ""
      : n === String(page ? stamps(page).length : 0)
        ? line?.dataset.saidAll
        : line?.dataset.said?.replace("{n}", n ?? "");
  news = [];
  return [trial && settledOf(trial), ...found, count].filter(Boolean).join(" ");
}

/** What a settle to another window rewrites besides the readout: the record, the links, the head. */
function moved(target: Page, win: Win, trial: Trial) {
  record(target, trial);
  windows(target, keyOf(win));
  target.corner.setAttribute("aria-label", cornerOf(win));
  target.frame.title = frameTitleOf(win, target.hands.name);
  document.title = titleFor(trial, target.hands.name);
  const canonical = document.querySelector("link[rel=canonical]");
  if (canonical instanceof HTMLLinkElement)
    canonical.href = new URL(addressOf(win), canonical.href).href;
  address();
  text("[data-copied]", "");
}

/**
 * A swept window, settled (placement.md, 3, "Once, at a settle"): the sweep's number, the record's
 * answer, the address, said once. A settle on the window already at rest (a press that came back to
 * it, an edit that rounds to it) restores the page from its marker, writes the inputs back and
 * says nothing (words.md, 4). `said` is false for Back and Forward, which follow the address
 * quietly.
 */
function settle(win: Win, said = true) {
  const trial = trialAt(win);
  if (!page || !trial) return;
  const key = keyOf(win);
  const away = key !== keyOf(rest);
  // The window shown already, at rest: only the inputs, which an edit may have left off it.
  if (
    !away &&
    key === keyOf(placed) &&
    !page.shown.hasAttribute("data-measure")
  )
    return place(page, win);
  rest = win;
  place(page, win);
  measuring(page, false);
  mark(page, win[1], trial);
  // The sea's share, as the server writes it (components/trials.tsx), at a settle only: mid-drag
  // the frame keeps the grab's, so the corner stays under the hand (placement.md, 8).
  page.drawing.style.setProperty(
    "--sea",
    (Math.max(0, -trial.freeboard) / win[1]).toFixed(5),
  );
  text("[data-verdict]", VERDICT[trial.kind]);
  answer(trial);
  if (away) moved(page, win, trial);
  // Last, after every write, so the frame is laid out once.
  entered(page);
  // An unmoved settle says nothing, unless a drag found a fit on its way back (words.md, 5).
  if (said && (away || news.length > 0))
    text("[data-trials-live]", message(away ? trial : undefined));
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
  place(page, win);
  live(page, win);
}

function begin(event: PointerEvent) {
  if (!page || drag || settling) return;
  // The drawing keeps the grab's scale, so the corner stays under the hand; it shrinks below that
  // only to stay inside the field (app/globals.css, --scale; placement.md, 3).
  // A grab during the last release's re-fit takes the scale it is drawn at now and stops the
  // re-fit there, or its end would drop --scale under the hand.
  const scale = page.frame.getBoundingClientRect().width / rest[0];
  clearTimeout(refitting);
  page.drawing.removeAttribute("data-refit");
  hand = { x: event.clientX, y: event.clientY };
  drag = { id: event.pointerId, ...hand, scale, at: rest };
  page.drawing.style.setProperty("--scale", String(scale));
  page.corner.setAttribute("data-dragging", "");
  measuring(page, true);
  live(page, rest);
}

/**
 * The release's re-fit, from the drag's scale to Ta's fit for the settled window: eased in Full
 * only, at most 180 ms from the frame's top left (placement.md, 3), by a transition on --scale
 * (app/globals.css), so it requests no frames of its own. Calm, Off and reduced motion snap.
 * `from` is the drag's drawn scale, read before the settle wrote the window's sea.
 */
function refit({ drawing, frame }: Page, w: number, from: number) {
  drawing.style.removeProperty("--scale");
  const to = frame.getBoundingClientRect().width / w;
  if (!full() || Math.abs(to - from) < 0.002) return;
  drawing.style.setProperty("--scale", String(from));
  drawing.getBoundingClientRect();
  drawing.setAttribute("data-refit", "");
  drawing.style.setProperty("--scale", String(to));
  refitting = setTimeout(() => {
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
  // Where the hand let go, whether or not a frame ran (a first touch whose chunk came late), and
  // said only if that's another window (settle).
  const { x, y, scale } = drag;
  const win = settleOn([
    rest[0] + (hand.x - x) / scale,
    rest[1] + (hand.y - y) / scale,
  ]);
  drag = undefined;
  settling = true;
  // Paint the release first and settle in the task after it: the settle lays the frame out
  // again, and done in pointerup's handler it would hold that event's next paint (T14).
  requestAnimationFrame(() =>
    setTimeout(() => {
      if (!page) return;
      // Read before the settle: a shallower sea there would widen the drawing before it eases.
      const from = page.frame.getBoundingClientRect().width / placed[0];
      settle(win);
      refit(page, win[0], from);
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

/** A window from the key a chart's mark carries: "1024x640". */
function winOf(key: string | null): Win {
  const [w = 0, h = 0] = (key ?? "").split("x").map(Number);
  return [w, h];
}

/**
 * A tap on the chart tries its window in place (T18): a crew's window whose mark it is on, a
 * sounding's own, or the point under it by the plot's units, settled by a release's rule
 * (settleOn). The ring goes there in the tap's own paint and the frame settles in the task after
 * it, as a release does (end). The loader hands over only an unmodified click on the chart, its
 * link's leaving already stopped: a modified click on a sounding is the link's.
 */
function tap(event: Event) {
  const { clientX, clientY } = event as MouseEvent;
  const plot = page?.plot;
  if (!page || !plot || event.type !== "click" || drag || settling) return;
  const ctm = plot.getScreenCTM() ?? undefined;
  // A crew's window whose mark the tap is on, measured on the screen against the mark's CSS width
  // (a dot, or H10's bar along its windows), the nearest if several: from 1024 one grid row is
  // under a screen px, so the plot's rounding alone takes a click on 1024 × 640's dot to 645
  // (decisions.md, 9). The mark is drawn and a sounding's target isn't: it wins where one covers it.
  let pinned: Win | undefined;
  let near = Number.POSITIVE_INFINITY;
  for (const pin of plot.querySelectorAll("[data-pin]")) {
    const reach = Number.parseFloat(getComputedStyle(pin).strokeWidth) / 2;
    for (const key of pin.getAttribute("data-windows")?.split(" ") ?? []) {
      const win = winOf(key);
      const dot = new DOMPoint(...win).matrixTransform(ctm);
      const off = Math.hypot(dot.x - clientX, dot.y - clientY);
      if (off <= reach && off < near) [pinned, near] = [win, off];
    }
  }
  // Else a sounding's own window, so a key's click (at 0, 0, never on the plot) tries it too.
  const sounding = (event.target as Element).closest("[data-sounding]");
  const at = new DOMPoint(clientX, clientY).matrixTransform(ctm?.inverse());
  const win = settleOn(
    pinned ??
      (sounding ? winOf(sounding.getAttribute("data-sounding")) : [at.x, at.y]),
  );
  settling = true;
  page.ring?.setAttribute("cx", String(win[0]));
  page.ring?.setAttribute("cy", String(win[1]));
  // The settle changes the frame's height and the answer's length above the chart: where the page
  // scrolls, the plot keeps its place under the finger by a scroll, never a tween (placement.md,
  // 3). Where the side is sticky nothing above it moves, and this scrolls by 0.
  // The chart's own box: the plot's would grow with the ring at the grid's edge.
  const chart = plot.closest("[data-chart]");
  const top = chart?.getBoundingClientRect().top ?? 0;
  requestAnimationFrame(() =>
    setTimeout(() => {
      settle(win);
      settling = false;
      scrollBy({
        top: (chart?.getBoundingClientRect().top ?? 0) - top,
        behavior: "instant",
      });
    }),
  );
}

/**
 * The next swept window from the settled one, a pixel at a time the way an input's arrow points,
 * within a grid step: so 1380 × 900 steps down to 1376, not past it. Off the grid's lines (a pinned
 * window such as 390 × 664) there may be none that near, and the grid step settles as a key does.
 */
function nextFrom(dw: number, dh: number): Win {
  const steps = dw !== 0 ? W.step : H.step;
  for (let k = 1; k <= steps; k++) {
    const win: Win = [rest[0] + k * dw, rest[1] + k * dh];
    if (isSwept(win)) return win;
  }
  return settleOn([rest[0] + dw * W.step, rest[1] + dh * H.step]);
}

/**
 * An edited size settles as the form's own address would (lib/trials.ts, goTo), in place, so a
 * swept window typed is drawn exactly. A step of one onto a window the crew didn't sweep, from an
 * input's own arrows or spinner, goes on to the next swept window that way, or a 1 px step up from
 * 1440 would snap straight back to it (placement.md, 3). Returns whether the form's submit is
 * handled here: during a drag it is, and ignored, since the hand's next frame rewrites the inputs.
 */
function typed() {
  if (drag || settling) return true;
  const [w, h] = page?.inputs ?? [];
  if (!w || !h || !w.checkValidity() || !h.checkValidity()) return false;
  const typed: Win = [Number(w.value), Number(h.value)];
  const [dw, dh] = [typed[0] - rest[0], typed[1] - rest[1]];
  if (Math.abs(dw) + Math.abs(dh) === 1 && !isSwept(typed))
    settle(nextFrom(dw, dh));
  else settle(drawnFor(typed) ?? rest);
  return true;
}

/**
 * Back or Forward within the page, as after the skip link's entry: the page follows the window the
 * address names, quietly, so the address, the page and Copy link agree (T13). A drag or a settle in
 * hand writes its own window over it.
 */
function back() {
  const named = /^\/trials(?:\/(\d+)x(\d+))?$/.exec(location.pathname);
  const win =
    named && drawnFor(named[1] ? [+named[1], Number(named[2])] : HOME);
  if (win && !drag && !settling) settle(win, false);
}

/**
 * A size edited and left while this loaded was never heard (sprint 64, fix round 1's follow-up):
 * it settles now, Width typed and Tabbed to Height included. One still focused is heard on its own
 * change.
 */
function unheard(inputs: readonly HTMLInputElement[]) {
  if (
    inputs.some(
      (input, i) =>
        input !== document.activeElement && input.value !== String(rest[i]),
    )
  )
    typed();
}

/**
 * Takes the page over from the loader (components/trials-corner.tsx) with the touch that woke it,
 * and tries every tap on the chart, which the loader's listener hands on, the first included (T18).
 */
export function start(hands: Hands, touch: Event) {
  if (!page) take(hands, touch);
  tap(touch);
}

function take(hands: Hands, first: Event) {
  const main = document.getElementById("main");
  const drawing = main?.querySelector<HTMLElement>(".trials-drawing");
  const frame = main?.querySelector("iframe");
  const corner = main?.querySelector<HTMLElement>("[data-corner]");
  const shown = main?.querySelector<HTMLElement>("[data-freeboard]");
  const form = main?.querySelector(".trials-form");
  if (!main || !drawing || !frame || !corner || !shown || !form) return;
  const inputs = [
    ...main.querySelectorAll<HTMLInputElement>("input[name=w], input[name=h]"),
  ];
  const plot = main.querySelector<SVGGraphicsElement>("[data-plot]");
  const ring = main.querySelector("[data-ring]");
  page = { hands, main, drawing, frame, corner, shown, inputs, plot, ring };
  rest = placed =
    drawnFor([
      Number(drawing.style.getPropertyValue("--w")),
      Number(drawing.style.getPropertyValue("--h")),
    ]) ?? HOME;
  listen(page);

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
  addEventListener("popstate", back);
  // The plank presses once and rests (placement.md, 7): nothing is left to animate.
  const plank = main.querySelector(".trials-found-plank");
  for (const type of ["animationend", "animationcancel"])
    plank?.addEventListener(type, () => plank.removeAttribute("data-pressed"));

  unheard(inputs);
  // The touch that loaded this: a drag already in hand, unless it let go while this loaded.
  if (first instanceof PointerEvent && first.type === "pointerdown") {
    if (corner.hasPointerCapture(first.pointerId)) begin(first);
    else corner.removeAttribute("data-dragging");
  }
}
