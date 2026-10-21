// Writes shots.json: every frame the canvas needs, from one set of layout numbers.
import { writeFileSync } from "node:fs";
import { LENGTH, HEIGHT } from "./hull.mjs";

const merged = Array.from({ length: 15 }, (_, i) => i + 1); // sprints 1 to 15, all on main
const live = { merged, pencil: true, pencilSprint: 17, live: true };

// Desktop sheet, 1440 x 900.
const D = { ox: 92, oy: 168, s: 1.3, hbY: 478, bx: 1196, bs: 1.3, by: 168 };
const deskPlan = { ...D };
const registered = { cx: D.ox + (LENGTH / 2) * D.s, cy: D.oy + (HEIGHT / 2) * D.s, s: D.s, yaw: 0, pitch: 0, z: 96 };
const settled = { cx: 492, cy: 300, s: 1.2, yaw: -30, pitch: 15, z: 170 };
const desk = (extra) => ({ w: 1440, h: 900, plan: deskPlan, ...live, from: registered, to: settled, ...extra });

// Phone sheet, 390 x 844: the body plan only.
const Ph = { bx: 195, by: 132, bs: 1.5, profile: false, halfBreadth: false, s: 1.5, ox: 0, oy: 132 };
const phoneRegistered = { cx: Ph.bx, cy: Ph.by + (HEIGHT / 2) * Ph.bs, s: Ph.bs, yaw: -90, pitch: 0, z: 400 };
const phoneSettled = { cx: 195, cy: 236, s: 0.5, yaw: -36, pitch: 16, z: 150 };
const phone = (extra) => ({ w: 390, h: 844, plan: Ph, ...live, from: phoneRegistered, to: phoneSettled, lens: 1500, ...extra });

const rest = { merged, pencil: false, live: false };
const crewPose = { cx: 700, cy: 395, s: 2.5, yaw: -16, pitch: 9, z: 260 };
const ghostPose = { cx: 600, cy: 330, s: 1.45, yaw: -20, pitch: 12, z: 150 };
const phoneCrew = { cx: 300, cy: 250, s: 1.25, yaw: -22, pitch: 12, z: 200 };
const phoneGhost = { cx: 195, cy: 230, s: 0.56, yaw: -26, pitch: 14, z: 150 };
const sb = (u, extra) => desk({ t: u, dpr: 1, ...extra });
const shots = [
  { name: "desk-hero", params: desk({ t: 1, numbers: [15, "pencil"] }) },
  { name: "desk-rest", params: desk({ t: 1, ...rest, numbers: [15] }) },
  { name: "desk-off", params: desk({ webgl: false, planks2d: true }) },
  { name: "desk-night", params: desk({ t: 1, theme: "dark", numbers: [15, "pencil"] }) },
  { name: "desk-crew", params: desk({ t: 1, from: crewPose, to: crewPose, numbers: "all", drawingOpacity: 0.55 }) },
  { name: "desk-ghost", params: desk({ t: 1, from: ghostPose, to: ghostPose, ghostHull: true, numbers: "all", drawing: false }) },
  { name: "sb-0-paint", params: sb(0, { webgl: false }) },
  { name: "sb-1-body", params: sb(0, { live: false }) },
  { name: "sb-2-lift", params: sb(0.07, { live: false }) },
  { name: "sb-3-turn", params: sb(0.18, { live: false }) },
  { name: "sb-4-settle", params: sb(0.42, {}) },
  { name: "sb-5-live", params: sb(1, { numbers: [15, "pencil"] }) },
  { name: "phone-hero", params: phone({ t: 1, numbers: [15, "pencil"] }) },
  { name: "phone-rest", params: phone({ t: 1, ...rest, numbers: [15] }) },
  { name: "phone-paint", params: phone({ webgl: false, dpr: 1 }) },
  { name: "phone-body", params: phone({ t: 0, live: false, dpr: 1 }) },
  { name: "phone-settled", params: phone({ t: 1, dpr: 1, numbers: [15, "pencil"] }) },
  { name: "phone-crew", params: phone({ t: 1, from: phoneCrew, to: phoneCrew, numbers: "all", drawingOpacity: 0.5 }) },
  { name: "phone-ghost", params: phone({ t: 1, from: phoneGhost, to: phoneGhost, ghostHull: true, numbers: "all", drawing: false }) },
];
writeFileSync(new URL("./shots.json", import.meta.url), JSON.stringify(shots, null, 1));
console.log(shots.length, "shots");
