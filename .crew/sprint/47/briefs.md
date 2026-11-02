# Sprint 47: briefs (Atlas)

Sprint 47 builds Ka (M), the keel on `/crew`. The contract is `.crew/sprint/46/first-contract.md`
(K1 to K8 and a rider), the plan `.crew/sprint/46/plan.md`. Branch `sprint/47-keel`, from
`origin/main` at dfe9f86.

## The shared interface: `lib/keel.ts` (Forge builds it; Probe's K2 and K3 load it)

Briefed to both word for word. Loaded at run time by the spec (as P2 loads `lib/particulars.ts`),
so a missing module fails only those tests.

```ts
/** One rule as the contract writes it: plan.md's table, rows 1 to 6, in order. */
export type KeelSpec = {
  sentence: string; // the visitor's sentence
  enforcer: string; // the contract's enforcer label, exact
  path: string; // repository-relative source path, e.g. ".github/CODEOWNERS"
  quote: string; // the contract's quote, exact, backticks included
};

/** A rule whose quote was found in its source. */
export type KeelRule = KeelSpec & {
  n: number; // 1 to 6, the rule's place in KEEL; li[data-rule] carries it, and a dropped rule leaves a gap
  start: number; // 1-based line the quote starts on
  end: number; // 1-based line it ends on
  href: string; // https://github.com/nycruslan/theseus-portfolio/blob/<ref>/<path>#L<start>[-L<end>]
  text: string; // the quote without its backticks, as the blockquote reads
};

export const KEEL: readonly KeelSpec[];

/** The contract's matching rule: where `quote` sits in `file`, or null. */
export function quoteLines(file: string, quote: string): { start: number; end: number } | null;

/** The rules whose source holds its quote, in KEEL's order. A source missing from `sources` (or
 * undefined) drops its rules; none found gives []. */
export function keelRules(
  sources: Readonly<Record<string, string | undefined>>,
  ref: string,
): KeelRule[];
```

The section renders nothing when `keelRules` gives `[]`.

## Iris (`iris`): the placement, the quote's type, binds versus guidance

For: the hiring executive who wonders whether the crew is governed. Decide, against the running
`/crew` and the kept checks' viewports (`first-contract.md`, "Kept checks"), placement (a), (b) or
(c) from `plan.md`'s Ka section, the quotes' type (the site has no code face yet), and how "binds"
and "guidance" differ to the eye. Nothing copper. The data rules in the contract hold whatever you
pick. Write your call to `.crew/sprint/47/placement.md`: where it sits at each kept viewport, the
type (tokens that exist in `app/globals.css`), the treatment of the two kinds of rule, and anything
Forge must measure. You may tighten the six sentences without changing what they claim. Report the
call in a few lines; you'll look at Forge's running build after.

## Probe (`probe`): K1 to K8 red, and the rider

Write `e2e/keel.spec.ts` from `first-contract.md`, red on main, using the interface above for K2
and K3. K7 records main's boxes (name the commit, dfe9f86). K6 and K7's placement-dependent parts
wait for Iris's `placement.md` only where the contract leaves the placement open; write the rest
now. K8 is Forge's proof in the PR and Lens's read, not a spec. Then the rider: W5's and W7's
down-state reads skip under `PLAYWRIGHT_BASE_URL`, with the reason in a comment. Commit in your
worktree and report the commits, which tests are red and why, and the spec's run time.

## Forge (`forge`): the keel

Build `lib/keel.ts` to the interface, the quotes fixed at build (`plan.md`, "A build constraint";
prove the mechanism on a scratch build first, extension-less `CODEOWNERS` included), and the
server-rendered section on `/crew` after the panel. Iris's placement and type come in
`placement.md`; start with the library and the mechanism, which don't depend on it. Prove K8 as the
contract says and keep the commands and output for the PR. Report 0 B of new script on `/crew` and
`/` (bytes before and after), the LCP element at 1440 × 900 and 390 × 664, and Probe's
`keel.spec.ts` and the kept `/crew` specs' results once his commits land. Don't edit `e2e/`.
