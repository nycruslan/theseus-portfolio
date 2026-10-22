import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  composite,
  contrast,
  horizontalOverflow,
  installRgba,
  projectLinkLabel,
  type Rgb,
  SCHEMES,
  STEP_TOKENS,
} from "./helpers";

// Sprint 23, B2: the facts on / as a drawing's schedule, and Detail A (.crew/sprint/23/contract.md,
// B2.1 and B2.2), written before the build. The oracle is the contract's data rules in this file's
// own lines, over content/profile.ts imported. Hooks the contract names: each fact section is a
// `section[aria-labelledby]` whose h2 carries the id; Detail A is the one `<figure>` in the
// JPMorgan entry, its `<figcaption>` beginning "Detail A.".

const IDS = ["work", "projects", "stack", "education", "contact"] as const;
const of = (id: string) => `section[aria-labelledby="${id}"]`;
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** Detail A's company and its five labels, in reading order, as the contract writes them. */
const DETAIL_COMPANY = "JPMorgan Chase & Co.";
const LABELS = [
  "Around 8 product teams",
  "Model-agnostic AI gateway",
  "AWS Bedrock",
  "Azure OpenAI",
  "Anthropic API",
];
const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);
/** The oracle: the labels when each occurs in the summary as is or first letter lower-cased. */
const detailLabels = (summary: string) =>
  LABELS.every(
    (label) => summary.includes(label) || summary.includes(lowerFirst(label)),
  )
    ? LABELS
    : null;
const DETAIL_ROLE = profile.experience.find(
  (role) => role.company === DETAIL_COMPANY,
);
const EXPECTED_LABELS = DETAIL_ROLE ? detailLabels(DETAIL_ROLE.summary) : null;

type Rgba = number[] | null;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

async function open(page: Page, width: number, height = 900, url = "/") {
  await page.setViewportSize({ width, height });
  const response = await page.goto(url);
  expect(response?.status(), `status of ${url}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** What's left of `text` once each fact is taken out once: only the page's separators may stay. */
function residue(text: string, facts: string[]) {
  let rest = squash(text);
  for (const fact of [...facts].sort((a, b) => b.length - a.length)) {
    rest = rest.replace(squash(fact), " ");
  }
  return rest.replace(/[\s·,]/g, "");
}

/** Each fact section as the DOM has it: h2, lists, and per entry its h3, text and links. */
function readFacts(page: Page) {
  return page.evaluate((ids) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const revisions = document.querySelector(
      'section[aria-labelledby="revisions"]',
    );
    return {
      order: [...document.querySelectorAll("main section[aria-labelledby]")]
        .filter(
          (s) =>
            revisions !== null &&
            Boolean(
              revisions.compareDocumentPosition(s) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        )
        .map((s) => s.getAttribute("aria-labelledby")),
      sections: ids.map((id) => {
        const section = document.querySelector(
          `section[aria-labelledby="${id}"]`,
        );
        const h2 = section?.querySelector("h2") ?? null;
        const lists = [...(section?.querySelectorAll("ul, ol") ?? [])].filter(
          (list) => !list.closest("figure"),
        );
        const items = [...(lists[0]?.children ?? [])].filter(
          (el) => el.tagName === "LI",
        );
        return {
          id,
          exists: section !== null,
          h2: { id: h2?.id ?? null, text: squashed(h2) },
          lists: lists.length,
          items: items.map((li) => {
            const h3 = li.querySelector("h3");
            // The first text in the entry, in DOM order, is the h3's.
            const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
            let first: Node | null = walker.nextNode();
            while (first && (first.textContent ?? "").trim() === "") {
              first = walker.nextNode();
            }
            const bare = li.cloneNode(true) as Element;
            for (const figure of bare.querySelectorAll("figure")) {
              figure.remove();
            }
            return {
              h3: h3 ? squashed(h3) : null,
              h3First: Boolean(h3 && first && h3.contains(first)),
              text: squashed(bare),
              links: [...li.querySelectorAll("a")].map((a) => ({
                text: squashed(a),
                href: a.getAttribute("href"),
              })),
            };
          }),
          links: [...(section?.querySelectorAll("a") ?? [])].map((a) => ({
            label: squashed(a),
            href: a.getAttribute("href"),
          })),
        };
      }),
    };
  }, IDS);
}

type Box = { left: number; top: number; right: number; bottom: number };

/** The rects B2.1 compares: each section's h2 and list, and each dated entry's period and h3. */
function readLayout(page: Page) {
  return page.evaluate(
    ({ ids, periods }) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const box = (el: Element | null): Box | null => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      return ids.map((id) => {
        const section = document.querySelector(
          `section[aria-labelledby="${id}"]`,
        );
        const list =
          [...(section?.querySelectorAll("ul, ol") ?? [])].find(
            (l) => !l.closest("figure"),
          ) ?? null;
        const entries = [...(list?.children ?? [])].map((li, i) => {
          const h3 = li.querySelector("h3");
          const period = periods[id]?.[i] ?? "";
          // The deepest element outside the h3 holding exactly the period.
          const holder =
            [...li.querySelectorAll("*")]
              .filter(
                (el) =>
                  !el.closest("figure") &&
                  !h3?.contains(el) &&
                  squashed(el) === period,
              )
              .at(-1) ?? null;
          const style = h3 ? getComputedStyle(h3) : null;
          const lineHeight = style
            ? style.lineHeight === "normal"
              ? Number.parseFloat(style.fontSize) * 1.2
              : Number.parseFloat(style.lineHeight)
            : 0;
          return {
            h3: box(h3),
            lineHeight,
            period: box(holder),
          };
        });
        return {
          id,
          h2: box(section?.querySelector("h2") ?? null),
          list: box(list),
          entries,
        };
      });
    },
    {
      ids: IDS,
      periods: {
        work: profile.experience.map((role) => role.period),
        education: profile.education.map((entry) => entry.period),
      } as Record<string, string[]>,
    },
  );
}

test("B2.1 the facts read as a schedule on /: the data rules' sections and entries, heads left of their lists and periods left of their h3 from 1024 px, stacked below, and no project row draws a box", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await open(page, 1440);
  const facts = await readFacts(page);
  expect
    .soft(facts.order, "the fact sections after the revision block")
    .toEqual([...IDS]);
  const section = (id: string) => facts.sections.find((s) => s.id === id);
  for (const s of facts.sections) {
    expect.soft(s.exists, `section[aria-labelledby="${s.id}"]`).toBe(true);
    expect.soft(s.h2.id, `the ${s.id} section's h2 carries the id`).toBe(s.id);
    if (s.id !== "contact") {
      expect.soft(s.lists, `lists in the ${s.id} section`).toBe(1);
    }
    for (const [i, item] of s.items.entries()) {
      if (item.h3 === null) continue;
      expect
        .soft(item.h3First, `${s.id} entry ${i}: its h3 comes first in the DOM`)
        .toBe(true);
    }
  }

  // Work: one entry per role, h3 the company, holding the title, period and summary.
  const work = section("work");
  expect
    .soft(
      work?.items.map((item) => item.h3),
      "Work's h3s: each role's company, in content order",
    )
    .toEqual(profile.experience.map((role) => role.company));
  for (const [i, role] of profile.experience.entries()) {
    const item = work?.items[i];
    expect
      .soft(
        residue(item?.text ?? "", [
          role.company,
          role.title,
          role.period,
          role.summary,
        ]),
        `${role.company} (${role.period}): text besides its four facts and the separators`,
      )
      .toBe("");
    for (const key of ["title", "period", "summary"] as const) {
      expect
        .soft(item?.text ?? "", `${role.company}'s ${key}, verbatim`)
        .toContain(squash(role[key]));
    }
  }

  // Projects: h3 the name, then the description; one link to href, labelled by the host rule.
  const projects = section("projects");
  expect
    .soft(
      projects?.items.map((item) => item.h3),
      "Projects' h3s: each project's name, in order",
    )
    .toEqual(profile.projects.map((project) => project.name));
  for (const [i, project] of profile.projects.entries()) {
    const item = projects?.items[i];
    const label = project.href ? projectLinkLabel(project.href) : null;
    expect
      .soft(
        residue(item?.text ?? "", [
          project.name,
          project.description,
          ...(label ? [label] : []),
        ]),
        `${project.name}: text besides its name, description and link label`,
      )
      .toBe("");
    expect
      .soft(item?.links, `${project.name}'s links`)
      .toEqual(project.href ? [{ text: label, href: project.href }] : []);
    if (project.href && label) {
      await expect
        .soft(
          page
            .locator(`${of("projects")} li`)
            .nth(i)
            .getByRole("link"),
          `${project.name}'s link: the project's name, then the label`,
        )
        .toHaveAccessibleName(`${project.name} ${label}`);
    }
  }

  // Stack: one entry per tool, in order.
  expect
    .soft(
      section("stack")?.items.map((item) => item.text),
      "Stack, in order",
    )
    .toEqual(profile.stack);

  // Education: h3 the school, holding the credential and the period.
  const education = section("education");
  expect
    .soft(
      education?.items.map((item) => item.h3),
      "Education's h3s: each school, in order",
    )
    .toEqual(profile.education.map((entry) => entry.school));
  for (const [i, entry] of profile.education.entries()) {
    expect
      .soft(
        residue(education?.items[i]?.text ?? "", [
          entry.school,
          entry.credential,
          entry.period,
        ]),
        `${entry.school}: text besides its three facts and the separators`,
      )
      .toBe("");
  }

  // Contact: the three links, in order.
  expect
    .soft(section("contact")?.links, "Contact's links, in order")
    .toEqual(profile.links);

  // The schedule: from 1024 px the head is left of its list and each period left of its h3,
  // its top inside the h3's first line box; below, both stack.
  for (const width of [390, 768, 1024, 1440]) {
    await open(page, width);
    const wide = width >= 1024;
    const layout = await readLayout(page);
    const problems: string[] = [];
    for (const s of layout) {
      if (!s.h2 || !s.list) {
        problems.push(`${s.id}: no h2 or no list`);
        continue;
      }
      if (wide && s.h2.right > s.list.left + 0.5) {
        problems.push(
          `${s.id}: h2's right ${s.h2.right} isn't left of the list's left ${s.list.left}`,
        );
      }
      if (!wide && s.h2.bottom > s.list.top + 0.5) {
        problems.push(
          `${s.id}: h2's bottom ${s.h2.bottom} isn't above the list's top ${s.list.top}`,
        );
      }
      if (s.id !== "work" && s.id !== "education") continue;
      for (const [i, entry] of s.entries.entries()) {
        const { h3, period, lineHeight } = entry;
        if (!h3 || !period) {
          problems.push(
            `${s.id} entry ${i}: no h3, or no element for the period`,
          );
          continue;
        }
        if (wide) {
          if (period.right > h3.left + 0.5) {
            problems.push(
              `${s.id} entry ${i}: period's right ${period.right} isn't left of the h3's left ${h3.left}`,
            );
          }
          if (period.top < h3.top - 0.5 || period.top > h3.top + lineHeight) {
            problems.push(
              `${s.id} entry ${i}: period's top ${period.top} is outside the h3's first line ${h3.top}..${h3.top + lineHeight}`,
            );
          }
        } else if (period.bottom > h3.top + 0.5) {
          problems.push(
            `${s.id} entry ${i}: period's bottom ${period.bottom} isn't above the h3's top ${h3.top}`,
          );
        }
      }
    }
    expect.soft(problems, `the schedule at ${width} px`).toEqual([]);

    // No project row draws a box.
    if ([390, 1024, 1440].includes(width)) {
      const boxes = await page
        .locator(`${of("projects")} li`)
        .evaluateAll((rows) =>
          rows.flatMap((li, i) => {
            const s = getComputedStyle(li);
            const out: string[] = [];
            for (const side of ["Left", "Right"] as const) {
              if (
                s[`border${side}Style`] !== "none" &&
                Number.parseFloat(s[`border${side}Width`]) > 0
              ) {
                out.push(`row ${i}: border-${side.toLowerCase()}`);
              }
            }
            if (
              !["rgba(0, 0, 0, 0)", "transparent"].includes(s.backgroundColor)
            ) {
              out.push(`row ${i}: background-color ${s.backgroundColor}`);
            }
            if (s.backgroundImage !== "none") {
              out.push(`row ${i}: background-image ${s.backgroundImage}`);
            }
            return out;
          }),
        );
      expect
        .soft(boxes, `project rows drawing a box at ${width} px`)
        .toEqual([]);
    }
  }
});

/** Detail A as the browser has it (works with scripts off: page.evaluate only). */
function readDetail(page: Page, company: string, labels: string[]) {
  return page.evaluate(
    ({ company, labels }) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const entries = [
        ...document.querySelectorAll('section[aria-labelledby="work"] li'),
      ];
      const li =
        entries.find((e) => squashed(e.querySelector("h3")) === company) ??
        null;
      const figures = [...document.querySelectorAll("main figure")].filter(
        (f) => !f.closest("[data-plan]"),
      );
      const figure = li?.querySelector("figure") ?? null;
      const caption = figure?.querySelector("figcaption") ?? null;
      const hidden = (el: Node) =>
        Boolean(
          (el instanceof Element ? el : el.parentElement)?.closest(
            '[aria-hidden="true"]',
          ),
        );
      // The exposed text outside the caption, in DOM order.
      const words: string[] = [];
      const hiddenWords: string[] = [];
      if (figure) {
        const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const text = (n.textContent ?? "").trim();
          if (!text || caption?.contains(n)) continue;
          (hidden(n) ? hiddenWords : words).push(text);
        }
      }
      return {
        entry: li !== null,
        figures: figures.length,
        inEntry: figure !== null,
        others: entries.filter((e) => e !== li && e.querySelector("figure"))
          .length,
        words: words.join(" ").replace(/\s+/g, " ").trim(),
        hiddenWords,
        caption: squashed(caption),
        captions: figure?.querySelectorAll("figcaption").length ?? 0,
        exposedSvgs: [...(figure?.querySelectorAll("svg, img") ?? [])].filter(
          (el) => !hidden(el),
        ).length,
        interactive: [
          ...(figure?.querySelectorAll(
            "a, button, input, select, textarea, [tabindex], [contenteditable]",
          ) ?? []),
        ].map((el) => el.tagName.toLowerCase()),
        bytes: figure ? new TextEncoder().encode(figure.outerHTML).length : 0,
        labelsFound: labels.map((label) =>
          figure
            ? [...figure.querySelectorAll("*")].some(
                (el) => !caption?.contains(el) && squashed(el) === label,
              )
            : false,
        ),
      };
    },
    { company, labels },
  );
}

/** Whether the figure follows the element that holds the role's summary, in DOM order. */
function followsSummary(page: Page, company: string, summary: string) {
  return page.evaluate(
    ({ company, summary }) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const li = [
        ...document.querySelectorAll('section[aria-labelledby="work"] li'),
      ].find((e) => squashed(e.querySelector("h3")) === company);
      const figure = li?.querySelector("figure");
      const holder = [...(li?.querySelectorAll("*") ?? [])]
        .filter((el) => !el.closest("figure") && squashed(el) === summary)
        .at(-1);
      return Boolean(
        figure &&
          holder &&
          holder.compareDocumentPosition(figure) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      );
    },
    { company, summary: squash(summary) },
  );
}

/** Each label's colour and ground (its nearest painted backgrounds, innermost first). */
function labelPaint(page: Page, labels: string[]) {
  return page.evaluate((labels) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const figure = document.querySelector(
      'section[aria-labelledby="work"] li figure',
    );
    return labels.map((label) => {
      const el =
        [...(figure?.querySelectorAll("*") ?? [])]
          .filter((e) => !e.closest("figcaption") && squashed(e) === label)
          .at(-1) ?? null;
      const grounds: (number[] | null)[] = [];
      for (let a: Element | null = el; a; a = a.parentElement) {
        grounds.push(rgba ? rgba(getComputedStyle(a).backgroundColor) : null);
      }
      return {
        label,
        found: el !== null,
        color: el && rgba ? rgba(getComputedStyle(el).color) : null,
        grounds,
      };
    });
  }, labels);
}

test("B2.2 Detail A: drawn from the JPMorgan summary's own words, real text with scripts on and off, inert, inside its column, in tokens, 4.5:1 in both schemes, boxed in forced colours, printed, at most 4,096 B, and absent from /read", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(150_000);
  expect(
    DETAIL_ROLE,
    `the role whose company is "${DETAIL_COMPANY}"`,
  ).toBeDefined();
  await open(page, 1440);
  const labels = EXPECTED_LABELS ?? [];
  const detail = await readDetail(page, DETAIL_COMPANY, labels);
  expect(detail.entry, `the ${DETAIL_COMPANY} entry in Work`).toBe(true);
  if (EXPECTED_LABELS === null) {
    // The summary no longer holds every phrase: no figure at all.
    expect(detail.figures, "figures in main when a phrase is missing").toBe(0);
    return;
  }
  expect(detail.inEntry, `a <figure> in the ${DETAIL_COMPANY} entry`).toBe(
    true,
  );
  expect.soft(detail.figures, "figures in main").toBe(1);
  expect.soft(detail.others, "figures in the other entries").toBe(0);
  expect
    .soft(
      await followsSummary(page, DETAIL_COMPANY, DETAIL_ROLE?.summary ?? ""),
      "the figure comes after the summary",
    )
    .toBe(true);
  expect
    .soft(
      detail.words,
      "the figure's exposed words: the five labels, in reading order",
    )
    .toBe(labels.join(" "));
  expect
    .soft(
      detail.labelsFound,
      "each label is an element of its own, outside the caption",
    )
    .toEqual(labels.map(() => true));
  expect.soft(detail.hiddenWords, "words inside aria-hidden parts").toEqual([]);
  expect.soft(detail.captions, "figcaptions").toBe(1);
  expect
    .soft(detail.caption, 'the caption begins "Detail A."')
    .toMatch(/^Detail A\./);
  expect.soft(detail.exposedSvgs, "connectors not aria-hidden").toBe(0);
  expect
    .soft(detail.interactive, "links, buttons or [tabindex] inside")
    .toEqual([]);
  expect.soft(detail.bytes, "Detail A's outerHTML in bytes").toBeGreaterThan(0);
  expect
    .soft(detail.bytes, "Detail A's outerHTML in bytes")
    .toBeLessThanOrEqual(4_096);

  // In the HTML response, and the same with scripts off.
  const html = await (await request.get("/")).text();
  const start = html.indexOf("<figure");
  const figureHtml =
    start === -1 ? "" : html.slice(start, html.indexOf("</figure>", start));
  for (const label of [...labels, "Detail A."]) {
    expect
      .soft(figureHtml, `"${label}" in the HTML response's <figure>`)
      .toContain(label);
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const bare = await context.newPage();
  await bare.goto("/");
  const off = await readDetail(bare, DETAIL_COMPANY, labels);
  await context.close();
  expect
    .soft(
      { words: off.words, caption: off.caption },
      "Detail A without scripts",
    )
    .toEqual({ words: detail.words, caption: detail.caption });

  // Wholly inside its column (the summary's left edge to the entry's right), no page overflow.
  for (const width of [320, 390, 1440]) {
    await open(page, width);
    const fit = await page.evaluate(
      ({ company, summary }) => {
        const squashed = (el: Element | null) =>
          (el?.textContent ?? "").replace(/\s+/g, " ").trim();
        const li = [
          ...document.querySelectorAll('section[aria-labelledby="work"] li'),
        ].find((e) => squashed(e.querySelector("h3")) === company);
        const figure = li?.querySelector("figure");
        const holder = [...(li?.querySelectorAll("*") ?? [])]
          .filter((el) => !el.closest("figure") && squashed(el) === summary)
          .at(-1);
        if (!li || !figure || !holder) return ["no entry, figure or summary"];
        const left = holder.getBoundingClientRect().left;
        const right = Math.min(
          li.getBoundingClientRect().right,
          document.documentElement.clientWidth,
        );
        const out: string[] = [];
        const check = (what: string, r: DOMRect) => {
          if (r.width === 0 && r.height === 0) return;
          if (r.left < left - 0.5 || r.right > right + 0.5) {
            out.push(
              `${what} spans ${r.left}..${r.right}, column ${left}..${right}`,
            );
          }
        };
        for (const el of [figure, ...figure.querySelectorAll("*")]) {
          check(`<${el.tagName.toLowerCase()}>`, el.getBoundingClientRect());
        }
        const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!(n.textContent ?? "").trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) {
            check(`text "${(n.textContent ?? "").trim().slice(0, 20)}"`, r);
          }
        }
        return out;
      },
      { company: DETAIL_COMPANY, summary: squash(DETAIL_ROLE?.summary ?? "") },
    );
    expect.soft(fit, `Detail A outside its column at ${width} px`).toEqual([]);
    expect
      .soft(await horizontalOverflow(page), `page overflow at ${width} px`)
      .toBeLessThanOrEqual(0);
  }

  // Text sizes are steps and colours are tokens; each label 4.5:1 on its ground, in both schemes.
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [390, 1440]) {
      await open(page, width);
      const paints = await page.evaluate(
        ({ steps }) => {
          const probe = document.createElement("div");
          document.body.append(probe);
          const colors = [
            "--background",
            "--foreground",
            "--muted",
            "--accent",
            "--rule",
            "--pencil",
            "--card",
            "--card-old",
          ].map((name) => {
            probe.style.color = `var(${name})`;
            return getComputedStyle(probe).color;
          });
          const sizes = steps.map((name) => {
            probe.style.fontSize = `var(${name})`;
            return getComputedStyle(probe).fontSize;
          });
          probe.remove();
          const figure = document.querySelector(
            'section[aria-labelledby="work"] li figure',
          );
          const out: string[] = [];
          for (const el of [figure, ...(figure?.querySelectorAll("*") ?? [])]) {
            if (!el || el.getClientRects().length === 0) continue;
            const s = getComputedStyle(el);
            const name = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
            const ownText = [...el.childNodes].some(
              (n) =>
                n.nodeType === Node.TEXT_NODE &&
                (n.textContent ?? "").trim() !== "",
            );
            if (ownText && !sizes.includes(s.fontSize)) {
              out.push(`${name}: font-size ${s.fontSize}`);
            }
            if (ownText && !colors.includes(s.color)) {
              out.push(`${name}: color ${s.color}`);
            }
            for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
              const c = s[`border${side}Color`];
              if (
                s[`border${side}Style`] !== "none" &&
                Number.parseFloat(s[`border${side}Width`]) > 0 &&
                !colors.includes(c)
              ) {
                out.push(`${name}: border-${side.toLowerCase()} ${c}`);
              }
            }
            if (
              s.backgroundColor !== "rgba(0, 0, 0, 0)" &&
              !colors.includes(s.backgroundColor)
            ) {
              out.push(`${name}: background ${s.backgroundColor}`);
            }
            if (el instanceof SVGElement) {
              for (const paint of [s.fill, s.stroke]) {
                if (paint !== "none" && !colors.includes(paint)) {
                  out.push(`${name}: paint ${paint}`);
                }
              }
            }
          }
          return out;
        },
        { steps: [...STEP_TOKENS] },
      );
      expect
        .soft(paints, `Detail A off the tokens at ${width} px (${scheme})`)
        .toEqual([]);
    }
    await open(page, 1440);
    const page0 = await page.evaluate(() => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      return rgba
        ? rgba(getComputedStyle(document.body).backgroundColor)
        : null;
    });
    for (const label of await labelPaint(page, labels)) {
      expect.soft(label.found, `"${label.label}" found (${scheme})`).toBe(true);
      // Lay the backgrounds over the page's, outermost first.
      let ground: Rgb = [page0?.[0] ?? 0, page0?.[1] ?? 0, page0?.[2] ?? 0];
      for (const g of [...label.grounds].reverse()) {
        if (g)
          ground = composite(
            [g[0] ?? 0, g[1] ?? 0, g[2] ?? 0, g[3] ?? 1],
            ground,
          );
      }
      const c: Rgba = label.color;
      const ratio = c
        ? contrast(
            composite([c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, c[3] ?? 1], ground),
            ground,
          )
        : 0;
      expect
        .soft(ratio, `"${label.label}" on its ground (${scheme})`)
        .toBeGreaterThanOrEqual(4.5);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });

  // Forced colours: every label's box has a border unlike Canvas, and its text is CanvasText.
  await page.emulateMedia({ forcedColors: "active" });
  await open(page, 1440);
  const forced = await page.evaluate((labels) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const probe = document.createElement("div");
    probe.style.color = "CanvasText";
    probe.style.backgroundColor = "Canvas";
    document.body.append(probe);
    const canvasText = getComputedStyle(probe).color;
    const canvas = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const figure = document.querySelector(
      'section[aria-labelledby="work"] li figure',
    );
    const sides = ["Top", "Right", "Bottom", "Left"] as const;
    const bordered = (el: Element) => {
      const s = getComputedStyle(el);
      return sides.every(
        (side) =>
          s[`border${side}Style`] !== "none" &&
          Number.parseFloat(s[`border${side}Width`]) > 0,
      );
    };
    return {
      active: matchMedia("(forced-colors: active)").matches,
      problems: labels.flatMap((label) => {
        const el =
          [...(figure?.querySelectorAll("*") ?? [])]
            .filter((e) => !e.closest("figcaption") && squashed(e) === label)
            .at(-1) ?? null;
        if (!el) return [`"${label}": not found`];
        const out: string[] = [];
        let boxEl: Element | null = el;
        while (boxEl && boxEl !== figure && !bordered(boxEl)) {
          boxEl = boxEl.parentElement;
        }
        if (!boxEl || boxEl === figure) {
          out.push(`"${label}": no box with a border on all four sides`);
        } else {
          const s = getComputedStyle(boxEl);
          for (const side of sides) {
            if (s[`border${side}Color`] === canvas) {
              out.push(`"${label}": border-${side.toLowerCase()} is Canvas`);
            }
          }
        }
        const color = getComputedStyle(el).color;
        if (color !== canvasText) {
          out.push(`"${label}": text ${color}, not CanvasText ${canvasText}`);
        }
        return out;
      }),
    };
  }, labels);
  expect(forced.active, "forced colours are on").toBe(true);
  expect.soft(forced.problems, "Detail A in forced colours").toEqual([]);
  await page.emulateMedia({ forcedColors: "none" });

  // Print keeps it.
  await page.emulateMedia({ media: "print" });
  await open(page, 1440);
  const printed = await page.evaluate((labels) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const seen = (el: Element | null | undefined) =>
      Boolean(
        el?.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        }) && el.getClientRects().length > 0,
      );
    const figure = document.querySelector(
      'section[aria-labelledby="work"] li figure',
    );
    return {
      figure: seen(figure),
      hidden: labels.filter(
        (label) =>
          ![...(figure?.querySelectorAll("*") ?? [])].some(
            (e) => squashed(e) === label && seen(e),
          ),
      ),
    };
  }, labels);
  await page.emulateMedia({ media: "screen" });
  expect.soft(printed.figure, "Detail A in print").toBe(true);
  expect.soft(printed.hidden, "labels hidden in print").toEqual([]);

  // Absent from /read.
  await open(page, 1440, 900, "/read");
  expect
    .soft(
      await page.evaluate(
        () =>
          [...document.querySelectorAll("figcaption")].filter((c) =>
            /^\s*Detail A\./.test(c.textContent ?? ""),
          ).length,
      ),
      "Detail A on /read",
    )
    .toBe(0);
  expect
    .soft(await (await request.get("/read")).text(), "/read's HTML")
    .not.toContain("Detail A.");
});

// The rule's interface (Forge's brief, .crew/sprint/23/brief-forge.md): lib/detail-a.ts exports
// `detailA(summary: string): string[] | null`. Loaded at run time, so a missing module fails here
// alone.
const DETAIL_MODULE = "../lib/detail-a";

test("B2.2 Detail A's rule on fixtures: the five labels when every phrase occurs as is or first letter lower-cased, in the contract's order, and no figure when any is missing", async () => {
  const loaded = (await import(DETAIL_MODULE)) as { detailA?: unknown };
  expect(typeof loaded.detailA, "lib/detail-a.ts exports detailA").toBe(
    "function",
  );
  const detailA = loaded.detailA as (summary: string) => string[] | null;
  const all = LABELS.join(", ");
  const cases: [string, string, string[] | null][] = [
    ["the owner's summary", DETAIL_ROLE?.summary ?? "", EXPECTED_LABELS],
    ["every label as written", `${all}.`, LABELS],
    [
      "every label with its first letter lower-cased",
      `${LABELS.map(lowerFirst).join(" and ")}.`,
      LABELS,
    ],
    [
      "the labels in reverse order",
      `${[...LABELS].reverse().join(" then ")}.`,
      LABELS,
    ],
    ["an empty summary", "", null],
    [
      "a lower-cased letter past the first",
      all.replace("AWS Bedrock", "aws Bedrock"),
      null,
    ],
    [
      "an upper-cased label in lower case throughout",
      all.replace("Anthropic API", "anthropic api"),
      null,
    ],
    ...LABELS.map((label): [string, string, null] => [
      `"${label}" missing`,
      all.replace(label, "something else"),
      null,
    ]),
  ];
  for (const [name, summary, expected] of cases) {
    expect.soft(detailA(summary), name).toEqual(expected);
  }
});
