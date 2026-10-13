import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

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
  const description = page.locator('meta[name="description"]');
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  return [
    await page.locator("body").innerText(),
    await page.title(),
    (await description.getAttribute("content")) ?? "",
    ...hrefs,
  ].join("\n");
}

// fixme until the owner's content lands: the seed profile still renders the stand-ins it marks
// TODO(owner) ("Company name", "What you built, owned and improved."), so this fails today by
// design. The PR that brings in the owner's interview answers turns it back into `test`.
test.fixme("no value the owner marked TODO(owner) renders", async ({
  page,
}, testInfo) => {
  const placeholders = markedPlaceholders(
    join(testInfo.project.testDir, "..", "content"),
  );
  await page.goto("/");
  const facts = await renderedFacts(page);

  expect(facts).not.toContain(MARKER);
  expect(placeholders.filter((value) => facts.includes(value))).toEqual([]);
});
