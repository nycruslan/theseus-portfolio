import { REPO_URL } from "@/lib/site";
import type { SprintEntry } from "@/lib/sprint-log";

const SIZE_WORDS = {
  S: "Small sprint",
  M: "Medium sprint",
  L: "Large sprint",
} as const;

const LINK_CLASSES =
  "inline-block text-accent underline underline-offset-4 hover:text-foreground";

// One sprint of the build log, shaped like an Experience entry: the goal, a muted line under it,
// then what went wrong, in full. See .crew/sprint/12/direction-iris.md, section 3.
export function SprintItem({ entry }: { entry: SprintEntry }) {
  const meta = [
    entry.size ? SIZE_WORDS[entry.size] : undefined,
    entry.ownersCall ? "Owner's call" : undefined,
    entry.pr ? (
      <a
        key="pr"
        href={`${REPO_URL}/pull/${entry.pr}`}
        className={LINK_CLASSES}
      >
        Pull request #{entry.pr}
      </a>
    ) : undefined,
  ].filter((part) => part !== undefined);

  // Two items can carry the same text, so a key also counts the earlier ones that equal it.
  const items = entry.wentWrong.map((text, at) => ({
    text,
    nth: entry.wentWrong.slice(0, at).filter((other) => other === text).length,
  }));

  return (
    <li className="border-t border-rule pt-6">
      <h3 className="relative text-balance break-words text-step-lg font-medium">
        {/* Inline before the goal on a phone; from md it hangs in the gutter, 16px left of the goal,
        so the numbers right-align. */}
        <span className="tabular-nums text-muted md:absolute md:top-0 md:right-full md:mr-4">
          <span className="sr-only">Sprint </span>
          {entry.sprint}
        </span>
        {/* A real space, not a margin: the heading's text and accessible name must read
        "Sprint 11 Goal". From md the number is out of the flow and this space collapses. */}{" "}
        {entry.goal}
      </h3>
      {meta.length > 0 ? (
        <p className="text-step-sm leading-6 text-muted">
          {meta.map((part, index) => (
            <span key={typeof part === "string" ? part : "pr"}>
              {/* A no-break space keeps each dot on the line of the item before it. The dot has its
              own margin so the next link's focus ring (4px out) clears it. */}
              {index > 0 ? (
                <>
                  {"\u00a0"}
                  <span className="mx-1">·</span>{" "}
                </>
              ) : null}
              {part}
            </span>
          ))}
        </p>
      ) : null}
      {entry.wentWrong.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-step-sm font-medium text-muted">
            What went wrong
          </h4>
          <ul className="mt-1 flex flex-col gap-2">
            {items.map(({ text, nth }) => (
              <li
                key={`${nth}-${text}`}
                className="relative text-pretty break-words text-step-base before:absolute before:-left-3 before:top-[calc(0.5lh-1.5px)] before:size-[3px] before:rounded-full before:bg-muted forced-colors:before:bg-[CanvasText] before:content-['']"
              >
                {text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
