import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type APIRequestContext,
  type Browser,
  expect,
  test,
} from "@playwright/test";
import { profile } from "../content/profile";
import { SITE_URL } from "../lib/site";
import { entryOf, LOG, recordOf } from "./log";
import {
  COUNT_AT,
  QUESTION_STEP,
  recordDate,
  STEPS,
  stepIndex,
} from "./retros";

// Sprint 54, Yb: a card for every step (.crew/sprint/54/contract.md, Y9 to Y11). A link to /log/n
// unfurls as that step: its own card, its own og:title, and the question at the step where the last
// original plank leaves. What a link preview reads is the server's HTML and the image it names, so
// these checks read exactly that, every merged step, no page loads. Every expected word comes from
// the oracle in e2e/retros.ts (the retros, their merge records and the count rule) and from
// `profile`, never from lib/step-card.ts, which Y10 checks against it.

const QUESTION = "Which one is the Theseus?";

/** The day a step merged, as the record's Date pair gives it (the year always): "22 Oct 2026". */
const mergeDay = (n: number) => {
  const merge = entryOf(n)?.merge;
  return merge ? (recordDate(merge.mergedAt).split(", ")[0] ?? "") : undefined;
};

/** What the card says for step n, by the contract's words. */
function cardOracle(n: number) {
  const day = mergeDay(n);
  // A step with no merge record yet (a sprint's own retro at its close-out) names no day.
  const head = day ? `Sprint ${n} · ${day}` : `Sprint ${n}`;
  const headline =
    n === QUESTION_STEP ? QUESTION : (entryOf(n)?.goal ?? "(no retro)");
  return {
    head,
    day,
    headline,
    body: COUNT_AT(stepIndex(n)),
    title: `Sprint ${n}: ${headline}`,
  };
}

/** The interface Forge builds to (lib/step-card.ts), as the brief gives it. */
type StepCard = {
  head: string;
  headline: string;
  body: string;
  alt: string;
  title: string;
};

/** The words of a sentence with the oracle's parts taken out: what is left may hold no figure. */
const leftover = (text: string, n: number) => {
  const { headline, day } = cardOracle(n);
  let rest = text.replace(headline, " ");
  if (day) rest = rest.replace(day, " ");
  return rest.replace(new RegExp(`Sprint ${n}(?!\\d)`), " ");
};

/**
 * An alt for step n: the headline (the goal, or the question at the k = 22 step and on no other),
 * `Sprint n` and the merge day, and no figure beyond them: no "of N", nothing the crew wrote.
 */
function checkAlt(alt: string, n: number, what: string) {
  const { headline, day } = cardOracle(n);
  expect.soft(alt, `${what} holds the headline`).toContain(headline);
  expect
    .soft(alt.includes(QUESTION), `${what} holds the question`)
    .toBe(n === QUESTION_STEP);
  expect
    .soft(alt, `${what} holds Sprint ${n}`)
    .toMatch(new RegExp(`Sprint ${n}(?!\\d)`));
  if (day) expect.soft(alt, `${what} holds the merge day`).toContain(day);
  expect
    .soft(
      leftover(alt, n),
      `${what} "${alt}" has no figure beyond the record's`,
    )
    .not.toMatch(/\d/);
}

type Head = {
  title: string;
  description: string[];
  canonical: string[];
  ogUrl: string[];
  ogTitle: string[];
  twitterTitle: string[];
  ogImage: string[];
  twitterImage: string[];
  ogImageAlt: string[];
};

/**
 * Each page's head as a link preview reads it: the server's HTML, parsed with scripts off, every
 * request aborted. One request a page.
 */
async function serverHeads(
  browser: Browser,
  request: APIRequestContext,
  urls: readonly string[],
) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("**/*", (route) => route.abort());
  const heads = new Map<string, Head>();
  for (const url of urls) {
    const response = await request.get(url);
    expect.soft(response.status(), `status of ${url}`).toBe(200);
    await page.setContent(await response.text(), { waitUntil: "commit" });
    heads.set(
      url,
      await page.evaluate(() => {
        const content = (css: string) =>
          [...document.querySelectorAll<HTMLMetaElement>(css)].map(
            (meta) => meta.content,
          );
        return {
          title: document.title,
          description: content('meta[name="description"]'),
          canonical: [
            ...document.querySelectorAll<HTMLLinkElement>(
              'link[rel="canonical"]',
            ),
          ].map((link) => link.getAttribute("href") ?? ""),
          ogUrl: content('meta[property="og:url"]'),
          ogTitle: content('meta[property="og:title"]'),
          twitterTitle: content('meta[name="twitter:title"]'),
          ogImage: content('meta[property="og:image"]'),
          twitterImage: content('meta[name="twitter:image"]'),
          ogImageAlt: content('meta[property="og:image:alt"]'),
        };
      }),
    );
  }
  await context.close();
  return heads;
}

/** An image as a preview fetches it: the tag names the production host, the same path is served here. */
async function fetchCard(request: APIRequestContext, tag: string) {
  const url = new URL(tag);
  const response = await request.get(url.pathname + url.search);
  const png = await response.body();
  return {
    path: url.pathname,
    status: response.status(),
    type: response.headers()["content-type"],
    signature: png.subarray(1, 4).toString("latin1"),
    size: png.length >= 24 ? [png.readUInt32BE(16), png.readUInt32BE(20)] : [],
    hash: createHash("sha256").update(png).digest("hex"),
  };
}

/** lib/step-card.ts and the reader it takes its entries from, loaded in the runner. */
async function loadStepCard() {
  try {
    const [{ stepCard }, { readSprintLog }] = await Promise.all([
      import("../lib/step-card"),
      import("../lib/sprint-log"),
    ]);
    const entries = readSprintLog();
    return (n: number): StepCard => stepCard(entries, n);
  } catch (error) {
    expect
      .soft(String(error), "lib/step-card.ts loads in Playwright's runner")
      .toBe("a module");
    return undefined;
  }
}

const STEP_PAGES = STEPS.map(recordOf);
const stepOf = (url: string) => Number(url.slice(`${LOG}/`.length));

// ---------------------------------------------------------------------------------------------

test("Y9 One card per step: every merged /log/n carries one og:image and one twitter:image under its own segment, served 200 as image/png, 1200 x 630; every step's card differs from /'s, /log/13's from /log/23's; / and /log serve the same card bytes", async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  expect(STEPS.length, "merged steps in the record").toBeGreaterThan(22);
  const heads = await serverHeads(browser, request, ["/", LOG, ...STEP_PAGES]);

  const root = heads.get("/");
  expect(root?.ogImage, "/'s og:image").toHaveLength(1);
  const rootCard = await fetchCard(request, root?.ogImage[0] ?? "");
  expect.soft(rootCard.status, "status of /'s card").toBe(200);
  // The root card's bytes, so a run can be compared with main's (4bd7987fc0dcaca3… on 5fceef8).
  test.info().annotations.push({
    type: "root card sha256",
    description: rootCard.hash,
  });
  const logCard = await fetchCard(request, heads.get(LOG)?.ogImage[0] ?? "");
  expect.soft(logCard.status, "status of /log's card").toBe(200);
  expect
    .soft(logCard.hash, "/log's card bytes are /'s, unchanged")
    .toBe(rootCard.hash);

  const hashes = new Map<number, string>();
  for (const url of STEP_PAGES) {
    const n = stepOf(url);
    const head = heads.get(url);
    const where = `${url} (step ${n})`;
    for (const [name, tags] of [
      ["og:image", head?.ogImage ?? []],
      ["twitter:image", head?.twitterImage ?? []],
    ] as const) {
      expect.soft(tags, `${name} on ${where}`).toHaveLength(1);
      if (tags.length !== 1) continue;
      const card = await fetchCard(request, tags[0] ?? "");
      expect
        .soft(
          card.path.startsWith(`${url}/`),
          `${name} "${card.path}" is under ${url}/, its own segment`,
        )
        .toBe(true);
      expect.soft(card.status, `status of ${where}'s ${name}`).toBe(200);
      expect.soft(card.type, `${where}'s ${name} type`).toBe("image/png");
      expect.soft(card.signature, `${where}'s ${name} is a PNG`).toBe("PNG");
      expect
        .soft(card.size, `${where}'s ${name}'s IHDR width and height`)
        .toEqual([1200, 630]);
      expect
        .soft(card.hash, `${where}'s ${name} bytes differ from /'s card`)
        .not.toBe(rootCard.hash);
      if (name === "og:image") hashes.set(n, card.hash);
    }
  }
  expect
    .soft(hashes.get(13), "/log/13's card bytes differ from /log/23's")
    .not.toBe(hashes.get(23));
});

test("Y10 The card's words come from the record and profile: lib/step-card.ts's head, headline, body and title for every step are the oracle's (Sprint n · merge day; the goal, or the question at the k = 22 step alone; the count line), its alt holds the headline and the head with no other figure; each step's og:image:alt is that alt, holding the goal or the question, Sprint n and the day; and the step's card draws from the module", async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  expect(QUESTION_STEP, "the step where k = 22").toBeDefined();
  const stepCard = await loadStepCard();
  const heads = await serverHeads(browser, request, STEP_PAGES);

  for (const n of STEPS) {
    const url = recordOf(n);
    const oracle = cardOracle(n);
    const where = `${url} (step ${n}, k = ${stepIndex(n)})`;

    // The module, read in the runner.
    const card = stepCard?.(n);
    if (card) {
      expect
        .soft(
          {
            head: card.head,
            headline: card.headline,
            body: card.body,
            title: card.title,
          },
          `stepCard's words for ${where}`,
        )
        .toEqual({
          head: oracle.head,
          headline: oracle.headline,
          body: oracle.body,
          title: oracle.title,
        });
      checkAlt(card.alt, n, `stepCard's alt, ${where}`);
    }

    // The page's tag, as a preview reads it.
    const alts = heads.get(url)?.ogImageAlt ?? [];
    expect.soft(alts, `og:image:alt on ${where}`).toHaveLength(1);
    const alt = alts[0] ?? "";
    if (card) {
      expect
        .soft(alt, `og:image:alt is stepCard's alt, ${where}`)
        .toBe(card.alt);
    }
    checkAlt(alt, n, `og:image:alt, ${where}`);
  }

  // The image draws the module's words: the step's card imports it (as P15 holds /'s to lib/card).
  const source = await readFile(
    join(process.cwd(), "app/log/[n]/opengraph-image.tsx"),
    "utf8",
  );
  expect
    .soft(
      /from\s+["'](?:@\/lib|(?:\.\.\/)+lib)\/step-card["']/.test(source),
      "app/log/[n]/opengraph-image.tsx imports lib/step-card",
    )
    .toBe(true);
});

test("Y11 Each step's titles: og:title and twitter:title are Sprint n: <goal>, or Sprint n: Which one is the Theseus? at the k = 22 step, and stepCard's title; the document title, description, canonical and og:url stay as B5.8 pins them; /log keeps its titles", async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const stepCard = await loadStepCard();
  const heads = await serverHeads(browser, request, [LOG, ...STEP_PAGES]);

  for (const n of STEPS) {
    const url = recordOf(n);
    const head = heads.get(url);
    const where = `${url} (step ${n})`;
    const { title } = cardOracle(n);
    expect.soft(head?.ogTitle, `og:title on ${where}`).toEqual([title]);
    expect
      .soft(head?.twitterTitle, `twitter:title on ${where}`)
      .toEqual([title]);
    const card = stepCard?.(n);
    if (card) {
      expect
        .soft(head?.ogTitle, `og:title is stepCard's title on ${where}`)
        .toEqual([card.title]);
    }
    // B5.8 (C2.1), on every step: unchanged by the card.
    expect
      .soft(head?.title, `document title of ${where}`)
      .toBe(`Revision ${n} — Log — ${profile.name}`);
    expect
      .soft(head?.description, `description of ${where}`)
      .toEqual([entryOf(n)?.goal]);
    expect
      .soft(head?.canonical, `canonical of ${where}`)
      .toEqual([`${SITE_URL}${url}`]);
    expect
      .soft(head?.ogUrl, `og:url of ${where}`)
      .toEqual([`${SITE_URL}${url}`]);
  }

  const log = heads.get(LOG);
  const logTitle = `Log — ${profile.name}`;
  expect.soft(log?.title, "/log's document title").toBe(logTitle);
  expect.soft(log?.ogTitle, "/log's og:title").toEqual([logTitle]);
  expect.soft(log?.twitterTitle, "/log's twitter:title").toEqual([logTitle]);
});
