import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  composite,
  contrast,
  PROJECTS,
  parseColor,
  type Rgb,
  resolveColors,
  SCHEMES,
  withLink,
} from "./helpers";

// What stays true for a keyboard visitor (sprint 4): a skip link comes first and lands on main,
// Tab visits every link in reading order, each stop shows one clear ring in a token color, and a
// card shows keyboard focus the way it shows hover. The skip link is `a[href="#main"]`.

const SKIP = 'a[href="#main"]';
const CONTACT = 'section[aria-labelledby="contact"]';

/** The link inside the project card at `index`. */
const cardLink = (index: number) => `${PROJECTS} li:nth-child(${index + 1}) a`;

/** Waits for any transition (a ring may fade in) to run its course before styles are read. */
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    ),
  );
}

/** Presses Tab until the focused element matches `selector`, at most `max` times. */
async function tabUntil(page: Page, selector: string, max = 12) {
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

test("a skip link is the first stop, hidden until focused, and readable when shown", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 1440]) {
      const where = `${width} px, ${scheme}`;
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const skip = page.locator(SKIP);
      await expect(skip, "skip links").toHaveCount(1);
      expect(
        await page.evaluate(() =>
          document.querySelector("a")?.getAttribute("href"),
        ),
        `the first link in DOM order (${where})`,
      ).toBe("#main");

      // Before focus it can't be seen: a box of at most 1 x 1 px, or wholly off screen.
      const before = await skip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
        };
      });
      expect(
        (before.width <= 1 && before.height <= 1) ||
          before.right <= 0 ||
          before.bottom <= 0,
        `skip link hidden before focus (${where}): ${JSON.stringify(before)}`,
      ).toBe(true);

      await page.keyboard.press("Tab");
      expect(
        await skip.evaluate((el) => el === document.activeElement),
        `the first Tab focuses the skip link (${where})`,
      ).toBe(true);
      await expect(skip).toHaveAccessibleName("Skip to content");

      await settled(page);
      const tokens = Object.values(await resolveColors(page)).map(
        ({ computed }) => computed,
      );
      const shown = await skip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
          width: r.width,
          height: r.height,
          viewport: {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
          },
          color: style.color,
          background: style.backgroundColor,
        };
      });
      expect
        .soft(
          shown.box.left >= 0 &&
            shown.box.top >= 0 &&
            shown.box.right <= shown.viewport.width &&
            shown.box.bottom <= shown.viewport.height,
          `wholly inside the viewport (${where}): ${JSON.stringify(shown.box)}`,
        )
        .toBe(true);
      expect.soft(shown.width, `width (${where})`).toBeGreaterThanOrEqual(24);
      expect.soft(shown.height, `height (${where})`).toBeGreaterThanOrEqual(24);
      expect
        .soft(tokens, `text color ${shown.color} is a token (${where})`)
        .toContain(shown.color);
      expect
        .soft(tokens, `background ${shown.background} is a token (${where})`)
        .toContain(shown.background);
      const fg = parseColor(shown.color);
      const bg = parseColor(shown.background);
      expect.soft(bg?.[3], `background opacity (${where})`).toBe(1);
      const ground: Rgb = [bg?.[0] ?? 0, bg?.[1] ?? 0, bg?.[2] ?? 0];
      expect
        .soft(
          fg ? contrast(composite(fg, ground), ground) : 0,
          `text contrast of ${shown.color} on ${shown.background} (${where})`,
        )
        .toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("the skip link moves focus to main, and the next Tab goes on from there", async ({
  page,
  request,
}) => {
  await page.goto("/");
  expect(
    await tabUntil(page, SKIP, 1),
    "the first Tab focuses the skip link",
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect
    .poll(() => new URL(page.url()).hash, "location hash after Enter")
    .toBe("#main");

  const main = page.locator("main");
  await expect(main, "main elements").toHaveCount(1);
  await expect(main).toHaveAttribute("id", "main");
  await expect(main).toHaveAttribute("tabindex", "-1");
  const focus = await main.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      focused: el === document.activeElement,
      outline: `${style.outlineStyle} ${style.outlineWidth}`,
      ringless: style.outlineStyle === "none" || style.outlineWidth === "0px",
    };
  });
  expect(focus.focused, "main is focused").toBe(true);
  expect(
    focus.ringless,
    `main shows no ring, since it isn't a control: ${focus.outline}`,
  ).toBe(true);

  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => document.activeElement === document.querySelector("main a"),
    ),
    "the next Tab focuses the first link inside main",
  ).toBe(true);

  // The 404 has no main to point at, so it gets no skip link.
  const missing = await request.get("/no-such-page");
  expect(missing.status(), "status of /no-such-page").toBe(404);
  expect(await missing.text(), "the 404's links").not.toContain('href="#main"');
});

test("Tab visits every link in order, each with one clear ring, in both schemes", async ({
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
    const tokenRgba = new Map(
      Object.values(colors).map((c) => [c.computed, c.rgba] as const),
    );
    const [r = 0, g = 0, b = 0] = colors["--background"]?.rgba ?? [];
    const background: Rgb = [r, g, b];

    const stops: string[] = [];
    const problems: string[] = [];
    for (let presses = 0; presses < expectedStops.length + 2; presses++) {
      await page.keyboard.press("Tab");
      await settled(page);
      const stop = await page.evaluate((projects) => {
        const el = document.activeElement;
        if (el?.tagName !== "A") return null;
        const box = el.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        // A project link may hand its ring to its card; every other link wears its own.
        const card = el.closest(`${projects} li`);
        const candidates = card ? [el, card] : [el];
        return {
          href: el.getAttribute("href") ?? "",
          onItself: !card,
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
      }, PROJECTS);
      if (!stop) break;
      stops.push(stop.href);
      const verdicts = stop.rings.map((ring) => {
        const rgba = tokenRgba.get(ring.color);
        const ratio = rgba
          ? contrast(composite(rgba, background), background)
          : 0;
        const why = [
          ring.width >= 2 ? "" : `width ${ring.width}`,
          ["none", "hidden"].includes(ring.style) ? `style ${ring.style}` : "",
          rgba ? "" : `color ${ring.color} isn't a token`,
          !rgba || ratio >= 3 ? "" : `contrast ${ratio.toFixed(2)}`,
          ring.containsCenter ? "" : "doesn't contain the center",
          !stop.onItself || ring.offset >= 0 ? "" : `offset ${ring.offset}`,
        ].filter(Boolean);
        return { ring: ring.el, why };
      });
      if (!verdicts.some(({ why }) => why.length === 0)) {
        problems.push(`${stop.href}: ${JSON.stringify(verdicts)}`);
      }
    }
    expect(stops, `Tab order (${scheme})`).toEqual(expectedStops);
    expect(problems, `stops without a clear ring (${scheme})`).toEqual([]);

    // Order comes from the DOM: no positive tabindex, and only main is focusable off the Tab order.
    const offOrder = await page.evaluate(() =>
      [...document.querySelectorAll("[tabindex]")]
        .filter((el) => el.getAttribute("tabindex") !== "0")
        .map(
          (el) =>
            `<${el.tagName.toLowerCase()}> tabindex="${el.getAttribute("tabindex")}"`,
        ),
    );
    expect(offOrder, `tabindex other than 0 (${scheme})`).toEqual([
      '<main> tabindex="-1"',
    ]);
  }
});

test("a card shows keyboard focus the way it shows hover", async ({ page }) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const colors = await resolveColors(page);
    const accent = colors["--accent"]?.computed;
    const muted = colors["--muted"]?.computed;
    for (const project of withLink) {
      const index = profile.projects.indexOf(project);
      const arrow = () =>
        page
          .locator(`${PROJECTS} li`)
          .nth(index)
          .locator("svg")
          .evaluate((svg) => getComputedStyle(svg).color);
      await page.goto("/");
      await page.mouse.move(0, 0);
      expect(
        await tabUntil(page, cardLink(index)),
        `Tab reaches the ${project.name} link`,
      ).toBe(true);
      await settled(page);
      expect(await arrow(), `arrow with keyboard focus (${scheme})`).toBe(
        accent,
      );

      await page.keyboard.press("Tab");
      await settled(page);
      expect(await arrow(), `arrow with focus elsewhere (${scheme})`).toBe(
        muted,
      );

      await page.locator(`${PROJECTS} li`).nth(index).hover();
      await settled(page);
      expect(await arrow(), `arrow on hover (${scheme})`).toBe(accent);
    }
  }
});

test("forced colors keep exactly one ring", async ({ page }) => {
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
      await tabUntil(page, cardLink(index)),
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
            ? [el.tagName.toLowerCase()]
            : [];
        }),
      );
    expect(rings, `outlined elements in the ${project.name} card`).toHaveLength(
      1,
    );
  }

  await page.goto("/");
  expect(
    await tabUntil(page, `${CONTACT} li:first-child a`),
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
