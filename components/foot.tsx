import type { ReactNode } from "react";

// The drawing's foot below 768 px (.crew/sprint/31/contract.md, "The bar"; rest-390.webp): the bar
// holds four links there, so Read as page sits here at the left, underlined as it is in the bar, a
// 44 px target, with the page's motion control, where it has one, at the right. From 768 px the bar
// has room for both and the foot is gone, so exactly one Read as page and one control are ever
// shown. Read as page precedes the control in the DOM, so Tab reaches it first, as the eye does.
// The sheet has both at the drawing's foot; /crew, Read as page alone there (no model until B4d);
// the Log and its records, both at the header's end (components/log.tsx; .crew/sprint/33/).
export function Foot({ control }: { control?: ReactNode }) {
  return (
    <div data-foot="" className="foot">
      <a
        href="/read"
        className="flex items-center text-step-base whitespace-nowrap font-semibold text-foreground underline decoration-1 underline-offset-[6px] hover:decoration-2 max-[359px]:text-step-sm"
      >
        Read as page
      </a>
      {control}
    </div>
  );
}
