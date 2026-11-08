// The yard's controller (.crew/sprint/55/contract.md, "The interface between the 3D and the
// controller"): in Full and Calm the Log's step links, and ← and →, stop being document navigations.
// A press keeps the page and moves one plank through the 3D's `Press` at once, never waiting on the
// network (.crew/sprint/55/press-iris.md, section 6). Meanwhile the step's words come from the
// server's own /log/<n>, fetched and parsed (settled point 3), so they are the Off page's by
// construction. Once the plank has landed and the page has come, the drawings and the question
// follow, the URL is replaced, never pushed, so playing never grows history, and a polite live
// region names the step. Off never loads this chunk, so Off and no script keep the plain links.
//
// A press held past 400 ms riffles (.crew/sprint/56/contract.md; Iris's calls, riffle-iris.md): the
// steps come on the pace's clock, faster and faster, until a chapter stops them or the visitor lets
// go. While it runs only the drawings, the Theseus's caption and the count line follow the hulls;
// the record, the title, the URL and the live region change once, at the stop or the release.

import { PLANKS } from "@/lib/hull-layouts";
import { riffleGap } from "./calls";

/** Moves the hulls between two steps; `from` and `to` index the steps (merged sprints, ascending). */
export type Press = {
  /**
   * Full flies one plank, Calm fades; resolves once the plank has landed. `pace`, in a riffle, is
   * the ms until the next step may start: Full fits the plank's motion into it, Calm fades within
   * it. Without `pace`, Yc's press, unchanged. Never called when Off.
   */
  go(from: number, to: number, pace?: number): Promise<void>;
  /** Lands a moving plank at once; `go`'s promise then resolves. */
  land(): void;
};
export type MakePress = (steps: readonly number[]) => Press;

/** A step's own page; any other path, /log among them, is no step. */
const STEP_PATH = /^\/log\/([1-9]\d*)$/;

/**
 * The header: the ghost's caption, the count line, the question and the lines figure. A step's
 * words never move an element the page keeps, since one that moves past the press's 500 ms of
 * input is a layout shift (B5.25; the question's +59 px at 23): the header's lines and the record
 * come in as the server's own elements, and a new element is never a shift.
 */
const HEAD = ".log-head";
/** The record, and in it the step links: replaced whole. */
const RECORD = ".record";
const COUNT = "[data-ghost-count]";
/** The Theseus's caption between the drawings, one line held whole, so it moves nothing. */
const CAPTION = "[data-theseus-caption]";
/**
 * The 22nd merge's question, on its step alone, right after the count line. It comes with the
 * words, its space taken unseen, and shows with the plank: it is the payoff, and lands with the
 * last original (Iris; .crew/sprint/55/review-iris.md, must 1).
 */
const QUESTION = "[data-yard-question]";
/** The step's drawings, swapped once the plank lands, so the page under the canvas is the step's. */
const DRAWINGS = ["[data-theseus]", "[data-ghost]"];
/** Every revision, which below 1024 follows the record. */
const TABLE = ".log-revs";
/** The revision table's row for the open record. */
const OPEN_ROW = ".rev-link[aria-current]";
const CANONICAL = 'link[rel="canonical"]';
/** Half a step is never shown: every region a step's page swaps in must be there. */
const REGIONS = [
  HEAD,
  "[data-ghost-caption]",
  COUNT,
  RECORD,
  CAPTION,
  ...DRAWINGS,
];
/** The links the model plays. */
const STEP_LINK =
  '.record a[data-step="previous"], .record a[data-step="next"]';

/** A press still down this long is a hold, and riffles (contract, settled point 1). */
const HOLD_MS = 400;
/** A riffle fetches this many pages ahead of it, never past its stop (settled point 5). */
const AHEAD = 4;

/**
 * Each step's parsed page, kept for the document's life: the pages are prerendered, so a revisit,
 * a Full press that mounts the model again, or a page back from the bfcache asks nothing twice. A
 * failed fetch isn't kept, so the next press asks again.
 */
const pages = new Map<number, Promise<Document | null>>();

const stepOf = (path: string) => {
  const found = STEP_PATH.exec(path);
  return found ? Number(found[1]) : undefined;
};

/** The step's page from the server, or null when it can't be had whole. */
async function load(sprint: number): Promise<Document | null> {
  try {
    const response = await fetch(`/log/${sprint}`);
    if (!response.ok) return null;
    const fresh = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );
    return REGIONS.every((region) => fresh.querySelector(region))
      ? fresh
      : null;
  } catch {
    return null;
  }
}

function page(sprint: number) {
  const kept = pages.get(sprint);
  if (kept !== undefined) return kept;
  const loading = load(sprint).then((fresh) => {
    if (!fresh) pages.delete(sprint);
    return fresh;
  });
  pages.set(sprint, loading);
  return loading;
}

/** Each region's children become the server's, the element itself kept. */
function swap(doc: Document, fresh: Document, regions: readonly string[]) {
  for (const region of regions) {
    const here = doc.querySelector(region);
    const there = fresh.querySelector(region);
    if (here && there) {
      here.replaceChildren(
        ...[...there.childNodes].map((node) => doc.importNode(node, true)),
      );
    }
  }
}

/** The region becomes the server's own element; returns it. */
function replace(doc: Document, fresh: Document, region: string) {
  const here = doc.querySelector(region);
  const there = fresh.querySelector(region);
  if (!here || !there) return here;
  const next = doc.importNode(there, true);
  here.replaceWith(next);
  return next;
}

/** Where focus is in `region`, if it is: the step link's kind, and its place among the controls. */
function focusIn(region: Element | null) {
  const active = region?.ownerDocument.activeElement;
  if (!region || !active || !region.contains(active)) return null;
  return {
    kind: active.getAttribute("data-step"),
    at: [...region.querySelectorAll("a, button")].indexOf(active),
  };
}

/**
 * Focus back where it was before the region was replaced: on the pressed step link's
 * replacement, the one of the same kind (Iris), or the other one at an end (Next is gone at the
 * newest step, and the hand-off there is never focused by a press: Iris's calls, section 4), or
 * the control in the same place. Without this focus falls to the body with the old region.
 */
function refocus(region: Element | null, was: ReturnType<typeof focusIn>) {
  if (!region || !was) return;
  const controls = [...region.querySelectorAll<HTMLElement>("a, button")];
  const step = was.kind
    ? (region.querySelector<HTMLElement>(`[data-step="${was.kind}"]`) ??
      region.querySelector<HTMLElement>("[data-step]"))
    : null;
  (step ?? controls[Math.min(was.at, controls.length - 1)])?.focus({
    preventScroll: true,
  });
}

/**
 * The next task, after the input event in hand has finished with its default actions. A message,
 * not a timer, so a paused clock (Playwright's, in the checks) doesn't hold it.
 */
const nextTask = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });

/** Typing in a field owns its arrow keys. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.matches("input, textarea, select"));

const chorded = (event: MouseEvent | KeyboardEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/** One step: where it goes, and how far it has got. */
type Flight = {
  to: number;
  sprint: number;
  /** The step's page, once it has come while this was the latest step. */
  fresh?: Document;
  /** `go` has resolved. */
  landed: boolean;
  /**
   * A riffle's step on its way past: only its drawings, caption and count follow the hulls, and
   * its record, title, URL and name wait for the riffle's end (Iris's calls, section 3).
   */
  passing: boolean;
  /** Its record, header and title are up. */
  worded: boolean;
  /** Resolves once `go` has and the landing's swaps that could run have: never on the network. */
  moved: Promise<void>;
};

/** A press held down: before its 400 ms `n` is 0, then it counts the riffle's steps. */
type Held = {
  by: 1 | -1;
  n: number;
  timer: number;
  /** What holds it, so only its own release ends it. */
  pointer?: number;
  key?: string;
  /** The step link shown held while the riffle runs (Iris, addition 4). */
  link: HTMLElement | null;
  /** The step onto a chapter has started: nothing comes after it. */
  stopping: boolean;
};

/** A pointer down on a step link, and the link's box then, in page coordinates. */
type Down = {
  id: number;
  link: HTMLAnchorElement;
  /** Touch or pen, not a mouse. */
  touch: boolean;
  /** A touch or pen waiting for its tap, or for 400 ms held still. */
  timer: number;
  box: { left: number; top: number; right: number; bottom: number };
};

/** Takes the Log's step links and keys over; returns the teardown. */
export function startYard(doc: Document, makePress: MakePress): () => void {
  const view = doc.defaultView;
  const steps = [
    ...doc.querySelectorAll<HTMLAnchorElement>(".rev-log .rev-link"),
  ]
    .map((link) => stepOf(link.pathname))
    .filter((sprint): sprint is number => sprint !== undefined)
    .sort((a, b) => a - b);
  const opened = view ? stepOf(view.location.pathname) : undefined;
  const at = opened === undefined ? -1 : steps.indexOf(opened);
  // On /log, today's page, there are no step links to take: Start again and the table's rows stay
  // document navigations, as every jump of more than one plank does.
  if (!view || at < 0) return () => {};

  const press = makePress(steps);
  const host = doc.querySelector<HTMLElement>("[data-model]");
  const live = doc.querySelector("[data-yard-live]");
  let alive = true;
  /** The step the latest press goes to: where ← and → step from. */
  let target = at;
  /** The latest step, until it has landed with its page. */
  let flight: Flight | null = null;
  /** A riffle's last step, landed in passing, while the riffle runs on. */
  let passed: Flight | null = null;
  /** A press landed while still held: its URL and name wait to see if it riffles. */
  let pending: { flown: Flight; fresh: Document } | null = null;
  let held: Held | null = null;
  let down: Down | null = null;
  /** The click that ends a pointer press the controller has stepped already does nothing more. */
  let claimed = false;

  // CSS reads it: while the model plays the step links, a hold shows no callout or menu.
  if (host) host.dataset.yard = "";

  /**
   * The chapters, where a riffle stops: every 22nd merge (the last original out at 23, the crew's
   * own first ship at 45), the first step and the newest (settled point 3).
   */
  const isStop = (i: number) =>
    i <= 0 || i >= steps.length - 1 || (i + 1) % PLANKS.length === 0;
  const calm = () =>
    doc.querySelector("[data-motion]")?.getAttribute("data-mode") === "calm";

  const fetchAll = (indexes: readonly number[]) => {
    for (const i of indexes) {
      const sprint = steps[i];
      if (sprint !== undefined) page(sprint).catch(() => {});
    }
  };

  /** Once the model is at rest, the step's neighbours, so the next press finds its words. */
  const prefetch = () => {
    const state = host?.dataset.state;
    const rest =
      (state === "settled" || state === "still") &&
      host?.dataset.press === undefined;
    if (!alive || !rest || flight) return;
    fetchAll([target - 1, target + 1]);
  };

  /** A riffle's next pages in its direction, the stop's among them, and none past it. */
  const ahead = (by: number) => {
    let stop = target + by;
    while (!isStop(stop)) stop += by;
    const next: number[] = [stop];
    for (let i = target + by; next.length <= AHEAD && i !== stop; i += by) {
      next.push(i);
    }
    fetchAll(next);
  };

  /** The step's words: its header, record and Theseus caption, the table's open row, the title. */
  const words = (fresh: Document) => {
    const record = doc.querySelector(RECORD);
    const focused = focusIn(record);
    const table = doc.querySelector(TABLE);
    const tableTop = table?.getBoundingClientRect().top;
    swap(doc, fresh, [HEAD, CAPTION]);
    const asked = doc.querySelector(QUESTION);
    if (asked instanceof HTMLElement) asked.style.visibility = "hidden";
    refocus(replace(doc, fresh, RECORD), focused);
    const row = fresh.querySelector(OPEN_ROW);
    doc.querySelector(OPEN_ROW)?.removeAttribute("aria-current");
    if (row) {
      doc
        .querySelector(`.rev-link[href="${row.getAttribute("href")}"]`)
        ?.setAttribute("aria-current", row.getAttribute("aria-current") ?? "");
    }
    doc.title = fresh.title;
    const canonical = fresh.querySelector(CANONICAL)?.getAttribute("href");
    if (canonical) {
      doc.querySelector(CANONICAL)?.setAttribute("href", canonical);
    }
    // Below 1024 a record of another height moves the table under it: in view, it comes in as
    // the server's too. Above the view scroll anchoring holds it, and below nothing is seen.
    if (!table || tableTop === undefined) return;
    const top = table.getBoundingClientRect().top;
    const seen = (y: number) => y >= 0 && y < view.innerHeight;
    if (top !== tableTop && (seen(tableTop) || seen(top))) {
      const listed = focusIn(table);
      refocus(replace(doc, fresh, TABLE), listed);
    }
  };

  /** The step is the page's now: its URL, then its name, once (settled point 7). */
  const announce = (flown: Flight, fresh: Document) => {
    // Through Next's own hook on replaceState, so its router holds the URL the page shows.
    view.history.replaceState(null, "", `/log/${flown.sprint}`);
    const goal = fresh.getElementById("record")?.textContent ?? "";
    if (live) live.textContent = `Revision ${flown.sprint}: ${goal}`;
    prefetch();
  };

  /** A hold is over, at its stop or released: nothing more comes from it. */
  const drop = () => {
    const was = held;
    held = null;
    if (!was) return null;
    view.clearTimeout(was.timer);
    was.link?.removeAttribute("data-held");
    return was;
  };

  /** A step landed for good, with its page: its words if a riffle held them back, its name. */
  const rest = (flown: Flight, fresh: Document) => {
    if (!flown.worded) {
      flown.worded = true;
      words(fresh);
    }
    // The server's markup again: the question has no style of its own.
    doc.querySelector(QUESTION)?.removeAttribute("style");
    // The step onto a chapter has landed: the riffle is over, held or not.
    if (held?.stopping) drop();
    // Still held, the press may yet riffle, and a riffle names only its stop.
    if (held) {
      pending = { flown, fresh };
      return;
    }
    announce(flown, fresh);
  };

  /** The landed step's drawings; then, unless a newer step is on, its caption or its words. */
  const settle = (flown: Flight, fresh: Document) => {
    swap(doc, fresh, DRAWINGS);
    if (flight !== flown) return;
    flight = null;
    if (flown.passing) {
      // The flip book's page number: one line each, held whole, so neither moves the page.
      swap(doc, fresh, [CAPTION, COUNT]);
      passed = flown;
      return;
    }
    rest(flown, fresh);
  };

  /** The step's page has come: its words, or, if it couldn't be had, the link's own navigation. */
  const arrived = (flown: Flight, fresh: Document | null) => {
    // Overtaken by a newer step, whose page brings the words.
    if (!alive || flight !== flown) return;
    // A riffle passing by doesn't wait for a page: its end asks for it again.
    if (!fresh && flown.passing) return;
    if (!fresh) {
      alive = false;
      view.location.assign(`/log/${flown.sprint}`);
      return;
    }
    flown.fresh = fresh;
    if (!flown.passing) {
      flown.worded = true;
      words(fresh);
    }
    if (flown.landed) settle(flown, fresh);
    // A run of presses finds its pages cached, so its words never come late (Lens's nit on Yc).
    fetchAll([flown.to - 1, flown.to + 1]);
  };

  /** A riffle has ended between or during its steps: the step it stands on comes up whole. */
  const conclude = () => {
    const now = flight;
    if (!now) {
      const last = passed;
      passed = null;
      if (last?.fresh) rest(last, last.fresh);
      return;
    }
    if (!now.passing) return;
    now.passing = false;
    if (now.fresh) {
      now.worded = true;
      words(now.fresh);
    } else {
      page(now.sprint).then(
        (fresh) => arrived(now, fresh),
        () => {},
      );
    }
  };

  /**
   * A release, keyup, Escape, a pointer that leaves or is cancelled, a blur or a hidden page. A
   * riffle ends there: the moving plank lands at once, the marks come back (`land` brings them
   * even with nothing moving), and the step it stands on takes its words, URL and name, once. A
   * quick press flies on, and only its name waited.
   */
  const release = () => {
    const was = drop();
    if (!was) return;
    if (was.n > 0) {
      press.land();
      conclude();
      return;
    }
    const ready = pending;
    pending = null;
    if (ready) announce(ready.flown, ready.fresh);
  };

  /**
   * One step. A press lands a moving plank first and flies once that has settled, as in Yc. A
   * riffle's step calls `go` on the riffle's clock, and the 3D hurries a moving plank home itself;
   * `pace` is the gap to the next step, and the step onto a chapter has none, so it plays the
   * whole press (Iris's calls, section 3). Its words wait for `input` when it is given. Returns
   * whether it stepped.
   */
  const step = (
    to: number,
    riffling = false,
    pace?: number,
    input?: Promise<void>,
  ) => {
    const sprint = steps[to];
    if (!alive || sprint === undefined || to === target) return false;
    const before = flight;
    const from = target;
    target = to;
    passed = null;
    pending = null;
    if (live) live.textContent = "";
    const flown: Flight = {
      to,
      sprint,
      landed: false,
      passing: pace !== undefined,
      worded: false,
      moved: Promise.resolve(),
    };
    flight = flown;
    const landed = () => {
      flown.landed = true;
      if (alive && flown.fresh) settle(flown, flown.fresh);
    };
    // The 3D failed: the drawings, swapped on landing, are the page.
    const failed = () => {};
    if (riffling) {
      flown.moved = press.go(from, to, pace).catch(failed).then(landed);
    } else {
      // A press while one is moving lands it first; its landing runs before this one flies, all
      // within the task, so the motion starts within a frame of the press.
      if (before && !before.landed) press.land();
      flown.moved = (before?.moved ?? Promise.resolve())
        .then(() => (alive ? press.go(from, to) : undefined))
        .catch(failed)
        .then(landed);
    }
    const fetched = page(sprint);
    Promise.all([fetched, input]).then(
      ([fresh]) => arrived(flown, fresh),
      () => {},
    );
    return true;
  };

  /** The riffle's next step, on the pace's clock. */
  const tick = () => {
    const now = held;
    if (!alive || !now) return;
    const to = target + now.by;
    if (steps[to] === undefined) return release();
    now.n += 1;
    if (now.n === 1) {
      // The riffle starts: the press's name waits for its stop, and the link shows held.
      pending = null;
      now.link = doc.querySelector<HTMLElement>(
        `.record a[data-step="${now.by > 0 ? "next" : "previous"}"]`,
      );
      now.link?.setAttribute("data-held", "");
    }
    if (isStop(to)) {
      now.stopping = true;
      now.timer = 0;
      step(to, true);
      return;
    }
    const gap = riffleGap(now.n, calm());
    step(to, true, gap);
    now.timer = view.setTimeout(tick, gap);
    ahead(now.by);
  };

  /**
   * A press that may be held: one step at once, and still down at 400 ms, the riffle. Its words
   * wait for `input` when it is given.
   */
  const hold = (
    by: 1 | -1,
    source: Pick<Held, "pointer" | "key">,
    input?: Promise<void>,
  ) => {
    release();
    const to = target + by;
    // A press onto a chapter never riffles (Iris, section 3).
    if (!step(to, false, undefined, input) || isStop(to)) return;
    held = {
      by,
      n: 0,
      timer: view.setTimeout(tick, HOLD_MS),
      link: null,
      stopping: false,
      ...source,
    };
  };

  /** A pointer is up or cancelled: a touch's wait ends, and a hold it made is released. */
  const lift = (event: PointerEvent) => {
    const was = down;
    if (!was || event.pointerId !== was.id) return;
    down = null;
    view.clearTimeout(was.timer);
    was.link.removeEventListener("pointerup", lift);
    was.link.removeEventListener("pointercancel", lift);
    if (held?.pointer === was.id) release();
  };

  /**
   * A press on a step link. A mouse steps at once and may hold; touch and pen step at the tap's
   * release (the click, as Yc), or hold once the finger has stayed still 400 ms, so a scroll that
   * starts on a step link never steps the yard (Iris, addition 1).
   */
  const pointerdown = (event: PointerEvent) => {
    claimed = false;
    if (
      event.defaultPrevented ||
      !event.isPrimary ||
      event.button !== 0 ||
      chorded(event) ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>(STEP_LINK);
    if (!link) return;
    const by = link.dataset.step === "next" ? 1 : -1;
    if (steps[target + by] === undefined) return;
    const box = link.getBoundingClientRect();
    const id = event.pointerId;
    const mouse = event.pointerType === "mouse";
    down = {
      id,
      link,
      touch: !mouse,
      timer: 0,
      box: {
        left: box.left + view.scrollX,
        top: box.top + view.scrollY,
        right: box.right + view.scrollX,
        bottom: box.bottom + view.scrollY,
      },
    };
    // On the link too: a link the words replace may still be the touch's target.
    link.addEventListener("pointerup", lift);
    link.addEventListener("pointercancel", lift);
    if (mouse) {
      // The hulls move at once; the words wait for the press's own mousedown to focus the link,
      // with no ring, as Yc's click does, so `words` moves focus to its replacement still without
      // one. Replaced first, the link's focus falls to main, and focusing it by script shows the
      // ring (Iris's review). The drag image is `drag`'s, the selection CSS's.
      claimed = true;
      hold(by, { pointer: id }, nextTask());
      return;
    }
    down.timer = view.setTimeout(() => {
      claimed = true;
      hold(by, { pointer: id });
    }, HOLD_MS);
  };

  /** A mouse dragged off the held link lets it go, as a pressed button does (Iris, addition 2). */
  const pointermove = (event: PointerEvent) => {
    const now = down;
    if (
      !now ||
      now.touch ||
      event.pointerId !== now.id ||
      held?.pointer !== now.id ||
      held.stopping
    ) {
      return;
    }
    // Against the link's box at the press: the words may move or replace the link itself.
    const x = event.clientX + view.scrollX;
    const y = event.clientY + view.scrollY;
    const { left, top, right, bottom } = now.box;
    if (x < left || x > right || y < top || y > bottom) release();
  };

  // Enter, a tap, and any click the controller didn't take at its pointerdown: one step, as Yc.
  const click = (event: MouseEvent) => {
    if (claimed && event.detail > 0) {
      claimed = false;
      event.preventDefault();
      return;
    }
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      chorded(event) ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>(STEP_LINK);
    const sprint = link ? stepOf(link.pathname) : undefined;
    const to = sprint === undefined ? -1 : steps.indexOf(sprint);
    if (to < 0) return;
    event.preventDefault();
    release();
    step(to);
  };

  /**
   * Keys on a focused step link: Home and End jump to the first and newest steps (decision 3),
   * and a held Enter never repeats, since it would step at the OS's rate past every chapter
   * (Iris, addition 3). Returns whether the key was the link's.
   */
  const linkKey = (event: KeyboardEvent) => {
    if (!(event.target instanceof Element && event.target.closest(STEP_LINK))) {
      return false;
    }
    const end =
      event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : -1;
    if (end < 0 && !(event.key === "Enter" && event.repeat)) return false;
    event.preventDefault();
    if (end >= 0 && !event.repeat) {
      release();
      step(end);
    }
    return true;
  };

  /**
   * ← and → as Previous and Next, from the step the latest press goes to, so a quick second press
   * steps on from the first even before its words are up; held, they riffle on the controller's
   * clock, never the OS's repeat. Escape stops a riffle anywhere.
   */
  const key = (event: KeyboardEvent) => {
    if (event.defaultPrevented || chorded(event)) return;
    if (event.key === "Escape") return release();
    if (linkKey(event)) return;
    const by =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (
      !by ||
      event.repeat ||
      typing(event.target) ||
      steps[target + by] === undefined
    ) {
      return;
    }
    event.preventDefault();
    hold(by, { key: event.key });
  };

  const keyup = (event: KeyboardEvent) => {
    if (held?.key === event.key) release();
  };

  // A touch held on a step link shows no menu while the model plays it (settled point 1).
  const menu = (event: MouseEvent) => {
    if (down?.touch) event.preventDefault();
  };
  const drag = (event: DragEvent) => {
    if (event.target instanceof Element && event.target.closest(STEP_LINK)) {
      event.preventDefault();
    }
  };

  // Alt-Tab during a held key never delivers its keyup (Iris, addition 2).
  const away = () => {
    if (down) view.clearTimeout(down.timer);
    down = null;
    release();
  };
  const hidden = () => {
    if (doc.hidden) away();
  };

  // Back or Forward onto another step of this document (the skip link's #main pushes one) would
  // show this step's words at that step's URL: the server's page for it instead.
  const traversed = () => {
    const sprint = stepOf(view.location.pathname);
    if (sprint !== undefined && sprint !== steps[target]) {
      view.location.reload();
    }
  };

  const rested = new MutationObserver(prefetch);
  if (host) {
    rested.observe(host, { attributeFilter: ["data-state", "data-press"] });
  }
  doc.addEventListener("pointerdown", pointerdown);
  doc.addEventListener("pointermove", pointermove);
  doc.addEventListener("pointerup", lift, true);
  doc.addEventListener("pointercancel", lift, true);
  doc.addEventListener("click", click);
  doc.addEventListener("keydown", key);
  doc.addEventListener("keyup", keyup);
  doc.addEventListener("contextmenu", menu);
  doc.addEventListener("dragstart", drag);
  doc.addEventListener("visibilitychange", hidden);
  view.addEventListener("blur", away);
  view.addEventListener("popstate", traversed);
  prefetch();

  return () => {
    if (down) view.clearTimeout(down.timer);
    down = null;
    drop();
    // Torn down mid-flight or mid-riffle (Off pressed, or the page hidden): the page is the
    // step's at once, words and all, if its page has come, and stays the step before if not.
    if (alive) {
      const up = flight;
      const stood = passed;
      const ready = pending;
      alive = false;
      if (up?.fresh) {
        up.passing = false;
        settle(up, up.fresh);
      } else if (!up && stood?.fresh) {
        rest(stood, stood.fresh);
      } else if (ready) {
        announce(ready.flown, ready.fresh);
      }
    }
    rested.disconnect();
    doc.removeEventListener("pointerdown", pointerdown);
    doc.removeEventListener("pointermove", pointermove);
    doc.removeEventListener("pointerup", lift, true);
    doc.removeEventListener("pointercancel", lift, true);
    doc.removeEventListener("click", click);
    doc.removeEventListener("keydown", key);
    doc.removeEventListener("keyup", keyup);
    doc.removeEventListener("contextmenu", menu);
    doc.removeEventListener("dragstart", drag);
    doc.removeEventListener("visibilitychange", hidden);
    view.removeEventListener("blur", away);
    view.removeEventListener("popstate", traversed);
    if (host) delete host.dataset.yard;
  };
}
