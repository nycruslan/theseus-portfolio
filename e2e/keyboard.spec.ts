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
// Tab visits every link in DOM order, each stop can be seen and shows one clear ring in a token
// color, and a project link shows keyboard focus the way it shows hover. The skip link is
// `a[href="#main"]`. Sprint 23 (.crew/sprint/23/contract.md): projects are rows with one small link,
// so the hover is the link's (B2.9 disposition); B2.3 pins Contact's first link as the 12th stop;
// B2.9 holds the forced-colours ring on /read and the 404.

const SKIP = 'a[href="#main"]';
const CONTACT = 'section[aria-labelledby="contact"]';

/** The link inside the project card at `index`. */
const cardLink = (index: number) => `${PROJECTS} li:nth-child(${index + 1}) a`;

/**
 * Waits for any transition (a ring may fade in) to run its course before styles are read. Only
 * clock animations: a scroll-driven one (the section reveal) that is still before its range never
 * finishes, and awaiting it would hang. Two frames then let a scroll that Tab caused (a focused
 * link brought into view) update those scroll-driven animations before styles are read.
 */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .map((animation) => animation.finished),
    );
    for (let frame = 0; frame < 2; frame++) {
      await new Promise((done) => requestAnimationFrame(done));
    }
  });
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
      await expect(skip, `skip link name (${where})`).toHaveAccessibleName(
        /skip/i,
      );

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

  // Any page with a skip link has a main for it to land on, the 404 included.
  const missing = await page.goto("/no-such-page");
  expect(missing?.status(), "status of /no-such-page").toBe(404);
  expect(
    await page.evaluate(
      () =>
        !document.querySelector('a[href="#main"]') ||
        document.getElementById("main") !== null,
    ),
    "the 404's skip link has a #main to land on",
  ).toBe(true);
});

test("Tab visits every link in DOM order, each seen with one clear ring, in both schemes", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    // The order the DOM gives, skip link first: a positive tabindex would jump the queue.
    const expectedStops = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")]
        .filter((a) => a.checkVisibility())
        .map((a) => a.getAttribute("href") ?? ""),
    );
    expect(expectedStops[0], "the first link in the DOM").toBe("#main");
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
        // A focused link must be seen: not transparent, hidden, clipped to a pixel or off screen.
        const seen =
          el.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }) &&
          box.width > 1 &&
          box.height > 1 &&
          box.right > 0 &&
          box.bottom > 0 &&
          box.left < innerWidth &&
          box.top < innerHeight;
        // A project link may hand its ring to its card; every other link wears its own.
        const card = el.closest(`${projects} li`);
        const candidates = card ? [el, card] : [el];
        return {
          href: el.getAttribute("href") ?? "",
          seen,
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
      if (!stop.seen) problems.push(`${stop.href}: can't be seen when focused`);
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
    expect(
      problems,
      `stops not seen, or without a clear ring (${scheme})`,
    ).toEqual([]);

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

test("a project link shows keyboard focus as it shows hover, and both differ from rest", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const project of withLink) {
      const index = profile.projects.indexOf(project);
      const card = page.locator(`${PROJECTS} li`).nth(index);
      // The icon's color when the card has one; otherwise the card's and its link's own colors,
      // ring included.
      const look = () =>
        card.evaluate((li) => {
          const icon = li.querySelector("svg");
          if (icon) return { icon: getComputedStyle(icon).color };
          const paint = (el: Element | null) => {
            if (!el) return "";
            const style = getComputedStyle(el);
            return [
              style.color,
              style.textDecorationColor,
              style.textDecorationThickness,
              style.borderColor,
              style.backgroundColor,
              style.outlineStyle,
              style.outlineColor,
            ].join(" ");
          };
          return { colors: `${paint(li)} | ${paint(li.querySelector("a"))}` };
        });
      const where = `${project.name} row (${scheme})`;

      await page.goto("/");
      await page.mouse.move(0, 0);
      await settled(page);
      const rest = await look();
      expect(
        await tabUntil(page, cardLink(index)),
        `Tab reaches the ${project.name} link`,
      ).toBe(true);
      await settled(page);
      const focused = await look();
      await page.keyboard.press("Tab");
      await page.locator(cardLink(index)).hover();
      await settled(page);
      const hovered = await look();

      if ("icon" in rest) {
        expect(focused, `icon with keyboard focus vs hover, ${where}`).toEqual(
          hovered,
        );
        expect(
          focused,
          `icon with keyboard focus vs at rest, ${where}`,
        ).not.toEqual(rest);
      } else {
        expect(focused, `keyboard focus vs at rest, ${where}`).not.toEqual(
          rest,
        );
        expect(hovered, `hover vs at rest, ${where}`).not.toEqual(rest);
      }
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

test("B2.3 on /, Contact's first link is the 12th Tab stop: skip, the 4 bar links, the 3 title-block links, the Log link, the project links, then it", async ({
  page,
}) => {
  await page.goto("/");
  const expected = [
    "#main",
    "#work",
    "/sprints",
    "#contact",
    "/read",
    ...profile.links.map((link) => link.href),
    "/sprints",
    ...withLink.map((project) => project.href ?? ""),
    profile.links[0]?.href ?? "",
  ];
  // tabUntil's bound: a further stop before Contact raises it, which is a harness change.
  expect(expected, "the stops up to Contact's first link").toHaveLength(12);
  const stops: string[] = [];
  for (let press = 0; press < expected.length; press++) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute("href") ??
          `<${document.activeElement?.tagName.toLowerCase()}>`,
      ),
    );
  }
  expect(stops, "the first 12 Tab stops on /").toEqual(expected);
  expect(
    await page.evaluate(
      (sel) => document.activeElement?.matches(sel) ?? false,
      `${CONTACT} li:first-child a`,
    ),
    "the 12th stop is Contact's first link",
  ).toBe(true);
});

test("B2.9 in forced colours, every focused link or button on /read and the 404 shows exactly one ring", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  for (const [route, status] of [
    ["/read", 200],
    ["/no-such-page", 404],
  ] as const) {
    const response = await page.goto(route);
    expect(response?.status(), `status of ${route}`).toBe(status);
    expect(
      await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
      "forced colors are on",
    ).toBe(true);
    const count = await page.locator("a[href], button").count();
    expect(count, `links and buttons on ${route}`).toBeGreaterThan(0);
    const problems: string[] = [];
    let visited = 0;
    for (let press = 0; press < count + 1; press++) {
      await page.keyboard.press("Tab");
      await settled(page);
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || !el.matches("a, button")) {
          return null;
        }
        const ancestors: Element[] = [];
        for (
          let a = el.parentElement;
          a && a !== document.body;
          a = a.parentElement
        ) {
          ancestors.push(a);
        }
        const rings = [el, ...el.querySelectorAll("*"), ...ancestors].filter(
          (c) => {
            const style = getComputedStyle(c);
            return (
              style.outlineStyle !== "none" &&
              Number.parseFloat(style.outlineWidth) > 0
            );
          },
        );
        return {
          name: el.getAttribute("href") ?? el.tagName.toLowerCase(),
          rings: rings.map((c) => c.tagName.toLowerCase()),
        };
      });
      if (!stop) break;
      visited++;
      if (stop.rings.length !== 1) {
        problems.push(
          `${stop.name}: ${stop.rings.length} rings (${stop.rings.join(", ")})`,
        );
      }
    }
    expect(visited, `Tab stops visited on ${route}`).toBeGreaterThan(0);
    expect
      .soft(problems, `focused stops without exactly one ring on ${route}`)
      .toEqual([]);
  }
});
