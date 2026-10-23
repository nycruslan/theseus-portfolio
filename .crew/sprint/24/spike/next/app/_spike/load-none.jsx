"use client";

// B3 spike, S1's baseline: the same idle scheduling as load-a.jsx and load-b.jsx, and no import.
// The bytes the other two fetch beyond this page's are the 3D chunk.
import { useEffect } from "react";

export function LoadNone() {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run) => setTimeout(run, 1));
    idle(() => {
      document.documentElement.dataset.scene = JSON.stringify({ option: "none" });
    });
  }, []);
  return null;
}
