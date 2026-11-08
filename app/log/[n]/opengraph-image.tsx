import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { cardText } from "@/lib/card";
import { cardFonts } from "@/lib/card-fonts";
import { type CardShip, cardShips } from "@/lib/card-ships";
import { LIGHT, SITE_URL } from "@/lib/site";
import { readSprintLog } from "@/lib/sprint-log";
import { STEP_CARD, stepCard } from "@/lib/step-card";

// A step's own card (.crew/sprint/54/contract.md; Iris's "share card for /log/23" in
// .crew/sprint/52/design/yard-states.webp): both ships as they stood after sprint n, the Theseus
// above the ghost, beside the step's head, its headline and the page's count line, every word from
// lib/step-card.ts; under an ink rule, the owner's name in the condensed display face, his role at
// his employer, and the step's address. In the light tokens and the root card's faces (lib/card-fonts.ts).
// Prerendered for every step at build, as the records are. The page names it with the step's own
// alt (app/log/[n]/page.tsx): a card file's `alt` is one string for every step, and
// generateImageMetadata, which varies it, moves the image under a param no build-time list reaches.

export const size = { width: STEP_CARD.width, height: STEP_CARD.height };
export const contentType = STEP_CARD.type;

export function generateStaticParams() {
  return readSprintLog().map((entry) => ({ n: String(entry.sprint) }));
}

const fonts = await cardFonts();

/** The foot's role: the root card's lead without its full stop (Foot says why). */
const ROLE = cardText(profile).lead.replace(/\.$/, "");

/** The drawings' width: the card's left column, as the frame sets it. */
const SHIP_WIDTH = 600;
/** A plank number's size: the page's where a lift is this deep (about 14 px). */
const NUMBER_SIZE = 12;
/** A plank number's box, centred on its anchor or ending at it. */
const NUMBER_BOX = 40;
const DISPLAY = "Sofia Sans Extra Condensed";

/**
 * The headline's size in the display face: the largest that keeps it within four lines of the
 * column, by its length (the record's goals run from 50 to 137 characters, the question 25).
 */
function headlineSize(text: string) {
  if (text.length <= 30) return 72;
  if (text.length <= 75) return 60;
  if (text.length <= 100) return 52;
  return 44;
}

/**
 * A ship, the drawing its box's background, its plank numbers set over it in Sofia Sans, the step's
 * own in bold, as on the page.
 */
function Ship({ ship }: { ship: CardShip }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: ship.width,
        height: ship.height,
        backgroundImage: `url(${ship.src})`,
        backgroundSize: "100% 100%",
      }}
    >
      {ship.letters.map(({ text, align, x, y, current }) => (
        <div
          key={`${text}-${x}-${y}`}
          style={{
            position: "absolute",
            top: y - NUMBER_SIZE / 2,
            left:
              align === "start"
                ? x
                : x - (align === "end" ? NUMBER_BOX : NUMBER_BOX / 2),
            width: NUMBER_BOX,
            height: NUMBER_SIZE,
            display: "flex",
            justifyContent: {
              start: "flex-start",
              middle: "center",
              end: "flex-end",
            }[align],
            fontSize: NUMBER_SIZE,
            lineHeight: 1,
            fontWeight: current ? 700 : 400,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}

/** The step's words: its head, small and muted; the headline in the display face; the count line. */
function Words({ card }: { card: ReturnType<typeof stepCard> }) {
  const headline = headlineSize(card.headline);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
      }}
    >
      <div style={{ fontSize: 22, color: LIGHT.muted }}>{card.head}</div>
      <div
        style={{
          marginTop: 12,
          fontFamily: DISPLAY,
          fontSize: headline,
          fontWeight: 700,
          lineHeight: 1.02,
          letterSpacing: -headline / 100,
          textWrap: "balance",
        }}
      >
        {card.headline}
      </div>
      <div style={{ marginTop: 20, fontSize: 24, lineHeight: 1.4 }}>
        {card.body}
      </div>
    </div>
  );
}

/**
 * Under an ink rule: the owner's name, his role at his employer and the step's address. The role is
 * the root card's lead, the bio's first sentence (lib/card.ts), without its full stop: the one
 * place the unfurl says who he is, so it names the scale an executive reads (Atlas's call).
 */
function Foot({ sprint }: { sprint: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        marginTop: 28,
        paddingTop: 16,
        borderTop: `2px solid ${LIGHT.foreground}`,
      }}
    >
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 48,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {profile.name}
      </div>
      <div style={{ fontSize: 28 }}>{ROLE}</div>
      <div style={{ marginLeft: "auto", fontSize: 22, color: LIGHT.muted }}>
        {`${new URL(SITE_URL).host}/log/${sprint}`}
      </div>
    </div>
  );
}

export default async function StepCardImage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const entries = readSprintLog();
  const step = entries.find((entry) => String(entry.sprint) === n);
  if (!step) return new Response("Not Found", { status: 404 });
  // The planks are seated oldest first, as on the page.
  const merged = entries.map((entry) => entry.sprint).reverse();
  const ships = cardShips(merged, step.sprint, SHIP_WIDTH);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px 40px",
        background: LIGHT.background,
        color: LIGHT.foreground,
        fontFamily: "Sofia Sans",
      }}
    >
      <div style={{ display: "flex", flex: 1, gap: 44 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 40,
            width: SHIP_WIDTH,
          }}
        >
          <Ship ship={ships.theseus} />
          <Ship ship={ships.ghost} />
        </div>
        <Words card={stepCard(entries, step.sprint)} />
      </div>
      <Foot sprint={step.sprint} />
    </div>,
    { ...size, fonts },
  );
}
