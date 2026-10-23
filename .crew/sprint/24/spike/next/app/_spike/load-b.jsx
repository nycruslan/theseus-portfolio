"use client";

// B3 spike, S1: after first paint and on idle, import the scene and the loft's inputs, mount on
// the page's canvas and draw the registered frame. Everything the 3D needs is behind import().
import { useEffect } from "react";

export function LoadB() {
  useEffect(() => {
    let cancelled = false;
    const idle = window.requestIdleCallback ?? ((run) => setTimeout(run, 1));
    idle(async () => {
      const root = document.documentElement;
      try {
        const [{ mount, option }, { posesFor }] = await Promise.all([
          import("./scene/scene-webgpu.js"),
          import("./scene/poses.js"),
        ]);
        if (cancelled) return;
        const canvas = document.getElementById("scene");
        const poses = posesFor("wide", 1408, window.innerHeight);
        canvas.style.width = `${poses.width}px`;
        canvas.style.height = `${poses.height}px`;
        const stage = await mount(canvas, {
          ...poses,
          dpr: Math.min(window.devicePixelRatio, 2),
          level: "desktop",
          states: new Map(),
        });
        const first = stage.frame(0);
        const last = stage.frame(1);
        root.dataset.scene = JSON.stringify({ option, first, last });
      } catch (error) {
        root.dataset.scene = JSON.stringify({ error: String(error) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
