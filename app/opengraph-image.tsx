import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { LIGHT, SITE_URL } from "@/lib/site";

// The card a shared link shows: the page's own header in the light tokens, generated at build time.
// It uses next/og's built-in Geist, the site's own typeface.

export const alt = `${profile.name}, ${profile.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: LIGHT.background,
        color: LIGHT.foreground,
      }}
    >
      <div style={{ width: 120, height: 8, background: LIGHT.accent }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 128, lineHeight: 1, letterSpacing: -4 }}>
          {profile.name}
        </div>
        <div style={{ fontSize: 48 }}>{profile.headline}</div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${LIGHT.rule}`,
          paddingTop: 24,
          fontSize: 28,
          color: LIGHT.muted,
        }}
      >
        <span>{profile.location}</span>
        <span>{new URL(SITE_URL).host}</span>
      </div>
    </div>,
    size,
  );
}
