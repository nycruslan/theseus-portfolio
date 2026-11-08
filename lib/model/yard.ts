// The yard's controller (.crew/sprint/55/contract.md, "The interface between the 3D and the
// controller"): in Full and Calm the Log's step links, and ← and →, stop being document navigations.
// A press keeps the page and moves one plank through the 3D's `Press` at once, never waiting on the
// network (.crew/sprint/55/press-iris.md, section 6). Meanwhile the step's words come from the
// server's own /log/<n>, fetched and parsed (settled point 3), so they are the Off page's by
// construction. Once the plank has landed and the page has come, the drawings and the question
// follow, the URL is replaced, never pushed, so playing never grows history, and a polite live
// region names the step. Off never loads this chunk, so Off and no script keep the plain links.

/** Moves the hulls between two steps; `from` and `to` index the steps (merged sprints, ascending). */
export type Press = {
  /** Full flies one plank, Calm fades; resolves once the plank has landed. Never called when Off. */
  go(from: number, to: number): Promise<void>;
  /** Lands a moving plank at once; `go`'s promise then resolves. */
  land(): void;
};
export type MakePress = (steps: readonly number[]) => Press;

/** A step's own page; any other path, /log among them, is no step. */
const STEP_PATH = /^\/log\/([1-9]\d*)$/;

/**
 * The step's words, swapped as soon as its page has come: each is on every step's page. Each keeps
 * its element and takes the server's children, so whatever holds the element (the stylesheet, the
 * 3D, a check) still holds it. The record carries the step links.
 */
const WORDS = [
  ".record",
  "[data-ghost-caption]",
  "[data-ghost-count]",
  "[data-theseus-caption]",
];
/** The step's drawings, swapped once the plank lands, so the page under the canvas is the step's. */
const DRAWINGS = ["[data-theseus]", "[data-ghost]"];
/**
 * The 22nd merge's question, on its step alone, right after the count line. It leaves with the
 * words and arrives with the plank: it is the payoff, and lands with the last original (Iris).
 */
const QUESTION = "[data-yard-question]";
const COUNT = "[data-ghost-count]";
/** The revision table's row for the open record. */
const OPEN_ROW = ".rev-link[aria-current]";
const CANONICAL = 'link[rel="canonical"]';

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
    // Half a step is never shown: every region the press swaps must be there.
    return [...WORDS, ...DRAWINGS].every((region) =>
      fresh.querySelector(region),
    )
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
 * Focus back where it was before the region's children were replaced: on the pressed step link's
 * replacement, the one of the same kind (Iris), or the other one at an end (Next is gone at the
 * newest step), or the control in the same place. Without this the pressed link leaves with the
 * old record and focus falls to the body.
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

/** Typing in a field owns its arrow keys. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.matches("input, textarea, select"));

/** One press: the step it goes to, and how far it has got. */
type Flight = {
  to: number;
  sprint: number;
  /** The step's page, once it has come while this was the latest press. */
  fresh?: Document;
  /** `go` has resolved. */
  landed: boolean;
  /** Resolves once `go` has and the landing's swaps that could run have: never on the network. */
  moved: Promise<void>;
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
  /** The latest press, until it has landed with its page. */
  let flight: Flight | null = null;

  /** Once the model is at rest, the step's neighbours, so the next press finds its words. */
  const prefetch = () => {
    const state = host?.dataset.state;
    const rest =
      (state === "settled" || state === "still") &&
      host?.dataset.press === undefined;
    if (!alive || !rest || flight) return;
    for (const near of [steps[target - 1], steps[target + 1]]) {
      if (near !== undefined) page(near).catch(() => {});
    }
  };

  /** The step's words, once its page has come. */
  const words = (fresh: Document) => {
    const record = doc.querySelector(".record");
    const focused = focusIn(record);
    swap(doc, fresh, WORDS);
    doc.querySelector(QUESTION)?.remove();
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
    refocus(record, focused);
  };

  /** The landed step's drawings, question and URL; then its name, unless a newer press is on. */
  const settle = (flown: Flight, fresh: Document) => {
    swap(doc, fresh, DRAWINGS);
    const asked = fresh.querySelector(QUESTION);
    if (asked) doc.querySelector(COUNT)?.after(doc.importNode(asked, true));
    // Through Next's own hook on replaceState, so its router holds the URL the page shows.
    view.history.replaceState(null, "", `/log/${flown.sprint}`);
    if (flight !== flown) return;
    flight = null;
    const goal = fresh.getElementById("record")?.textContent ?? "";
    if (live) live.textContent = `Revision ${flown.sprint}: ${goal}`;
    prefetch();
  };

  /** The step's page has come: its words, or, if it couldn't be had, the link's own navigation. */
  const arrived = (flown: Flight, fresh: Document | null) => {
    // Overtaken by a newer press, whose page brings the words.
    if (!alive || flight !== flown) return;
    if (!fresh) {
      alive = false;
      view.location.assign(`/log/${flown.sprint}`);
      return;
    }
    flown.fresh = fresh;
    words(fresh);
    if (flown.landed) settle(flown, fresh);
  };

  const fly = (flown: Flight, from: number) => {
    if (!alive) return;
    const moving = press.go(from, flown.to);
    // Pressed again before this one could start: it lands at once, and the newer one flies.
    if (flight !== flown) press.land();
    return moving;
  };

  const step = (to: number) => {
    const sprint = steps[to];
    if (sprint === undefined || to === target) return;
    const before = flight;
    // A press while one is moving lands it first; its landing runs before this one flies, all
    // within the task, so the motion starts within a frame of the press.
    if (before && !before.landed) press.land();
    const from = target;
    target = to;
    if (live) live.textContent = "";
    const flown: Flight = {
      to,
      sprint,
      landed: false,
      moved: Promise.resolve(),
    };
    flight = flown;
    flown.moved = (before?.moved ?? Promise.resolve())
      .then(() => fly(flown, from))
      .catch(() => {
        // The 3D failed: the drawings, swapped below, are the page.
      })
      .then(() => {
        flown.landed = true;
        if (alive && flown.fresh) settle(flown, flown.fresh);
      });
    page(sprint).then(
      (fresh) => arrived(flown, fresh),
      () => {},
    );
  };

  const click = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>(
      '.record a[data-step="previous"], .record a[data-step="next"]',
    );
    const sprint = link ? stepOf(link.pathname) : undefined;
    const to = sprint === undefined ? -1 : steps.indexOf(sprint);
    if (to < 0) return;
    event.preventDefault();
    step(to);
  };

  // ← and → as Previous and Next, from the step the latest press goes to, so a quick second press
  // steps on from the first even before its words are up. Nothing at the first and newest steps.
  const key = (event: KeyboardEvent) => {
    const by =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (
      !by ||
      event.defaultPrevented ||
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      typing(event.target) ||
      steps[target + by] === undefined
    ) {
      return;
    }
    event.preventDefault();
    step(target + by);
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
  doc.addEventListener("click", click);
  doc.addEventListener("keydown", key);
  view.addEventListener("popstate", traversed);
  prefetch();

  return () => {
    // Torn down mid-flight (Off pressed, or the page hidden): the page is the step's at once if
    // its words are up, and stays the step before if they aren't.
    const up = alive ? flight : null;
    alive = false;
    if (up?.fresh) settle(up, up.fresh);
    rested.disconnect();
    doc.removeEventListener("click", click);
    doc.removeEventListener("keydown", key);
    view.removeEventListener("popstate", traversed);
  };
}
