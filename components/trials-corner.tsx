"use client";

import { useEffect } from "react";
import type { Hands } from "@/lib/trials-live";

// The trials page's only script before a touch (.crew/sprint/64/contract.md, T10: at most 1,024 B
// gzip beyond the 404's). It waits for the first pointerdown or focus on the frame's corner or
// the size inputs and only then imports the controller (lib/trials-live.ts), handing it that
// touch: a pointer already on the corner is captured here, so the drag holds while it loads.
// Copy link is here, not there, so its clipboard write runs in the click itself, as Safari asks.
// Not memoised by the React Compiler ("use no memo"): it renders nothing (components/model.tsx).

const TOUCHED = "[data-corner],[name=w],[name=h]";

export function TrialsCorner({ hands }: { hands: Hands }) {
  "use no memo";
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const one = (selector: string) => main.querySelector(selector);
    const touch = (event: Event) => {
      const target = event.target as Element;
      if (!target.closest?.(TOUCHED)) return;
      main.removeEventListener("pointerdown", touch);
      main.removeEventListener("focusin", touch);
      const corner = target.closest("[data-corner]");
      if (corner && event instanceof PointerEvent) {
        corner.setPointerCapture(event.pointerId);
        corner.setAttribute("data-dragging", "");
      }
      import("@/lib/trials-live").then(
        (live) => live.start(hands, event),
        () => corner?.removeAttribute("data-dragging"),
      );
    };
    main.addEventListener("pointerdown", touch);
    main.addEventListener("focusin", touch);
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
    one("[data-copy]")?.addEventListener("click", copy);
  }, [hands]);
  return null;
}
