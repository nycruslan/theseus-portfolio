// OKLCH to sRGB hex, and WCAG contrast, for choosing the canvas tokens.
export function oklch(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const enc = (x) => {
    const v = Math.min(1, Math.max(0, x));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  return [r, g, bb].map(enc);
}
export const hex = (rgb) =>
  `#${rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const T = {
    light: {
      film: [0.952, 0.008, 165],
      filmDeep: [0.915, 0.01, 170],
      rule: [0.83, 0.012, 180],
      ink: [0.22, 0.02, 230],
      graphite: [0.47, 0.012, 235],
      pencil: [0.64, 0.01, 235],
      copper: [0.5, 0.13, 42],
      card: [0.985, 0.004, 95],
      vellum: [0.9, 0.014, 200],
    },
    dark: {
      film: [0.205, 0.014, 225],
      filmDeep: [0.245, 0.016, 225],
      rule: [0.35, 0.016, 220],
      ink: [0.93, 0.008, 190],
      graphite: [0.74, 0.012, 225],
      pencil: [0.55, 0.012, 225],
      copper: [0.74, 0.13, 45],
      card: [0.9, 0.008, 90],
      vellum: [0.5, 0.02, 210],
    },
  };
  for (const [scheme, t] of Object.entries(T)) {
    const film = oklch(...t.film);
    console.log(`-- ${scheme}`);
    for (const [k, v] of Object.entries(t)) {
      const c = oklch(...v);
      console.log(
        k.padEnd(9),
        hex(c),
        `oklch(${(v[0] * 100).toFixed(1)}% ${v[1]} ${v[2]})`,
        "vs film",
        contrast(c, film).toFixed(2),
        "vs filmDeep",
        contrast(c, oklch(...t.filmDeep)).toFixed(2),
      );
    }
  }
}
