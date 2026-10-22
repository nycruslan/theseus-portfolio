import { ImageResponse } from "next/og";
import { LIGHT } from "@/lib/site";

// Browsers, feed readers and crawlers still ask for /favicon.ico whatever the page links, so it
// answers with app/icon.svg's mark as a 32 px PNG, in the light tokens. A route rather than an
// app/favicon.ico file: the file would add a second icon link that some browsers prefer over the
// SVG, which follows the dark scheme.
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: LIGHT.background,
      }}
    >
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
        <path
          d="M11 25V7h6.5a5.5 5.5 0 0 1 0 11H11m6 0 5.5 7"
          fill="none"
          stroke={LIGHT.foreground}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    { width: 32, height: 32 },
  );
}
