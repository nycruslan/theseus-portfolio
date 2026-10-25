// The owner's picks: the questions the team asks the owner in a PR's body (the sprint skill's
// "Owner's pick"), each a heading with task-list options the owner ticks on GitHub, one marked
// "(Recommended)". The team goes ahead with the recommended option; a tick on another tells the next
// run to switch. A pick marked "(waits)" holds its PR for the owner's answer, and an "Applied:" line
// under a pick names the option the team built, the last one counting, so the owner can still
// change their mind. The sprint pre-flight reads them (next-sprint.mjs), merge.mjs holds a PR whose
// waiting pick isn't applied, and open-pr.mjs keeps the answers when it rewrites a body.

const PICK =
  /^#{2,4}\s+Owner['’]s pick(?<before>\s*\(waits\))?\s*:?\s*(?<after>\(waits\)\s*)?(?<question>.*)$/iu;
const OPTION = /^\s*[-*]\s+\[(?<mark>[ xX])\]\s+(?<text>.+?)\s*$/u;
const HEADING = /^#{1,6}\s/u;
const FENCE = /^\s*(```|~~~)/u;
// "Applied: B, in #41.", give or take a list marker, bold, or more PRs after the first.
const APPLIED =
  /^\s*(?:[-*]\s+)?[*_]*Applied(?::[*_]*|[*_]*:)\s*(?<choice>.+?)(?:,?\s+in\s+#\d+.*?)?\.?\s*$/iu;

/**
 * The questions a PR's body asks the owner: each "Owner's pick" heading, with the task-list options
 * under it, which the owner ticks on GitHub. A pick marked "(waits)" holds its PR until the owner
 * answers; `applied` is the option its last "Applied:" line names, or null.
 */
export function ownerPicks(body) {
  return scan(body).map(({ question, waits, applied, options }) => ({
    question,
    waits,
    applied,
    options,
  }));
}

/**
 * What the owner ticked besides the option the team built: the built one is the last applied, or
 * else the recommended one, which the team builds without waiting; a pick that waits has none until
 * it's applied. Applying an answer leaves only its box ticked, so any other tick is a new answer.
 */
export function unbuilt({ waits, applied, options }) {
  const built =
    applied ??
    (waits ? null : options.find((option) => option.recommended)?.text);
  return options
    .filter(
      (option) =>
        option.ticked && !(built && plain(option.text) === plain(built)),
    )
    .map((option) => option.text);
}

/**
 * `body` with each pick the live body also asks taken from the live body, ticks and "Applied:"
 * lines included: rewriting a PR's body from its file must not erase the owner's answers.
 */
export function keepAnswers(body, live) {
  const liveLines = (live ?? "").split(/\r?\n/u);
  const answered = new Map(
    scan(live).map((pick) => [
      plain(pick.question),
      liveLines.slice(pick.start, pick.end + 1),
    ]),
  );
  const lines = body.split(/\r?\n/u);
  const kept = [];
  let next = 0;
  for (const pick of scan(body)) {
    const block = answered.get(plain(pick.question));
    if (!block) continue;
    kept.push(...lines.slice(next, pick.start), ...block);
    next = pick.end + 1;
  }
  kept.push(...lines.slice(next));
  return kept.join("\n");
}

// Each pick with the lines it spans. Its options are one list right under the heading, after any
// prose; "Applied:" lines and blank lines may follow them, and anything else ends the pick, so a
// checklist further down never reads as its options. Fenced code is never a pick.
function scan(body) {
  const picks = [];
  let pick;
  let listed = false;
  let fenced = false;
  (body ?? "").split(/\r?\n/u).forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      pick = undefined;
      return;
    }
    if (fenced) return;
    const heading = line.match(PICK);
    if (heading) {
      const { before, after, question } = heading.groups;
      pick = {
        question: question.trim(),
        waits: Boolean(before || after),
        applied: null,
        options: [],
        start: index,
        end: index,
      };
      picks.push(pick);
      listed = false;
      return;
    }
    if (!pick) return;
    if (HEADING.test(line)) {
      pick = undefined;
      return;
    }
    const option = line.match(OPTION);
    const applied = !option && line.match(APPLIED);
    if (option && !listed) {
      pick.options.push({
        text: option.groups.text,
        ticked: option.groups.mark !== " ",
        recommended: /\(recommended\)/iu.test(option.groups.text),
      });
      pick.end = index;
    } else if (applied) {
      pick.applied = applied.groups.choice;
      pick.end = index;
      listed = pick.options.length > 0;
    } else if (line.trim() === "") {
      listed = pick.options.length > 0;
    } else if (pick.options.length) {
      pick = undefined;
    }
  });
  return picks;
}

// An option in the team's words: without "(Recommended)", markdown, case or a closing full stop.
const plain = (text) =>
  text
    .replace(/\(recommended\)/giu, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/[*_`]/gu, "")
    .replace(/\s+/gu, " ")
    .replace(/[.\s]+$/u, "")
    .trim()
    .toLowerCase();
