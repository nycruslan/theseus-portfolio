import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { horizontalOverflow, resolveColors, SCHEMES } from "./helpers";

// Sprint 3 (project cards): one test per numbered check in .studio/sprint/3/contract.md, named by
// its number. These bind this sprint's card; once it merges, Probe folds the lasting parts into
// invariants.spec.ts and retires the rest (the exact-snapshot parts of C2 and C8 especially).
//
// "The card" is a list item of the Projects section. Its *surface* is that item or any descendant
// whose box covers it, so a border or background on an inner wrapper or on the link counts. Note
// the section is found by `aria-labelledby="projects"`: in app/page.tsx the `projects` id sits on
// the h2, not on the section, so the contract's `#projects` means that section.

// Every custom property app/globals.css declares, in order, at the start of sprint 3 (9a37002).
const DECLARED_AT_SPRINT_START = [
  "--background: #e6f3f1",
  "--foreground: #0f2220",
  "--muted: #455e5a",
  "--accent: #944126",
  "--rule: #c5d5d2",
  "--step-sm: clamp(0.8333rem, 0.8304rem + 0.0149vw, 0.8438rem)",
  "--step-base: clamp(1rem, 0.9643rem + 0.1786vw, 1.125rem)",
  "--step-lg: clamp(1.2rem, 1.1143rem + 0.4286vw, 1.5rem)",
  "--step-xl: clamp(1.44rem, 1.28rem + 0.8vw, 2rem)",
  "--step-2xl: clamp(3rem, 2.5rem + 2.5vw, 4.75rem)",
  "--color-background: var(--background)",
  "--color-foreground: var(--foreground)",
  "--color-muted: var(--muted)",
  "--color-accent: var(--accent)",
  "--color-rule: var(--rule)",
  "--text-step-sm: var(--step-sm)",
  "--text-step-sm--line-height: 1.5",
  "--text-step-base: var(--step-base)",
  "--text-step-base--line-height: 1.6",
  "--text-step-lg: var(--step-lg)",
  "--text-step-lg--line-height: 1.45",
  "--text-step-xl: var(--step-xl)",
  "--text-step-xl--line-height: 1.2",
  "--text-step-2xl: var(--step-2xl)",
  "--text-step-2xl--line-height: 1",
  "--font-sans: var(--font-geist-sans)",
  "--background: #091413",
  "--foreground: #e1eae9",
  "--muted: #96a9a6",
  "--accent: #eb8a64",
  "--rule: #2d4543",
];

const PROJECTS = 'section[aria-labelledby="projects"]';
const withLink = profile.projects.filter((project) => project.href);

const cardsOf = (page: Page) => page.locator(`${PROJECTS} li`);
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Playwright runs from the repo root (that is where playwright.config.ts lives).
const repoRoot = () => process.cwd();

/** The five color tokens as the browser computes them in the page's current scheme. */
async function tokenColors(page: Page) {
  const colors = await resolveColors(page);
  return Object.fromEntries(
    Object.entries(colors).map(([name, { computed }]) => [name, computed]),
  );
}

/** Source files under dir (relative to the repo root) that hold code or CSS, with comments removed. */
function sources(root: string, dir: string) {
  return readdirSync(join(root, dir), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.(tsx?|css)$/.test(file))
    .map((file) => {
      const text = readFileSync(join(root, dir, file), "utf8");
      return {
        file: `${dir}/${file}`,
        // Line comments after a ":" are left alone, so "https://" survives.
        code: text
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1"),
      };
    });
}

// ---------------------------------------------------------------------------------------------

test("C1. one card per project, with its name, description and link", async ({
  page,
}) => {
  await page.goto("/");
  const cards = cardsOf(page);
  await expect(cards, "cards (list items) in the Projects section").toHaveCount(
    profile.projects.length,
  );
  for (const [index, project] of profile.projects.entries()) {
    const card = cards.nth(index);
    const title = card.locator("h3");
    await expect(title, `h3 in card ${index}`).toHaveCount(1);
    await expect(title, `card ${index} title`).toHaveText(project.name);
    await expect(card, `card ${index} description`).toContainText(
      project.description,
    );
    const links = card.locator("a");
    if (project.href) {
      await expect(links, `links in the ${project.name} card`).toHaveCount(1);
      await expect(links, `${project.name} link target`).toHaveAttribute(
        "href",
        project.href,
      );
      await expect(
        card.getByRole("link"),
        `${project.name} link accessible name`,
      ).toHaveAccessibleName(new RegExp(escapeRegExp(project.name)));
    } else {
      await expect(
        links,
        `links in the ${project.name} card (it has no href)`,
      ).toHaveCount(0);
    }
  }

  // A project with no href must get no link. The content has none to render today, so the branch
  // can only be seen in the source: the page or the card component still tests `href`.
  const root = repoRoot();
  const card = join(root, "components", "project-card.tsx");
  const code = [join(root, "app", "page.tsx"), card]
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  expect(
    code,
    "app/page.tsx or components/project-card.tsx branches on href",
  ).toMatch(
    /!\s*[\w.]*\bhref\b|\bhref\b\s*(?:\?(?![.?])|&&|[!=]==?\s*undefined)/,
  );
});

test("C2. no words added, none lost", async ({ page }) => {
  await page.goto("/");
  const cards = cardsOf(page);
  await expect(cards).toHaveCount(profile.projects.length);
  for (const [index, project] of profile.projects.entries()) {
    const card = cards.nth(index);
    const text = normalize(await card.innerText());
    expect(text, `visible text of the ${project.name} card`).toBe(
      normalize(`${project.name} ${project.description}`),
    );
    // The sign that the card is a link must be CSS or an aria-hidden SVG, never text, never an
    // image, and never a glyph put in with `content`.
    const extras = await card.evaluate((li) => {
      const all = [li, ...li.querySelectorAll("*")];
      const generated = all.flatMap((el) =>
        ["::before", "::after"].flatMap((pseudo) => {
          const content = getComputedStyle(el, pseudo).content;
          const empty = ["none", "normal", '""', "''"].includes(content);
          return empty
            ? []
            : [`${el.tagName.toLowerCase()}${pseudo} ${content}`];
        }),
      );
      const svgs = [...li.querySelectorAll("svg")]
        .filter((svg) => svg.getAttribute("aria-hidden") !== "true")
        .map((svg) => svg.outerHTML.slice(0, 60));
      return {
        generated,
        svgsNotAriaHidden: svgs,
        images: li.querySelectorAll("img, picture, canvas, video").length,
      };
    });
    expect(extras.generated, "text made with CSS content").toEqual([]);
    expect(extras.svgsNotAriaHidden, "svg without aria-hidden").toEqual([]);
    expect(extras.images, "images in the card").toBe(0);
  }

  // Everything outside the cards (header, Experience, the section headings, Contact) says what the
  // profile says, in order. Expected strings come from content/profile.ts, not from a snapshot.
  const outside = await page.evaluate(() => {
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
    const cards = [
      ...document.querySelectorAll('section[aria-labelledby="projects"] li'),
    ];
    const out: string[] = [];
    const walk = (node: Node) => {
      if (node instanceof Element) {
        if (skip.has(node.tagName) || cards.includes(node)) return;
        if (getComputedStyle(node).display === "none") return;
      }
      if (node.nodeType === Node.TEXT_NODE) out.push(node.textContent ?? "");
      else node.childNodes.forEach(walk);
    };
    walk(document.body);
    return out.join(" ");
  });
  const expected = [
    profile.name,
    profile.headline,
    profile.location,
    profile.bio,
    "Experience",
    ...profile.experience.flatMap((role) => [
      `${role.title} · ${role.company}`,
      role.period,
      role.summary,
    ]),
    "Projects",
    "Contact",
    ...profile.links.map((link) => link.label),
  ].join(" ");
  expect(normalize(outside), "text outside the project cards").toBe(
    normalize(expected),
  );
});

test("C3. the whole card is the target", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const project of withLink) {
      const href = project.href ?? "";
      await page.goto("/");
      const card = cardsOf(page).nth(profile.projects.indexOf(project));
      await card.scrollIntoViewIfNeeded();
      const phone = viewport.width === 390;
      const result = await card.evaluate((li, grid) => {
        const link = li.querySelector("a");
        const rect = li.getBoundingClientRect();
        const inset = 8;
        const xs = [
          rect.left + inset,
          rect.left + rect.width / 2,
          rect.right - inset,
        ];
        const ys = [
          rect.top + inset,
          rect.top + rect.height / 2,
          rect.bottom - inset,
        ];
        // The five points the contract names, plus (on a phone) the whole 3 x 3 grid.
        const points: [number, number][] = grid
          ? xs.flatMap((x) => ys.map((y): [number, number] => [x, y]))
          : [
              [xs[0] ?? 0, ys[0] ?? 0],
              [xs[2] ?? 0, ys[0] ?? 0],
              [xs[1] ?? 0, ys[1] ?? 0],
              [xs[0] ?? 0, ys[2] ?? 0],
              [xs[2] ?? 0, ys[2] ?? 0],
            ];
        const misses = points.flatMap(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          const ok = Boolean(
            link &&
              hit &&
              (hit === link || link.contains(hit) || hit.closest("a") === link),
          );
          return ok
            ? []
            : [
                `(${Math.round(x)}, ${Math.round(y)}) hit <${hit?.tagName.toLowerCase()}>`,
              ];
        });
        return {
          misses,
          height: rect.height,
          bottomRight: points[points.length - 1],
        };
      }, phone);
      const where = `${project.name} card at ${viewport.width} px`;
      expect(
        result.misses,
        `points in the ${where} that miss the link`,
      ).toEqual([]);
      if (phone) {
        expect(result.height, `${where}: card height`).toBeGreaterThanOrEqual(
          44,
        );
      }
      // And a real click in the corner follows the link (the destination is stubbed).
      await page.route(href, (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<title>stub</title>",
        }),
      );
      const [x = 0, y = 0] = result.bottomRight ?? [];
      await page.mouse.click(x, y);
      await page.waitForURL(new URL(href, page.url()).href, { timeout: 5_000 });
      await page.unroute(href);
    }
  }
});

test("C4. title in ink, underline in copper, in both schemes", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const colors = await tokenColors(page);
    const cards = cardsOf(page);
    for (const [index, project] of profile.projects.entries()) {
      const title = await cards.nth(index).evaluate((li, name) => {
        // The element that holds the title's text, and the nearest one from there up to the card
        // that draws the underline (text-decoration is set on an ancestor as often as on the text).
        const holder = [...li.querySelectorAll("h3, h3 *")].find((el) =>
          [...el.childNodes].some(
            (node) =>
              node.nodeType === Node.TEXT_NODE &&
              (node.textContent ?? "").includes(name),
          ),
        );
        if (!holder) return null;
        let line: Element | null = holder;
        while (line && line !== li.parentElement) {
          if (getComputedStyle(line).textDecorationLine.includes("underline"))
            break;
          line = line.parentElement;
        }
        const drawn =
          line && line !== li.parentElement ? getComputedStyle(line) : null;
        return {
          color: getComputedStyle(holder).color,
          line: drawn?.textDecorationLine ?? "none",
          lineColor: drawn?.textDecorationColor ?? "",
        };
      }, project.name);
      expect(title, `${project.name} title text found in an h3`).not.toBeNull();
      expect
        .soft(title?.color, `${project.name} title color (${scheme})`)
        .toBe(colors["--foreground"]);
      // A project with no href has no link, so its name is plain ink with no underline: an
      // underline there would promise a link that isn't (direction.md, no-href branch).
      if (project.href) {
        expect
          .soft(
            title?.line,
            `${project.name} title text-decoration-line (${scheme})`,
          )
          .toContain("underline");
        expect
          .soft(
            title?.lineColor,
            `${project.name} title underline color (${scheme})`,
          )
          .toBe(colors["--accent"]);
      } else {
        expect
          .soft(
            title?.line,
            `${project.name} (no href) title has no underline (${scheme})`,
          )
          .not.toContain("underline");
      }
    }
    const contact = await page
      .locator('section[aria-labelledby="contact"] a')
      .evaluateAll((links) => links.map((a) => getComputedStyle(a).color));
    expect(contact.length, "Contact links").toBe(profile.links.length);
    for (const color of contact) {
      expect
        .soft(color, `Contact link color (${scheme})`)
        .toBe(colors["--accent"]);
    }
  }
});

test("C5. a card reads as a card, from tokens only", async ({ page }) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const tokens = Object.values(await tokenColors(page));
    const cards = cardsOf(page);
    for (const [index] of profile.projects.entries()) {
      const info = await cards.nth(index).evaluate((li) => {
        const box = li.getBoundingClientRect();
        const all = [li, ...li.querySelectorAll("*")];
        const label = (el: Element) =>
          `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : ""}>`;
        const sides = ["Top", "Right", "Bottom", "Left"] as const;
        // The item and every descendant whose box covers the whole item (within a pixel).
        const surfaces = all.filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.left <= box.left + 1 &&
            r.top <= box.top + 1 &&
            r.right >= box.right - 1 &&
            r.bottom >= box.bottom - 1
          );
        });
        return {
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          surfaces: surfaces.map((el) => {
            const style = getComputedStyle(el);
            return {
              el: label(el),
              background: style.backgroundColor,
              borders: sides.map((side) => ({
                width: Number.parseFloat(
                  style.getPropertyValue(`border-${side.toLowerCase()}-width`),
                ),
                color: style.getPropertyValue(
                  `border-${side.toLowerCase()}-color`,
                ),
              })),
            };
          }),
          shadows: all.flatMap((el) => {
            const style = getComputedStyle(el);
            return [style.boxShadow, style.textShadow].some((v) => v !== "none")
              ? [`${label(el)} ${style.boxShadow} / ${style.textShadow}`]
              : [];
          }),
          translucent: all.flatMap((el) =>
            getComputedStyle(el).opacity === "1"
              ? []
              : [`${label(el)} opacity ${getComputedStyle(el).opacity}`],
          ),
          svgPaint: [...li.querySelectorAll("svg, svg *")].flatMap((el) => {
            const style = getComputedStyle(el);
            return [style.fill, style.stroke].filter(
              (paint) => paint !== "none",
            );
          }),
        };
      });
      const transparent = "rgba(0, 0, 0, 0)";
      const delimited = info.surfaces.some(
        (surface) =>
          surface.borders.some((border) => border.width > 0) ||
          (surface.background !== transparent &&
            surface.background !== info.bodyBackground),
      );
      expect
        .soft(
          delimited,
          `card ${index} has a border or a background unlike the body's (${scheme}); surfaces: ${JSON.stringify(info.surfaces)}`,
        )
        .toBe(true);
      const notTokens = info.surfaces.flatMap((surface) => [
        ...surface.borders
          .filter(
            (border) => border.width > 0 && !tokens.includes(border.color),
          )
          .map((border) => `${surface.el} border ${border.color}`),
        ...(surface.background !== transparent &&
        !tokens.includes(surface.background)
          ? [`${surface.el} background ${surface.background}`]
          : []),
      ]);
      expect
        .soft(notTokens, `card colors that are not a token (${scheme})`)
        .toEqual([]);
      expect.soft(info.shadows, `shadows in the card (${scheme})`).toEqual([]);
      expect
        .soft(info.translucent, `translucent parts of the card (${scheme})`)
        .toEqual([]);
      expect
        .soft(
          info.svgPaint.filter((paint) => !tokens.includes(paint)),
          `svg fill or stroke that is not a token (${scheme})`,
        )
        .toEqual([]);
    }
  }
});

test("C6. keyboard: tabbing to the link outlines the whole card", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const project of withLink) {
      await page.goto("/");
      const tokens = Object.values(await tokenColors(page));
      const card = cardsOf(page).nth(profile.projects.indexOf(project));
      const link = card.locator("a");
      let focused = false;
      for (let presses = 0; presses < 30 && !focused; presses++) {
        await page.keyboard.press("Tab");
        focused = await link.evaluate((el) => el === document.activeElement);
      }
      expect(
        focused,
        `Tab reaches the ${project.name} link within 30 presses`,
      ).toBe(true);
      expect(
        await link.evaluate((el) => el.matches(":focus-visible")),
        "link matches :focus-visible",
      ).toBe(true);

      // A focus ring may fade in; measure it once any transition has run its course.
      await page.evaluate(() =>
        Promise.all(
          document.getAnimations().map((animation) => animation.finished),
        ),
      );
      const found = await card.evaluate((li) => {
        const box = li.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        type Box = { left: number; top: number; right: number; bottom: number };
        // A generated box has no getBoundingClientRect; an absolutely positioned one (a stretched
        // link) is placed from its containing block with the used offsets the browser reports.
        const pseudoBox = (el: Element, style: CSSStyleDeclaration): Box => {
          const own = el.getBoundingClientRect();
          if (style.position !== "absolute") return own;
          let block: Element | null = el;
          while (block && getComputedStyle(block).position === "static")
            block = block.parentElement;
          const origin = (
            block ?? document.documentElement
          ).getBoundingClientRect();
          const left =
            origin.left +
            (block?.clientLeft ?? 0) +
            Number.parseFloat(style.left);
          const top =
            origin.top + (block?.clientTop ?? 0) + Number.parseFloat(style.top);
          const width = Number.parseFloat(style.width);
          const height = Number.parseFloat(style.height);
          if ([left, top, width, height].some(Number.isNaN)) return own;
          return { left, top, right: left + width, bottom: top + height };
        };
        const outlined = [li, ...li.querySelectorAll("*")].flatMap((el) =>
          [null, "::before", "::after"].flatMap((pseudo) => {
            const style = getComputedStyle(el, pseudo);
            if (pseudo && ["none", "normal"].includes(style.content)) return [];
            if (
              style.outlineStyle === "none" ||
              style.outlineStyle === "hidden"
            )
              return [];
            const b = pseudo
              ? pseudoBox(el, style)
              : el.getBoundingClientRect();
            return [
              {
                el: `<${el.tagName.toLowerCase()}>${pseudo ?? ""}`,
                width: Number.parseFloat(style.outlineWidth),
                style: style.outlineStyle,
                color: style.outlineColor,
                containsCenter:
                  b.left <= cx &&
                  cx <= b.right &&
                  b.top <= cy &&
                  cy <= b.bottom,
              },
            ];
          }),
        );
        return outlined;
      });
      const good = found.filter(
        (o) => o.width >= 2 && tokens.includes(o.color) && o.containsCenter,
      );
      expect(
        good.length,
        `an outline of 2 px or more in a token color around the card center (${scheme}); outlines found: ${JSON.stringify(found)}`,
      ).toBeGreaterThan(0);
    }
  }
});

test.describe("C7. no motion, no flash, no script", () => {
  test("with reduced motion nothing animates or transitions, and hover changes color only", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("load");
    expect(
      await page.evaluate(() => document.getAnimations().length),
      "running animations",
    ).toBe(0);
    const cards = cardsOf(page);
    for (const [index] of profile.projects.entries()) {
      const card = cards.nth(index);
      const durations = await card.evaluate((li) =>
        [li, ...li.querySelectorAll("*")].flatMap((el) => {
          const style = getComputedStyle(el);
          const all = [style.transitionDuration, style.animationDuration]
            .join(",")
            .split(",");
          return all.every((d) => d.trim() === "0s")
            ? []
            : [
                `<${el.tagName.toLowerCase()}> ${style.transitionDuration} / ${style.animationDuration}`,
              ];
        }),
      );
      expect
        .soft(
          durations,
          "elements with a transition or animation under reduced motion",
        )
        .toEqual([]);

      // Hover: whatever it changes must not move, resize, lift or fade anything.
      const snapshot = () =>
        card.evaluate((li) =>
          [li, ...li.querySelectorAll("*")].map((el) => {
            const style = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              el: `<${el.tagName.toLowerCase()}>`,
              box: [r.left, r.top, r.width, r.height].map(Math.round),
              transform: style.transform,
              translate: style.translate,
              scale: style.scale,
              boxShadow: style.boxShadow,
              filter: style.filter,
              opacity: style.opacity,
              borderWidth: style.borderTopWidth,
            };
          }),
        );
      await card.scrollIntoViewIfNeeded();
      const before = await snapshot();
      await card.hover();
      expect
        .soft(await snapshot(), "geometry, shadow, filter and opacity on hover")
        .toEqual(before);
    }
  });

  test("no client component, effect, matchMedia or dark: variant in app/ or components/", async () => {
    const root = repoRoot();
    const files = [...sources(root, "app"), ...sources(root, "components")];
    const rules: [string, RegExp][] = [
      ["a client component", /["']use client["']/],
      ["useEffect", /\buse(?:Layout)?Effect\b/],
      ["matchMedia", /\bmatchMedia\b/],
      ["a dark: variant", /(?<![\w-])dark:/],
    ];
    const hits = files.flatMap(({ file, code }) =>
      rules
        .filter(([, pattern]) => pattern.test(code))
        .map(([name]) => `${file}: ${name}`),
    );
    expect(hits).toEqual([]);
  });
});

test("C8. tokens only: no color literal, no palette utility, no new token", async () => {
  const root = repoRoot();
  const files = [
    ...sources(root, "app"),
    ...sources(root, "components"),
  ].filter(({ file }) => file !== "app/layout.tsx");
  // app/globals.css declares the ten color tokens in hex: that is the one place literals live
  // (contract wording says only layout.tsx is exempt; see probe-checks.md).
  const tokenDeclaration =
    /--(?:background|foreground|muted|accent|rule)\s*:[^;]*;/g;
  const palette =
    "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
  const rules: [string, RegExp][] = [
    ["a hex color", /(?<![\w&])#[0-9a-fA-F]{3,8}\b/],
    ["rgb()", /\brgba?\(/],
    ["hsl()", /\bhsla?\(/],
    ["oklch()", /\b(?:oklch|oklab)\(/],
    [
      "a Tailwind palette utility",
      new RegExp(
        `(?<![\\w])(?:[\\w-]+:)*[a-z]+(?:-[a-z]+)*-(?:black|white|(?:${palette})-\\d{2,3})(?![\\w-])`,
      ),
    ],
  ];
  const hits = files.flatMap(({ file, code }) => {
    const checked =
      file === "app/globals.css" ? code.replace(tokenDeclaration, "") : code;
    return rules
      .filter(([, pattern]) => pattern.test(checked))
      .map(([name]) => `${file}: ${name}`);
  });
  expect(hits, "color literals and palette utilities").toEqual([]);

  // No new token, no changed value: every custom property declared in app/globals.css, in order,
  // as it stood when the sprint began. (A snapshot on purpose: the contract says byte-identical.)
  const css =
    sources(root, "app").find(({ file }) => file === "app/globals.css")?.code ??
    "";
  const declared = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(
    ([, name, value]) => `${name}: ${normalize(value ?? "")}`,
  );
  expect(declared, "custom properties declared in app/globals.css").toEqual(
    DECLARED_AT_SPRINT_START,
  );
});

test("C9. the card reflows at 320 and 390 px, in both schemes", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      expect(
        await horizontalOverflow(page),
        `page scrollWidth - clientWidth at ${width} px (${scheme})`,
      ).toBeLessThanOrEqual(0);
      const cards = cardsOf(page);
      for (const [index] of profile.projects.entries()) {
        const problems = await cards.nth(index).evaluate((li) => {
          const viewport = document.documentElement.clientWidth;
          const box = li.getBoundingClientRect();
          const out: string[] = [];
          if (box.left < 0 || box.right > viewport)
            out.push(
              `card spans ${box.left}..${box.right} in a ${viewport} px viewport`,
            );
          for (const el of [li, ...li.querySelectorAll("*")]) {
            if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth)
              out.push(
                `<${el.tagName.toLowerCase()}> scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
              );
          }
          // Each line of text sits inside the card and the viewport.
          const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!(node.textContent ?? "").trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const r of range.getClientRects()) {
              if (
                r.left < box.left - 1 ||
                r.right > box.right + 1 ||
                r.right > viewport
              )
                out.push(
                  `text "${(node.textContent ?? "").trim().slice(0, 20)}" spans ${r.left}..${r.right}`,
                );
            }
          }
          return out;
        });
        expect(problems, `card ${index} at ${width} px (${scheme})`).toEqual(
          [],
        );
      }
    }
  }
});
