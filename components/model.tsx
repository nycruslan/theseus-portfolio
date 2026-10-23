"use client";

import { useEffect, useRef } from "react";

// The model's loader (.crew/sprint/25/contract.md, "Where" and "When"; .crew/sprint/26/contract.md
// drops the width): `[data-model]`, the white card model's layer over the drawing, empty until the
// 3D chunk fills it. It is the only client code / ships with the model Off, so it stays this small
// (B2.10). After load, on idle, it checks the page wants the model: a screen at any width, no
// forced colours, no Save-Data, and last, one throwaway WebGL 2 context. Only then does it import
// the scene. Otherwise the drawing is the page and no 3D is downloaded.
export function Model({ seated }: { seated: readonly string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let gone = false;
    let stop: (() => void) | undefined;
    const run = () => {
      const host = ref.current;
      const save = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection?.saveData;
      if (
        gone ||
        !host ||
        save ||
        !matchMedia("screen and (forced-colors: none)").matches
      ) {
        return;
      }
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) return;
      probe.getExtension("WEBGL_lose_context")?.loseContext();
      import("@/lib/model/mount").then(
        ({ mount }) => {
          if (!gone) stop = mount(host, seated);
        },
        () => {},
      );
    };
    const idle = () => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(run, { timeout: 2000 });
      } else setTimeout(run, 1);
    };
    if (document.readyState === "complete") idle();
    else addEventListener("load", idle, { once: true });
    return () => {
      gone = true;
      removeEventListener("load", idle);
      stop?.();
    };
  }, [seated]);
  return <div data-model="" aria-hidden="true" ref={ref} />;
}
