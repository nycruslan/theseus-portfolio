"use client";

import { useSyncExternalStore } from "react";

// Nothing to subscribe to: whether scripts run never changes once the page is up.
const subscribe = () => () => {};

/**
 * /read's Print control (.crew/sprint/23/contract.md, "The calls I made"). A button that only
 * exists where scripts run, since without them it could do nothing: the server and the first
 * hydrating render draw nothing, and the button appears once the page is live, into a slot the
 * strip keeps for it, so nothing moves (app/globals.css, "The strip"). Ctrl or Cmd+P prints the
 * same page either way.
 */
export function PrintButton() {
  const scripted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!scripted) return null;
  return (
    <button
      type="button"
      className="print-button"
      onClick={() => window.print()}
    >
      Print
    </button>
  );
}
