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

// The Log's ghost hull (.crew/sprint/33/notes-iris.md, Iris's calls 1 to 4; contract.md, "What it
// shows" and "The view"). One constant a call, as the loft's are.

/**
 * Its one camera move, in ms: the loft's ease over a shorter span, the archive's quieter echo of
 * the sheet's 2.4 s (call 3).
 */
export const GHOST_DURATION = 1800;

/**
 * Its settled view at every width (call 3): sprint 17's ghost turn, yaw −20° and pitch 12°, with
 * the sheet's lift and lens. Its framed length holds at its drawing's, centred on the drawing's
 * box, so the settled hull stays inside the box the canvas lies on.
 */
export const SETTLE_GHOST = { dx: 0, dy: 0, yaw: -20, pitch: 12, lift: LIFT };

// The hull on /crew (.crew/sprint/36/contract.md, "The hull on /crew"): the card model lifting off
// the detail drawing of the plank being drawn now. One constant a call, as the loft's are.

/** Its one move, in ms, on the loft's ease, once a visit (the contract: 1.8 s). */
export const CREW_DURATION = 1800;

/**
 * Its settled pose (Iris's calls, .crew/sprint/36/notes-iris.md): a turn of `yaw` degrees toward
 * the end of the hull the focus plank is on, the bow (−35°) for a plank whose middle is at or
 * forward of midships and the stern (+35°) otherwise, so the plank being drawn comes toward the
 * visitor; pitch 6°; the sheet's lift and lens. It holds frame 1's framed height, as the sheet's
 * loft does with no growth, which settles it at about 0.75 to 0.85 of frame 1's scale, and turns
 * about the focus point, which keeps its frame-1 screen point.
 */
export const SETTLE_CREW = { yaw: 35, pitch: 6, lift: LIFT };

/**
 * The focus point while the plank is in pencil: on its lower edge, this many hull units × f aft of
 * the pen's dot, the middle of the ten slots' stretch, 10 to 55 (notes-iris.md, section 3).
 */
export const CREW_FOCUS = 27.5;

/**
 * The vellum (call 1): the card's lit material made translucent, at α 0.7 settled, its colour
 * solved so the unlit composite over the film is `--vellum`; at 0.4 of the card's lit mix, under
 * the rig at × 1.35 in light and the warm lamp at 1.6 in dark (`/`'s × 4 put 8 to 9 numbers under
 * 4.5:1: spike-pixel.md, section 4). Iris's 0.5 left the keel's planks at L 0.844 to 0.850 in
 * light, under her band's 0.85, and the inside above the near sheer at the film's 0.952; the
 * lower mix draws both ends toward the unlit `--vellum`, in both schemes.
 */
export const GHOST_ALPHA = 0.7;
export const GHOST_LIT = 0.4;
export const GHOST_GAIN = 1.35;
export const GHOST_DARK_GAIN = 1.6;

/**
 * The seats whose numbers the 3D leads out aft, as the 2D leads out 5.0's, from 768 px: 3.0's "8",
 * where the turned stern leaves its plank no place to clear the outline (Iris's decision on must 2,
 * .crew/sprint/33/early-look-iris.md). Each goes at its lift's mid-depth, LEAD_OUT units aft of its
 * plank's stern end, right-aligned, with a leader LEAD_GAP units short of it into the plank, as the
 * 2D's rule sets 5.0 (lib/lines-plan.ts). The Off drawing keeps them on their planks.
 */
export const LED_OUT: readonly string[] = ["3.0"];
export const LEAD_OUT = 22;
export const LEAD_GAP = 2;

/** The ghost's line weights in CSS px: the seams and butts, the outline, and the ink mark of a
 * record's plank or the hovered one (calls 1 and 4); the leaders are the seams' weight. */
export const GHOST_EDGE_PX = 0.75;
export const GHOST_OUTLINE_PX = 1.4;
export const MARK_PX = 1.4;

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
