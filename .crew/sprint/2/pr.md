# Sprint 2: dark mode that follows the system preference

- **Goal:** roadmap item 2. Dark mode follows the system preference, with accessible contrast in both themes.
- **Size:** M, with no fix rounds. Quill wrote the contract, Iris the direction, and Probe the e2e checks first. Pixel built it, and Lens, Probe and Iris reviewed it.
- **Contract:** `.crew/sprint/2/contract.md` (C1–C8). Decisions are in `.crew/sprint/2/decisions.md`.

## What changed

- `app/globals.css`:
  - `color-scheme: light dark` is set on the base `:root`.
  - The dark `--accent` is now copper, `#eb8a64` (hue 42, 7.45:1).
  - The dark `--rule` is now verdigris, `#2d4543`, so the selection is visible.
  - A comment tells builders to add an `@source` for each new folder.
- `app/layout.tsx`: a `viewport` export with `colorScheme` and one `theme-color` per scheme. Each equals that scheme's `--background`.
- `e2e/dark-mode.spec.ts`: 14 checks for C1–C7, written by Probe before the build.
- The theme switches in CSS only. There's no toggle, no client code and no new dependency. Light is pixel-identical to main.

## Results

- CI on `2a33b48`: `check` and `scope` are green.
- `pnpm verify` passes. e2e: 29 passed, 1 skipped (the sprint 0 `test.fixme`).
- Contrast:

  | Pair | Light | Dark |
  |---|---|---|
  | Foreground | 14.53 | 15.30 |
  | Muted | 6.15 | 7.60 |
  | Accent | 6.06 | 7.45 |
  | Foreground on rule | 10.88 | 8.39 |

- axe finds 0 violations of any impact in both schemes.

## Verdicts (on 2a33b48)

- Lens: **ship**, with 0 Important findings (`review-lens.md`).
- Probe: **ship** (`verify-probe.md`).
- Iris: **changes**, 6.8/10, on owner items only (`review-iris.md`). She rates it better than production and asks for no change to this PR.

## Needs owner decision

Iris's verdict holds the merge, and both reasons are the owner's:
1. **Placeholder gate.** The rubric fails on the seed stand-ins in `content/profile.ts`: "Company name", "Previous company", "What you built, owned and improved." and the bare LinkedIn URL. They're the same on main. Either replace them or waive the gate for owner-pending content.
2. **The 7.0 bar.** Should a sprint scoped away from layout pass at "better than production, every other gate passing"? This is the second sprint at 6.8.

If the owner waives both, this PR is ready to merge as is. The proposed rubric change is in `retro.json`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01SELVBypHfrqBm4sEVeK1he
