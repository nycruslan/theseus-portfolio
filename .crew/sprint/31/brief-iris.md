# Sprint 31 brief for Iris: `/crew`'s calls first, then beside the build, then the review (Atlas)

## What this sprint is for

B4a (the plan's B4.1): `/crew`, the crew at work, from the Studio's feed, as the owner-approved
frames `.crew/sprint/17/design/crew-1440.webp` and `crew-390.webp` draw it, with the bar's Crew
link on every page and, below 768 px, Read as page moving from the bar to the drawing's foot on
`/` as `rest-390.webp` draws it. The page is server-rendered from the feed with no client code:
the drawing at the left (the sheet's 2D lines plan in this sprint; the hull and the control come
with B4d), the panel at the right: "Crew", a Close link to `/`, the sprint chip and goal, the crew
table (seven rows: name, role word, state, one line), the now line, the moments with UTC times,
and Evidence, Approval and Rules. It shows four states (`.crew/sprint/28/b4-plan.md`, "The four
states, and the honest rest"): live (copper on Working and the now line), open and not live (a PR
waiting for the owner, nobody in copper), resting (the last merged sprint, labelled with its merge
time), and feed down ("The live feed isn't answering", the last plank from the retros, the roles
with no state words). The owner approved the feed contract (`.crew/sprint/28/feed-contract.md`)
by merging #75 today; the feed isn't deployed yet, so the crew builds against fixtures and only
the owner sees the real feed, on the preview. The plan behind it is `b4-plan.md`; Quill's
contract lands within about ninety minutes as `.crew/sprint/31/contract.md`. Forge builds and
Probe writes the checks from the first minute; your notes land mid-build, as sprint 30's did.

## Part 1: the calls, within the hour

Write them as `.crew/sprint/31/notes-iris.md` in this checkout (don't commit; Atlas commits it)
and message Atlas the moment it's written. Numbers a builder can type.

1. **The panel and the drawing at 390, 768, 1024 and 1440.** The frame at 1440: the drawing
   840 px, the panel 600 with a left rule, "Crew" in the display face, the Close box top right.
   At 390: the drawing above (the frame shows the body plan and the planks), the panel below. Say
   the split from 1024, what the drawing is at 768 and 390 (the sheet draws three views from 768
   and two below; `/read` the profile and half-breadth plan; reuse `components/lines-plan.tsx`'s
   views, no new drawing), the panel's padding and rules, the chip ("17" hatched, graphite) and
   goal line, the crew table's columns (name in the display face, the role word, the state with
   its dot, the line; at 390 the frame drops the role word and folds the not-called roles into
   one sentence "Forge, Pixel and Probe are not on this sprint."), the Activity heading and the
   rows, and the Evidence, Approval and Rules rows. The first screen at 1440 × 900 and 390 × 844:
   what must start inside it (the `h1`, the chip, the first crew row at least).
2. **The four states' look.** Live: the copper dot and word on Working rows and the copper now
   line, nothing else copper (the owner's call 2). Open, not live: the label "Waiting on the
   owner" and no copper. Resting: the last merged sprint told the same way, labelled with its
   merge time; say how the label reads so a visitor knows nothing is happening and the page
   doesn't apologise. Down: "The live feed isn't answering", the last sprint from the retros, the
   roles with no state words: say what fills the state column and the now line so the panel
   still reads as designed. Nothing pulses or moves in any state.
3. **Read as page below 768.** On `/` it leaves the bar for the drawing's foot beside the
   control, as `rest-390.webp` draws it (the link at the left, underlined, the group at the
   right): confirm the row's height and gaps against sprint 27's control row (`app/page.tsx`,
   `app/globals.css` "The drawing's foot"). On `/crew` there is no control until B4d: say where
   Read as page sits below 768 (the drawing's foot alone, or the panel's foot) and how.
4. **The words for a non-engineer.** The frames' role words (Lead, Design, Roadmap, Review, Code,
   Motion, Tests), the state words (Working, Waiting, Done, "Not on this sprint"), and the moment
   kinds the feed sends (`kickoff`, `ticket`, `contract`, `decision`, `report`, `verdict`, `gate`,
   `pr`, `merge`, `end`): the feed's `text` is the Studio's own sentence ("Done means 14 checks");
   say whether the page prefixes a kind word, which, and how it reads to a board member. And the
   now line when it quotes Atlas (feed contract, decision 4): how a quote is marked.

Constraints that hold: no horizontal scroll at 320; 24 px targets from 1024 and 44 on phones; one
ring per focused link; CLS 0; links ink and underlined except the bar's; copper only for live;
the same tokens, faces and bar as `/`; no client code on `/crew`.

## Part 2: beside the build, then the review

Atlas messages you when Forge has a build running, with its URL (or serve a worktree yourself:
`git worktree add /home/user/wt-iris-31 <branch>`, `pnpm install --frozen-lockfile`,
`pnpm build`, `node node_modules/next/dist/bin/next start --port 4720 &`, note `$!` and kill the
`next-server` child by PID when done; your ports are 4720 to 4729; to see a fixture state, set
`CREW_FEED_URL` to Probe's fixture server, which Atlas tells you how to start). Look early at
320, 390, 768, 1024 and 1440, both schemes, scripts off, forced colours, each of the four states,
and say exactly what to change while it's cheap. When the build is done, review it against
`design/rubric.md`, the frames and production's `/` (the bar), score it, and write
`.crew/sprint/31/review-iris.md` with `Verdict: ship`, `changes` or `blocked` on the first line,
your musts and your cheap changes apart, frames in your scratchpad or
`.crew/screenshots/sprint-31/` (git ignores it) with a line saying what each shows. Name what
departs from the approved frames for the owner (the 2D drawing, no control on `/crew`, the moved
Read as page on phones, the Rules copy, anything of yours) in one paragraph Atlas can put on the
PR. Then at most three memory lines citing `.crew/sprint/31/`, and correct any line of yours that
proved wrong.
