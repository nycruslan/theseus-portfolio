import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { EDUCATION, horizontalOverflow, SCHEMES, STACK } from "./helpers";

// Sprint 6's contract (.crew/sprint/6/contract.md), one test per numbered check: Stack and
// Education join the page after Projects, show the owner's facts in order and nothing else, hold
// nothing interactive, and reflow on a phone. C7 (the gate) is CI's job, not a browser check.
// Facts are imported from content/profile.ts, never copied.

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** A section is asserted to exist first, so a missing one fails there and not on a later detail. */
async function expectSection(page: Page, selector: string, name: string) {
  const section = page.locator(selector);
  await expect(section, `the ${name} section (${selector})`).toHaveCount(1);
  return section;
}

/**
 * The text a section shows besides its heading, as a visitor reads it (innerText), with the facts
 * named removed (longest first, so a short fact inside a longer one can't strand its tail).
 */
function leftover(page: Page, selector: string, facts: string[]) {
  return page.evaluate(
    ({ selector: sel, facts: list }) => {
      const section = document.querySelector<HTMLElement>(sel);
      if (!section) return null;
      const heading = section.querySelector("h2")?.innerText ?? "";
      let text = section.innerText;
      if (heading) text = text.replace(heading, "");
      for (const fact of [...list].sort((a, b) => b.length - a.length)) {
        text = text.split(fact).join(" ");
      }
      return text;
    },
    { selector, facts },
  );
}

/** Generated text on the section or anything in it: `content` other than none/normal/"". */
function generatedText(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const section = document.querySelector(sel);
    if (!section) return null;
    return [section, ...section.querySelectorAll("*")].flatMap((el) =>
      ["::before", "::after"].flatMap((pseudo) => {
        const content = getComputedStyle(el, pseudo).content;
        return ["none", "normal", '""', "''"].includes(content)
          ? []
          : [`${el.tagName.toLowerCase()}${pseudo} ${content}`];
      }),
    );
  }, selector);
}

/** How many visual rows the Stack items sit on: tops within 2 px are one row. */
function stackRows(page: Page) {
  return page.evaluate((sel) => {
    const tops = [...document.querySelectorAll(`${sel} li`)]
      .map((li) => li.getBoundingClientRect().top)
      .sort((a, b) => a - b);
    let rows = 0;
    let last = Number.NEGATIVE_INFINITY;
    for (const top of tops) {
      if (top - last > 2) rows++;
      last = top;
    }
    return { rows, items: tops.length };
  }, STACK);
}

// Sprint 22 (B1) renames Experience to Work and puts the sheet's Revisions first.
test("C1. Section order: the sheet's Revisions, then Work, Case studies, Projects, Stack, Education, Contact", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page.locator("main h2").evaluateAll((els) => els.map((el) => el.id)),
    "ids of the h2s in main, in DOM order",
  ).toEqual([
    "revisions",
    "work",
    "case-studies",
    "projects",
    "stack",
    "education",
    "contact",
  ]);
  await expect(page.locator("main h2#stack"), "Stack heading").toHaveText(
    "Stack",
  );
  await expect(
    page.locator("main h2#education"),
    "Education heading",
  ).toHaveText("Education");
  expect(
    await page
      .locator("main h2#stack, main h2#education")
      .evaluateAll((els) => els.map((el) => el.textContent)),
    "textContent of the new h2s",
  ).toEqual(["Stack", "Education"]);
});

test("C2. Stack lists every tool, in order", async ({ page }) => {
  await page.goto("/");
  const section = await expectSection(page, STACK, "Stack");
  await expect(
    section.locator("ul, ol"),
    "lists in the Stack section",
  ).toHaveCount(1);
  const items = section.locator("li");
  await expect(items, "items in the Stack list").toHaveCount(
    profile.stack.length,
  );
  for (const [index, tool] of profile.stack.entries()) {
    expect(
      normalize(await items.nth(index).innerText()),
      `Stack item ${index}`,
    ).toBe(tool);
  }
});

test("C3. Education lists every entry, in order", async ({ page }) => {
  await page.goto("/");
  const section = await expectSection(page, EDUCATION, "Education");
  await expect(
    section.locator("ul, ol"),
    "lists in the Education section",
  ).toHaveCount(1);
  const entries = section.locator("li");
  await expect(entries, "entries in the Education list").toHaveCount(
    profile.education.length,
  );
  for (const [index, entry] of profile.education.entries()) {
    const li = entries.nth(index);
    await expect(li.locator("h3"), `h3s in entry ${index}`).toHaveCount(1);
    expect(
      normalize(await li.locator("h3").innerText()),
      `entry ${index} h3`,
    ).toContain(entry.school);
    const text = normalize(await li.innerText());
    for (const [what, fact] of [
      ["school", entry.school],
      ["credential", entry.credential],
      ["period", entry.period],
    ] as const) {
      expect(text, `entry ${index} shows its ${what}`).toContain(fact);
    }
  }
});

test("C4. Nothing added to the owner's facts", async ({ page }) => {
  await page.goto("/");
  await expectSection(page, STACK, "Stack");
  await expectSection(page, EDUCATION, "Education");
  const sections = [
    { name: "Stack", selector: STACK, facts: profile.stack },
    {
      name: "Education",
      selector: EDUCATION,
      facts: profile.education.flatMap((e) => [
        e.school,
        e.credential,
        e.period,
      ]),
    },
  ];
  for (const { name, selector, facts } of sections) {
    const rest = await leftover(page, selector, facts);
    expect(
      rest?.replace(/[\s·—–,|]/g, ""),
      `${name}: text left once every fact is removed (only whitespace and · — – , | allowed); got ${JSON.stringify(rest)}`,
    ).toBe("");
    expect(
      await generatedText(page, selector),
      `${name}: text made with CSS content`,
    ).toEqual([]);
  }
});

test("C5. Nothing interactive in the new sections", async ({ page }) => {
  await page.goto("/");
  for (const [name, selector] of [
    ["Stack", STACK],
    ["Education", EDUCATION],
  ] as const) {
    const section = await expectSection(page, selector, name);
    await expect(
      section.locator("a, button, input, [tabindex]"),
      `interactive elements in ${name}`,
    ).toHaveCount(0);
  }
});

test("C6. They reflow: no overflow at 320 and 390 px, and the stack wraps at 390 and 1440 px", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const scheme of SCHEMES) {
      const where = `${viewport.width} px (${scheme})`;
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await expectSection(page, STACK, "Stack");
      expect(
        await horizontalOverflow(page),
        `page overflow at ${where}`,
      ).toBeLessThanOrEqual(0);
      const outside = await page.evaluate((sel) => {
        const section = document.querySelector(sel);
        if (!section) return ["no Stack section"];
        const box = section.getBoundingClientRect();
        return [...section.querySelectorAll("li")].flatMap((li) => {
          const r = li.getBoundingClientRect();
          return r.left < box.left - 0.5 || r.right > box.right + 0.5
            ? [
                `"${(li.textContent ?? "").trim()}" ${r.left}..${r.right} outside ${box.left}..${box.right}`,
              ]
            : [];
        });
      }, STACK);
      expect(
        outside,
        `Stack items outside the Stack section at ${where}`,
      ).toEqual([]);
    }
  }

  // Not one tool per line: fewer distinct rows than items, on a phone and on a desktop.
  await page.emulateMedia({ colorScheme: "light" });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expectSection(page, STACK, "Stack");
    const { rows, items } = await stackRows(page);
    expect(items, "Stack items on the page").toBe(profile.stack.length);
    expect(
      rows,
      `distinct rows of Stack items at ${viewport.width} px (${items} items)`,
    ).toBeLessThan(items);
  }
});

test("C8. Forced colors: the Stack's drawn dots still show, and the list clips only sideways", async ({
  page,
}) => {
  // Windows High Contrast drops a background-only dot to the page colour, so it vanishes; and a
  // list that clips on every side (overflow-hidden) would also cut off anything that grows past it.
  await page.emulateMedia({ forcedColors: "active" });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expectSection(page, STACK, "Stack");
    const seen = await page.evaluate((sel) => {
      const list = document.querySelector(`${sel} ul`);
      const items = [...document.querySelectorAll<HTMLElement>(`${sel} ul li`)];
      // The dot left of a row's first item is clipped away on purpose, so only the others count:
      // an item is first in its row when it sits lower than the one before it.
      const followers = items.filter(
        (li, at) =>
          at > 0 &&
          Math.abs(
            li.getBoundingClientRect().top -
              (items[at - 1]?.getBoundingClientRect().top ?? 0),
          ) <= 2,
      );
      return {
        overflowX: list ? getComputedStyle(list).overflowX : null,
        overflowY: list ? getComputedStyle(list).overflowY : null,
        page: getComputedStyle(document.body).backgroundColor,
        dots: followers.map((li) => ({
          text: (li.textContent ?? "").trim(),
          background: getComputedStyle(li, "::before").backgroundColor,
        })),
      };
    }, STACK);
    const where = `${viewport.width} px`;
    expect(
      seen.dots.length,
      `Stack items after a row's first at ${where}`,
    ).toBeGreaterThan(0);
    expect(
      seen.dots.filter(
        (dot) =>
          dot.background === "transparent" ||
          dot.background === "rgba(0, 0, 0, 0)",
      ),
      `dots with no colour in forced colors at ${where}`,
    ).toEqual([]);
    // Forced colors resets a background-only colour to Canvas, which is opaque but the page's own
    // colour, so "not transparent" alone would pass for an invisible dot: it must also differ.
    expect(
      seen.dots.filter((dot) => dot.background === seen.page),
      `dots the colour of the page in forced colors at ${where}`,
    ).toEqual([]);
    expect(seen.overflowY, `the Stack list's overflow-y at ${where}`).toBe(
      "visible",
    );
    // "Only sideways" has two halves: the sideways one is what hides the leading dot of a row.
    expect(seen.overflowX, `the Stack list's overflow-x at ${where}`).toBe(
      "clip",
    );
  }
});
