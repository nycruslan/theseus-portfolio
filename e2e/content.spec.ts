import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { ROUTES, STATUS } from "./helpers";

const MARKER = "TODO(owner)";

// The owner marks each stand-in value in content/ with a `// TODO(owner)` comment on the line
// above it. This collects the strings each marker covers: the property or array item that
// follows it, up to the comma that ends it, including a whole array or object it opens.
// content/drafts/ is skipped: drafts never render.
function markedPlaceholders(contentDir: string): string[] {
  const files = readdirSync(contentDir, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !file.startsWith("drafts/"))
    .map((file) => readFileSync(join(contentDir, file), "utf8"));
  const values: string[] = [];
  for (const source of files) {
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      if (!line.includes(MARKER)) return;
      let depth = 0;
      for (const next of lines.slice(index + 1)) {
        const strings = [...next.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
        values.push(...strings.map((match) => match[1] ?? ""));
        const code = next.replace(/"(?:[^"\\]|\\.)*"/g, "");
        depth += (code.match(/[[{(]/g) ?? []).length;
        depth -= (code.match(/[\]})]/g) ?? []).length;
        if (depth <= 0 && /[,;]\s*$/.test(code)) break;
      }
    });
  }
  return values.filter((value) => value.trim() !== "");
}

// Every fact a visitor sees: the visible text, the page title and description, and link targets.
async function renderedFacts(page: Page) {
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  const description = await page.evaluate(
    () =>
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? "",
  );
  return [
    await page.locator("body").innerText(),
    await page.title(),
    description,
    ...hrefs,
  ].join("\n");
}

// content/ has carried no TODO(owner) marker since the owner's 2026 facts landed, so this holds
// again and guards the next stand-in: a value marked TODO(owner) must not reach the page. Sprint 23
// adds /read and the 404 (.crew/sprint/23/contract.md, B2.9).
test("no value the owner marked TODO(owner) renders, on /, /read or the 404", async ({
  page,
}, testInfo) => {
  const placeholders = markedPlaceholders(
    join(testInfo.project.testDir, "..", "content"),
  );
  for (const route of ROUTES) {
    const response = await page.goto(route);
    expect(response?.status(), `status of ${route}`).toBe(STATUS[route]);
    const facts = await renderedFacts(page);

    expect.soft(facts, `the marker on ${route}`).not.toContain(MARKER);
    expect
      .soft(
        placeholders.filter((value) => facts.includes(value)),
        `placeholders on ${route}`,
      )
      .toEqual([]);
  }
});
