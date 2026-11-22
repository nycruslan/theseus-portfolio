# Sprint 84: decisions

1. **The work (Atlas).** The roadmap stands down until a production defect says something false
   or hides a fact, and no owner goal came with this run. Sprints 82 and 83 swept layout, links,
   merge times and the live feed's number. Probe swept what they didn't read, on
   https://theseus-portfolio.vercel.app (the custom domain is outside this session's allowlist):
   - the agent surfaces against `content/`, compared exactly: `/api/me.json`, `/llms.txt`, all six
     `/api/mcp` tools, `/`'s JSON-LD, and the meta and social cards on 15 routes;
   - every figure on `/`, `/crew`, `/log`, `/log/83`, `/evals` and `/trials` against its source
     (retros, merge records, the hull's seats, the sweep file, a fresh freeboard measure);
   - WebGL on at 390 × 844 and 1440 × 900, pairwise text boxes plus a look at the drawn plank
     numbers.
   Verdict: none. Everything stated agrees with its source.

2. **No build; the sprint ships notes only (Atlas).** Nothing qualifies, so no product code
   changes: polish while standing down is what the roadmap rules out. The PR carries sprint 83's
   merge record, written by this run's pre-flight, so `/log` dates 83 and its lines figure moves
   to 9034674, plus the sweep's record here and one lesson in `.crew/STATE.md`.

3. **Not defects** (kept for the next sweep):
   - Sprint 83's record lag: "33 of 25,226 lines … at 957653e", 20 Nov's "3 revisions", and
     /log/83's undated card alt. This PR closes it.
   - `/` at 1440 × 900 reads 29.2 px of freeboard against the trials' 37.0. The trials measure
     `/` without the live row and say so.
   - The case studies carry no JSON-LD; nothing they show is missing or false.
   - The first phone load paints a fallback font (`display: optional`, by design).

4. **Not reached:** `/ask`'s live assistant, MCP search beyond one query, the `/crew`, `/log` and
   `/evals` social cards (same bytes as `/`'s), and portfolio.ruslanshulga.com itself.
