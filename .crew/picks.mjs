// The owner's picks: the questions the team asks the owner in a PR's body (the sprint skill's
// "Owner's pick"), each a heading with task-list options the owner ticks on GitHub, one marked
// "(Recommended)". The team goes ahead with the recommended option; a tick on another tells the next
// run to switch. A pick marked "(waits)" holds its PR for the owner's answer, and an "Applied:" line
// under a pick says the team acted on it. The sprint pre-flight reads them (next-sprint.mjs).

const PICK =
  /^#{2,4}\s+Owner's pick(?<waits>\s*\(waits\))?\s*:?\s*(?<question>.*)$/iu;
const OPTION = /^\s*[-*]\s+\[(?<mark>[ xX])\]\s+(?<text>.+?)\s*$/u;
const HEADING = /^#{1,6}\s/u;
const APPLIED = /^\s*Applied:/iu;

/**
 * The questions a PR's body asks the owner: each "Owner's pick" heading, with the task-list options
 * under it, which the owner ticks on GitHub. A pick marked "(waits)" holds its PR until the owner
 * answers; one with an "Applied:" line is done.
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
        applied: false,
        options: [],
      };
      picks.push(pick);
    } else if (HEADING.test(line)) {
      pick = undefined;
    } else if (pick && APPLIED.test(line)) {
      pick.applied = true;
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
