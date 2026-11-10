import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { profile } from "@/content/profile";
import { cardText } from "@/lib/card";
import { cardFonts } from "@/lib/card-fonts";
import { LIGHT, LIGHT_LINES, SITE_URL } from "@/lib/site";
import { addressOf, type Win } from "@/lib/trials";
import { TRIAL_CARD, type TrialCardWords, trialCard } from "@/lib/trials-card";
import { signedOf, sweptTrial, type Trial } from "@/lib/trials-words";

// A window's card (.crew/sprint/64/contract.md, T15), laid out as Iris placed it
// (.crew/sprint/64/placement.md, 6) in the step card's grammar (app/log/[n]/opengraph-image.tsx):
// the drawing on the left, the words on the right centred on its frame, and under an ink rule the
// owner's name, his role and the window's address. The drawing is the trials page's figure
// (app/globals.css, "The drawing") in card weights, and draws only what the sweep measured: the
// window, with its two dimensions and the waterline at its foot over a hatched sea, and the
// freeboard to scale at its right edge, running down into the sea when the links sink. Paper fills
// the frame: the card doesn't pretend to render the page. Light tokens and the cards' faces, and no
// copper, which means live: a card is a still of the sweep.

const fonts = await cardFonts();

const DISPLAY = "Sofia Sans Extra Condensed";

/** The foot's role: the root card's lead without its full stop, as the step card's foot. */
const ROLE = cardText(profile).lead.replace(/\.$/, "");

/** The card's inner width, and the row above the foot: the card's height less its padding and foot. */
const INNER = TRIAL_CARD.width - 2 * 56;
const ROW = 448;
/** The drawing's column, and the gap before the words. */
const DRAWING = 480;
const GAP = 44;

/** The most the frame may take in either direction, and the gutters its dimensions take. */
const FRAME_MAX = 340;
const GUTTER = { left: 36, top: 36 } as const;
/**
 * Past the frame's right edge: the freeboard dimension's ticks (18 px), then its label from +24.
 * Wide enough that `Waterline`, set at the drawing's right end, starts clear of a sinking window's
 * dimension line (13 px out), as the page's --gr keeps them apart.
 */
const RIGHT = 124;
/** The sea's depth under the waterline. */
const SEA = 16;

/** Line weights in card pixels, about 1.5 times the page's (placement.md, 6). */
const WEIGHT = { frame: 2, dimension: 2, freeboard: 2, waterline: 3, sea: 1.5 };

/** Label sizes: the dimensions' and Waterline, and the signed freeboard's. */
const LABEL = 22;
const SIGNED = 30;

/** One decimal: a tenth is under a pixel at the card's size. */
const num = (v: number) => String(Math.round(v * 10) / 10);

/**
 * Where the drawing's parts land in its column, from the window and its signed freeboard. The frame
 * keeps the window's ratio within FRAME_MAX and the column's width less its gutters, never larger
 * than the window itself, and its centre sits on the row's, where the words centre too. At 340 tall
 * the width dimension above it and the Waterline label below it stay in the row; a sinking window's
 * dimension can reach further down, so the frame shrinks until that fits too.
 */
function layoutOf([w, h]: Win, freeboard: number) {
  const sunk = Math.max(0, -freeboard);
  const scale = Math.min(
    1,
    Math.min(FRAME_MAX, DRAWING - GUTTER.left - RIGHT) / w,
    FRAME_MAX / h,
    (ROW / 2 - 2) / (h / 2 + sunk),
  );
  const half = ROW / 2;
  const fw = w * scale;
  const fh = h * scale;
  const top = half - fh / 2;
  const foot = top + fh;
  return { fw, fh, top, foot, links: foot - freeboard * scale };
}

type Layout = ReturnType<typeof layoutOf>;

/** Every line of the drawing as one SVG, for its column's background (memory, sprint 54). */
function linesOf({ fw, top, foot, links }: Layout) {
  const left = GUTTER.left;
  const right = left + fw;
  const above = top - GUTTER.top;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}"/>`;
  // The freeboard dimension runs from the links' foot to the waterline, either way round.
  const [from, to] = links < foot ? [links, foot] : [foot, links];
  const source = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DRAWING}" height="${ROW}" viewBox="0 0 ${DRAWING} ${ROW}">`,
    // The sea at 135 degrees, as the page's, under the frame only.
    `<defs><pattern id="sea" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="${LIGHT_LINES.pencil}" stroke-width="${WEIGHT.sea}"/></pattern></defs>`,
    `<rect x="${num(left)}" y="${num(foot + WEIGHT.waterline / 2)}" width="${num(fw)}" height="${SEA - WEIGHT.waterline / 2}" fill="url(#sea)"/>`,
    // The width over the frame and the height beside it, each between its extension ticks.
    `<g stroke="${LIGHT.muted}" stroke-width="${WEIGHT.dimension}">`,
    line(left, above, left, top),
    line(right, above, right, top),
    line(left, above + GUTTER.top / 2, right, above + GUTTER.top / 2),
    line(0, top, left, top),
    line(0, foot, left, foot),
    line(left / 2, top, left / 2, foot),
    "</g>",
    `<rect x="${num(left)}" y="${num(top)}" width="${num(fw)}" height="${num(foot - top)}" fill="${LIGHT_LINES.card}" stroke="${LIGHT.foreground}" stroke-width="${WEIGHT.frame}"/>`,
    `<g stroke="${LIGHT.foreground}" stroke-width="${WEIGHT.waterline}">${line(0, foot, DRAWING, foot)}</g>`,
    `<g stroke="${LIGHT.foreground}" stroke-width="${WEIGHT.freeboard}">`,
    line(right, from, right + 18, from),
    line(right, to, right + 18, to),
    line(right + 13, from, right + 13, to),
    "</g>",
    "</svg>",
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}`;
}

/**
 * A label in the drawing, its box placed by `at` with its text centred in it. On a pad of the
 * card's ground it breaks the line under it, as the page's dimension labels do.
 */
function Label({
  children,
  at,
  pad,
  size = LABEL,
  bold,
}: {
  children: string;
  at: CSSProperties;
  pad?: boolean;
  size?: number;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        justifyContent: "center",
        ...at,
      }}
    >
      <div
        style={{
          display: "flex",
          // Satori reads every key it is given, so a label without a pad has no background key.
          ...(pad ? { padding: "0 6px", background: LIGHT.background } : {}),
          fontSize: size,
          lineHeight: 1,
          fontWeight: bold ? 700 : 400,
          color: bold ? LIGHT.foreground : LIGHT.muted,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The box a dimension's number centres in: wide enough for any window's. */
const NUMBER_BOX = 80;

function Drawing({ trial }: { trial: Trial }) {
  const [w, h] = trial.win;
  const layout = layoutOf(trial.win, trial.freeboard);
  const { fw, fh, top, foot } = layout;
  const left = GUTTER.left;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: DRAWING,
        height: ROW,
        backgroundImage: `url(${linesOf(layout)})`,
        backgroundSize: "100% 100%",
      }}
    >
      <Label
        at={{
          top: top - GUTTER.top / 2 - LABEL / 2,
          left: left + fw / 2 - NUMBER_BOX / 2,
          width: NUMBER_BOX,
        }}
        pad
      >
        {String(w)}
      </Label>
      {/* Turned to read up its dimension, as the page sets the height. */}
      <Label
        at={{
          top: top + fh / 2 - LABEL / 2,
          left: left / 2 - NUMBER_BOX / 2,
          width: NUMBER_BOX,
          transform: "rotate(-90deg)",
        }}
        pad
      >
        {String(h)}
      </Label>
      {/* Its foot 6 px above the waterline, beside the freeboard dimension. */}
      <Label
        at={{ top: foot - 6 - SIGNED, left: left + fw + 24 }}
        size={SIGNED}
        bold
      >
        {signedOf(trial)}
      </Label>
      <Label at={{ top: foot + 8, right: 0 }}>Waterline</Label>
    </div>
  );
}

/**
 * The headline's size, the largest of 96, 84 and 72 that keeps it on one line in the words'
 * column (placement.md, 6). By its length, as the step card sizes its headline: the widest the
 * sweep gives, "Under by 197.1 px.", sets 460 px wide at 88 px, about 28 px a character at 96, so
 * the column holds 20 characters at 96, 23 at 84 and 26 at 72.
 */
function headlineSize(text: string) {
  if (text.length <= 20) return 96;
  if (text.length <= 23) return 84;
  return 72;
}

/** The card's words, every one from lib/trials-card.ts, centred on the frame. */
function Words({ card }: { card: TrialCardWords }) {
  const [head, size, answer, verdict, dare] = card.lines;
  const headline = headlineSize(answer);
  const display = { fontFamily: DISPLAY, fontWeight: 700, lineHeight: 1 };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: INNER - DRAWING - GAP,
        height: ROW,
      }}
    >
      <div style={{ fontSize: 24, color: LIGHT.muted }}>{head}</div>
      <div style={{ ...display, marginTop: 8, fontSize: 60 }}>{size}</div>
      <div
        style={{
          ...display,
          marginTop: 14,
          fontSize: headline,
          letterSpacing: -headline / 100,
        }}
      >
        {answer}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.2,
          textWrap: "balance",
        }}
      >
        {verdict}
      </div>
      <div
        style={{
          marginTop: 20,
          fontSize: 26,
          lineHeight: 1.3,
          color: LIGHT.muted,
          textWrap: "balance",
        }}
      >
        {dare}
      </div>
    </div>
  );
}

/** Under an ink rule: the owner's name, his role and the window's address, as a step card's foot. */
function Foot({ win }: { win: Win }) {
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
        {`${new URL(SITE_URL).host}${addressOf(win)}`}
      </div>
    </div>
  );
}

/** A window's card as a PNG, or a 404 for a window off the sweep, which never gets one. */
export function trialCardResponse(win: Win): Response {
  const card = trialCard(win);
  if (!card) return new Response("Not Found", { status: 404 });
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
      <div style={{ display: "flex", height: ROW, gap: GAP }}>
        <Drawing trial={sweptTrial(win)} />
        <Words card={card} />
      </div>
      <Foot win={win} />
    </div>,
    { width: TRIAL_CARD.width, height: TRIAL_CARD.height, fonts },
  );
}
