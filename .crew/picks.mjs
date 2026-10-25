// The owner's picks: the questions the team asks the owner in a PR's body (the sprint skill's
// "Owner's pick"), each a heading with task-list options the owner ticks on GitHub, one marked
// "(Recommended)". The team goes ahead with the recommended option; a tick on another tells the next
// run to switch. A pick marked "(waits)" holds its PR for the owner's answer, and an "Applied:" line
// under a pick names the option the team built, the last one counting, so the owner can still
// change their mind. The sprint pre-flight reads them (next-sprint.mjs).

const PICK =
  /^#{2,4}\s+Owner's pick(?<waits>\s*\(waits\))?\s*:?\s*(?<question>.*)$/iu;
const OPTION = /^\s*[-*]\s+\[(?<mark>[ xX])\]\s+(?<text>.+?)\s*$/u;
const HEADING = /^#{1,6}\s/u;
const APPLIED = /^\s*Applied:\s*(?<choice>.+?)(?:,\s*in\s+#\d+)?\.?\s*$/iu;

/**
 * The questions a PR's body asks the owner: each "Owner's pick" heading, with the task-list options
 * under it, which the owner ticks on GitHub. A pick marked "(waits)" holds its PR until the owner
 * answers; `applied` is the option its last "Applied:" line names, or null.
 */
export function ownerPicks(body) {
  const picks = [];
  let pick;
  for (const line of (body ?? "").split(/\r?\n/u)) {
    const heading = line.match(PICK);
    if (heading) {
      pick = {
        question: heading.groups.question.trim(),
        waits: Boolean(heading.groups.waits),
        applied: null,
        options: [],
      };
      picks.push(pick);
    } else if (HEADING.test(line)) {
      pick = undefined;
    } else if (pick && APPLIED.test(line)) {
      pick.applied = line.match(APPLIED).groups.choice;
    } else if (pick) {
      const option = line.match(OPTION);
      if (option) {
        pick.options.push({
          text: option.groups.text,
          ticked: option.groups.mark !== " ",
          recommended: /\(recommended\)/iu.test(option.groups.text),
        });
      }
    }
  }
  return picks;
}

/**
 * What the owner ticked that the team hasn't built: empty when nothing is ticked or the built
 * option is among the ticks. The built one is the last applied, or else the recommended one, which
 * the team builds without waiting; a pick that waits has none until it's applied.
 */
export function unbuilt({ waits, applied, options }) {
  const ticked = options
    .filter((option) => option.ticked)
    .map((option) => option.text);
  const built =
    applied ??
    (waits ? null : options.find((option) => option.recommended)?.text);
  return built && ticked.some((text) => plain(text) === plain(built))
    ? []
    : ticked;
}

// An "Applied:" line names the option in the team's words: compare without "(Recommended)", case
// or a closing full stop.
const plain = (text) =>
  text
    .replace(/\(recommended\)/iu, "")
    .replace(/[.\s]+$/u, "")
    .trim()
    .toLowerCase();
