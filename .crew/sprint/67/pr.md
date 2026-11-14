# Sprint 67: the trials' demo, and a Log door that wraps

**Goal:** the milestone's last item (`ROADMAP.md`, "Now: try to sink it"): Quill's demo of the trials on production after #134, with sprint 66's door follow-ups riding along. Chosen from the roadmap.

**Size:** S. No contract: the demo is notes, and the follow-ups are Lens's nits and Forge's own from `.crew/sprint/66/retro.json`.

## What a visitor sees

- On the Log, with a large default font (21 px or more) at 320 wide, "Try to sink Ruslan's contact links" now wraps onto two lines inside its column instead of running off the page. At the default font nothing on `/log` moves (Forge: 0 of 1,042 boxes at 320, 390, 1024 and 1440).
- Nothing else changes: the dare is now written once (`lib/trials-dare.ts`), and the trials page, the doors and every card render byte-identically (Forge: six card PNGs `cmp` equal, page HTML 0 lines differ).

## The demo

Quill's verdict (`.crew/sprint/67/demo.md`): the trials hold on production. The plan's four questions hold: the dare is in the first screen at every window read, a held finger sinks the links in about 2 s on a phone, the page's number equals the frame's own measure to 0.03 px on all 48 loads, and each window's card is its own dare. The doors sit under Crew's first rule and at the Log's foot with nothing above them moved, and `/` is unchanged. Nothing makes the site say something false or hide a fact, so **the crew stands down after this sprint**, and neither "after the demo" item earns a sprint. Left open, as follow-ups: the frame's 48 "Blocked script execution" console errors a view, a cold-load caption jump that turns T8's CLS red on production 3 loads in 12, T11's deployed race, and plainer words in places (Iris).

## Decisions

`.crew/sprint/67/decisions.md`: starting past the pre-flight's stand-down, which counted sprint 66's merged role branches as in flight (1); why the follow-ups ride here (2). No Owner's pick: nothing here needs the owner.

## Checks

- **Lens: ship** on cff2447, 0 Important, 1 nit (one `FIRST_NAME`, `lib/trials-dare.ts:6` and `lib/crew-key.ts:11`), which rides with the next sprint on that code.
- **T25** (`e2e/trials-doors.spec.ts`): each door inside its column and the page at 320 × 568 with a 16, 20 and 24 px default font, webfont and fonts blocked; no sideways scroll at 16 and 20. Red on main's CSS for the Log at 24 px (right edge 354 against a 304 column), green with the recipe (304) (Probe, two scratch builds). Lens's "from 20 px" was off by one: the door fits at 20 and overflows from 21 (Probe and Forge, both renderers).
- **T26**: each door prints, in ink, as its sentence, at 390 × 844 and 1440 × 900, light and dark. It pins what ships.
- **K6** (`e2e/keel.spec.ts`, `keelShows`): reads every link in a rule, so rule 1's door is read in print and forced colours at all five sizes.
- On the integrated head: `pnpm verify` passes; `trials-doors`, `keel`, `trials`, `trials-drag` and `trials-chart`, 38 passed (Atlas). Forge ran the same set on his build (34 passed, before T25 and T26), Probe the two door specs on main (T25's Log red only, as meant).
- Quill ran the four trials specs unedited against production: 20 passed, T11 red once then green (the drag outran the controller's load), T8 red twice on CLS alone (the cold-load caption jump, above).
- No retired checks. Not verified: Safari, iOS, Firefox, a real finger, the browser's zoom as opposed to a larger default font.

## Found, not fixed (out of scope)

- From a 21 px default font, the bar's Contact link makes every page scroll sideways at 320 (373 at 24 px, cut to "Con"), and at 24 px so does the Log's motion control's Off (327) (Probe and Forge).
- On paper the door is a dare to an interactive page with no address; the print rules otherwise drop such links or print the address. Iris's call; T26's "shown" retires if she hides it.

## Files

`app/globals.css`, `lib/trials-dare.ts`, `lib/trials-card.ts`, `components/trials.tsx`, `components/keel.tsx`, `components/log.tsx`, `e2e/trials-doors.spec.ts`, `e2e/keel.spec.ts`; `.crew/sprint/65/merge.json`, `.crew/sprint/66/merge.json`, `.crew/sprint/67/`; Quill's, Forge's and Probe's memory.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZx9KFY5efK5rxMgik
