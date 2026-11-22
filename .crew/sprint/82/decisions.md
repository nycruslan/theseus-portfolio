# Sprint 82: decisions

1. **The work (Atlas).** The roadmap stands down until a production defect says something false
   or hides a fact, and no owner goal came with this run. Probe swept production read-only (92
   sitemap URLs and 565 hrefs crawled, 84 default-font loads over 14 routes and six windows, 16
   specs run against production, every merge.json checked against GitHub's `merged_at`). One
   finding qualifies: /log/40 says PR #99 merged at "08:03 UTC", but GitHub merged it at 09:03:09Z.
   Its squash commit was stamped 08:03:08Z across the 1 Nov 2026 US fall-back, when 01:03 Pacific
   happened twice. The other 78 records are 1 to 2 s early, all showing the right minute.

2. **Fix the record, not the script (Atlas).** `merge-record.mjs` never rewrites a record, so a
   hand edit to `.crew/sprint/40/merge.json` sticks. Reading `merged_at` from GitHub would make the
   script depend on the network, which it avoids on purpose (it runs from git alone), and the next
   fall-back is a year away. The script's header now names the exception and says how to check for
   it. The record's `commit` and `lines` fields stay: they're true.

3. **No new check (Atlas).** S lane: the existing suite stays green. A check pinning one record's
   time would only repeat the data. B5.5/B5.6's oracle already reads each record and its date.

4. **Not defects** (Probe's report, kept for the next sweep): `/`'s revision ellipsis from 1024 px
   is by design (B1.5); production's "Undated" sprint 81 is the known record lag
   (`.crew/sprint/32/decisions.md` 5, 10); B2.10 is 1 B over its 2,048 B budget only in the live
   state of a running sprint; T8's CLS on /trials is already listed as open.
