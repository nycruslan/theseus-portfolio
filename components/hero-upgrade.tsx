"use client";

import { type ReactNode, useEffect, useRef } from "react";

type Device = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** Whether this device should get the WebGL hull at all (.crew/sprint/9/contract.md, "The gate"). */
function capable() {
  const device = navigator as Device;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (device.connection?.saveData === true) return false;
  // Undefined passes: a browser that doesn't say is caught by the other gates if it is weak.
  if ((device.hardwareConcurrency ?? 4) < 4) return false;
  if ((device.deviceMemory ?? 4) < 4) return false;
  // A throwaway context that the browser may refuse for a software or blocklisted GPU. It is the
  // only WebGL request before the renderer loads, and it is freed straight away.
  const probe = document
    .createElement("canvas")
    .getContext("webgl", { failIfMajorPerformanceCaveat: true });
  probe?.getExtension("WEBGL_lose_context")?.loseContext();
  return probe !== null;
}

/**
 * The hero's box, and the gate in front of its WebGL upgrade. Everything here is first-load code,
 * so it holds no shader: after the load event, once the box is within a viewport of the screen and
 * the browser is idle, it asks a capable device for the renderer (components/hero-gl.ts, its own
 * chunk), which draws the same hull over the SVG. Anything else keeps the SVG.
 */
export function HeroUpgrade({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let near: IntersectionObserver | undefined;
    let cancelIdle = () => {};
    let live = true;
    const upgrade = () => {
      if (!capable()) return;
      // A chunk that fails to load (offline, a new deploy) leaves the SVG, which is the design.
      import("./hero-gl")
        .then(({ mountHull }) => {
          if (live) mountHull(el);
        })
        .catch(() => undefined);
    };
    const whenIdle = () => {
      if (typeof requestIdleCallback === "function") {
        const id = requestIdleCallback(upgrade, { timeout: 2000 });
        cancelIdle = () => cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(upgrade, 1);
        cancelIdle = () => clearTimeout(id);
      }
    };
    const watch = () => {
      // Within one viewport height of the screen, above or below.
      near = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          near?.disconnect();
          whenIdle();
        },
        { rootMargin: `${innerHeight}px 0px` },
      );
      near.observe(el);
    };
    if (document.readyState === "complete") watch();
    else addEventListener("load", watch, { once: true });
    return () => {
      live = false;
      removeEventListener("load", watch);
      near?.disconnect();
      cancelIdle();
    };
  }, []);

  return (
    <div ref={box} data-hero aria-hidden="true" className="hero">
      {children}
    </div>
  );
}
