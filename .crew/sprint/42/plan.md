# The next milestone: the proof in the first window (Quill, sprint 42)

## The outcome

Whatever window a visitor opens `/` in, the first screen shows Ruslan's name, his role, his own
lead, the four particulars and a way to reach him. That means a laptop browser 1280 to 1920 wide
and 620 to 950 tall, a tablet, or a phone browser with its toolbars showing. When the window is
short, the drawing gives up height; the facts don't. At 1440 × 900 nothing moves.

Three sprints, with checks W1 to W15: Wa and Wb are M, Wc is S. No sprint needs an owner answer to
start, touches an owner path or edits `content/`. One Owner's pick for the milestone after this one
is asked now, so his answer is ready when this one closes (below).

## Why this, and not standing down

`close.md` has the measurements. "The proof in five seconds" holds at the sizes its checks pin,
1440 × 900 and 390 × 844, but those are screen sizes. A browser's toolbars take 110 to 150 px of a
laptop screen, and Safari's take more of a phone's. In the windows people actually have:

1. **On the commonest Windows laptop window (1536 × 715, a 1920 × 1080 screen at 125%), the
   first view shows no role, no bio and no contact.** The name sits on the fold (y 600 to 689), the
   role is at 737 and the links at 907. At 1366 × 625 the name itself is cut (542 to 629). An
   executive at a bank is the reader most likely to have this machine. `PRODUCT.md` asks that "the
   owner's name, role and value are readable within a second or two", and here they aren't.
2. **On a MacBook (1440 × 790) the key and the contact links are below the fold** (797 and 874).
3. **On every phone window measured, the particulars are below the fold** (390 × 664: 653 to
   812). On an iPhone SE in Safari (375 × 548), so are the contact links (642).
4. **From 1024 to 1279 the particulars are below the fold even on the screen sizes** (1024 × 768:
   769 to 849), and the key is hidden from 1024 to 1439. These are Pa's and Pb's left-opens.

The cause is one rule. From 1024 the drawing band's height is a fixed share of the width (0.3381:
the lines plan's own proportions, `lib/hull-layouts.ts` WIDE.box 476/1408, drawn in `components/lines-plan.tsx`; `.sheet-row`'s min-height in `app/globals.css` reuses the same 0.3381, so the two change together), so a short window pushes the title block down and keeps the
drawing whole. Below 768 the drawing and the motion control fill y 50 to 345 before the name
starts. Iris noted the laptop windows in sprint 34; no sprint took them up, and no check pins a
window shorter than 768.

**Why not standing down:** this is `PRODUCT.md`'s first belief failing for most first visits,
measured on production, with no owner answer needed.

**Why not the roadmap's two candidates first:**

- A published keel adds proof of belief 2.
- `/work/…` case studies deepen belief 1.

Both land below a first window that is already losing belief 1, so fixing the window first makes
every later proof count. The case study needs the owner's facts. The keel needs his word to publish
his setup. Both are asked as the Owner's pick below, so the answer is ready when this milestone
closes.

## The sprints

### Wa (M): the sheet fits a laptop window, from 1280 wide

At every laptop window in the set, the title block and the particulars are in the first view, with
the revision block's caption, which carries the bio's sentence that a team of AI agents builds the
site. At 1440 × 900 the page is unchanged. Checks W1 to W7, in `first-contract.md`.

**Iris's call first, on these measurements.** The table below is the height each window lacks:
the contact links' bottom plus 8 px, less the fold. The band column is the drawing band's height
now (72 px down to the bottom row).

| Window | Lacks | Band now | Band if it alone gives way |
|---|---|---|---|
| 1920 × 950 | 71 px | about 638 | 89% |
| 1512 × 865 | 42 px | about 499 | 92% |
| 1470 × 840 | 52 px | about 485 | 89% |
| 1440 × 790 | 92 px | 475 | 81% |
| 1280 × 800, live | 25 px | 421 | 94% |
| 1280 × 680 | 145 px | 421 | 66% |
| 1536 × 715 | 200 px | 508 | 61% |
| 1366 × 625 | 206 px | 450 | 54% |

Three ways out, for her to choose or better:

- **(a) The band gives way.** The sheet takes at most the small viewport's height (`svh`), and the
  drawing scales to the band that's left: down to about 54% at 1366 × 625. The particulars stay in
  the band's corner, so it must still hold them. Pixel joins, since the model registers to the
  drawing's box.
- **(b) The title block rises.** On windows wider than about 16:10, the title block sits beside
  the drawing, and the revisions go below. That recomposes the sheet the owner approved on sprint
  17's canvas. It's Iris's call, and the owner may overrule it after the merge.
- **(c) The drawing drops the half-breadth plan** below some height. The profile and body plan
  keep their scale, and the band loses about a third. The hull's shadow falls on the half-breadth
  plan today, so Pixel joins.

Whichever she picks, 1440 × 900 stays as it is: every kept check pins it.

Rider (Iris confirms, Pixel or Forge fixes): the led-out "42" on seat 5.0 sits on the Base line at
1440 to 1536 on production today (sprint 41's follow-up). Wa scales that drawing.

### Wb (M): the sheet fits a phone window

At 390 × 664, 393 × 659, 412 × 780 and 430 × 746, in both schemes and every feed state, B1.1's items
and the four particulars are in the first window. At 375 × 548 and 360 × 560, B1.1's items are (the
particulars may follow). The narrow drawing stays whole and the model registers on it. Iris's call
first. The room to find, with the same 8 px margin, is 156 px at 390 × 664 (the particulars end at
812), and 102 px at 375 × 548 for the contact links. Her options include a shorter narrow drawing, the motion
control's row (it holds y 295 to 345, the first window's prime space, for a setting) or the
particulars' form.

- **W8** The phone window holds the facts, as above, on B4.22's harness (default server, live,
  open and resting).
- **W9** The narrow drawing is whole: lettering and planks inside the band. B3.1's registration
  holds at 390 × 664 on Full.
- **W10** The control: one group of Full, Calm and Off with 44 px targets, wherever it sits. If it
  moves on `/`, B3.16's place clause (`motion.spec.ts`) is the only rewrite. Wb's contract and PR
  name it with the reason (the assertion changes place, not strength), for Lens to confirm. `/crew`'s and `/log`'s
  controls (B4.41, B5.25) don't move.
- **W11** Still: CLS 0 at load. The phone layout sizes from `svh`, never `vh` or `dvh`, so Safari's
  toolbar collapsing never moves the sheet (a source check; Chromium can't emulate the toolbar).
- **W12** Rider (Pixel): the 3D label over the copper dot at 1024 and below (Pb's left-open, the
  3D half of P13). Wb touches the narrow drawing.

### Wc (S): tablets and the key, from 1024 to 1439

Pa's and Pb's left-opens, on the rule Wa sets.

- **W13** At 1024 × 640, 1024 × 768 and 1180 × 740, B1.1's items and the four particulars are in
  the first window (today the particulars sit at 769 to 849 at 1024 × 768).
- **W14** The key shows from 1024 to 1439 (one or two lines). It's inside the first window at
  1280 × 680, 1366 × 625 and 1024 × 768, with B4.22 and B4.49 unedited.
- **W15** Rider (Probe): P3's, P8's and P9's default-server passes run under `PLAYWRIGHT_BASE_URL`.
  Only the fixture states skip there (`particulars.spec.ts:414`, `plain-words.spec.ts:369` and
  `457`).

## Budgets that apply to every sprint

- **Facts first:** every fact stays server HTML at full opacity, 0 B of new script on `/` (B2.10
  unedited), and the DOM order unchanged (P1's order, Contact's first link the 16th Tab stop). The
  LCP stays the `h1` from 1024 (B1.9's measure, run at 1366 × 625 and 1536 × 715 too), and the `h1`
  or the bio on phones.
- **Nothing moves at 1440 × 900:** B1.1, B3.1, P3, P4, P8, B4.22 and B4.49 run unedited, and
  1920 × 1080 is reported.
- **The drawing stays whole:** never cropped, with its three views (or Iris's named subset) and
  their lettering inside the band. Iris states the smallest drawing height she accepts, and W3
  reports it at every window.
- **The 3D costs no more:** the draws and triangles `model-cost.spec.ts` reads are unchanged. Frame
  1 registers within B3.1's bounds at the new windows.
- **Still:** CLS 0 (B1.8 unedited) at load and through a window resize. Nothing new is copper.
- **CI:** each sprint reports its new specs' time and the full suite's at CI's worker count,
  against `check`'s 35 minutes (#100: 28.8). New window checks read the DOM with WebGL refused
  wherever the hull isn't the question.

## Riders, checked against the code on 2026-11-01

Sprint 41's retro proposes grepping for each rider before listing it; `close.md` has the table.

- **Taken here:**
  - the led-out 5.0 number (Wa);
  - the 3D label over the dot (Wb);
  - the key from 1024 to 1439 and the particulars below the fold from 1024 to 1279 (Wc);
  - P3, P8 and P9 under `PLAYWRIGHT_BASE_URL` (Wc).
- **Open, and no sprint here touches their code,** so they wait:
  - Lens's two nits on #100 (`lib/card.ts:13`, `app/opengraph-image.tsx:70`);
  - the 404's first paint in the fallback face;
  - the card drawn as a sheet (Iris);
  - Detail A's dark boxes (a real phone);
  - `/` and `/crew`'s dev-only instant-navigation message (no `export const instant` in `app/`).
- **Open, for a PR that waits for the owner anyway:**
  - the legend's "Original" (`components/plank-key.tsx:39`);
  - the commit-hash link (C5.3);
  - the unknown record's scripts-off 404.
- **Not riders:**
  - The display face on slow first visits (`close.md`, "Also seen"): `optional` is Iris's
    sprint 22 call, so it's hers to weigh again, for example by inlining the name's few glyphs.
  - Splitting CI's suite: `.github/` is the owner's.

## Out of scope

- **What the facts say:** no new figures, no rewording, nothing in `content/`.
- **The loft's motion, the hull's look, the live marks and the replay:** the owner's demos judge
  them. Wa and Wb change only where the drawing sits and its size on short windows, and the model
  follows the drawing as it does at every width today.
- **A line about the crew in a phone's first window:** the phone's window has room for belief 1
  first (`PRODUCT.md`'s order). The bar's Crew link is there, and the key follows the rows.
- **`/crew`, `/log` and `/read` at short windows:** their first screens aren't the five-second
  read.
- **The keel and `/work/…` case studies:** the pick below.

## What waits for the owner

Nothing in Wa, Wb or Wc. Iris's composition on short windows changes the approved sheet where the
owner's frames never went, so it's her call. He may overrule it after the merge, and it can be
undone. His open demos (B3, B4 and B5) will be judged on his own laptop window, so Wa should land
before he runs them. The optional five-second test still stands: show `/` to a stranger, on a
laptop window and a phone, for five seconds.

### Owner's pick: which proof comes after the first window

Asked now so it doesn't hold the next milestone. Atlas puts it in sprint 42's PR body if he agrees.

- [ ] A published keel: the rules the crew can't break, quoted from the files that enforce them (`.github/CODEOWNERS`, the required checks, `CLAUDE.md`'s Boundaries), on `/crew` (Recommended). It needs no new facts, it shows belief 2's mechanism, and it can be undone.
- [ ] A JPMorgan case study at `/work/…`, from facts Ruslan writes or approves in `content/` (the crew drafts only from `content/profile.ts`, in `content/drafts/`). Published employer detail can't be taken back.
- [ ] Neither for now: the crew stands down after this milestone until Ruslan sets a goal.

The choice can be undone. Nothing is built from it before this milestone closes, and the keel, if
built, is a page that can be taken down. The repository it quotes is public already.
