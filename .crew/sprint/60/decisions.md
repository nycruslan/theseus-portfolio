# Sprint 60 decisions

## 1. The contract mutant, and every red on it (Probe)

**The build.** A scratchpad copy of `ff9a3d9`'s app (main's code) with a bare version of the change
and nothing else:

- `components/plank-key.tsx`: `PlankLegend` takes `planks` and `replaced` and renders the
  "Original" item only when `planks - replaced > 0`.
- `components/revisions.tsx`: the legend gets `planks` and `replaced`; the Log link and
  `<a href={`/log/${entries.at(-1)?.sprint}`}>Rebuild it yourself</a>`, with the Log link's classes
  word for word, share one `div.flex.flex-wrap.items-center.gap-x-6.gap-y-1`, the Log link first.
- `app/read/page.tsx`: the legend gets `planks={PLANKS.length}` and `replaced`.

**The run.** The whole unedited suite as at `ff9a3d9` (400 tests), `PLAYWRIGHT_PREBUILT=1` on that
build, 3 workers, on a machine shared with Iris's and Forge's runs (load 16 to 21 on 4 cores).
**391 passed, 9 failed, in 40.7 min.** Six of the nine are H11's (as amended at `f7faa7f`), two are
contract changes H11 doesn't name (decisions 4 and 7), and one is the runner's load.

Every red, with its reason:

| Spec and check | Red at | Why | Disposition |
|---|---|---|---|
| `keyboard.spec.ts` B2.3 | the first 25 stops | the door is the stop after the Log link | H11, rewritten |
| `keyboard.spec.ts:446` forced colors keep exactly one ring | "Tab reaches the first Contact link" | `tabUntil` stops at 25 presses | **Contract change**, decision 7 |
| `sheet.spec.ts` B1.5 | "its links" at every width | the door after the Log link | H11, rewritten |
| `sheet.spec.ts` B2.9 riders | "the original swatch on / and /read" | no Original item | H11, rewritten, swatch half retired (decision 3) |
| `live-layer.spec.ts` B4.19 | "the default server's legend: two items" | one item; and `live-layer.ts`'s finder by "Original" found no list | H11, rewritten with the finder |
| `plan.spec.ts` B1.4 | "an HTML legend naming seated and original" (null) | its finder, "seated" and "original" in one element's text, found none (I didn't trace why; Iris expected it to pass through the parent) | H11 (amended), rewritten (decision 8) |
| `plan.spec.ts` B2.5 | "the legend's states on /" | 1 item, not 2 | H11 (amended), rewritten (decision 8) |
| `facts-scan.spec.ts` P17 | "the row wraps at 390 px" | the count line and legend fit one line at 390 | **Contract change**, decision 4 |
| `invariants.spec.ts` B2.9 axe, light | test timeout (90 s) in `AxeBuilder.analyze` | the machine's load: the dark run passed in the same suite; rerun on the same build at load 4, both schemes passed, 47.5 and 48.5 s | Not the change; kept |

Not red, and named by the contract: B4.49 (decision 9). B1.2's finder passed on the mutant through
the count line's "0 original" in the legend's parent, as Iris found; it is rewritten anyway
(decision 8). B4.18, which reads the legend through `live-layer.ts`, passed (both sides read an
empty list) and passes with the new finder.

## 2. H8's other half is a unit read, and it pins `planks` and `replaced` (Probe; Atlas agreed)

No fixture draws an original plank beside a legend: `/` in every feed state and `/read` all have 22
of 22 replaced, and the step pages that draw original planks (`/log/n` before 23) have no legend.
So H8's "a mutant that hides the item unconditionally" is caught by rendering `PlankLegend` from
`components/plank-key.tsx` with `react-dom/server` inside the spec, with the count line's own prop
names, `planks` and `replaced` (the contract's rule is written in them): "Original" at
{22, 21} and {22, 0}, not at {22, 22}; "Seated by a sprint" first; pencil and copper after.
Atlas agreed to the names and told Forge.

**Proven:** on a tree whose `PlankLegend` hides the item unconditionally (`{false ? (`), served
the mutant's build, H8 goes red on exactly the three unit renders that have an original plank
({22, 21}, {22, 0}, and with pencil and copper) while its page reads stay green.

## 3. B2.9's forced-colours rider: rewritten, and its swatch half retired (Probe, as H11 names)

Before: on `/` and `/read`, the original swatch's fill unlike the seated swatch's, each unlike
Canvas, and an original plank unlike a seated one where one is drawn (never, since 22 merged; the
test annotated that it couldn't). After: on `/log/13` (13 seated, 9 original) an original plank's
fill unlike a seated plank's and unlike Canvas, which the old rider could no longer reach; on `/`
and `/read` no original plank drawn, the seated swatch kept and unlike Canvas, a seated plank
unlike Canvas.

**Retired, for Lens:** "the original swatch's fill vs the seated swatch's" and "the original swatch
differs from Canvas" on `/` and `/read`. Their item is gone where no original plank is drawn, which
on those pages is always. The rule that would bring it back is H8's unit read.

## 4. P17's `/read` clause: a red the contract didn't name, read at 320 (Probe; contract change)

`e2e/facts-scan.spec.ts` P17 asserts that `/read`'s figcaption row (the count line and the legend)
wraps at 390 with a 6 px row gap. Without "Original" the two share one line at 390 (count line
16–206, legend 230–372, both at the same top on the mutant), so "the row wraps at 390 px" fails.
At 320 and 360 it still wraps, with the 6 px gap (main and the mutant alike). The rewrite reads
the row at 320 × 568, same assertions. It passes on main and on the mutant.

## 5. H10's baseline: measured on main's build, and it agrees with Iris's (Probe)

`fit.md` wasn't on the branch when I reached H10, so I measured today's figures myself, with H10's
own read: main's build at `ff9a3d9`, the default server and B4.22's kept fixture sites (live, open,
resting) and the replay fixture, WebGL refused, a fresh context per state and face (webfont, and
every `.woff2` aborted with only next/font's `local()` faces loaded), one load at 1440 × 900 then
1 px resizes 1380 to 1440 at 900 tall, the lowest of the title block's three Contact links. The
figures are `BASELINE` in `e2e/home-door.spec.ts`, one a width per state and face.

They match `fit.md`'s table: today's lowest is live 874.2, open 866.3 (867.1 with fonts blocked),
default 866.3, resting 880.2, replay 880.4 px, against Iris's 874.17, 866.31 (867.14), 866.31,
880.16 and 880.41 on production. Iris's states were built on production's markup; mine are the
fixtures' own, so the spec keeps mine.

## 6. H10's ceiling is the lowest of today's states at each width (Atlas's contract change)

First Atlas allowed open to drop to live's place (Forge measured 866.3 → 874.2 at 1440 × 900);
then, with `fit.md`, the contract reads "never lower than the lowest of today's states at that
width", which has the same effect on open and supersedes it. `lowestToday(width, face)` is the
largest of the five states' figures there. Live is swept too, since the 1440 × 900 clause ("All N
revisions in the Log" and the door wholly in the first screen) holds in every state.

H10 can't be red on main through the sweep, which is main's own figures; on main it is red only
through the door's absence at 1440 × 900 (10 reds, one per state and face).

## 7. `tabUntil`'s bound rises with B2.3's count (Probe; Forge found it too; contract change)

`e2e/keyboard.spec.ts:446`, "forced colors keep exactly one ring", went red on the mutant at "Tab
reaches the first Contact link": `tabUntil` presses Tab at most 25 times, B2.3's old count, and
Contact's first link is now the 26th stop. The bound is B2.3's count by design (its comment says
so), so it rises to 26 with B2.3's rewrite. The test's assertions are unchanged. It passes on main
with 26 (the link is reached at 25).

## 8. H11's later rewrites: B2.5's legend length, B1.4's and B1.2's legend finders (Iris's fit, 4.4)

- B2.5 (`e2e/plan.spec.ts`): `shipWords` finds the legend as the list holding "Seated by a sprint";
  "the legend's states on /" has length `ORIGINAL > 0 ? 2 : 1` (1 today), not 2. `/read`'s legend
  still equals `/`'s.
- B1.4 (`e2e/plan.spec.ts`): the legend by the same intent, and a new clause pinning its items,
  "Seated by a sprint" alone while the count line reads 0 original (Original exactly when it reads
  more). Its old finder went red on the mutant (decision 1), so it is a rewrite, not a tidy-up.
- B1.2 (`e2e/sheet.spec.ts`): the legend found the same way; its assertions are unchanged.

## 9. Kept as written (Probe)

- B4.49 (`crew-replay-home.spec.ts`) and B4.24 (`live-layer.spec.ts`) read the Tab order up to the
  Log link (`[link, keel, Log]` one apart), never what follows it, so the door after the Log link
  leaves them true. Neither went red on the mutant.
- `e2e/live-layer.ts`'s legend finder is rewritten as H11 names (the list holding "Seated by a
  sprint"); B4.19 is rewritten to "Seated" alone first, every other clause unchanged; B4.18's
  "legend as on the default server" reads through the same finder and stays as written.

## 10. Runtime (Probe)

On this 4-core machine, at load 4 after the suite, 2 workers (`mut-all`, the mutant build):
H8 31.5 s, H9 21.0 s, H10 28.7 s, so `e2e/home-door.spec.ts` is 81 test-seconds with its fixture
sites already up in the worker (they start in its `beforeAll`, shared by name with B4.22's and
B4.49's). The rewrites cost what they did: B2.3 1.8 s, B1.5 2.3 s, B2.9 riders 0.6 s (one more
page, `/log/13`), B4.19 1.5 s, B1.4 1.4 s, B2.5 1.7 s, P17 1.5 s. On main, where the door is missing
and H9 stops early per window, H8 30.1, H9 33.0 and H10 59.4 s, cold sites included. The suite on
the mutant took 40.7 min for 400 tests on 3 workers at load 16 to 21; CI's slowest shard is for
Atlas to read on the PR's run.

**On main** (`main-all`): H8, H9, H10, B2.3, B1.5, B4.19, B1.4 and B2.5 red; P17, B1.2, B2.9 riders
and "forced colors keep exactly one ring" green (the re-pointings hold on today's page). H10 is red
on main only through "the door wholly in the first screen" at 1440 × 900, ten times, one per
state and face. **On the mutant:** all 15 green, axe in both schemes included.

**H10 on the mutant:** open drops 7.2 to 7.9 px at 1410 to 1440 (7.3 to 7.9 at 1422 to 1440 with
fonts blocked), to 874.2 at 1440, live's place; every other state is unmoved to a tenth. Replay sits
exactly on the ceiling at every width (880.4 at 1440), so a door that drops replay by more than
0.5 px anywhere in the sweep is red; no separate mutant was built for it.
