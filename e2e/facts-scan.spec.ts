import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { inflateSync } from "node:zlib";
import { expect, type Page, test } from "@playwright/test";
import { type Profile, profile } from "../content/profile";
import { particularsOf, SOURCE_COMPANY } from "./particulars";

// Sprint 41, Pc: the facts scannable and shared (.crew/sprint/41/contract.md, P14 to P17), written
// before the build. The oracle restates the contract's data rules here, over content/profile.ts.
// Hooks (relayed to Forge, .crew/sprint/41/): each Work entry's sentences are `[data-sentence]`
// elements sharing one parent that holds the whole summary; the card's words and faces come from
// lib/card.ts (`cardText(profile)` and `CARD_FONTS`, repo-relative paths).

const REPO = join(__dirname, "..");
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** The contract's sentence rule: split after each ". ", trimmed, empty parts dropped. */
const sentencesOf = (text: string) =>
  text
    .split(/(?<=\.) /)
    .map((part) => part.trim())
    .filter(Boolean);

const WORK_ENTRIES = 'section[aria-labelledby="work"] ol > li';

/** Each Work entry's sentence elements as the browser has them (page.evaluate only: scripts off too). */
function readSentences(page: Page) {
  return page.evaluate((selector) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    return [...document.querySelectorAll(selector)].map((li) => {
      const sentences = [...li.querySelectorAll("[data-sentence]")];
      const parents = new Set(sentences.map((el) => el.parentElement));
      const parent = parents.size === 1 ? [...parents][0] : null;
      const figure = li.querySelector("figure");
      const last = sentences.at(-1);
      return {
        company: squashed(li.querySelector("h3")),
        texts: sentences.map((el) => squashed(el)),
        inFigure: sentences.filter((el) => el.closest("figure")).length,
        parents: parents.size,
        parentText: parent ? squashed(parent) : null,
        lists: [...li.querySelectorAll("ul, ol")].filter(
          (list) => !list.closest("figure"),
        ).length,
        figureFollows:
          figure && last
            ? Boolean(
                last.compareDocumentPosition(figure) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
              )
            : null,
        hasFigure: figure !== null,
        blocks: sentences.map((el) => {
          const s = getComputedStyle(el);
          let opacity = 1;
          for (let a: Element | null = el; a; a = a.parentElement) {
            opacity *= Number.parseFloat(getComputedStyle(a).opacity);
          }
          const r = el.getBoundingClientRect();
          return {
            display: s.display,
            visibility: s.visibility,
            opacity,
            top: r.top,
            bottom: r.bottom,
            height: r.height,
          };
        }),
      };
    });
  }, WORK_ENTRIES);
}

const BLOCK_LEVEL = [
  "block",
  "flex",
  "grid",
  "flow-root",
  "list-item",
  "table",
];

test("P14 Work reads sentence by sentence on /: in every Work entry each sentence of the summary is a [data-sentence] block of its own, in order and verbatim, all under one parent that still reads the whole summary; each starts below the previous at 1440 x 900 and 390 x 844, at full opacity; no ul or ol outside the figure, Detail A after the last sentence, and the same sentences with scripts off", async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);
  const expected = profile.experience.map((role) => ({
    company: role.company,
    sentences: sentencesOf(role.summary),
    summary: squash(role.summary),
  }));
  expect(
    expected.some((role) => role.sentences.length > 1),
    "the oracle: some summary has more than one sentence",
  ).toBe(true);

  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    const response = await page.goto("/");
    expect(response?.status(), "status of /").toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const entries = await readSentences(page);
    expect(
      entries.map((entry) => entry.company),
      `Work's entries at ${width} px`,
    ).toEqual(expected.map((role) => role.company));
    for (const [i, role] of expected.entries()) {
      const entry = entries[i];
      const name = `${role.company} (entry ${i}) at ${width} px`;
      expect
        .soft(entry?.texts, `${name}: its [data-sentence] texts, in order`)
        .toEqual(role.sentences);
      expect
        .soft(entry?.inFigure, `${name}: sentences inside the figure`)
        .toBe(0);
      expect.soft(entry?.parents, `${name}: parents of its sentences`).toBe(1);
      expect
        .soft(
          entry?.parentText,
          `${name}: the sentences' parent reads the summary, single spaces between sentences`,
        )
        .toBe(role.summary);
      expect.soft(entry?.lists, `${name}: ul or ol outside the figure`).toBe(0);
      if (role.company === SOURCE_COMPANY) {
        expect
          .soft(entry?.hasFigure, `${name}: Detail A is in the entry`)
          .toBe(true);
        expect
          .soft(
            entry?.figureFollows,
            `${name}: Detail A follows the last sentence`,
          )
          .toBe(true);
      }
      const problems: string[] = [];
      for (const [k, block] of (entry?.blocks ?? []).entries()) {
        if (!BLOCK_LEVEL.includes(block.display)) {
          problems.push(`sentence ${k}: display ${block.display}`);
        }
        if (block.visibility !== "visible" || block.opacity !== 1) {
          problems.push(
            `sentence ${k}: visibility ${block.visibility}, opacity ${block.opacity}`,
          );
        }
        if (block.height <= 0) problems.push(`sentence ${k}: no height`);
        const previous = entry?.blocks[k - 1];
        if (previous && block.top < previous.bottom - 0.5) {
          problems.push(
            `sentence ${k}: top ${block.top} above sentence ${k - 1}'s bottom ${previous.bottom}`,
          );
        }
      }
      expect
        .soft(problems, `${name}: each sentence a block of its own`)
        .toEqual([]);
    }
  }

  // Server HTML: the same sentences with scripts off.
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const bare = await context.newPage();
  expect((await bare.goto("/"))?.status(), "status of / scripts off").toBe(200);
  const off = await readSentences(bare);
  expect
    .soft(
      off.map((entry) => entry.texts),
      "each entry's [data-sentence] texts with scripts off",
    )
    .toEqual(expected.map((role) => role.sentences));
  await context.close();
});

// ---------------------------------------------------------------------------------------------
// P15: the card. Its words come from lib/card.ts, loaded at run time so a missing module fails
// this test and not the file.

const CARD_MODULE = "../lib/card";

type CardText = {
  name: string;
  lead: string;
  rows: { term: string; phrase: string }[];
};

/** The contract's card for a profile: the name, the bio's first sentence, the particulars or none. */
function cardOracle(p: Profile): CardText {
  const summary =
    p.experience.find((role) => role.company === SOURCE_COMPANY)?.summary ?? "";
  return {
    name: p.name,
    lead: sentencesOf(p.bio)[0] ?? "",
    rows: (particularsOf(summary) ?? []).map(({ term, phrase }) => ({
      term,
      phrase,
    })),
  };
}

/** A copy of the profile with the source role's summary and the bio replaced. */
function variant(changes: { summary?: string; bio?: string }): Profile {
  return {
    ...profile,
    bio: changes.bio ?? profile.bio,
    experience: profile.experience.map((role) =>
      role.company === SOURCE_COMPANY && changes.summary !== undefined
        ? { ...role, summary: changes.summary }
        : role,
    ),
  };
}

/** The family names in a TTF, OTF or WOFF file's name table (nameID 16, else 1). */
function fontFamilies(bytes: Buffer): string[] {
  const tag = bytes.toString("latin1", 0, 4);
  let name: Buffer | null = null;
  if (tag === "wOFF") {
    const count = bytes.readUInt16BE(12);
    for (let i = 0; i < count; i++) {
      const at = 44 + i * 20;
      if (bytes.toString("latin1", at, at + 4) !== "name") continue;
      const offset = bytes.readUInt32BE(at + 4);
      const compLength = bytes.readUInt32BE(at + 8);
      const origLength = bytes.readUInt32BE(at + 12);
      const raw = bytes.subarray(offset, offset + compLength);
      name = compLength < origLength ? inflateSync(raw) : raw;
    }
  } else if (["\0\x01\0\0", "OTTO", "true"].includes(tag)) {
    const count = bytes.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
      const at = 12 + i * 16;
      if (bytes.toString("latin1", at, at + 4) !== "name") continue;
      const offset = bytes.readUInt32BE(at + 8);
      const length = bytes.readUInt32BE(at + 12);
      name = bytes.subarray(offset, offset + length);
    }
  }
  if (!name) return [];
  const count = name.readUInt16BE(2);
  const strings = name.readUInt16BE(4);
  const found = new Map<number, string>();
  for (let i = 0; i < count; i++) {
    const at = 6 + i * 12;
    const platform = name.readUInt16BE(at);
    const id = name.readUInt16BE(at + 6);
    const length = name.readUInt16BE(at + 8);
    const offset = strings + name.readUInt16BE(at + 10);
    if (id !== 1 && id !== 16) continue;
    const raw = name.subarray(offset, offset + length);
    let text: string;
    if (platform === 3 || platform === 0) {
      text = "";
      for (let k = 0; k + 1 < raw.length; k += 2) {
        text += String.fromCharCode(raw.readUInt16BE(k));
      }
    } else {
      text = raw.toString("latin1");
    }
    if (!found.has(id) || platform === 3) found.set(id, text);
  }
  const family = found.get(16) ?? found.get(1);
  return family ? [family] : [];
}

const SOFIA = /^Sofia Sans( (Semi |Extra |Ultra )?Condensed)?$/;

test("P15 the card carries the proof, in Sofia Sans: /'s og:image answers 200, image/png, 1200 x 630, its alt the name and the lead; lib/card.ts's cardText gives the name, the bio's first sentence and the JPMorgan particulars (none when the rule gives null), on the real profile and on fixtures; its CARD_FONTS are vendored TTF, OTF or WOFF files whose name table reads Sofia Sans, with the OFL beside them; and the card imports the module", async ({
  page,
  request,
}) => {
  // The image the tags name, as a link preview fetches it.
  await page.goto("/");
  const meta = await page.evaluate(() => {
    const content = (property: string) =>
      document
        .querySelector(`meta[property="${property}"]`)
        ?.getAttribute("content") ?? "";
    return { image: content("og:image"), alt: content("og:image:alt") };
  });
  expect(meta.image, "og:image").not.toBe("");
  const url = new URL(meta.image);
  const image = await request.get(url.pathname + url.search);
  expect.soft(image.status(), "og:image status").toBe(200);
  expect
    .soft(image.headers()["content-type"], "og:image content-type")
    .toBe("image/png");
  const png = await image.body();
  expect
    .soft(png.subarray(1, 4).toString("latin1"), "og:image is a PNG")
    .toBe("PNG");
  expect
    .soft(
      png.length >= 24 ? [png.readUInt32BE(16), png.readUInt32BE(20)] : null,
      "og:image's IHDR width and height",
    )
    .toEqual([1200, 630]);

  const real = cardOracle(profile);
  expect(real.lead, "the oracle's lead").toBe(
    "VP Engineering at JPMorgan Chase.",
  );
  expect
    .soft(
      meta.alt.startsWith(real.name),
      `og:image:alt "${meta.alt}" starts with the name`,
    )
    .toBe(true);
  expect.soft(meta.alt, "og:image:alt holds the lead").toContain(real.lead);

  // The module the card draws from.
  let loaded: { cardText?: unknown; CARD_FONTS?: unknown } = {};
  try {
    loaded = (await import(CARD_MODULE)) as typeof loaded;
  } catch (error) {
    expect.soft(String(error), "lib/card.ts loads in Node").toBe("a module");
  }
  expect
    .soft(typeof loaded.cardText, "lib/card.ts exports cardText")
    .toBe("function");
  if (typeof loaded.cardText === "function") {
    const cardText = loaded.cardText as (p: Profile) => CardText;
    const fixtures: [string, Profile][] = [
      ["the owner's profile", profile],
      ["a one-sentence bio", variant({ bio: "Builds AI platforms." })],
      [
        "a summary without the particulars' phrases",
        variant({ summary: "Built things. Led people." }),
      ],
      [
        "a summary with two phrases, one capitalised",
        variant({
          summary:
            "Cut manual processing on the flagship workflow by about 55%. Lead a team of 7 across AI research, backend and platform.",
        }),
      ],
    ];
    for (const [label, fixture] of fixtures) {
      const out = cardText(fixture);
      const want = cardOracle(fixture);
      expect.soft(out?.name, `${label}: the name`).toBe(want.name);
      expect.soft(out?.lead, `${label}: the lead`).toBe(want.lead);
      expect
        .soft(
          (out?.rows ?? []).map(({ term, phrase }) => ({ term, phrase })),
          `${label}: the rows, term then phrase, in order`,
        )
        .toEqual(want.rows);
    }
  }

  // The face: vendored files the card loads, each Sofia Sans by its own name table.
  const fonts = Array.isArray(loaded.CARD_FONTS)
    ? (loaded.CARD_FONTS as unknown[]).filter(
        (path): path is string => typeof path === "string",
      )
    : [];
  expect.soft(fonts.length, "lib/card.ts's CARD_FONTS").toBeGreaterThan(0);
  for (const path of fonts) {
    const file = isAbsolute(path) ? path : join(REPO, path);
    expect
      .soft(
        file.startsWith(REPO) && !file.includes("node_modules"),
        `${path} is vendored in the repository`,
      )
      .toBe(true);
    expect
      .soft([".ttf", ".otf", ".woff"], `${path}: a face satori reads`)
      .toContain(extname(file).toLowerCase());
    const bytes = await readFile(file).catch(() => null);
    expect.soft(bytes, `${path} exists`).not.toBeNull();
    if (!bytes) continue;
    const families = fontFamilies(bytes);
    expect
      .soft(
        families.length === 1 && SOFIA.test(families[0] ?? ""),
        `${path}'s family in its name table (${families.join(", ") || "none"}) is Sofia Sans`,
      )
      .toBe(true);
    const siblings = await readdir(dirname(file)).catch(() => [] as string[]);
    const licences = siblings.filter((entry) => /OFL|LICEN[CS]E/i.test(entry));
    const texts = await Promise.all(
      licences.map((entry) =>
        readFile(join(dirname(file), entry), "utf8").catch(() => ""),
      ),
    );
    expect
      .soft(
        texts.some((text) => text.includes("SIL Open Font License")),
        `the OFL beside ${basename(file)} (found: ${licences.join(", ") || "none"})`,
      )
      .toBe(true);
  }
  const card = await readFile(join(REPO, "app/opengraph-image.tsx"), "utf8");
  expect
    .soft(
      /from\s+["']@\/lib\/card["']/.test(card),
      "app/opengraph-image.tsx imports from @/lib/card",
    )
    .toBe(true);
});

// ---------------------------------------------------------------------------------------------
// P16: the text face's fallback, as sprint 27 did for the display face (app/globals.css, "The
// display face's fallback"). The metrics are next/font's for Sofia Sans over Arial, as it emitted
// them for "Sofia Sans Fallback" on the sprint's head (measured, .crew/sprint/41/).

const LOCAL_FACE = "Sofia Sans Local";
const METRICS = {
  ascentOverride: "93.31%",
  descentOverride: "31.1%",
  lineGapOverride: "0%",
  sizeAdjust: "96.46%",
};

test("P16 the text face's fallback: body's computed font-family names Sofia Sans, then the local face Sofia Sans Local, whose @font-face takes Arial, Liberation Sans, Arimo and Roboto with next/font's metrics", async ({
  page,
}) => {
  await page.goto("/");
  const read = await page.evaluate((local) => {
    const families = getComputedStyle(document.body)
      .fontFamily.split(",")
      .map((family) => family.trim().replace(/^["']|["']$/g, ""));
    const faces: {
      src: string;
      ascentOverride: string;
      descentOverride: string;
      lineGapOverride: string;
      sizeAdjust: string;
    }[] = [];
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const style = rule.style;
        const family = style
          .getPropertyValue("font-family")
          .trim()
          .replace(/^["']|["']$/g, "");
        if (family !== local) continue;
        faces.push({
          src: style.getPropertyValue("src"),
          ascentOverride: style.getPropertyValue("ascent-override"),
          descentOverride: style.getPropertyValue("descent-override"),
          lineGapOverride: style.getPropertyValue("line-gap-override"),
          sizeAdjust: style.getPropertyValue("size-adjust"),
        });
      }
    }
    return { families, faces };
  }, LOCAL_FACE);
  const web = read.families.indexOf("Sofia Sans");
  const local = read.families.indexOf(LOCAL_FACE);
  expect
    .soft(
      web,
      `body's font-family (${read.families.join(", ")}) names Sofia Sans`,
    )
    .toBeGreaterThanOrEqual(0);
  expect
    .soft(
      local > web && web >= 0,
      `body's font-family (${read.families.join(", ")}) names ${LOCAL_FACE} after Sofia Sans`,
    )
    .toBe(true);
  expect.soft(read.faces.length, `@font-face rules for ${LOCAL_FACE}`).toBe(1);
  const face = read.faces[0];
  for (const system of ["Arial", "Liberation Sans", "Arimo", "Roboto"]) {
    expect
      .soft(face?.src ?? "", `${LOCAL_FACE} takes local("${system}")`)
      .toContain(`local("${system}")`);
  }
  expect
    .soft(
      face
        ? {
            ascentOverride: face.ascentOverride,
            descentOverride: face.descentOverride,
            lineGapOverride: face.lineGapOverride,
            sizeAdjust: face.sizeAdjust,
          }
        : null,
      `${LOCAL_FACE}'s metrics: next/font's for Sofia Sans`,
    )
    .toEqual(METRICS);
});

// ---------------------------------------------------------------------------------------------
// P17: Iris's two gaps (.crew/sprint/23/review-iris.md, Cheap 2 and 3).

const SIBLING_GAP = 18;

test("P17 the two gaps: below 1024 each project link's row rule sits within 2 px of the 18 px every other entry leaves under its text; /read's figcaption row at 390 wraps with a 6 px row gap", async ({
  page,
}) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const read = await page.evaluate(() => {
      const ruleTop = (li: Element) =>
        li.getBoundingClientRect().bottom -
        Number.parseFloat(getComputedStyle(li).borderBottomWidth);
      const ruled = (li: Element) =>
        Number.parseFloat(getComputedStyle(li).borderBottomWidth) > 0;
      const entries = [
        ...document.querySelectorAll(
          'section[aria-labelledby="work"] ol > li, section[aria-labelledby="projects"] ul > li, section[aria-labelledby="education"] ol > li',
        ),
      ];
      const others: number[] = [];
      const links: { gap: number; name: string }[] = [];
      for (const li of entries.filter(ruled)) {
        const a = li.querySelector("a");
        const name = (li.querySelector("h3")?.textContent ?? "").trim();
        if (a && li.closest('section[aria-labelledby="projects"]')) {
          // The link's text line: centred in its target box, one line-height tall.
          const box = a.getBoundingClientRect();
          const lineHeight = Number.parseFloat(getComputedStyle(a).lineHeight);
          links.push({
            name,
            gap: ruleTop(li) - (box.top + box.height / 2 + lineHeight / 2),
          });
          continue;
        }
        // An entry without a link or a figure: the gap under its lowest text block (the period
        // comes last in the DOM but is drawn first).
        if (li.querySelector("figure")) continue;
        const bottoms = [...li.children].map(
          (el) => el.getBoundingClientRect().bottom,
        );
        if (bottoms.length > 0) others.push(ruleTop(li) - Math.max(...bottoms));
      }
      return { others, links };
    });
    expect(
      read.others.length,
      `entries without a link at ${width} px`,
    ).toBeGreaterThan(0);
    for (const gap of read.others) {
      expect
        .soft(gap, `the gap under an entry's text at ${width} px`)
        .toBeCloseTo(SIBLING_GAP, 0);
    }
    expect(
      read.links.length,
      `project rows with a link and a rule at ${width} px`,
    ).toBeGreaterThan(0);
    for (const link of read.links) {
      expect
        .soft(
          Math.abs(link.gap - SIBLING_GAP),
          `${link.name}: its rule ${link.gap.toFixed(2)} px under the link's text at ${width} px, against ${SIBLING_GAP}`,
        )
        .toBeLessThanOrEqual(2);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  expect((await page.goto("/read"))?.status(), "status of /read").toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const caption = await page.evaluate(() => {
    const figcaption = document.querySelector(
      'section[aria-labelledby="ship"] figcaption',
    );
    const row =
      [...(figcaption?.children ?? [])].find(
        (el) => getComputedStyle(el).flexWrap === "wrap",
      ) ?? null;
    if (!row) return null;
    // The row's lines, by the tops of its items; the gap is each line's top under the last bottom.
    const boxes = [...row.children].map((el) => el.getBoundingClientRect());
    const lines: { top: number; bottom: number }[] = [];
    for (const box of boxes) {
      const line = lines.find((l) => Math.abs(l.top - box.top) < 1);
      if (line) line.bottom = Math.max(line.bottom, box.bottom);
      else lines.push({ top: box.top, bottom: box.bottom });
    }
    lines.sort((a, b) => a.top - b.top);
    return lines.slice(1).map((line, i) => line.top - (lines[i]?.bottom ?? 0));
  });
  expect(caption, "a wrapping row in /read's ship figcaption").not.toBeNull();
  expect(caption?.length ?? 0, "the row wraps at 390 px").toBeGreaterThan(0);
  for (const gap of caption ?? []) {
    expect
      .soft(gap, "the figcaption row's gap between its lines at 390 px")
      .toBeCloseTo(6, 0);
  }
});
