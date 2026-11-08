import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { CARD_FONTS } from "./card";

// Every face lib/card.ts names, for the cards a shared link shows (app/opengraph-image.tsx, and a
// step's, app/log/[n]/opengraph-image.tsx). The folder is spelled in the call so the build traces
// assets/fonts alone into the server code: a path wholly from a variable makes it trace, and ship,
// the whole project.

const [regular, bold, condensedBold] = CARD_FONTS;

const face = async (name: string, path: string, weight: 400 | 700) => ({
  name,
  data: await readFile(join(process.cwd(), "assets/fonts", basename(path))),
  weight,
  style: "normal" as const,
});

/** Sofia Sans regular and bold, and the condensed display face, for ImageResponse's `fonts`. */
export function cardFonts() {
  return Promise.all([
    face("Sofia Sans", regular, 400),
    face("Sofia Sans", bold, 700),
    face("Sofia Sans Extra Condensed", condensedBold, 700),
  ]);
}
