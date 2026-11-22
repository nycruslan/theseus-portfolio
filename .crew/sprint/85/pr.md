## Sprint 85 (S): the assistant knows where to find Ruslan

**Goal** (from the roadmap's stand-down defect condition): read the one surface sprints 82 to 84
left unread, `/ask`'s live answers, against `content/`, for anything false or hidden.

**Size:** S, one check. **Contract:** `.crew/sprint/85/contract.md`. **Decisions:**
`.crew/sprint/85/decisions.md`.

### What the sweep found

Probe asked production's `/api/chat` 13 questions a hiring executive would ask. Every call
returned 200. Ten answers matched `content/`, and both trap questions (salary, a made-up employer)
were declined without inventing anything. **One qualifies:** asked for his links, the assistant
said the record "doesn't list other links such as LinkedIn or GitHub". `content/profile.ts` lists
both. The cause is `resumeAsText()`, the record the assistant, MCP `get_resume` and
`search_portfolio` all read: it left out `profile.links` and every project URL.

### The change

- `lib/portfolio.ts`: the résumé text gains a `## Contact` section (Email as the address, LinkedIn,
  GitHub), and each project's URL goes next to its name.
- `app/llms.txt/route.ts`: Contact lists every `profile.links` entry, not only Email.
- `e2e/agent-record.spec.ts` (Probe, red first): T42a `get_resume` holds every link and project
  URL; T42b a "linkedin github" search returns one passage with both URLs; T42c `/llms.txt`'s
  Contact lists each link. Every URL is read from `content/profile.ts`.
- `.crew/sprint/84/merge.json`: sprint 84's merge record. Memory lines from Forge and Probe; Probe
  moved 8 mutant lessons to `mutants.md` to keep MEMORY.md under 25 KB.

`content/` and every owner path are untouched. The system prompt grows by about 230 characters.

### Results

- T42a to T42c failed on 9c92427 (Probe: "Expected substring: nycruslan@gmail.com", "No matches
  for linkedin github", "LinkedIn under Contact") and pass on the head, along with
  `e2e/one-site.spec.ts` (33 passed together).
- `pnpm verify` passes on the integrated tree.
- On a local build, the search Probe ran on production ("linkedin github contact"), which found
  nothing there, now returns the Contact passage first.

Not verified: a live `/api/chat` answer after the fix. It runs only once this is deployed, and
`get_resume` shows the exact text the prompt embeds. Not reached: portfolio.ruslanshulga.com
(outside the allowlist) and multi-turn conversations.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbHXAdQpFwSv9ZbdmG
