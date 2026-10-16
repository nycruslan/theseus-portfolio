import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  composite,
  contrast,
  type Rgb,
  resolveColors,
  resolveSteps,
  SCHEMES,
} from "./helpers";

// Sprint 4 (accessibility pass): one test per numbered check in .studio/sprint/4/contract.md,
// named by its number. C9 (the page at rest is unchanged) is evidence Probe measures by hand
// against production and the origin/main build, not a suite test (decisions.md, item 2); C10 is
// CI itself. Once the sprint merges, the lasting parts fold into invariants.spec.ts.
//
// The skip link is `a[href="#main"]`; the three sections are `section[aria-labelledby]` in `main`.

const PROJECTS = 'section[aria-labelledby="projects"]';
const CONTACT = 'section[aria-labelledby="contact"]';
const withLink = profile.projects.filter((project) => project.href);
const SKIP = 'a[href="#main"]';

/** "rgb(r, g, b)" or "rgba(r, g, b, a)" as the browser computes it; null for any other syntax. */
function parseColor(value: string): [number, number, number, number] | null {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  );
  if (!match) return null;
  const [, r = "0", g = "0", b = "0", a] = match;
  const alpha =
    a === undefined
      ? 1
      : a.endsWith("%")
        ? Number.parseFloat(a) / 100
        : Number.parseFloat(a);
  return [Number(r), Number(g), Number(b), alpha];
}

/** Waits for any transition (a ring may fade in) to run its course before styles are read. */
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    ),
  );
}

/** Presses Tab until `matches` holds for the focused element (at most `max` presses). */
async function tabUntil(
  page: Page,
  selector: string,
  max = 12,
): Promise<boolean> {
  for (let presses = 0; presses < max; presses++) {
    await page.keyboard.press("Tab");
    const found = await page.evaluate(
      (sel) => document.activeElement?.matches(sel) ?? false,
      selector,
    );
    if (found) return true;
  }
  return false;
}

const projectLink = `${PROJECTS} li a`;
const firstContact = `${CONTACT} li:first-child a`;

// ---------------------------------------------------------------------------------------------

test("C1. a skip link is the first stop and is hidden until focused", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 1440]) {
      const where = `${width} px, ${scheme}`;
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      expect(
        await page.evaluate(() =>
          document.querySelector("a")?.getAttribute("href"),
        ),
        `the first <a> in DOM order (${where})`,
      ).toBe("#main");

      // Before focus it cannot be perceived: a box of at most 1 x 1 px, or wholly off screen.
      const before = await page
        .locator(SKIP)
        .first()
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            right: r.right,
            bottom: r.bottom,
          };
        });
      const hidden =
        (before.width <= 1 && before.height <= 1) ||
        before.right <= 0 ||
        before.bottom <= 0;
      expect(
        hidden,
        `skip link hidden before focus (${where}): ${JSON.stringify(before)}`,
      ).toBe(true);

      await page.keyboard.press("Tab");
      const skip = page.locator(SKIP);
      await expect(skip, "skip links").toHaveCount(1);
      expect(
        await skip.evaluate((el) => el === document.activeElement),
        `the first Tab focuses the skip link (${where})`,
      ).toBe(true);
      await expect(skip).toHaveAccessibleName(/^Skip to content$/);

      await settled(page);
      const colors = await resolveColors(page);
      const steps = Object.values(await resolveSteps(page));
      const tokens = Object.values(colors).map((c) => c.computed);
      const after = await skip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
          viewportWidth: document.documentElement.clientWidth,
          viewportHeight: document.documentElement.clientHeight,
          color: style.color,
          background: style.backgroundColor,
          fontSize: Number.parseFloat(style.fontSize),
          transition: style.transitionDuration,
        };
      });
      const inside =
        after.left >= 0 &&
        after.top >= 0 &&
        after.right <= after.viewportWidth &&
        after.bottom <= after.viewportHeight;
      expect
        .soft(
          inside,
          `box wholly inside the viewport (${where}): ${JSON.stringify(after)}`,
        )
        .toBe(true);
      expect.soft(after.width, `width (${where})`).toBeGreaterThanOrEqual(24);
      expect.soft(after.height, `height (${where})`).toBeGreaterThanOrEqual(24);
      expect.soft(after.top, `top edge (${where})`).toBeLessThan(100);
      expect
        .soft(tokens, `text color ${after.color} is a token (${where})`)
        .toContain(after.color);
      expect
        .soft(tokens, `background ${after.background} is a token (${where})`)
        .toContain(after.background);
      const fg = parseColor(after.color);
      const bg = parseColor(after.background);
      expect.soft(bg?.[3], `background opacity (${where})`).toBe(1);
      if (fg && bg) {
        const ratio = contrast(composite(fg, [bg[0], bg[1], bg[2]] as Rgb), [
          bg[0],
          bg[1],
          bg[2],
        ] as Rgb);
        expect
          .soft(ratio, `skip link text contrast (${where})`)
          .toBeGreaterThanOrEqual(4.5);
      } else {
        expect
          .soft(
            false,
            `color ${after.color} / ${after.background} could not be read (${where})`,
          )
          .toBe(true);
      }
      expect
        .soft(
          steps.some((step) => Math.abs(step - after.fontSize) < 0.01),
          `font size ${after.fontSize}px is a --step-* size (${where})`,
        )
        .toBe(true);
      expect
        .soft(
          after.transition.split(",").every((d) => d.trim() === "0s"),
          `transition-duration ${after.transition} is 0s (${where})`,
        )
        .toBe(true);
    }
  }
});

test("C2. the skip link works", async ({ page, request }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      document.activeElement?.matches('a[href="#main"]'),
    ),
    "the first Tab focuses the skip link",
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect
    .poll(() => new URL(page.url()).hash, "location hash after Enter")
    .toBe("#main");

  const mains = page.locator("main");
  await expect(mains, "main elements").toHaveCount(1);
  await expect(mains).toHaveAttribute("id", "main");
  await expect(mains).toHaveAttribute("tabindex", "-1");
  const focus = await page.evaluate(() => {
    const main = document.querySelector("main");
    const style = main ? getComputedStyle(main) : null;
    return {
      mainIsFocused: main !== null && document.activeElement === main,
      outlineStyle: style?.outlineStyle,
      outlineWidth: style?.outlineWidth,
    };
  });
  expect(focus.mainIsFocused, "main is document.activeElement").toBe(true);
  expect(
    focus.outlineStyle === "none" || focus.outlineWidth === "0px",
    `main shows no outline while focused: ${focus.outlineStyle} ${focus.outlineWidth}`,
  ).toBe(true);

  // The next Tab goes into the content, not back to the skip link.
  await page.keyboard.press("Tab");
  const next = await page.evaluate(() => ({
    href: document.activeElement?.getAttribute("href") ?? null,
    isFirstLinkInMain:
      document.activeElement === document.querySelector("main a"),
  }));
  const expectedHref = withLink[0]?.href ?? profile.links[0]?.href;
  expect(next.isFirstLinkInMain, "focus is on the first link inside main").toBe(
    true,
  );
  expect(next.href, "the first link inside main").toBe(expectedHref);

  // The 404 has no main to point at, so it gets no skip link.
  const missing = await request.get("/no-such-page");
  expect(missing.status(), "status of /no-such-page").toBe(404);
  expect(
    await missing.text(),
    "404 HTML mentions the skip link target",
  ).not.toContain('href="#main"');
});

test("C3. landmarks and headings", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main"), "main landmarks").toHaveCount(1);

  const sections = page.locator("main section[aria-labelledby]");
  await expect(sections, "sections in main").toHaveCount(3);
  const names: string[] = [];
  for (let index = 0; index < 3; index++) {
    const section = sections.nth(index);
    // textContent, not innerText: the h2s are upper-cased by CSS, the accessible name is not.
    const heading = (
      (await section.locator("h2").first().textContent()) ?? ""
    ).trim();
    names.push(heading);
    await expect(section, `section ${index} role`).toHaveRole("region");
    await expect(
      section,
      `section ${index} accessible name`,
    ).toHaveAccessibleName(heading);
  }
  expect(names, "section headings").toEqual([
    "Experience",
    "Projects",
    "Contact",
  ]);

  await expect(page.locator("h1"), "h1 elements").toHaveCount(1);
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3")].map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: (h.textContent ?? "").trim().slice(0, 30),
    })),
  );
  let previous = 0;
  for (const heading of levels) {
    const level = Number(heading.tag.slice(1));
    expect(
      level - previous,
      `${heading.tag} "${heading.text}" follows an h${previous} (a skipped level)`,
    ).toBeLessThanOrEqual(1);
    previous = level;
  }

  await expect(page.locator("html"), "html lang").toHaveAttribute("lang", "en");
  expect((await page.title()).trim(), "document.title").not.toBe("");

  const outside = await page.evaluate(() => {
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
    return [...document.body.querySelectorAll("*")]
      .filter(
        (el) =>
          !skip.has(el.tagName) &&
          !el.closest("main") &&
          !el.closest('a[href="#main"]') &&
          [...el.childNodes].some(
            (node) =>
              node.nodeType === Node.TEXT_NODE &&
              (node.textContent ?? "").trim() !== "",
          ),
      )
      .map(
        (el) =>
          `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
      );
  });
  expect(
    outside,
    "elements with text outside main (and the skip link)",
  ).toEqual([]);
});

test("C4. one focus look for everything focusable, in both schemes", async ({
  page,
}) => {
  const expectedStops = [
    "#main",
    ...withLink.map((project) => project.href ?? ""),
    ...profile.links.map((link) => link.href),
  ];
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const colors = await resolveColors(page);
    const tokenRgb = new Map(
      Object.values(colors).map((c) => [c.computed, c.rgba] as const),
    );
    const bgRgba = colors["--background"]?.rgba ?? [0, 0, 0, 1];
    const background: Rgb = [bgRgba[0], bgRgba[1], bgRgba[2]];

    const stops: string[] = [];
    const problems: string[] = [];
    let leftLinks = false;
    for (let presses = 0; presses < 12 && !leftLinks; presses++) {
      await page.keyboard.press("Tab");
      await settled(page);
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        if (el?.tagName !== "A") return null;
        const box = el.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const isSkip = el.getAttribute("href") === "#main";
        const card = el.closest(`section[aria-labelledby="projects"] li`);
        // A project link may hand its ring to the card; the skip link and Contact links wear their own.
        const candidates = card && !isSkip ? [el, card] : [el];
        return {
          href: el.getAttribute("href") ?? "",
          onItself: candidates.length === 1,
          rings: candidates.map((c) => {
            const style = getComputedStyle(c);
            const r = c.getBoundingClientRect();
            return {
              el: c === el ? "a" : "li",
              style: style.outlineStyle,
              width: Number.parseFloat(style.outlineWidth),
              color: style.outlineColor,
              offset: Number.parseFloat(style.outlineOffset),
              containsCenter:
                r.left <= cx && cx <= r.right && r.top <= cy && cy <= r.bottom,
            };
          }),
        };
      });
      if (!stop) {
        leftLinks = true;
        break;
      }
      stops.push(stop.href);
      const verdicts = stop.rings.map((ring) => {
        const rgba = tokenRgb.get(ring.color);
        const ratio = rgba
          ? contrast(composite(rgba, background), background)
          : 0;
        const why = [
          ring.width >= 2 ? "" : `width ${ring.width}`,
          ring.style !== "none" && ring.style !== "hidden"
            ? ""
            : `style ${ring.style}`,
          rgba ? "" : `color ${ring.color} is not a token`,
          ratio >= 3 || !rgba ? "" : `contrast ${ratio.toFixed(2)}`,
          ring.containsCenter ? "" : "does not contain the center",
          !stop.onItself || ring.offset >= 0 ? "" : `offset ${ring.offset}`,
        ].filter(Boolean);
        return { ring: ring.el, why };
      });
      if (!verdicts.some((v) => v.why.length === 0)) {
        problems.push(`${stop.href}: ${JSON.stringify(verdicts)}`);
      }
    }
    expect(
      leftLinks,
      `focus left the links within 12 presses (${scheme}); stops: ${stops.join(", ")}`,
    ).toBe(true);
    expect(stops, `Tab order (${scheme})`).toEqual(expectedStops);
    expect(problems, `stops without a clear focus ring (${scheme})`).toEqual(
      [],
    );

    const tabindexes = await page.evaluate(() =>
      [...document.querySelectorAll("[tabindex]")].map((el) => ({
        el: el.tagName.toLowerCase(),
        value: el.getAttribute("tabindex"),
      })),
    );
    for (const { el, value } of tabindexes) {
      expect.soft(["-1", "0"], `<${el}> tabindex="${value}"`).toContain(value);
      if (value === "-1")
        expect.soft(el, "only main has tabindex -1").toBe("main");
    }
  }
});

test("C5. the card's arrow follows keyboard focus", async ({ page }) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const colors = await resolveColors(page);
    const accent = colors["--accent"]?.computed;
    const muted = colors["--muted"]?.computed;
    const arrowColor = (index: number) =>
      page
        .locator(`${PROJECTS} li`)
        .nth(index)
        .locator("svg")
        .evaluate((svg) => getComputedStyle(svg).color);
    for (const project of withLink) {
      const index = profile.projects.indexOf(project);
      await page.goto("/");
      await page.mouse.move(0, 0);
      expect(
        await tabUntil(page, projectLink),
        `Tab reaches the ${project.name} link`,
      ).toBe(true);
      await settled(page);
      expect(
        await arrowColor(index),
        `arrow color with keyboard focus (${scheme})`,
      ).toBe(accent);

      await page.keyboard.press("Tab");
      await page.mouse.move(0, 0);
      await settled(page);
      expect(
        await arrowColor(index),
        `arrow color with focus elsewhere (${scheme})`,
      ).toBe(muted);

      // Hover still does what it did.
      await page.locator(`${PROJECTS} li`).nth(index).hover();
      await settled(page);
      expect(await arrowColor(index), `arrow color on hover (${scheme})`).toBe(
        accent,
      );
    }
  }
});

test("C6. forced colors keep exactly one ring", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  expect(
    await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
    "forced colors are on",
  ).toBe(true);

  for (const project of withLink) {
    const index = profile.projects.indexOf(project);
    await page.goto("/");
    expect(
      await tabUntil(page, projectLink),
      `Tab reaches the ${project.name} link`,
    ).toBe(true);
    await settled(page);
    const rings = await page
      .locator(`${PROJECTS} li`)
      .nth(index)
      .evaluate((li) =>
        [li, ...li.querySelectorAll("*")].flatMap((el) => {
          const style = getComputedStyle(el);
          return style.outlineStyle !== "none" &&
            Number.parseFloat(style.outlineWidth) > 0
            ? [
                {
                  el: el.tagName.toLowerCase(),
                  style: style.outlineStyle,
                  width: style.outlineWidth,
                },
              ]
            : [];
        }),
      );
    expect(rings, `outlined elements in the ${project.name} card`).toHaveLength(
      1,
    );
    expect(rings[0]?.el, "the one ring is not on the link").not.toBe("a");
  }

  await page.goto("/");
  expect(
    await tabUntil(page, firstContact),
    "Tab reaches the first Contact link",
  ).toBe(true);
  await settled(page);
  const contact = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(contact.style, "Contact link outline style").not.toBe("none");
  expect(contact.width, "Contact link outline width").toBeGreaterThanOrEqual(2);
});

test("C7. axe, with the strict tag set, with the skip link showing", async ({
  page,
}) => {
  const tags = [
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
    "best-practice",
  ];
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [390, 1440]) {
      for (const skipFocused of [false, true]) {
        const where = `${scheme}, ${width} px, ${skipFocused ? "skip link focused" : "nothing focused"}`;
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/");
        if (skipFocused) {
          await page.keyboard.press("Tab");
          expect
            .soft(
              await page.evaluate(() =>
                document.activeElement?.matches('a[href="#main"]'),
              ),
              `the skip link is focused (${where})`,
            )
            .toBe(true);
          await settled(page);
        }
        const results = await new AxeBuilder({ page }).withTags(tags).analyze();
        const found = results.violations.map((v) => ({
          rule: v.id,
          impact: v.impact,
          help: v.help,
          targets: v.nodes.map((node) => node.target.join(" ")),
        }));
        expect.soft(found, `axe violations (${where})`).toEqual([]);
        const passed = results.passes.map((p) => p.id);
        for (const rule of ["color-contrast", "landmark-one-main", "region"]) {
          expect
            .soft(passed, `axe ran ${rule} and it passed (${where})`)
            .toContain(rule);
        }
      }
    }
  }
});

test("C8. targets are big enough", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect
    .soft(await tabUntil(page, SKIP, 1), "the first Tab focuses the skip link")
    .toBe(true);
  await settled(page);
  const links = page.locator(`${CONTACT} a`);
  await expect(links, "Contact links").toHaveCount(profile.links.length);
  for (let index = 0; index < profile.links.length; index++) {
    const rect = await links.nth(index).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        text: (el.textContent ?? "").trim(),
      };
    });
    expect
      .soft(rect.width, `${rect.text} link width`)
      .toBeGreaterThanOrEqual(24);
    expect
      .soft(rect.height, `${rect.text} link height`)
      .toBeGreaterThanOrEqual(24);
  }
  // Last, so a missing skip link does not hide what the Contact links measure.
  await expect(page.locator(SKIP), "skip links").toHaveCount(1);
  const skip = await page.locator(SKIP).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  expect.soft(skip.width, "skip link width").toBeGreaterThanOrEqual(24);
  expect.soft(skip.height, "skip link height").toBeGreaterThanOrEqual(24);
});
