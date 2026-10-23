"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Open } from "@/lib/model/mount";

// The model's client code, the only script / ships with the model Off, so it is one module and
// stays this small (B2.10, 2,048 B decoded over /sprints'): the motion mode, the bar's control for
// it, and the model's loader. A module of its own costs about 165 B, and neither component is
// memoised by the React Compiler ("use no memo"): its cache and runtime cost 633 B here and save
// no work, since each renders a handful of elements (.crew/sprint/27/).

// The motion mode (.crew/sprint/27/contract.md, "The mode"): Full, Calm or Off, read by the control
// and the loader with useSyncExternalStore. A press is kept on the device; until there is one, the
// device's hints set the mode and are followed live.

type Mode = "full" | "calm" | "off";

const KEY = "theseus:motion";
const REDUCE = "(prefers-reduced-motion: reduce)";
/** This visit's press: it holds for the visit when storage throws. */
let pressed: Mode | undefined;
/** The loader's WebGL 2 probe failed: Off is all there is, and Full and Calm can't be pressed. */
let refused = false;

/** A press or a refusal, told to both readers as an event of the key's name. */
const notify = () => dispatchEvent(new Event(KEY));

function subscribe(listener: () => void) {
  const reduce = matchMedia(REDUCE);
  addEventListener(KEY, listener);
  reduce.addEventListener("change", listener);
  return () => {
    removeEventListener(KEY, listener);
    reduce.removeEventListener("change", listener);
  };
}

function stored(): Mode | undefined {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "full" || value === "calm" || value === "off") return value;
  } catch {
    // Storage is blocked: the hints decide.
  }
  return undefined;
}

const read = (): Mode =>
  refused
    ? "off"
    : (pressed ??
      stored() ??
      ((navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData
        ? "off"
        : matchMedia(REDUCE).matches
          ? "calm"
          : "full"));

/** The server's snapshot: no scripts, so no mode. */
const server = () => null;

function press(mode: Mode) {
  pressed = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Storage is blocked: the choice holds for this visit.
  }
  notify();
}

const LABELS = ["Full", "Calm", "Off"];

/**
 * Full, Calm, Off (.crew/sprint/27/contract.md, "The control"): three pressed-or-not buttons in the
 * bar's slot. They only exist where scripts run, since without them none could do anything: the
 * server and the hydrating render draw the slot empty, at the group's size, so nothing moves when
 * they arrive (app/globals.css, "The motion control").
 */
export function MotionControl() {
  "use no memo";
  const mode = useSyncExternalStore(subscribe, read, server);
  return (
    <div data-motion="" data-mode={mode}>
      {mode && (
        <fieldset aria-label="Motion">
          {LABELS.map((label) => {
            const value = label.toLowerCase() as Mode;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={value === mode}
                disabled={refused && value !== "off"}
                onClick={() => press(value)}
              >
                {label}
              </button>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}

type Run = { stop(): void; settle(): void };
/** The model's mount now, if any: the page has one layer. */
let current: Run | undefined;

/**
 * One mount of the model: after load, on idle, it checks the page can show it (a screen with no
 * forced colours, and last, one throwaway WebGL 2 context) and only then imports the scene. With
 * no WebGL 2 the control is told, and the drawing is the page.
 */
function begin(host: HTMLElement, seated: readonly string[], open: Open): Run {
  let gone = false;
  let model: Run | undefined;
  const run = () => {
    if (gone || !matchMedia("screen and (forced-colors: none)").matches) {
      return;
    }
    const probe = document.createElement("canvas").getContext("webgl2");
    if (!probe) {
      refused = true;
      notify();
      return;
    }
    probe.getExtension("WEBGL_lose_context")?.loseContext();
    import("@/lib/model/mount").then(
      ({ mount }) => {
        if (!gone) model = mount(host, seated, open);
      },
      () => {},
    );
  };
  const idle = () => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 2000 });
    } else setTimeout(run, 1);
  };
  // Stopped before load, the listener stays and finds the run gone.
  if (document.readyState === "complete") idle();
  else addEventListener("load", idle);
  return {
    stop() {
      gone = true;
      model?.stop();
    },
    settle() {
      open = "settled";
      model?.settle();
    },
  };
}

// The model's loader (.crew/sprint/25/contract.md, "Where" and "When"; .crew/sprint/27/contract.md,
// "The modes and the model"): `[data-model]`, the white card model's layer over the drawing, empty
// until the 3D chunk fills it. The motion mode decides: Off never probes or imports; Calm opens
// settled; Full lofts once a visit. A press of Full builds the model again and lofts; Calm settles
// a loft.
export function Model({ seated }: { seated: readonly string[] }) {
  "use no memo";
  const ref = useRef<HTMLDivElement>(null);
  const mode = useSyncExternalStore(subscribe, read, server);
  // The layer only leaves with the page, whose pagehide the mount answers itself, so nothing is
  // torn down on unmount.
  useEffect(() => {
    const host = ref.current;
    if (!host || !mode) return;
    if (current && mode === "calm") return current.settle();
    // Full from Calm: a hint changed, and the model stays settled; or Full was pressed, and it lofts.
    if (current && mode === "full" && !pressed) return;
    current?.stop();
    current =
      mode === "full" || mode === "calm"
        ? begin(
            host,
            seated,
            mode === "calm" ? "settled" : pressed ? "loft" : "auto",
          )
        : undefined;
  }, [mode, seated]);
  return <div data-model="" aria-hidden="true" ref={ref} />;
}
