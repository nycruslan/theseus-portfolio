"use client";

import { useEffect } from "react";
import type { Hands } from "@/lib/trials-live";

// The trials page's only script before a touch (.crew/sprint/64/contract.md, T10: at most 1,024 B
// gzip beyond the 404's). It waits for the first press or focus on the frame's corner or the size
// inputs, or a tap on the chart, and only then imports the controller (lib/trials-live.ts),
// handing it that touch: a pointer already on the corner is captured here, so the drag holds while
// it loads, and a sounding's click is kept from leaving the page, so its window is tried in place
// (.crew/sprint/65/contract.md, T18). Copy link is here, not there, so its clipboard write runs in
// the click itself, as Safari asks. At load it brings back the fits found this visit (T21, call 6).
// Not memoised by the React Compiler ("use no memo"): it renders nothing (components/model.tsx).

const TOUCHED = "[data-corner],[name=w],[name=h]";
/** The visit's found fits, as digits: sessionStorage's one key (T21), lib/trials-live.ts's too. */
const FOUND = "theseus:found";
const TYPES = ["pointerdown", "focusin", "click"];

/**
 * The fits found this visit, shown again, and the window's own (the server stamped them) found
 * with them. Stamps and regions keep the places the server laid out for them, hidden, so showing
 * them moves nothing.
 */
function restore(main: HTMLElement) {
  try {
    // "null" until a fit is found, which holds no fit's digit.
    const found = String(sessionStorage.getItem(FOUND));
    let now = "";
    for (const fit of main.querySelectorAll<HTMLElement>("[data-fit]")) {
      const n = fit.dataset.fit as string;
      if (fit.hidden && !found.includes(n)) continue;
      now += n;
      fit.hidden = false;
      main.querySelector(`[data-fit-region="${n}"]`)?.removeAttribute("hidden");
    }
    sessionStorage.setItem(FOUND, now);
    (main.querySelector("[data-found-count]") as Element).textContent =
      `${now.length}`;
  } catch {
    // Storage is blocked: the page stays the server's, with the window's own fits and count.
  }
}

export function TrialsCorner({ hands }: { hands: Hands }) {
  "use no memo";
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const one = (selector: string) => main.querySelector(selector);
    restore(main);

    const off = new AbortController();
    const touch = (event: Event) => {
      const target = event.target as Element;
      const { type, button, ctrlKey, metaKey, shiftKey, altKey } =
        event as MouseEvent;
      const tap = type === "click";
      // A press with the main button, or a click on the chart; modified, a sounding is a link and
      // a press isn't a drag (T18).
      if (
        button ||
        ctrlKey ||
        metaKey ||
        shiftKey ||
        altKey ||
        !target.closest(tap ? "[data-chart]" : TOUCHED)
      )
        return;
      if (tap) event.preventDefault();
      // Every press or focus after this one is the controller's. Every tap stays this listener's:
      // the controller tries it once loaded, the first included.
      main.removeEventListener("pointerdown", touch);
      main.removeEventListener("focusin", touch);
      const corner = target.closest("[data-corner]");
      if (corner && type === "pointerdown") {
        corner.setPointerCapture((event as PointerEvent).pointerId);
        corner.setAttribute("data-dragging", "");
      }
      import("@/lib/trials-live").then(
        (live) => live.start(hands, event),
        () => corner?.removeAttribute("data-dragging"),
      );
    };
    for (const type of TYPES) main.addEventListener(type, touch, off);
    // The link is the shown window's, which the canonical names at once: the address can lag a
    // held key's settles (lib/trials-live.ts, address). The live region says it and the line beside
    // the button shows it (.crew/sprint/64/words.md, 4 and 5).
    const copy = () => {
      const { pathname } = new URL(
        document.querySelector<HTMLLinkElement>("link[rel=canonical]")?.href ??
          location.href,
      );
      const [w = "", h = ""] = (one("[data-size]")?.textContent ?? "").split(
        " × ",
      );
      const say = (copied: boolean) => {
        const [heard, seen] = hands.copy[copied ? "done" : "failed"].map(
          (words) => words.replace("{w}", w).replace("{h}", h),
        );
        const live = one("[data-trials-live]");
        const line = one("[data-copied]");
        if (live) live.textContent = heard ?? "";
        if (line) line.textContent = seen ?? "";
      };
      const clipboard = navigator.clipboard;
      if (!clipboard) return say(false);
      clipboard.writeText(location.origin + pathname).then(
        () => say(true),
        () => say(false),
      );
    };
    one("[data-copy]")?.addEventListener("click", copy, off);
    return () => off.abort();
  }, [hands]);
  return null;
}
