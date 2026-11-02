// The keel on /crew (.crew/sprint/46/first-contract.md): the six rules the crew builds under, each
// quoted from the file that states it and linked to that line on GitHub. This module only matches;
// the sources are read into the build by components/keel.tsx, since /crew regenerates on servers
// whose files don't include them (.crew/sprint/46/plan.md, "A build constraint"). Probe's checks
// load it at run time in Playwright, which doesn't map `@/`, so it imports nothing.

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

// Spelled out rather than taken from lib/site.ts's REPO_URL: a spec loads this file without `@/`.
const BLOB = "https://github.com/nycruslan/theseus-portfolio/blob";

// The sentences are Iris's (.crew/sprint/47/placement.md): 5 and 6 tightened from the plan's
// drafts, claiming the same.
export const KEEL: readonly KeelSpec[] = [
  {
    sentence:
      "Nothing merges until three checks pass: the tests, the gate and Lens's review.",
    enforcer: "Enforced by GitHub: the protect-main ruleset",
    path: "CLAUDE.md",
    quote:
      "GitHub decides what merges: the `protect-main` ruleset requires `check` (CI), `gate` (the owner's paths and decisions) and `lens`.",
  },
  {
    sentence:
      "A change to the crew's own rules, or to how its work is judged, waits for Ruslan's approval.",
    enforcer: "Enforced by the gate check",
    path: ".github/CODEOWNERS",
    quote:
      "The owner's paths: a PR that touches one waits for @nycruslan to approve its head.",
  },
  {
    sentence: "Ruslan's facts are his: the crew drafts, he approves.",
    enforcer: "Enforced by the gate check",
    path: ".github/CODEOWNERS",
    quote:
      "The owner's facts; drafts are the team's, for the owner to approve.",
  },
  {
    sentence:
      "No test is weakened to get a pass unless Lens accepts the reason.",
    enforcer: "Enforced by Lens's review",
    path: ".crew/scope.mjs",
    quote:
      "Lens accepts each one only when the PR names it and why the behaviour it checked is gone.",
  },
  {
    sentence: "The agents who build don't edit the tests they're judged by.",
    enforcer:
      "Guidance only: a hook in each session, which a shell command can get around",
    path: ".crew/guard.mjs",
    quote: "builders can't rewrite the checks their work is judged by",
  },
  {
    sentence:
      "Every session acts on GitHub as Ruslan, so a pull request that passed on his approval is left for him to merge by hand.",
    enforcer: "Guidance only: the crew's own merge script",
    path: ".crew/gate.mjs",
    quote:
      "Sessions reach GitHub as the owner, so they could post that approval too: merge.mjs leaves such a PR for the owner to merge by hand.",
  },
];

/** A line's words as the matching rule reads them: its indent and one comment marker gone. */
const MARKER = /^(?:#|\/\/|\*) */;
const SPACES = /\s+/g;

const words = (line: string) =>
  line.trimStart().replace(MARKER, "").replace(SPACES, " ").trim();

/**
 * The contract's matching rule: the file's lines, each stripped of its indent and one leading `#`,
 * `//` or `*` with the spaces after it, joined by single spaces with every run of whitespace
 * collapsed to one. The quote is found in that text, and its first and last characters map back
 * to the lines they came from. A line with no words adds only a space, which collapses into the
 * join, so it is skipped.
 */
export function quoteLines(
  file: string,
  quote: string,
): { start: number; end: number } | null {
  const wanted = quote.replace(SPACES, " ").trim();
  if (wanted === "") return null;
  let text = "";
  const starts: number[] = []; // each kept line's first offset in `text`
  const lines: number[] = []; // its 1-based line number
  for (const [index, line] of file.split(/\r?\n/).entries()) {
    const kept = words(line);
    if (kept === "") continue;
    if (text !== "") text += " ";
    starts.push(text.length);
    lines.push(index + 1);
    text += kept;
  }
  const at = text.indexOf(wanted);
  if (at === -1) return null;
  // The kept line an offset falls in: the last to start at or before it.
  const lineAt = (offset: number) =>
    lines[starts.findLastIndex((start) => start <= offset)] ?? 1;
  return { start: lineAt(at), end: lineAt(at + wanted.length - 1) };
}

/** The rules whose source holds its quote, in KEEL's order. A source missing from `sources` (or
 * undefined) drops its rules; none found gives []. */
export function keelRules(
  sources: Readonly<Record<string, string | undefined>>,
  ref: string,
): KeelRule[] {
  return KEEL.flatMap((spec, index) => {
    const file = sources[spec.path];
    if (file === undefined) return [];
    const found = quoteLines(file, spec.quote);
    if (found === null) return [];
    const { start, end } = found;
    const lines = end === start ? `L${start}` : `L${start}-L${end}`;
    return [
      {
        ...spec,
        n: index + 1,
        start,
        end,
        href: `${BLOB}/${ref}/${spec.path}#${lines}`,
        text: spec.quote.replaceAll("`", ""),
      },
    ];
  });
}
