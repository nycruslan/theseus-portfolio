# Sprint 85: decisions

1. **The work (Atlas).** No owner goal came with this run, and the roadmap stands down until a
   production defect says something false or hides a fact. Sprints 82 to 84 read everything but
   `/ask`'s live answers (`.crew/STATE.md`), so Probe swept those on
   https://theseus-portfolio.vercel.app: 13 calls to `/api/chat` (12 by script, 1 in a browser at
   390 × 844), and two more `/api/mcp` searches. Every answer returned 200 in 1.1 to 2.3 s; ten
   matched `content/` and both out-of-scope questions (salary, a made-up employer) were declined
   without inventing anything.
   **One qualifies.** Asked for his links, the assistant said the record "doesn't list other links
   such as LinkedIn or GitHub", twice. `content/profile.ts` lists both. The model never saw them:
   `resumeAsText()` in `lib/portfolio.ts` leaves out `profile.links` and every project `href`, and
   MCP `get_resume` and `search_portfolio` ("linkedin github contact": no matches) read the same
   text. A visitor is told something false and loses two facts, so the sprint fixes it
   (`contract.md`, S with one check).

2. **Not defects** (kept for the next sweep):
   - Q3 said the record gives no headcount for the MCP servers' users, though the bio says
     "several thousand employees use every day"; Q1 read the same sentence right. It's the model's
     variance, not missing data: a groundedness case in the evals is a follow-up, not this sprint.
   - "Vice President, Engineering, AI Platform" spells out the headline; the shared base's list
     paraphrased. Phrasing.
   - `/llms.txt`'s Contact listed only Email. Not false, but it's the same omission in the same
     code family, so it rides along.

3. **Not reached:** portfolio.ruslanshulga.com (outside the allowlist), multi-turn conversations
   and prompt injection beyond the two out-of-scope questions.
