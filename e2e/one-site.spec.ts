import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { profile } from "../content/profile";
import { caseStudies } from "../content/work";

// What the earlier portfolio brought here: the case studies, the assistant, its evals and the agent
// surfaces. The model is never called: /api/chat is mocked in the browser, and the server is only
// asked what it refuses. Facts are imported from content/, never copied.

const PAGES = ["/ask", "/evals", ...caseStudies.map((s) => `/work/${s.slug}`)];

test("the sheet links every case study, and the first screen reaches them and the assistant", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="case-studies"]');
  for (const study of caseStudies) {
    await expect(
      section.getByRole("link", { name: study.title }),
    ).toHaveAttribute("href", `/work/${study.slug}`);
  }
  const block = page.locator("main header").first();
  await expect(block.getByRole("link", { name: "Ask AI" })).toBeInViewport();
  await expect(
    block.getByRole("link", { name: "Case studies" }),
  ).toBeInViewport();
  await expect(block.getByRole("link", { name: "Email" })).toHaveAttribute(
    "href",
    /^mailto:/,
  );
});

for (const study of caseStudies) {
  test(`${study.slug} says all its facts in the HTML, with scripts off`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto(`/work/${study.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText(study.title);
    for (const metric of study.metrics) {
      await expect(page.getByText(metric.value, { exact: true })).toBeVisible();
    }
    for (const part of study.flow.flat()) {
      await expect(page.locator(".flow").getByText(part)).toBeVisible();
    }
    for (const section of study.sections) {
      await expect(
        page.getByRole("heading", { name: section.title }),
      ).toBeVisible();
    }
    await context.close();
  });
}

test("an unknown case study answers 404", async ({ page }) => {
  expect((await page.goto("/work/no-such-study"))?.status()).toBe(404);
});

test("the assistant streams an answer, keeps the history and refocuses the question", async ({
  page,
}) => {
  const bodies: { messages: { role: string; content: string }[] }[] = [];
  await page.route("/api/chat", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "text/plain; charset=utf-8",
      body: `Answer ${bodies.length}.`,
    });
  });
  await page.goto("/ask");
  await page.getByRole("button", { name: /scale/ }).click();
  await expect(page.getByText("Answer 1.")).toBeVisible();
  await expect(page.getByLabel("Your question")).toBeFocused();

  await page.getByLabel("Your question").fill("And the gateway?");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Answer 2.")).toBeVisible();
  expect(bodies[1]?.messages.map((m) => m.role)).toEqual([
    "user",
    "assistant",
    "user",
  ]);
  expect(bodies[1]?.messages[1]?.content).toBe("Answer 1.");
});

test("a rate-limited assistant gives the way forward, not a dead end", async ({
  page,
}) => {
  await page.route("/api/chat", (route) => route.fulfill({ status: 429 }));
  await page.goto("/ask");
  await page.getByLabel("Your question").fill("Hello?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.locator(".ask-answer")).toContainText("Email");
});

test("the chat route refuses other sites and malformed requests before any model call", async ({
  request,
  baseURL,
}) => {
  const url = "/api/chat";
  const data = { messages: [{ role: "user", content: "Hi" }] };
  const foreign = await request.post(url, {
    data,
    headers: { origin: "https://example.com" },
  });
  expect(foreign.status()).toBe(403);
  const malformed = await request.post(url, {
    data: { messages: [{ role: "assistant", content: "Hi" }] },
    headers: { origin: baseURL ?? "" },
  });
  expect(malformed.status()).toBe(400);
});

test("the eval route needs the cron secret", async ({ request }) => {
  expect((await request.get("/api/cron/evals")).status()).toBe(401);
});

test("agent surfaces serve the owner's facts", async ({ request }) => {
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain(profile.name);
  for (const study of caseStudies) expect(llms).toContain(study.title);

  const me = await (await request.get("/api/me.json")).json();
  expect(me.name).toBe(profile.name);
  expect(me.caseStudies).toHaveLength(caseStudies.length);

  const mcp = await request.post("/api/mcp", {
    headers: {
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
  });
  const tools = await mcp.text();
  for (const name of [
    "get_resume",
    "list_projects",
    "get_project",
    "search_portfolio",
    "get_eval_summary",
    "get_contact",
  ]) {
    expect(tools).toContain(name);
  }
});

test("the old portfolio's addresses lead somewhere", async ({ request }) => {
  for (const [from, to] of [
    ["/bridge", "/crew"],
    ["/foundry", "/crew"],
    ["/garden", "/crew"],
    ["/substrate", "/crew"],
    ["/work/the-bridge", "/crew"],
    ["/admin", "/"],
    ["/admin/trader", "/"],
  ] as const) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(
      new URL(response.headers().location ?? "", "http://x").pathname,
    ).toBe(to);
  }
});

test("pages carry the security headers", async ({ request }) => {
  const all = (await request.get("/")).headers();
  expect(all["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(all["strict-transport-security"]).toContain("max-age=63072000");
  expect(all["x-content-type-options"]).toBe("nosniff");
});

test("the policy blocks nothing the pages need", async ({ page }) => {
  const refused: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) {
      refused.push(message.text());
    }
  });
  for (const path of ["/", "/crew", "/log", ...PAGES]) {
    await page.goto(path, { waitUntil: "load" });
  }
  expect(refused).toEqual([]);
});

for (const path of PAGES) {
  test(`${path} has no serious accessibility issue and reflows at 320`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => v.id),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
}
