import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { profile } from "@/content/profile";
import { cardText } from "@/lib/card";
import { cardFonts } from "@/lib/card-fonts";
import { LIGHT, LIGHT_LINES, SITE_URL } from "@/lib/site";
import { addressOf, type Win } from "@/lib/trials";
import { TRIAL_CARD, type TrialCardWords, trialCard } from "@/lib/trials-card";
import { signedOf, sweptTrial, type Trial } from "@/lib/trials-words";

// A window's card (.crew/sprint/64/contract.md, T15), in the step card's language
// (app/log/[n]/opengraph-image.tsx): the drawing on the left, the words on the right, and under an
// ink rule the owner's name, his role and the window's address. The drawing is the trials page's
// figure (app/globals.css, "The drawing"): the frame at the window's ratio with its two
// dimensions, the waterline at its foot over a hatched sea, and the freeboard dimension at its
// right edge from the contact links' foot to the waterline, under it when they sink. Light tokens
// and the site's faces, no copper: copper is for what is live, and a card is a still.

const fonts = await cardFonts();

const DISPLAY = "Sofia Sans Extra Condensed";

/** The foot's role: the root card's lead without its full stop, as the step card's foot. */
const ROLE = cardText(profile).lead.replace(/\.$/, "");

/** The drawing's box, in the card's pixels: the card's left column, its height the row's. */
const BOX = { width: 520, height: 440 } as const;
/** The dimensions' gutters, as the page's --gl, --gt and --gr, widened for the card's labels. */
const GUTTER = { left: 34, top: 36, right: 116 } as const;
/** A label's size, and its gap from the line it names. */
const LABEL = { size: 20, gap: 6 } as const;
/**
 * Where the freeboard's number and the Waterline label start, past the frame's right edge: clear
 * of the freeboard dimension's ticks (to +20), so a sinking window's dimension, which runs down
 * past the Waterline label, never meets it (as the page's --gr keeps them apart).
 */
const BESIDE = 26;
/** The sea under the waterline: its least depth, and how far it runs past sunken links. */
const SEA = { least: 18, past: 10 } as const;
/** Room under the waterline for the Waterline label, which sits a gap and a half below it. */
const UNDER = LABEL.gap * 2 + LABEL.size + 2;

/**
 * Each line's weight in the card's pixels: a network shows the card at 0.3 to 0.46 of its size,
 * so they run about 1.5 times the page's, as the step card's do (lib/card-ships.ts).
 */
const WEIGHT = { frame: 2, dimension: 1.5, links: 2, waterline: 3, sea: 1.5 };

/** One decimal: a tenth is under a pixel at the card's size. */
const num = (v: number) => String(Math.round(v * 10) / 10);

/**
 * Where everything lands, from the window and its signed freeboard. The frame keeps the window's
 * ratio and never draws it larger than itself; it fits the box's width, and its height with
 * whatever hangs under the waterline: the Waterline label, or sunken links and their label.
 */
function layoutOf([w, h]: Win, freeboard: number) {
  const sunk = Math.max(0, -freeboard);
  const hanging = LABEL.gap + LABEL.size + 2;
  const scale = Math.min(
    1,
    (BOX.width - GUTTER.left - GUTTER.right) / w,
    (BOX.height - GUTTER.top - UNDER) / h,
    (BOX.height - GUTTER.top - hanging) / (h + sunk),
  );
  const fw = w * scale;
  const fh = h * scale;
  const foot = GUTTER.top + fh;
  const links = foot - freeboard * scale;
  return {
    fw,
    fh,
    foot,
    links,
    sinks: links > foot,
    sea: Math.max(SEA.least, sunk * scale + SEA.past),
    width: GUTTER.left + fw + GUTTER.right,
    height: foot + Math.max(UNDER, sunk * scale + hanging),
  };
}

type Layout = ReturnType<typeof layoutOf>;

/** Every line of the drawing as one SVG, for its box's background (memory, sprint 54). */
function linesOf({ fw, fh, foot, links, sea, width, height }: Layout) {
  const { left: gl, top: gt } = GUTTER;
  const right = gl + fw;
  const ink = LIGHT.foreground;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}"/>`;
  // The freeboard dimension runs from the links' foot to the waterline, either way round.
  const [top, bottom] = links < foot ? [links, foot] : [foot, links];
  const source = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}">`,
    `<defs><pattern id="sea" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="${LIGHT_LINES.pencil}" stroke-width="${WEIGHT.sea}"/></pattern></defs>`,
    `<rect x="${num(gl)}" y="${num(foot + 2)}" width="${num(fw)}" height="${num(sea - 2)}" fill="url(#sea)"/>`,
    // The width over the frame and the height beside it, each between two ticks.
    `<g stroke="${LIGHT.muted}" stroke-width="${WEIGHT.dimension}">`,
    line(gl, 0, gl, gt),
    line(right, 0, right, gt),
    line(gl, gt / 2, right, gt / 2),
    line(0, gt, gl, gt),
    line(0, foot, gl, foot),
    line(gl / 2, gt, gl / 2, foot),
    "</g>",
    `<rect x="${num(gl)}" y="${num(gt)}" width="${num(fw)}" height="${num(fh)}" fill="${LIGHT_LINES.card}" stroke="${ink}" stroke-width="${WEIGHT.frame}"/>`,
    // The links' foot across the frame, or across the sea when they sink.
    `<g stroke="${ink}" stroke-width="${WEIGHT.links}" stroke-dasharray="6 4">${line(gl, links, right, links)}</g>`,
    `<g stroke="${ink}" stroke-width="${WEIGHT.waterline}">${line(0, foot, width, foot)}</g>`,
    `<g stroke="${ink}" stroke-width="${WEIGHT.dimension}">`,
    line(right, top, right + 20, top),
    line(right, bottom, right + 20, bottom),
    line(right + 14, top, right + 14, bottom),
    "</g>",
    "</svg>",
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}`;
}

/**
 * A label in the drawing, its box placed by `at` in the drawing's pixels with its text centred in
 * it. On a pad of `ground` it breaks the line or hatching under it, as the page's labels do.
 */
function Label({
  children,
  at,
  ground,
  bold,
}: {
  children: string;
  at: CSSProperties;
  ground?: string;
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
          ...(ground ? { padding: "0 6px", background: ground } : {}),
          fontSize: LABEL.size,
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
  const { fw, fh, foot, links, sinks, width, height } = layout;
  const { left: gl, top: gt } = GUTTER;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width,
        height,
        backgroundImage: `url(${linesOf(layout)})`,
        backgroundSize: "100% 100%",
      }}
    >
      <Label
        at={{
          top: gt / 2 - LABEL.size / 2,
          left: gl + fw / 2 - NUMBER_BOX / 2,
          width: NUMBER_BOX,
        }}
        ground={LIGHT.background}
      >
        {String(w)}
      </Label>
      {/* Turned to read up its dimension, as the page sets the height. */}
      <Label
        at={{
          top: gt + fh / 2 - LABEL.size / 2,
          left: gl / 2 - NUMBER_BOX / 2,
          width: NUMBER_BOX,
          transform: "rotate(-90deg)",
        }}
        ground={LIGHT.background}
      >
        {String(h)}
      </Label>
      {/* Over the links' line inside the frame, or under it in the sea when they sink. */}
      <Label
        at={{
          top: sinks ? links + LABEL.gap : links - LABEL.gap - LABEL.size,
          left: gl + (sinks ? 4 : 10),
        }}
        ground={sinks ? LIGHT.background : undefined}
      >
        Contact links
      </Label>
      <Label
        at={{ top: foot - LABEL.gap - 2 - LABEL.size, left: gl + fw + BESIDE }}
        bold
      >
        {signedOf(trial)}
      </Label>
      <Label at={{ top: foot + LABEL.gap * 1.5, left: gl + fw + BESIDE }}>
        Waterline
      </Label>
    </div>
  );
}

/** The card's words, every one from lib/trials-card.ts: the head, the answer, the verdict, the dare. */
function Words({ card }: { card: TrialCardWords }) {
  const [head, answer, verdict, dare] = card.lines;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
      }}
    >
      <div style={{ fontSize: 26, color: LIGHT.muted }}>{head}</div>
      <div
        style={{
          marginTop: 10,
          fontFamily: DISPLAY,
          fontSize: 88,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: -0.88,
        }}
      >
        {answer}
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {verdict}
      </div>
      <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.3 }}>{dare}</div>
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
  const trial = sweptTrial(win);
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
            alignItems: "center",
            justifyContent: "center",
            width: BOX.width,
          }}
        >
          <Drawing trial={trial} />
        </div>
        <Words card={card} />
      </div>
      <Foot win={win} />
    </div>,
    { width: TRIAL_CARD.width, height: TRIAL_CARD.height, fonts },
  );
}
