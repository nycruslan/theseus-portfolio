# Sprint 85 (S): the assistant knows where to find Ruslan

**Outcome.** Asked for Ruslan's links, the assistant on `/ask` gives his LinkedIn and GitHub, which
`content/profile.ts` lists, instead of saying the record has none. Probe's sweep of production found
it saying so twice (`decisions.md` 1): `resumeAsText()` in `lib/portfolio.ts`, the record the
assistant, MCP `get_resume` and `search_portfolio` all read, leaves out `profile.links` and every
project `href`.

**Checks** (Probe, `e2e/`, red on main first):
- **T42a.** MCP `get_resume` on the build returns text that holds every `href` in
  `profile.links` (the mailto's address at least) and every project `href` in `profile.projects`.
- **T42b.** MCP `search_portfolio` for "linkedin github" returns a passage that holds both URLs.
- **T42c.** `/llms.txt`'s Contact section lists every `profile.links` entry.

**The fix** (Forge): `lib/portfolio.ts` adds a links section and project URLs to the résumé text;
`app/llms.txt/route.ts` lists all links under Contact. Both read `content/`, which doesn't change.

**Budgets.** No new dependency, no client code; the system prompt grows by a few lines only.

**Out of scope.** The assistant's rules, tone and model; `/evals` cases (a groundedness case for
the MCP servers' headcount, `decisions.md` 2, is a follow-up); `content/`; owner paths.
