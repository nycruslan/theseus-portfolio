import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  horizontalOverflow,
  PROJECTS,
  resolveColors,
  SCHEMES,
  withLink,
} from "./helpers";

// What stays true of the project cards (sprint 3) whatever their look: one per project, saying
// what the profile says and nothing more, the whole card is the link when the project has one, and
// they're drawn in tokens, hold still under reduced motion and reflow on a phone. Their focus ring
// and Tab order are in keyboard.spec.ts. A card is a list item of the Projects section.

const cardsOf = (page: Page) => page.locator(`${PROJECTS} li`);
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("one card per project: its name and description, and a link only when it has an href", async ({
  page,
}) => {
  await page.goto("/");
  const cards = cardsOf(page);
  await expect(cards, "cards in the Projects section").toHaveCount(
    profile.projects.length,
  );
  for (const [index, project] of profile.projects.entries()) {
    const card = cards.nth(index);
    await expect(card.locator("h3"), `card ${index} title`).toHaveText(
      project.name,
    );
    expect(
      normalize(await card.innerText()),
      `visible text of the ${project.name} card`,
    ).toBe(normalize(`${project.name} ${project.description}`));

    // Whatever says "this is a link" is decoration: an aria-hidden icon, never text put in with
    // CSS `content`, which would join the link's name.
    const decoration = await card.evaluate((li) => ({
      generated: [li, ...li.querySelectorAll("*")].flatMap((el) =>
        ["::before", "::after"].flatMap((pseudo) => {
          const content = getComputedStyle(el, pseudo).content;
          return ["none", "normal", '""', "''"].includes(content)
            ? []
            : [`${el.tagName.toLowerCase()}${pseudo} ${content}`];
        }),
      ),
      exposedSvgs: [...li.querySelectorAll("svg")]
        .filter((svg) => svg.getAttribute("aria-hidden") !== "true")
        .map((svg) => svg.outerHTML.slice(0, 60)),
    }));
    expect(decoration.generated, "text made with CSS content").toEqual([]);
    expect(decoration.exposedSvgs, "svg without aria-hidden").toEqual([]);

    const links = card.getByRole("link");
    if (project.href) {
      await expect(links, `links in the ${project.name} card`).toHaveCount(1);
      await expect(links).toHaveAttribute("href", project.href);
      await expect(
        links,
        `${project.name} link accessible name`,
      ).toHaveAccessibleName(new RegExp(escapeRegExp(project.name)));
    } else {
      await expect(links, `links in the ${project.name} card`).toHaveCount(0);
    }
  }
});

test("the whole of a linked card is its link", async ({ page }) => {
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
      // A 3 x 3 grid of points, 8 px in from the card's edges, must all hit the link.
      const result = await card.evaluate((li) => {
        const link = li.querySelector("a");
        const rect = li.getBoundingClientRect();
        const xs = [rect.left + 8, rect.left + rect.width / 2, rect.right - 8];
        const ys = [rect.top + 8, rect.top + rect.height / 2, rect.bottom - 8];
        const points = xs.flatMap((x) =>
          ys.map((y): [number, number] => [x, y]),
        );
        const misses = points.flatMap(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return link && hit?.closest("a") === link
            ? []
            : [
                `(${Math.round(x)}, ${Math.round(y)}) hit <${hit?.tagName.toLowerCase()}>`,
              ];
        });
        return { misses, height: rect.height, corner: points.at(-1) };
      });
      const where = `${project.name} card at ${viewport.width} px`;
      expect(
        result.misses,
        `points in the ${where} that miss the link`,
      ).toEqual([]);
      expect(result.height, `${where}: height`).toBeGreaterThanOrEqual(44);

      // A real click in the bottom-right corner follows the link (the destination is stubbed).
      await page.route(href, (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<title>stub</title>",
        }),
      );
      const [x = 0, y = 0] = result.corner ?? [];
      await page.mouse.click(x, y);
      await page.waitForURL(new URL(href, page.url()).href, { timeout: 5_000 });
      await page.unroute(href);
    }
  }
});

test("a card's borders, background and icon are drawn in tokens, in both schemes", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const tokens = Object.values(await resolveColors(page)).map(
      ({ computed }) => computed,
    );
    for (const [index] of profile.projects.entries()) {
      const paints = await cardsOf(page)
        .nth(index)
        .evaluate((li) => {
          const label = (el: Element) => `<${el.tagName.toLowerCase()}>`;
          const sides = ["top", "right", "bottom", "left"];
          return [li, ...li.querySelectorAll("*")].flatMap((el) => {
            const style = getComputedStyle(el);
            const borders = sides
              .filter(
                (side) =>
                  Number.parseFloat(
                    style.getPropertyValue(`border-${side}-width`),
                  ) > 0,
              )
              .map((side) => ({
                what: `${label(el)} border-${side}`,
                color: style.getPropertyValue(`border-${side}-color`),
              }));
            const background =
              style.backgroundColor === "rgba(0, 0, 0, 0)"
                ? []
                : [
                    {
                      what: `${label(el)} background`,
                      color: style.backgroundColor,
                    },
                  ];
            const svg =
              el instanceof SVGElement
                ? [style.fill, style.stroke]
                    .filter((paint) => paint !== "none")
                    .map((color) => ({ what: `${label(el)} paint`, color }))
                : [];
            return [...borders, ...background, ...svg];
          });
        });
      const off = paints
        .filter(({ color }) => !tokens.includes(color))
        .map(({ what, color }) => `${what} ${color}`);
      expect(
        off,
        `card ${index} colors that aren't a token (${scheme})`,
      ).toEqual([]);
    }
  }
});

test("with reduced motion nothing in a card animates, and hover moves nothing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForLoadState("load");
  expect(
    await page.evaluate(() => document.getAnimations().length),
    "running animations",
  ).toBe(0);
  for (const [index] of profile.projects.entries()) {
    const card = cardsOf(page).nth(index);
    const moving = await card.evaluate((li) =>
      [li, ...li.querySelectorAll("*")].flatMap((el) => {
        const style = getComputedStyle(el);
        const durations = `${style.transitionDuration},${style.animationDuration}`;
        return durations.split(",").every((d) => d.trim() === "0s")
          ? []
          : [`<${el.tagName.toLowerCase()}> ${durations}`];
      }),
    );
    expect.soft(moving, "elements with a transition or animation").toEqual([]);

    // Hover may change color, never move, resize, lift or fade anything.
    const geometry = () =>
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
    const before = await geometry();
    await card.hover();
    expect
      .soft(await geometry(), "geometry, shadow, filter and opacity on hover")
      .toEqual(before);
  }
});

test("cards reflow at 320 and 390 px, in both schemes", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      expect(
        await horizontalOverflow(page),
        `page overflow at ${width} px (${scheme})`,
      ).toBeLessThanOrEqual(0);
      for (const [index] of profile.projects.entries()) {
        const problems = await cardsOf(page)
          .nth(index)
          .evaluate((li) => {
            const viewport = document.documentElement.clientWidth;
            const box = li.getBoundingClientRect();
            const out: string[] = [];
            if (box.left < 0 || box.right > viewport)
              out.push(
                `card spans ${box.left}..${box.right} of ${viewport} px`,
              );
            for (const el of [li, ...li.querySelectorAll("*")]) {
              if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth)
                out.push(
                  `<${el.tagName.toLowerCase()}> scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
                );
            }
            // Each line of text sits inside the card.
            const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              if (!(node.textContent ?? "").trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const r of range.getClientRects()) {
                if (r.left < box.left - 1 || r.right > box.right + 1)
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
