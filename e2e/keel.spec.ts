import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page } from "@playwright/test";
import { profile } from "../content/profile";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilState,
} from "./crew-feed";
import {
  horizontalOverflow,
  installRgba,
  resolveColors,
  SCHEMES,
  watchLayoutShift,
} from "./helpers";
import { FIRST, note, pause, REST } from "./model";
import { openModel, refuseWebGl } from "./webgl";

// Sprint 47, Ka: the keel on `/crew` (.crew/sprint/46/first-contract.md, K1 to K7; K8 is Forge's
// proof in the PR and Lens's read). Written before the build and before Iris's placement call
// (.crew/sprint/47/placement.md), so every read finds `section[aria-labelledby="keel"]` wherever
// it sits. The oracle is the contract's own words below and its matching rule, in this file's own
// lines over the checkout's files; lib/keel.ts (the briefs' interface) is loaded at run time for
// K3 alone, so a missing module fails there and nowhere else. The feed's live state comes from
// B4.22's harness (e2e/crew-feed.ts), on crew.spec.ts's kept `live` site.

const ROOT = join(__dirname, "..");
const REPO = "https://github.com/nycruslan/theseus-portfolio";
const KEEL = 'section[aria-labelledby="keel"]';
const PANEL = 'section[aria-labelledby="crew"]';
const MODEL = "[data-model]";
const DEPLOYED = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/**
 * Sprint 66's door into the trials, the last link in rule 1 (.crew/sprint/66/contract.md, T24):
 * its words from the owner's first name (content/profile.ts), its href exactly /trials.
 */
const TRIALS_DOOR = {
  href: "/trials",
  text: `Try to sink ${profile.name.trim().split(/\s+/)[0]}'s contact links`,
};

const LEAD =
  "The rules the crew builds under. The crew replaces the planks sprint by sprint; the keel stays. These rules live in files that are Ruslan's, so a change to any of them waits for his approval. Each is quoted from its file.";

type Rule = {
  n: number;
  sentence: string;
  enforcer: string;
  path: string;
  quote: string;
};

/**
 * The contract's six rules, plan.md's table rows 1 to 6: enforcer labels, paths and quotes exact.
 * The sentences are .crew/sprint/47/placement.md's ("The six sentences"): plan.md's drafts, with 5
 * and 6 tightened by Iris and accepted by Atlas.
 */
const RULES: readonly Rule[] = [
  {
    n: 1,
    sentence:
      "Nothing merges until three checks pass: the tests, the gate and Lens's review.",
    enforcer: "Enforced by GitHub: the protect-main ruleset",
    path: "CLAUDE.md",
    quote:
      "GitHub decides what merges: the `protect-main` ruleset requires `check` (CI), `gate` (the owner's paths and decisions) and `lens`.",
  },
  {
    n: 2,
    sentence:
      "A change to the crew's own rules, or to how its work is judged, waits for Ruslan's approval.",
    enforcer: "Enforced by the gate check",
    path: ".github/CODEOWNERS",
    quote:
      "The owner's paths: a PR that touches one waits for @nycruslan to approve its head.",
  },
  {
    n: 3,
    sentence: "Ruslan's facts are his: the crew drafts, he approves.",
    enforcer: "Enforced by the gate check",
    path: ".github/CODEOWNERS",
    quote:
      "The owner's facts; drafts are the team's, for the owner to approve.",
  },
  {
    n: 4,
    sentence:
      "No test is weakened to get a pass unless Lens accepts the reason.",
    enforcer: "Enforced by Lens's review",
    path: ".crew/scope.mjs",
    quote:
      "Lens accepts each one only when the PR names it and why the behaviour it checked is gone.",
  },
  {
    n: 5,
    sentence: "The agents who build don't edit the tests they're judged by.",
    enforcer:
      "Guidance only: a hook in each session, which a shell command can get around",
    path: ".crew/guard.mjs",
    quote: "builders can't rewrite the checks their work is judged by",
  },
  {
    n: 6,
    sentence:
      "Every session acts on GitHub as Ruslan, so a pull request that passed on his approval is left for him to merge by hand.",
    enforcer: "Guidance only: the crew's own merge script",
    path: ".crew/gate.mjs",
    quote:
      "Sessions reach GitHub as the owner, so they could post that approval too: merge.mjs leaves such a PR for the owner to merge by hand.",
  },
];

const shownQuote = (quote: string) => quote.replaceAll("`", "");

/**
 * The contract's matching rule, in this file's own lines: each line loses its leading whitespace,
 * then one leading `#`, `//` or `*` with the spaces after it; the lines join with single spaces and
 * every run of whitespace becomes one space; the quote is a substring, from line a to line b.
 */
function linesOf(file: string, quote: string) {
  let text = "";
  const lineOf: number[] = [];
  file.split("\n").forEach((raw, i) => {
    const line = `${raw.replace(/^\s+/, "").replace(/^(#|\/\/|\*)\s*/, "")} `;
    for (const c of line) {
      const space = /\s/.test(c);
      if (space && text.endsWith(" ")) continue;
      text += space ? " " : c;
      for (let k = 0; k < c.length; k++) lineOf.push(i + 1);
    }
  });
  const at = text.indexOf(quote);
  if (at < 0 || quote === "") return null;
  return {
    start: lineOf[at] ?? -1,
    end: lineOf[at + quote.length - 1] ?? -1,
  };
}

/** The checkout's sources, by path. */
function checkoutSources() {
  const out: Record<string, string> = {};
  for (const { path } of RULES)
    out[path] = readFileSync(join(ROOT, path), "utf8");
  return out;
}

/** The build's ref: the commit Vercel built, else main (the contract's link rule). */
function refsAllowed() {
  if (DEPLOYED) return /^(main|[0-9a-f]{40})$/;
  const ref = process.env.VERCEL_GIT_COMMIT_SHA || "main";
  return new RegExp(`^${ref}$`);
}

const hrefOf = (ref: string, path: string, start: number, end: number) =>
  `${REPO}/blob/${ref}/${path}#L${start}${end === start ? "" : `-L${end}`}`;

/** The link's parts by the contract's pattern, or null when it doesn't match it. */
function parseHref(href: string) {
  const m = href.match(
    /^https:\/\/github\.com\/nycruslan\/theseus-portfolio\/blob\/([^/]+)\/(.+)#L(\d+)(?:-L(\d+))?$/,
  );
  if (!m) return null;
  const start = Number(m[3]);
  const end = m[4] === undefined ? start : Number(m[4]);
  return { ref: m[1] ?? "", path: m[2] ?? "", start, end, ranged: !!m[4] };
}

// ---------------------------------------------------------------------------------------------
// Reads

type Read = {
  sections: number;
  inMain: boolean;
  afterPanel: boolean;
  h2: { id: string; text: string; tag: string }[];
  lead: boolean;
  ols: number;
  items: number;
  forbidden: string[];
  rules: {
    n: string | null;
    value: string | null;
    kind: string | null;
    text: string;
    enforcers: string[];
    quotes: string[];
    links: { href: string; text: string }[];
  }[];
};

/** The keel as the DOM has it: where it sits, its heading, lead, list and each rule's parts. */
function readKeel(page: Page): Promise<Read> {
  return page.evaluate(
    ({ keel, panel, lead }) => {
      const squash = (s: string | null | undefined) =>
        (s ?? "").replace(/\s+/g, " ").trim();
      const all = [...document.querySelectorAll(keel)];
      const section = all[0] ?? null;
      const crew = document.querySelector(panel);
      const out = {
        sections: all.length,
        inMain: Boolean(section?.closest("main")),
        afterPanel: Boolean(
          section &&
            crew &&
            !crew.contains(section) &&
            crew.compareDocumentPosition(section) &
              Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        h2: [] as { id: string; text: string; tag: string }[],
        lead: false,
        ols: 0,
        items: 0,
        forbidden: [] as string[],
        rules: [] as {
          n: string | null;
          value: string | null;
          kind: string | null;
          text: string;
          enforcers: string[];
          quotes: string[];
          links: { href: string; text: string }[];
        }[],
      };
      if (!section) return out;
      // The id the section is named by, inside it.
      const heading = document.getElementById("keel");
      if (heading && section.contains(heading))
        out.h2.push({
          id: heading.id,
          text: squash(heading.textContent),
          tag: heading.tagName.toLowerCase(),
        });
      out.lead = [...section.querySelectorAll("*")].some(
        (el) => squash(el.textContent) === lead,
      );
      const ols = section.querySelectorAll("ol");
      out.ols = ols.length;
      out.items = section.querySelectorAll("li[data-rule]").length;
      for (const el of section.querySelectorAll(
        "h1, [aria-live], button, [role=button]",
      ))
        out.forbidden.push(`<${el.tagName.toLowerCase()}>`);
      const list = ols[0];
      for (const li of list?.querySelectorAll(":scope > li[data-rule]") ?? [])
        out.rules.push({
          n: li.getAttribute("data-rule"),
          value: li.getAttribute("value"),
          kind: li.getAttribute("data-kind"),
          text: squash(li.textContent),
          enforcers: [...li.querySelectorAll("[data-enforcer]")].map((e) =>
            squash(e.textContent),
          ),
          quotes: [...li.querySelectorAll("blockquote")].map((q) =>
            squash(q.textContent),
          ),
          links: [...li.querySelectorAll("a")].map((a) => ({
            href: a.getAttribute("href") ?? "",
            text: squash(a.textContent),
          })),
        });
      return out;
    },
    { keel: KEEL, panel: PANEL, lead: LEAD },
  );
}

/** K1's assertions on one read. */
function k1(read: Read, where: string) {
  expect(read.sections, `section[aria-labelledby="keel"] ${where}`).toBe(1);
  expect.soft(read.inMain, `the keel in main ${where}`).toBe(true);
  expect
    .soft(read.afterPanel, `the keel outside and after the panel ${where}`)
    .toBe(true);
  expect
    .soft(read.h2, `h2#keel ${where}`)
    .toEqual([{ id: "keel", text: "Keel", tag: "h2" }]);
  expect.soft(read.lead, `the lead, word for word, ${where}`).toBe(true);
  expect.soft(read.ols, `one ol ${where}`).toBe(1);
  expect
    .soft(read.items, `li[data-rule] in the section ${where}`)
    .toBe(RULES.length);
  expect
    .soft(read.forbidden, `h1, aria-live or buttons in the keel ${where}`)
    .toEqual([]);
  expect
    .soft(
      read.rules.map((r) => r.n),
      `the rules' data-rule, in the contract's order, ${where}`,
    )
    .toEqual(RULES.map((r) => String(r.n)));
  // placement.md: each li's value is its own number, so a dropped rule leaves a gap in the markers.
  expect
    .soft(
      read.rules.map((r) => r.value),
      `the rules' li value, ${where}`,
    )
    .toEqual(RULES.map((r) => String(r.n)));
  for (const rule of RULES) {
    const li = read.rules.find((r) => r.n === String(rule.n));
    const what = `rule ${rule.n} ${where}`;
    expect.soft(li, `li[data-rule="${rule.n}"] ${where}`).toBeDefined();
    if (!li) continue;
    expect
      .soft(li.text.includes(rule.sentence), `${what} holds its sentence`)
      .toBe(true);
    expect
      .soft(li.enforcers, `${what}'s [data-enforcer]`)
      .toEqual([rule.enforcer]);
    expect
      .soft(li.quotes, `${what}'s blockquote`)
      .toEqual([shownQuote(rule.quote)]);
    // Sprint 66 (T24): this pinned exactly one link per rule, its source. Rule 1 now holds its
    // source and then the trials door, exactly those two in that order; rules 2 to 6 keep one, so a
    // door under any other rule, before the source or beside a second door fails here. links[0]
    // stays the source, which K2 reads.
    const door = rule.n === 1 ? [TRIALS_DOOR] : [];
    expect.soft(li.links.length, `${what}'s links`).toBe(1 + door.length);
    expect
      .soft(li.links.slice(1), `${what}'s links after its source`)
      .toEqual(door);
    expect
      .soft(
        li.links[0]?.href.startsWith(`${REPO}/blob/`) &&
          li.links[0]?.href.includes(`/${rule.path}#L`),
        `${what}'s link goes to ${rule.path} on GitHub (${li.links[0]?.href})`,
      )
      .toBe(true);
  }
}

/** `/crew` from `base` at a size, with the web fonts in. */
async function openCrew(page: Page, width: number, height: number, base = "") {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}/crew`);
  expect(
    response?.status(),
    `status of ${base || "the default server"}/crew at ${width} x ${height}`,
  ).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** A context with scripts off or on, WebGL refused, at a size. */
async function contextOf(
  browser: Browser,
  width: number,
  height: number,
  scripts: boolean,
  colorScheme: "light" | "dark" = "light",
) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    javaScriptEnabled: scripts,
    viewport: { width, height },
    colorScheme,
  });
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
  return { context, page: await context.newPage() };
}

const K1_SIZES = [
  [1440, 900],
  [390, 844],
] as const;

/** K1 on one server: GET /crew's HTML, then the DOM with scripts off and on, at both sizes. */
async function k1On(browser: Browser, base: string, where: string) {
  const html = await (await fetch(new URL("/crew", baseOf(base)))).text();
  // The HTML as the server sent it, parsed with no script to move anything.
  const raw = await contextOf(browser, 1440, 900, false);
  try {
    await raw.page.setContent(html, { waitUntil: "domcontentloaded" });
    k1(await readKeel(raw.page), `in GET /crew's HTML on ${where}`);
  } finally {
    await raw.context.close();
  }
  for (const [width, height] of K1_SIZES) {
    for (const scripts of [false, true]) {
      const { context, page } = await contextOf(
        browser,
        width,
        height,
        scripts,
      );
      try {
        await openCrew(page, width, height, base);
        k1(
          await readKeel(page),
          `with scripts ${scripts ? "on" : "off"} at ${width} x ${height} on ${where}`,
        );
      } finally {
        await context.close();
      }
    }
  }
}

function baseOf(base: string) {
  return base || String(test.info().project.use.baseURL);
}

// ---------------------------------------------------------------------------------------------
// K1, default server (holds in every feed state, so it runs on a deployment too)

const K1 =
  "K1 server-rendered: in GET /crew's HTML and in the DOM with scripts off (and on) at 1440 x 900 and 390 x 844, one section[aria-labelledby=keel] in main, outside and after the panel, h2#keel Keel, the lead, one ol of six li[data-rule] in the contract's order, each with its sentence, [data-enforcer] with its label, a blockquote with its quote's text and exactly one a to its source, rule 1 then exactly one more, the trials door to /trials (sprint 66); no h1, aria-live or button in it";

test(`${K1} (the default server's pass)`, async ({ browser }) => {
  test.setTimeout(90_000);
  await k1On(browser, "", "the default server");
});

// ---------------------------------------------------------------------------------------------
// K2, K4, K5: the links and labels on the page against the checkout's files

/** The page's rules: data-rule, label and link, from the default server at 1440 x 900. */
async function pageRules(browser: Browser) {
  const { context, page } = await contextOf(browser, 1440, 900, true);
  try {
    await openCrew(page, 1440, 900);
    const read = await readKeel(page);
    expect(read.sections, "section[aria-labelledby=keel] on /crew").toBe(1);
    return read.rules;
  } finally {
    await context.close();
  }
}

test("K2 the file's own words, at its line: each rule's link is https://github.com/nycruslan/theseus-portfolio/blob/<ref>/<path>#L<a>[-L<b>], ref main (or the build's commit), and the checkout's file at <path>, read by the contract's matching rule, holds the contract's quote from line a to line b; the link reads <path>, line a (or lines a–b) (placement.md)", async ({
  browser,
}) => {
  const rules = await pageRules(browser);
  const sources = checkoutSources();
  const refs = refsAllowed();
  expect.soft(rules.length, "rules on /crew").toBe(RULES.length);
  for (const rule of RULES) {
    const what = `rule ${rule.n}`;
    const li = rules.find((r) => r.n === String(rule.n));
    const href = li?.links[0]?.href ?? "";
    const link = parseHref(href);
    expect
      .soft(link, `${what}'s link by the contract's pattern (${href})`)
      .not.toBeNull();
    if (!link) continue;
    expect.soft(refs.test(link.ref), `${what}'s ref (${link.ref})`).toBe(true);
    expect.soft(link.path, `${what}'s path`).toBe(rule.path);
    expect
      .soft(link.ranged, `${what}'s link has -L<b> only when b differs from a`)
      .toBe(link.end !== link.start);
    const found = linesOf(sources[rule.path] ?? "", rule.quote);
    expect
      .soft(found, `${what}'s quote in the checkout's ${rule.path}`)
      .not.toBeNull();
    expect
      .soft(
        { start: link.start, end: link.end },
        `${what}'s lines in its link against where the quote sits in ${rule.path}`,
      )
      .toEqual(found);
    expect
      .soft(href, `${what}'s whole link`)
      .toBe(hrefOf(link.ref, rule.path, found?.start ?? -1, found?.end ?? -1));
    // placement.md: the link names the file and its lines, so the six names differ.
    const lines = found
      ? found.end === found.start
        ? `line ${found.start}`
        : `lines ${found.start}\u2013${found.end}`
      : "";
    expect
      .soft(li?.links[0]?.text, `${what}'s link text`)
      .toBe(`${rule.path}, ${lines}`);
  }
});

// The CODEOWNERS reader the gate uses (.crew/scope.mjs), loaded at run time: typed by hand, since
// the path is a string the type checker doesn't resolve.
const SCOPE_MODULE: string = "../.crew/scope.mjs";

test("K4 every source is Ruslan's: each keel link's path is an owner path by .github/CODEOWNERS, read with .crew/scope.mjs's codeowners (the last matching line wins)", async ({
  browser,
}) => {
  const { codeowners } = (await import(SCOPE_MODULE)) as {
    codeowners: (text: string) => (path: string) => boolean;
  };
  const owned = codeowners(
    readFileSync(join(ROOT, ".github", "CODEOWNERS"), "utf8"),
  );
  // The reader works as the gate's: a team path is not the owner's.
  expect(owned("app/crew/page.tsx"), "app/crew/page.tsx is the team's").toBe(
    false,
  );
  const rules = await pageRules(browser);
  const paths = rules.map((r) => parseHref(r.links[0]?.href ?? "")?.path ?? "");
  expect.soft(paths.length, "keel links").toBe(RULES.length);
  expect
    .soft(
      paths.filter((path) => !owned(path)),
      "keel sources that aren't owner paths",
    )
    .toEqual([]);
});

test("K5 honest about what binds: rules 5 and 6 carry labels beginning Guidance only, and no other rule does; data-kind is guidance on them and binds on the rest (placement.md)", async ({
  browser,
}) => {
  const rules = await pageRules(browser);
  expect.soft(rules.length, "rules on /crew").toBe(RULES.length);
  const guidance = rules
    .filter((r) => r.enforcers.some((e) => e.startsWith("Guidance only")))
    .map((r) => r.n);
  expect(guidance, "rules labelled Guidance only").toEqual(["5", "6"]);
  // placement.md's hook for the pencil treatment follows the label: guidance on 5 and 6, binds on
  // the rest, so the eye's difference can't disagree with the words.
  expect
    .soft(
      rules.map((r) => [r.n, r.kind]),
      "each rule's data-kind",
    )
    .toEqual(
      RULES.map((r) => [
        String(r.n),
        r.enforcer.startsWith("Guidance only") ? "guidance" : "binds",
      ]),
    );
  expect
    .soft(
      rules.filter((r) => r.enforcers.length !== 1).map((r) => r.n),
      "rules without exactly one label",
    )
    .toEqual([]);
});

// ---------------------------------------------------------------------------------------------
// K3: the product's rule on fixtures (as P2 runs lib/particulars.ts)

type KeelRuleOut = Rule & {
  start: number;
  end: number;
  href: string;
  text: string;
};
type Sources = Readonly<Record<string, string | undefined>>;

/** What keelRules must give for `sources`, by this file's rule. */
function want(sources: Sources, ref: string): KeelRuleOut[] {
  return RULES.flatMap((rule) => {
    const file = sources[rule.path];
    const found = file === undefined ? null : linesOf(file, rule.quote);
    if (!found) return [];
    return [
      {
        ...rule,
        start: found.start,
        end: found.end,
        href: hrefOf(ref, rule.path, found.start, found.end),
        text: shownQuote(rule.quote),
      },
    ];
  });
}

/** `path`'s file with lines a to b of its quote's place blanked: the words gone, the lines kept. */
function without(file: string, quote: string) {
  const found = linesOf(file, quote);
  if (!found) return file;
  return file
    .split("\n")
    .map((line, i) => (i + 1 >= found.start && i + 1 <= found.end ? "" : line))
    .join("\n");
}

test("K3 a rule drops when its file loses its words: lib/keel.ts's KEEL is the contract's six; quoteLines follows the matching rule; keelRules on the real files gives the six with their lines, links and text; a source without its quote drops that rule only, a missing source drops its rules, and none left gives []", async () => {
  // A literal specifier, so knip sees this spec use the exports (Forge, sprint 47); the catch keeps
  // a missing module to this test's failure.
  let loaded: { KEEL?: unknown; quoteLines?: unknown; keelRules?: unknown } =
    {};
  try {
    loaded = await import("../lib/keel");
  } catch (error) {
    expect(String(error), "lib/keel.ts loads").toBe("");
  }
  expect(Array.isArray(loaded.KEEL), "lib/keel.ts exports KEEL").toBe(true);
  expect(typeof loaded.quoteLines, "lib/keel.ts exports quoteLines").toBe(
    "function",
  );
  expect(typeof loaded.keelRules, "lib/keel.ts exports keelRules").toBe(
    "function",
  );
  const KEEL = loaded.KEEL as Omit<Rule, "n">[];
  const quoteLines = loaded.quoteLines as (
    file: string,
    quote: string,
  ) => { start: number; end: number } | null;
  const keelRules = loaded.keelRules as (
    sources: Sources,
    ref: string,
  ) => KeelRuleOut[];

  // The contract's rules, in order: labels, paths and quotes exact; the sentences as the page has them.
  expect
    .soft(
      KEEL.map(({ enforcer, path, quote }) => ({ enforcer, path, quote })),
      "KEEL's labels, paths and quotes",
    )
    .toEqual(
      RULES.map(({ enforcer, path, quote }) => ({ enforcer, path, quote })),
    );
  expect
    .soft(
      KEEL.map((k) => k.sentence),
      "KEEL's sentences",
    )
    .toEqual(RULES.map((r) => r.sentence));

  // The matching rule on a fixture that holds each of its clauses: leading whitespace, one #, //
  // or * stripped with its spaces (only one: "## zeta" keeps a #), and whitespace collapsed.
  const fixture = [
    "  # alpha beta",
    "    //   gamma",
    " *  delta   epsilon",
    "## zeta",
    "- eta",
    "",
    "\ttheta",
  ].join("\n");
  const cases: [string, { start: number; end: number } | null][] = [
    ["alpha", { start: 1, end: 1 }],
    ["beta gamma delta", { start: 1, end: 3 }],
    ["gamma", { start: 2, end: 2 }],
    ["delta epsilon # zeta", { start: 3, end: 4 }],
    ["epsilon zeta", null],
    ["- eta theta", { start: 5, end: 7 }],
    // The first place it sits: "eta" is in "beta" on line 1 before its own line 5.
    ["eta", { start: 1, end: 1 }],
    ["- eta", { start: 5, end: 5 }],
    ["delta  epsilon", null],
    ["omega", null],
  ];
  for (const [quote, lines] of cases) {
    expect
      .soft(linesOf(fixture, quote), `the oracle on "${quote}"`)
      .toEqual(lines);
    expect
      .soft(quoteLines(fixture, quote), `quoteLines on "${quote}"`)
      .toEqual(lines);
  }

  const real = checkoutSources();
  for (const rule of RULES)
    expect
      .soft(
        quoteLines(real[rule.path] ?? "", rule.quote),
        `quoteLines for rule ${rule.n} in ${rule.path}`,
      )
      .toEqual(linesOf(real[rule.path] ?? "", rule.quote));

  const all = want(real, "main");
  expect(all.length, "the oracle finds all six in the checkout").toBe(
    RULES.length,
  );
  expect
    .soft(keelRules(real, "main"), "keelRules on the real files")
    .toEqual(all);
  const sha = "0123456789abcdef0123456789abcdef01234567";
  expect
    .soft(keelRules(real, sha), "keelRules with a commit's ref")
    .toEqual(want(real, sha));

  // Each quote lost from its file: that rule alone drops, and the rest keep their n.
  for (const rule of RULES) {
    const sources = {
      ...real,
      [rule.path]: without(real[rule.path] ?? "", rule.quote),
    };
    const expected = want(sources, "main");
    expect(
      expected.map((r) => r.n),
      `the oracle drops rule ${rule.n} alone`,
    ).toEqual(RULES.filter((r) => r.n !== rule.n).map((r) => r.n));
    expect
      .soft(keelRules(sources, "main"), `without rule ${rule.n}'s quote`)
      .toEqual(expected);
  }

  // Each source missing, as an absent key and as undefined: its rules drop.
  for (const path of new Set(RULES.map((r) => r.path))) {
    const absent: Record<string, string | undefined> = { ...real };
    delete absent[path];
    const left = RULES.filter((r) => r.path !== path).map((r) => r.n);
    expect
      .soft(
        keelRules(absent, "main").map((r) => r.n),
        `with ${path} absent`,
      )
      .toEqual(left);
    expect
      .soft(
        keelRules({ ...real, [path]: undefined }, "main").map((r) => r.n),
        `with ${path} undefined`,
      )
      .toEqual(left);
  }

  // None left: no rules, so the section renders nothing (the briefs' interface).
  expect.soft(keelRules({}, "main"), "with no sources").toEqual([]);
  const emptied = Object.fromEntries(
    Object.entries(real).map(([path, file]) => [
      path,
      RULES.filter((r) => r.path === path).reduce(
        (text, r) => without(text, r.quote),
        file,
      ),
    ]),
  );
  expect.soft(keelRules(emptied, "main"), "with every quote lost").toEqual([]);
});

// ---------------------------------------------------------------------------------------------
// K6: every width, every mode

const K6_SIZES = [
  [1440, 900],
  [1536, 715],
  [1024, 768],
  [390, 664],
  [320, 568],
] as const;

/** Elements in the keel that paint past the viewport's sides, or scroll sideways inside it. */
function sideways(page: Page) {
  return page.evaluate((keel) => {
    const section = document.querySelector(keel);
    if (!section) return ["no keel"];
    const width = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of [section, ...section.querySelectorAll("*")]) {
      const name = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`;
      for (const r of el.getClientRects())
        if (r.width > 0 && (r.left < -0.5 || r.right > width + 0.5))
          out.push(
            `${name} paints ${r.left.toFixed(1)} to ${r.right.toFixed(1)}`,
          );
      const s = getComputedStyle(el);
      if (
        s.overflowX !== "visible" &&
        el.scrollWidth > el.clientWidth + 0.5 &&
        el.clientWidth > 0
      )
        out.push(
          `${name} scrolls ${el.scrollWidth - el.clientWidth} px sideways`,
        );
    }
    return out;
  }, KEEL);
}

/**
 * Keel links under their target (B2.9's measure, the box): 24 x 24 px, and, as placement.md gives
 * them the panel's `.crew-link`, 44 px tall below 1024.
 */
function smallLinks(page: Page, tall: number) {
  return page.evaluate(
    ({ keel, tall }) => {
      const links = [...document.querySelectorAll(`${keel} a`)];
      return {
        count: links.length,
        small: links.flatMap((a) => {
          const r = a.getBoundingClientRect();
          return r.width >= 24 && r.height >= tall
            ? []
            : [`${a.getAttribute("href")}: ${r.width} x ${r.height}`];
        }),
      };
    },
    { keel: KEEL, tall },
  );
}

/**
 * Every keel link by where it sits: a rule's (by its number) or the record line's (by its href),
 * sorted. Sprint 50 (Ra, R3) links the record line to the Log's Every revision, so K6's count of
 * six became this list: six source links, one per rule, and exactly one /log#every-revision in
 * p[data-keel-record] (.crew/sprint/49/first-contract.md, "Kept checks"). Sprint 66 (T24): the
 * list pinned every link in a rule as that rule's one source link, so the trials door would have
 * read as a second "rule 1"; now a link in p[data-trials-door] is its own entry, by its rule and
 * href, and the list holds exactly one, rule 1's to /trials, beside the six sources and the record
 * line's.
 */
function keelLinks(page: Page) {
  return page.evaluate((keel) => {
    const out = [...document.querySelectorAll(`${keel} a`)].map((a) => {
      const rule = a.closest("li[data-rule]");
      if (rule && a.closest("p[data-trials-door]"))
        return `the trials door in rule ${rule.getAttribute("data-rule")}: ${a.getAttribute("href")}`;
      if (rule) return `rule ${rule.getAttribute("data-rule")}`;
      const where = a.closest("p[data-keel-record]")
        ? "the record line"
        : "elsewhere";
      return `${where}: ${a.getAttribute("href")}`;
    });
    return out.sort();
  }, KEEL);
}

const KEEL_LINKS = [
  ...RULES.map((rule) => `rule ${rule.n}`),
  "the record line: /log#every-revision",
  `the trials door in rule 1: ${TRIALS_DOOR.href}`,
].sort();

/** Anything in the keel painted in `accent` (B1.6's properties), pseudo-elements included. */
function keelCopper(page: Page, accent: number[]) {
  return page.evaluate(
    ({ keel, target }) => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      const section = document.querySelector(keel);
      if (!rgba || !section) return ["no __rgba or no keel"];
      const same = (value: string) => {
        const c = rgba(value);
        return Boolean(
          c?.every(
            (v, i) => Math.abs(v - (target[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
          ),
        );
      };
      const ownText = (el: Element) =>
        [...el.childNodes].some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "").trim() !== "",
        );
      const hits: string[] = [];
      for (const el of [section, ...section.querySelectorAll("*")]) {
        if (el.getClientRects().length === 0) continue;
        const name = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
        for (const pseudo of [
          null,
          "::before",
          "::after",
          "::marker",
        ] as const) {
          if (pseudo === "::marker" && el.tagName !== "LI") continue;
          const s = getComputedStyle(el, pseudo);
          if (
            pseudo &&
            pseudo !== "::marker" &&
            ["none", "normal"].includes(s.content)
          )
            continue;
          const where = `${name}${pseudo ?? ""}`;
          const check = (property: string, value: string, painted = true) => {
            if (painted && same(value)) hits.push(`${where} ${property}`);
          };
          check(
            "color",
            s.color,
            pseudo !== null || ownText(el) || el.tagName === "A",
          );
          check("background-color", s.backgroundColor);
          for (const side of ["Top", "Right", "Bottom", "Left"] as const)
            check(
              `border-${side.toLowerCase()}-color`,
              s[`border${side}Color`],
              s[`border${side}Style`] !== "none" &&
                Number.parseFloat(s[`border${side}Width`]) > 0,
            );
          check(
            "outline-color",
            s.outlineColor,
            s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0,
          );
          check(
            "text-decoration-color",
            s.textDecorationColor,
            s.textDecorationLine !== "none",
          );
          if (el instanceof SVGElement && !pseudo) {
            check("fill", s.fill, s.fill !== "none");
            check("stroke", s.stroke, s.stroke !== "none");
          }
        }
      }
      return hits;
    },
    { keel: KEEL, target: accent },
  );
}

/**
 * Each rule, its label, quote and link as shown: a box, visible, at full opacity down its
 * ancestors, and text in a colour unlike the ground painted behind it.
 */
function keelShows(page: Page) {
  return page.evaluate((keel) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const section = document.querySelector(keel);
    if (!rgba || !section)
      return { rules: 0, problems: ["no __rgba or no keel"] };
    const ground = (el: Element) => {
      for (let a: Element | null = el; a; a = a.parentElement) {
        const c = rgba(getComputedStyle(a).backgroundColor);
        if (c && (c[3] ?? 0) >= 0.99) return c.slice(0, 3).join();
      }
      return (
        rgba(getComputedStyle(document.documentElement).backgroundColor) ?? [
          255, 255, 255,
        ]
      )
        .slice(0, 3)
        .join();
    };
    const problems: string[] = [];
    const items = [...section.querySelectorAll("li[data-rule]")];
    for (const li of items) {
      const n = li.getAttribute("data-rule");
      const parts: [string, Element | null][] = [
        ["rule", li],
        ["label", li.querySelector("[data-enforcer]")],
        ["quote", li.querySelector("blockquote")],
        ["link", li.querySelector("a")],
      ];
      for (const [what, el] of parts) {
        const name = `rule ${n}'s ${what}`;
        if (!el) {
          problems.push(`${name}: missing`);
          continue;
        }
        const s = getComputedStyle(el);
        if (el.getClientRects().length === 0) problems.push(`${name}: no box`);
        if (s.visibility !== "visible")
          problems.push(`${name}: ${s.visibility}`);
        let opacity = 1;
        for (let a: Element | null = el; a; a = a.parentElement)
          opacity *= Number(getComputedStyle(a).opacity);
        if (opacity < 0.99) problems.push(`${name}: opacity ${opacity}`);
        if ((el.textContent ?? "").trim() === "")
          problems.push(`${name}: no text`);
        const ink = rgba(s.color)?.slice(0, 3).join();
        if (!ink || ink === ground(el))
          problems.push(`${name}: text ${s.color} on its ground`);
      }
    }
    return { rules: items.length, problems };
  }, KEEL);
}

for (const [width, height] of K6_SIZES) {
  const size = `${width} x ${height}`;
  test(`K6 it reads at every width and in every mode, ${size}: light and dark, axe with B4.24's strict tags is clean on /crew, nothing scrolls sideways on the page or inside a quote, every keel link is a 24 px target, nothing in it is copper at rest, hovered or focused, and in forced colours and in print every rule, label, quote and link shows; on Full at rest, each rule scrolled into view, the keel meets no [data-model] box nor its canvas's`, async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    for (const scheme of SCHEMES) {
      const where = `at ${size}, ${scheme}`;
      const { context, page } = await contextOf(
        browser,
        width,
        height,
        true,
        scheme,
      );
      try {
        await openCrew(page, width, height);
        await expect(page.locator(KEEL), `the keel ${where}`).toHaveCount(1);
        const axe = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        expect
          .soft(
            axe.violations.map((v) => ({
              rule: v.id,
              targets: v.nodes.map((n) => n.target.join(" ")),
            })),
            `axe on /crew ${where}`,
          )
          .toEqual([]);
        expect
          .soft(await horizontalOverflow(page), `page overflow ${where}`)
          .toBe(0);
        expect
          .soft(await sideways(page), `the keel sideways ${where}`)
          .toEqual([]);
        const tall = width >= 1024 ? 24 : 44;
        const targets = await smallLinks(page, tall);
        expect
          .soft(
            await keelLinks(page),
            `keel links ${where}: one source link per rule, the record line's one and rule 1's trials door (${targets.count} in all)`,
          )
          .toEqual(KEEL_LINKS);
        expect
          .soft(targets.small, `keel links under 24 x ${tall} px ${where}`)
          .toEqual([]);

        const accent = (await resolveColors(page))["--accent"]?.rgba ?? [];
        expect(accent.length, "--accent resolves").toBe(4);
        const hits: string[] = [];
        await page.mouse.move(0, 0);
        hits.push(
          ...(await keelCopper(page, accent)).map((h) => `at rest: ${h}`),
        );
        const links = page.locator(`${KEEL} a`);
        for (let i = 0; i < (await links.count()); i++) {
          await links.nth(i).focus();
          hits.push(
            ...(await keelCopper(page, accent)).map(
              (h) => `link ${i + 1} focused: ${h}`,
            ),
          );
          await links.nth(i).evaluate((a) => (a as HTMLElement).blur());
          await links.nth(i).hover();
          hits.push(
            ...(await keelCopper(page, accent)).map(
              (h) => `link ${i + 1} hovered: ${h}`,
            ),
          );
        }
        await page.mouse.move(0, 0);
        expect.soft(hits, `copper in the keel ${where}`).toEqual([]);

        for (const mode of ["print", "forced colours"] as const) {
          await page.emulateMedia(
            mode === "print"
              ? { media: "print", forcedColors: "none" }
              : { media: "screen", forcedColors: "active" },
          );
          await openCrew(page, width, height);
          const shows = await keelShows(page);
          expect
            .soft(shows.rules, `rules ${where}, in ${mode}`)
            .toBe(RULES.length);
          expect
            .soft(shows.problems, `the keel ${where}, in ${mode}`)
            .toEqual([]);
        }
      } finally {
        await context.close();
      }
    }

    // The model's box doesn't change with the scheme, so it is read once per size, light.
    const run = await openModel(browser, { width, height });
    try {
      await run.goto("/crew");
      await run.waitFor([...REST], FIRST);
      await expect(
        run.page.locator(KEEL),
        `the keel on Full at ${size}`,
      ).toHaveCount(1);
      await expect(
        run.page.locator(MODEL),
        `[data-model] at ${size}`,
      ).toHaveCount(1);
      const count = await run.page.locator(`${KEEL} li[data-rule]`).count();
      const met: string[] = [];
      for (let i = 0; i < count; i++) {
        await run.page
          .locator(`${KEEL} li[data-rule]`)
          .nth(i)
          .evaluate((li) => li.scrollIntoView({ block: "center" }));
        await pause(300);
        await run.waitFor([...REST], 10_000);
        const read = await run.page.evaluate(
          ({ keel, model, i }) => {
            const m = document.querySelector(model)?.getBoundingClientRect();
            // The canvas too: placement.md has them abut, so a canvas wider than its layer shows here.
            const c = document
              .querySelector(`${model} canvas`)
              ?.getBoundingClientRect();
            const li = document.querySelectorAll(`${keel} li[data-rule]`)[i];
            const k = document.querySelector(keel)?.getBoundingClientRect();
            const r = li?.getBoundingClientRect();
            // Overlap counts past 0.5 px on both axes. The canvas is whole-pixel: at 1024 it is 567 px
            // wide for a 566.84 px layer, so its edge reaches 0.16 px past the column edge the keel
            // starts on (Forge's build, c9ebb59), as it already does against the panel on main. A
            // canvas a whole pixel wider than its layer still meets the keel.
            const meets = (a?: DOMRect, b?: DOMRect) =>
              Boolean(
                a &&
                  b &&
                  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
                  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5,
              );
            const box = (b?: DOMRect) =>
              b
                ? [b.left, b.top, b.width, b.height].map((v) => +v.toFixed(1))
                : null;
            return {
              n: li?.getAttribute("data-rule"),
              inView: Boolean(r && r.top < innerHeight && r.bottom > 0),
              keel: meets(k, m) || meets(k, c),
              rule: meets(r, m) || meets(r, c),
              boxes: {
                model: box(m),
                canvas: box(c),
                keel: box(k),
                rule: box(r),
              },
            };
          },
          { keel: KEEL, model: MODEL, i },
        );
        expect
          .soft(read.inView, `rule ${read.n} scrolled into view at ${size}`)
          .toBe(true);
        if (read.keel || read.rule)
          met.push(`rule ${read.n} in view: ${JSON.stringify(read.boxes)}`);
      }
      expect.soft(count, `rules on Full at ${size}`).toBe(RULES.length);
      expect
        .soft(met, `the keel meeting [data-model] on Full at rest at ${size}`)
        .toEqual([]);
      expect.soft(run.errors, `console errors on Full at ${size}`).toEqual([]);
    } finally {
      await run.close();
    }
  });
}

// ---------------------------------------------------------------------------------------------
// K7 and K1's live pass: on the default server and the live fixture (this checkout's build only)

type Box = [number, number, number, number];
type Boxes = Record<string, Box | null>;
const K7_SIZES = [
  [1440, 900],
  [390, 844],
] as const;
/** The sticky read's other windows from 1024 (placement.md, "What Forge must measure", 1). */
const STICKY_ONLY = [
  [1024, 768],
  [1536, 715],
] as const;
/**
 * What K7 pins, each [selector, anchor]. The drawing and the panel's h1 are pinned where they sit
 * on the page. The table and [data-rules] sit under text the newest retro writes (the chip's goal;
 * Evidence's PR and Approval's words), which rewraps at every merge, so each is pinned by its left,
 * width and height and by its top's distance from the foot of the element just above it that holds
 * that text: [data-chip] for the table, [data-approval] for the rules (fix round 2 on #110, after
 * sprint 47's goal fitted one line where sprint 46's wrapped and moved both up 25.5 px). A layout
 * change, the keel's included, still moves the drawing, the h1, a width or a gap.
 */
const ABOVE = {
  drawing: [".crew-drawing", null],
  h1: [`${PANEL} h1`, null],
  table: [`${PANEL} table`, `${PANEL} [data-chip]`],
  rules: ["[data-rules]", "[data-approval]"],
} as const;

/**
 * The boxes K7 pins: left, top (page coordinates, or from the anchor's foot), width and height.
 */
function aboveBoxes(page: Page): Promise<Boxes> {
  return page.evaluate((above) => {
    const one = (selector: string) => {
      const found = document.querySelectorAll(selector);
      return found.length === 1
        ? (found[0]?.getBoundingClientRect() ?? null)
        : null;
    };
    const out: Record<string, [number, number, number, number] | null> = {};
    for (const [name, [selector, anchor]] of Object.entries(above)) {
      const r = one(selector);
      const a = anchor === null ? null : one(anchor);
      const top =
        anchor === null
          ? (r?.top ?? 0) + scrollY
          : a
            ? (r?.top ?? 0) - a.bottom
            : null;
      out[name] =
        r && top !== null
          ? ([r.left, top, r.width, r.height].map(
              (v) => Math.round(v * 100) / 100,
            ) as [number, number, number, number])
          : null;
    }
    return out;
  }, ABOVE);
}

/**
 * Main's boxes, WebGL refused, light, recorded by this spec's K7 on main's product (dfe9f86, with
 * sprint 46's retro the newest): the table's and the rules' tops are from their anchors' feet.
 * Owner copy that rewraps the panel's fixed text moves them: re-record and say so.
 */
const MAIN: Record<"default" | "live", Record<string, Boxes>> = {
  default: {
    "1440 x 900": {
      drawing: [16, 72, 808, 478.5],
      h1: [849, 96, 79.92, 49.39],
      table: [849, 78.27, 551, 328.56],
      rules: [941, 8, 459, 58.5],
    },
    "390 x 844": {
      drawing: [16, 52, 358, 223.75],
      h1: [16, 353.7, 55.48, 36.09],
      table: [16, 104, 358, 312.16],
      rules: [100, 8, 274, 97.5],
    },
  },
  live: {
    "1440 x 900": {
      drawing: [16, 72, 808, 478.5],
      h1: [849, 96, 79.92, 49.39],
      table: [849, 56, 551, 328.56],
      rules: [941, 8, 459, 58.5],
    },
    "390 x 844": {
      drawing: [16, 52, 358, 223.75],
      h1: [16, 353.7, 55.48, 36.09],
      table: [16, 66, 358, 222.97],
      rules: [100, 8, 274, 97.5],
    },
  },
};

function moved(now: Boxes, main: Boxes | undefined) {
  if (!main) return ["no record from main"];
  return Object.keys(ABOVE).flatMap((name) => {
    const a = now[name];
    const b = main[name];
    if (!a || !b)
      return [`${name}: ${JSON.stringify(a)} against ${JSON.stringify(b)}`];
    return a.some((v, i) => Math.abs(v - (b[i] ?? Number.NaN)) > 0.5)
      ? [`${name}: ${JSON.stringify(a)} against main's ${JSON.stringify(b)}`]
      : [];
  });
}

/** K7 on one server: the boxes at both sizes, the sticky drawing from 1024, and CLS at load. */
async function k7On(
  browser: Browser,
  base: string,
  server: "default" | "live",
) {
  const where =
    server === "default" ? "the default server" : "the live fixture";
  for (const [width, height] of [...K7_SIZES, ...STICKY_ONLY]) {
    const size = `${width} x ${height}`;
    const { context, page } = await contextOf(browser, width, height, true);
    try {
      await openCrew(page, width, height, base);
      if (K7_SIZES.some(([w, h]) => w === width && h === height)) {
        const now = await aboveBoxes(page);
        note(test.info(), `boxes ${server} ${size}`, JSON.stringify(now));
        expect
          .soft(
            moved(now, MAIN[server][size]),
            `boxes that moved from main's at ${size} on ${where}`,
          )
          .toEqual([]);
      }

      if (width >= 1024) {
        // The keel's h2 at the viewport's middle. A spacer after main lets the page scroll that far
        // without touching the grid the drawing sticks in. Soft, so a page without the keel (main)
        // still records the CLS reads after it.
        const stuck = await page.evaluate(() => {
          const h = document.getElementById("keel");
          if (h?.tagName !== "H2") return null;
          const spacer = document.createElement("div");
          spacer.style.height = "100vh";
          document.body.append(spacer);
          const r = h.getBoundingClientRect();
          scrollTo(0, r.top + scrollY + r.height / 2 - innerHeight / 2);
          const after = h.getBoundingClientRect();
          return {
            middle: after.top + after.height / 2 - innerHeight / 2,
            scrollY,
            top:
              document.querySelector(".crew-drawing")?.getBoundingClientRect()
                .top ?? null,
          };
        });
        expect.soft(stuck, `h2#keel at ${size} on ${where}`).not.toBeNull();
        if (stuck) {
          // The precondition: the h2 where the contract puts it, the page scrolled well past the
          // drawing's own place, so a top of 72 is the sticky offset and no coincidence.
          expect
            .soft(
              Math.abs(stuck.middle),
              `the h2's centre from the viewport's middle at ${size} on ${where}`,
            )
            .toBeLessThanOrEqual(1);
          expect
            .soft(stuck.scrollY, `scrolled at ${size} on ${where}`)
            .toBeGreaterThan(100);
          note(
            test.info(),
            `sticky ${server} ${size}`,
            `scrollY ${stuck.scrollY}, .crew-drawing's top ${stuck.top}`,
          );
          expect
            .soft(
              Math.abs((stuck.top ?? Number.NaN) - 72),
              `.crew-drawing's top from the bar's 72 px with the keel's h2 at the middle at ${size} on ${where}`,
            )
            .toBeLessThanOrEqual(0.5);
        }
      }
    } finally {
      await context.close();
    }
  }

  // B1.8's CLS read: layout shift 0 over load plus 2 s, web fonts included.
  for (const [width, height] of [
    [1440, 900],
    [390, 664],
  ] as const) {
    const { context, page } = await contextOf(browser, width, height, true);
    try {
      await watchLayoutShift(page);
      await openCrew(page, width, height, base);
      expect
        .soft(await page.locator(KEEL).count(), `the keel on ${where}`)
        .toBe(1);
      await pause(2000);
      const cls = await page.evaluate(
        () => (window as Window & { __cls?: number }).__cls,
      );
      expect
        .soft(
          cls,
          `layout shift over load plus 2 s at ${width} x ${height} on ${where}`,
        )
        .toBe(0);
    } finally {
      await context.close();
    }
  }
}

function reachLive(crew: Crew) {
  return crew.once("keel live", async () => {
    const site = await crew.site("live", { fixture: "live" });
    const shown = await untilState(site.baseURL, "live", STATE_WAIT);
    return { base: site.baseURL, shown };
  });
}

test.describe("on this checkout's build and the live fixture", () => {
  test.describe.configure({ mode: "default" });
  test.skip(
    DEPLOYED,
    "PLAYWRIGHT_BASE_URL is set: main's boxes are this checkout's down state, and the live state needs this checkout's build served from a copy pointed at the fixture server (B4.22's harness)",
  );
  test.beforeAll(async () => {
    void reachLive(await crewOf());
  });

  test(`${K1} (the live fixture's pass)`, async ({ browser, crew }) => {
    test.setTimeout(150_000);
    const live = await reachLive(crew);
    expect(live.shown.seen, `/crew shows live within ${STATE_WAIT} ms`).toBe(
      "live",
    );
    await k1On(browser, live.base, "the live fixture");
  });

  test("K7 nothing above it moves: at 1440 x 900 and 390 x 844, WebGL refused, on the default server and the live fixture, .crew-drawing, the panel's h1, its table and [data-rules] have main's boxes within 0.5 px (the table's and the rules' tops from the foot of the retro text above them, [data-chip] and [data-approval]); at 1024 x 768, 1440 x 900 and 1536 x 715 with the keel's h2 at the viewport's middle .crew-drawing's top is the bar's 72 px; B1.8's CLS read is 0 at load at 1440 x 900 and 390 x 664", async ({
    browser,
    crew,
  }) => {
    test.setTimeout(180_000);
    await k7On(browser, "", "default");
    const live = await reachLive(crew);
    expect(live.shown.seen, `/crew shows live within ${STATE_WAIT} ms`).toBe(
      "live",
    );
    await k7On(browser, live.base, "live");
  });
});
