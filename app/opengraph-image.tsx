import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { CARD_FONTS, cardText } from "@/lib/card";
import { LIGHT } from "@/lib/site";

// The card a shared link shows, generated at build time (.crew/sprint/41/contract.md, P15): the
// owner's name, his bio's first sentence and the particulars the sheet quotes from his JPMorgan
// summary, every word from lib/card.ts, so the proof reads on the card itself. Set in Sofia Sans,
// the site's text face, from the TTFs lib/card.ts names, in the light tokens. The table is ruled
// as the sheet's particulars are, its head rule in ink: copper is for what is live.

const card = cardText(profile);

export const alt = `${card.name}, ${card.lead}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Every face lib/card.ts names, read once. The folder is spelled in the call so the build traces
// assets/fonts alone into the server code, which draws a record's card on request (/log/[n]): a
// path wholly from a variable makes it trace, and ship, the whole project.
const [regular, bold] = CARD_FONTS;
const face = async (path: string, weight: 400 | 700) => ({
  name: "Sofia Sans",
  data: await readFile(join(process.cwd(), "assets/fonts", basename(path))),
  weight,
  style: "normal" as const,
});
const fonts = await Promise.all([face(regular, 400), face(bold, 700)]);

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
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: 104,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -2,
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
