import { type APIRequestContext, expect, test } from "@playwright/test";
import { profile } from "../content/profile";

// The record the agents read: the assistant on /ask answers only from the résumé text that MCP
// get_resume and search_portfolio also serve, so what those return is what the assistant can say.
// Asked for Ruslan's links, production's assistant said the record had none, because that text left
// out profile.links and the project URLs (.crew/sprint/85/contract.md). The links are read from
// content/profile.ts, never copied, so these checks follow the owner's facts.

/** What a link's entry must show: a mailto's address (the record names it bare), else the URL. */
const shown = (href: string) => href.replace(/^mailto:/, "");

const webLinks = profile.links.filter(
  (link) => !link.href.startsWith("mailto:"),
);
const projectHrefs = profile.projects.flatMap((project) =>
  project.href ? [project.href] : [],
);

/** One MCP tool call on the build; the tool's text, read off the SSE reply's data line. */
async function callTool(
  request: APIRequestContext,
  name: string,
  args: Record<string, string> = {},
) {
  const response = await request.post("/api/mcp", {
    headers: {
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    },
  });
  expect(response.status()).toBe(200);
  const body = await response.text();
  const data = body
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);
  expect(data, `an SSE data line in: ${body.slice(0, 200)}`).toBeTruthy();
  const reply = JSON.parse(data ?? "{}") as {
    result?: { content?: { text?: string }[]; isError?: boolean };
  };
  expect(reply.result?.isError ?? false).toBe(false);
  return reply.result?.content?.[0]?.text ?? "";
}

test("T42a: MCP get_resume holds every profile link and every project URL", async ({
  request,
}) => {
  // Preconditions: the owner's facts still have links to look for.
  expect(webLinks.length).toBeGreaterThan(0);
  expect(projectHrefs.length).toBeGreaterThan(0);

  const resume = await callTool(request, "get_resume");
  expect(resume).toContain(profile.name);
  for (const link of profile.links) {
    expect(resume, `${link.label} in the résumé text`).toContain(
      shown(link.href),
    );
  }
  for (const href of projectHrefs) {
    expect(resume, `project URL ${href} in the résumé text`).toContain(href);
  }
});

test("T42b: MCP search for linkedin github finds a passage holding both URLs", async ({
  request,
}) => {
  const wanted = webLinks
    .filter((link) => /linkedin|github/i.test(link.label))
    .map((link) => link.href);
  expect(wanted, "LinkedIn and GitHub in content/profile.ts").toHaveLength(2);

  const text = await callTool(request, "search_portfolio", {
    query: "linkedin github",
  });
  expect(text, "search finds something").not.toMatch(/^No matches/);
  const hits = JSON.parse(text) as { source: string; text: string }[];
  const both = hits.filter((hit) =>
    wanted.every((href) => hit.text.includes(href)),
  );
  expect(
    both.length,
    `a passage holding ${wanted.join(" and ")}; got sources ${hits
      .map((hit) => hit.source)
      .join(", ")}`,
  ).toBeGreaterThan(0);
});

test("T42c: /llms.txt's Contact section lists every profile link", async ({
  request,
}) => {
  const response = await request.get("/llms.txt");
  expect(response.status()).toBe(200);
  const llms = await response.text();
  // The section runs from its heading to the next heading of the same level, or the end.
  const contact = llms.match(
    /^## Contact\n([\s\S]*?)(?=^## |(?![\s\S]))/m,
  )?.[1];
  expect(contact, "a ## Contact section").toBeTruthy();
  for (const link of profile.links) {
    expect(contact, `${link.label} under Contact`).toContain(link.label);
    expect(contact, `${link.label}'s address under Contact`).toContain(
      shown(link.href),
    );
  }
});
