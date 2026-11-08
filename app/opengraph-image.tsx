import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { cardText } from "@/lib/card";
import { cardFonts } from "@/lib/card-fonts";
import { LIGHT } from "@/lib/site";

// The card a shared link shows, generated at build time (.crew/sprint/41/contract.md, P15): the
// owner's name, his bio's first sentence and the particulars the sheet quotes from his JPMorgan
// summary, every word from lib/card.ts, so the proof reads on the card itself. Set in the site's
// faces from the TTFs lib/card.ts names, the name in the condensed display face as / sets it and
// the rest in Sofia Sans, in the light tokens. The table is ruled as the sheet's particulars are,
// its head rule in ink: copper is for what is live.

const card = cardText(profile);

export const alt = `${card.name}, ${card.lead}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Every face lib/card.ts names, read once (lib/card-fonts.ts).
const fonts = await cardFonts();

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: LIGHT.background,
        color: LIGHT.foreground,
        fontFamily: "Sofia Sans",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            fontFamily: "Sofia Sans Extra Condensed",
            fontSize: 128,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -1.28,
          }}
        >
          {card.name}
        </div>
        <div style={{ fontSize: 44, lineHeight: 1.2 }}>{card.lead}</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderTop: `2px solid ${LIGHT.foreground}`,
        }}
      >
        {card.rows.map(({ term, phrase }, i) => (
          <div
            key={term}
            style={{
              display: "flex",
              gap: 24,
              padding: "10px 0",
              borderTop: i === 0 ? "none" : `1px solid ${LIGHT.rule}`,
              fontSize: 30,
              lineHeight: 1.3,
            }}
          >
            <div
              style={{
                width: 128,
                flexShrink: 0,
                color: LIGHT.muted,
                fontWeight: 700,
              }}
            >
              {term}
            </div>
            <div style={{ flex: 1 }}>{phrase}</div>
          </div>
        ))}
      </div>
    </div>,
    { ...size, fonts },
  );
}
