## Goal

Redesign, build step B1: the hero of "the log of the Theseus". This is the roadmap's top item (the
owner's redesign goal of 2026-10-20). The owner accepted its direction and contract by merging #47.

## Size

M. Contract: `.studio/sprint/16/contract.md`. Its checks are B1 1 to 11 in `.studio/sprint/15/contract.md`.

## What ships

- **Faces:** Libre Franklin site-wide replaces Geist. Besley is used on the `/` h1 (136 px at 1440, 64 px
  at 390) and the headline cell. Both are self-hosted through `next/font/local` (`app/fonts/`, OFL texts
  beside them), 65.9 KB in total, with metric-fitted fallbacks.
- **Tokens:** `--step-display`, `--bronze` and `--rule-strong`, plus `--margin` and `--gutter`. The five
  original tokens are unchanged.
- **Title block:** a 12/6/1-column grid with the name and the ruled band (headline · location ·
  "Build log · N sprints"). The bio is in columns 7 to 12 from 1024 px. On phones the hull comes before
  the bio.
- **Hull:** 22 planks toned at build time from `readSprintLog()` through `lib/hull-planks.ts` (the ORDER
  table, `plankTones()`). Copper is the newest plank and bronze fades with age. The hull is cropped at the
  stern, and its length is `min((cw − margin) × 1.048, 1460px)`. The hero markup is 7.5 KB.
- **Canvas** (`components/hero-gl.ts`): the WebGL hull is rebuilt for 22 planks with per-plank tones and
  matches the SVG at rest. It makes one draw per frame and none at rest, and caps DPR at 1.5. The chunk
  is 3,953 B gzip, and first load is 841 B above `/_not-found`.

## Results

- `pnpm verify` passes.
- `pnpm test:e2e`: 137 passed, 1 skipped (content.spec's existing `fixme`), 0 failed. Probe ran it 3
  times on the canvas build.
- Probe's B1 checks are `e2e/hero-b1.spec.ts` plus the rewritten hero, hero-3d, sprints-entry,
  invariants and reveal specs. They were red first: 16 failures on main's code. Ten mutants were all
  killed. Notes: `.studio/sprint/16/spike-probe.md`, `specs-probe.md`.
- Iris (advice): `.studio/sprint/16/review-iris.md`, **changes, 7.7/10 against production's 6.5**.
  Forge fixed her findings 1 to 5 and 7 in b5665c3. On a slow-phone profile, the font-swap shift went
  from 0.034 to 0.0007 at 390, 0.0011 at 1024 and 0.0010 at 1440. Finding 6 (a 4 px jog at 390) is
  left for B2.

## Decisions

- Probe's B1.5 reads all 22 planks, not only the copper one, at 1024 × 768. This is stricter than the
  contract, so a later sprint's keel plank can't turn CI red. Forge's build passes it.
- reveal C3 ("the header never animates") now leaves out the decorative `aria-hidden` `[data-hero]` box.
  Decision 6 put the hull inside the header, and hero-3d C10.4's 200 ms swap fade then tripped C3 in 5 to
  7 runs out of 10. C10.4 still polices that fade, and two mutants (h1, band) show C3 still bites.
- Not built, as the contract scopes it: the stations ruler, the nav, seating, yaw (B2 and B5).

## Needs owner decision

1. **Decision 7, the spec retirements:** approve them as a set. Every retired or narrowed assertion,
   with its old file:line, is in `.studio/sprint/16/specs-probe.md` section 4. They are hero C2's
   688 × 138 box, gaps, cap and centring; C3's column-rule bow and the stern on the header edge; C7's lift
   structure, copper share, 3.0 ceiling and 10° hue window; hero-3d C11's 7 px air and centring; C13.4's
   3.05 : 1; sprints-entry C14.1's tag and class, C14.3's header children and C14.4's gaps; and reveal C3's
   hull exemption. `gate` holds this PR until you approve its head. Decision 9 (the markup cap) was not
   needed: the hero is 7.5 KB, under 8,192 B.

## Not verified

Real phones, Safari, Firefox and a real GPU. Everything ran in Chromium 156 on SwiftShader. The Android
`local()` fallbacks (Roboto, Noto Serif) are not tried yet; they are left for B2.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01EGj3XqreWLno1KMQU34S16
