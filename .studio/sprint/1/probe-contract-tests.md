# Probe: contract tests for sprint 1 (design tokens)

File: `e2e/tokens.spec.ts`. One test per numbered check, titled with its number, plus three
scope guards after check 6. Run before any product change, so they fail for the right reasons.

| Test | Today | Why |
| --- | --- | --- |
| 1 palette tokens exist and are capped | fails | 2 `--color-*` in `@theme` (need 4 to 8, with muted and accent roles) |
| 2 fluid type scale exists and is capped | fails | no `--text-*` tokens |
| 3 page uses the tokens, no leftovers | fails | `text-4xl`, `text-xl`, `text-sm`, `text-foreground/60`, `/80`, `/70` in `app/page.tsx` and `components/section.tsx` |
| 4 heading hierarchy scales | fails | h1 is 36 px at 390 and at 1440 (needs strictly larger at 1440) |
| 5 light-only, dark block gone | fails | `prefers-color-scheme` present, no `color-scheme: light`, body colors differ when dark is emulated |
| 6 reflows at 320 px | passes | regression guard: the seed already fits at 320. It must stay green once the type goes fluid |
| scope: contrast 7:1 / 4.5:1 | fails | no muted or accent token yet |
| scope: fonts via next/font, at most 2 families | passes | guard: seed has Geist and Geist Mono |
| scope: no motion added | passes | guard: seed has none |

Check 5's axe half is not duplicated: the existing light and dark axe tests in
`e2e/smoke.spec.ts` are the proof and must stay green.

## Choices the builders should know (the contract left them open)

- Token names are pinned: `--color-background`, `--color-foreground`, a `--color-muted*` and a
  `--color-accent*` (or `--color-link*`). The contrast test finds the muted and accent tokens by
  those names.
- `--text-*` names must not collide with Tailwind's stock steps (`xs`, `sm`, `base`, `lg`, `xl`,
  `2xl`...): check 3 bans those utilities, so a token named `--text-lg` could not be used.
  Companions like `--text-body--line-height` are not counted as steps.
- Check 3 also bans stock palette colors (`text-zinc-500`, `bg-white`) and arbitrary font sizes
  (`text-[18px]`), since the goal says every color and size comes from the tokens.
- Check 4's "body paragraph" is the bio, each experience summary and each project description
  (found by their text). The muted location and period lines are not body paragraphs.
- Check 6 treats the h1 as fully visible when its text range sits inside the viewport and the h1
  is not clipped by its own box.

## Validation of the tests themselves

The tests were also run against a throwaway reference implementation (an oklch palette, five
clamp steps, `color-scheme: light`, the class edits) in a scratch worktree, with the file checks
reading that worktree and the browser checks hitting a static page built from its CSS. All nine
passed there. A deliberately bad variant (fixed h1 size, wide letter-spacing, light muted color)
made 4, 6 and the contrast test fail, so they can go red for the right reason.

## Environment note

This sandbox has Chromium 1194 but Playwright 1.64 wants 1248, and the CDN is blocked. The runs
used a wrapper under the scratchpad (`PLAYWRIGHT_BROWSERS_PATH`) that execs the 1194 headless
shell. CI is unaffected.
