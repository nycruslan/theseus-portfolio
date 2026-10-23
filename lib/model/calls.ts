// Iris's calls on the loft (.crew/sprint/25/notes-iris.md, calls 1 to 8; decision 7 records the
// ones that change a number the contract names). Each call is one constant here, so a change of
// mind is a one-line change. Call 5's hollow drawing and call 8's reduced-motion fade are CSS rules
// in app/globals.css, "The model": the fade is 240 ms, linear, under prefers-reduced-motion only.

/** The loft's length in ms (call 1: the direction's 2.4 s stands). */
export const DURATION = 2400;

/** The ease's exponent, 2^(−EASE_K·u), softer than the contract's 10 (call 2). */
const EASE_K = 7;
/** The ease-in's share of the duration: 120 ms at 2.4 s, so the move doesn't start at full speed. */
const EASE_IN = 0.05;

/**
 * The eased progress at u, the share of the duration (call 2, word for word): the exponential
 * ease-out normalised to reach 1 at u = 1, times a smoothstep over the first EASE_IN. The product
 * is C1, since the smoothstep's slope is 0 where it hands over.
 */
export function ease(u: number) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const t = Math.min(1, u / EASE_IN);
  return ((1 - 2 ** (-EASE_K * u)) / (1 - 2 ** -EASE_K)) * t * t * (3 - 2 * t);
}

/** What the loft holds as the model lifts: its framed height, never its width (call 3). */
export const HOLD: "height" | "width" = "height";
/** From 768 px the framed height follows (1 + GROW × e) × frame 1's, as main.webp (call 3). */
export const GROW = 0.1;

/**
 * The settled pose (sprint 17's approved three-quarter view): turn in degrees, and the offset
 * from the registered pose in the drawing's own units, so at 1024 it is the 1440 pose scaled by
 * the drawing's width (call 7). The lens is 30° over the viewport's height at every width. dx
 * sets the bow at station 9.1 at 1440, 70 px clear of the drawing's own, as main.webp does
 * (Iris's early look; sprint 17's −6 put it at 9.5).
 */
export const SETTLE = { dx: -30, dy: 40, yaw: -30, pitch: 15 };

/**
 * Below 768 px, on the narrow drawing (.crew/sprint/26/contract.md, "The phone's loft"): the framed
 * height follows (1 + G_NARROW × e²) × frame 1's (Iris's call, .crew/sprint/26/notes-iris.md, 1;
 * the square by decision 9, so the growth arrives with the turn's foreshortening). The turn to
 * −36° foreshortens the hull to 0.80 of its length; 0.25 pays that back, so the model settles as
 * long as the drawing it left (310 px at 390, 73.7 px framed).
 */
export const G_NARROW = 0.25;

/**
 * The phone's settled pose: spike S5's turn (yaw −36°, pitch 16°), and an offset in the narrow
 * drawing's own units, 1 CSS px at 390 (Iris's call, notes-iris.md, 2). dx 0: the registered hull
 * is already left of centre, and the stern stays on station 0. dy 26: the deck settles 15 px below
 * the sheer, so the hollow profile's top plank shows above it, and the shadow lands on the
 * half-breadth plan's crown.
 */
export const SETTLE_NARROW = { dx: 0, dy: 26, yaw: -36, pitch: 16 };

/**
 * How far the settled model stands further off the sheet than the registered one, in hull units
 * (scaled with the model): high enough that the stern's keel clears the sheet by 27 to 35 px at
 * 1440, where sprint 17's 57 left it 8 to 16 px behind the paper (Iris's early look).
 */
export const LIFT = 90;

/** The shadow's darkness: --foreground over the sheet in light, black over it in dark (call 4). */
export const SHADOW_LIGHT = 0.18;
export const SHADOW_DARK = 0.6;
/** The shadow's blur radius in texels: a lobe edge of about 18 px, as main.webp's (Iris's early look). */
export const SHADOW_BLUR = 2;

/** Line weights in CSS px, the drawing's own: the seams and the outline (call 5; SVG untouched). */
export const SEAM_PX = 0.9;
export const OUTLINE_PX = 1.6;

/** Every light's intensity × DARK_GAIN in the dark scheme, so the lit card isn't darker than its
 * own token (call 6). */
export const DARK_GAIN = 4;
/**
 * The lamp's colour in the dark scheme: warm, so the card's blue-grey token lit × 4 reads as card
 * under a lamp, as night-1440.webp does (upper strake about 159, 169, 168), not blue steel
 * (Iris's review). Light is white in the light scheme; frame 1 is the flat token in either.
 */
export const DARK_LIGHT = "#fff4e7";
