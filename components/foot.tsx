import type { ReactNode } from "react";

// The drawing's foot below 768 px (.crew/sprint/31/contract.md, "The bar"; rest-390.webp): the bar
// holds four links there, so Read as page sits here at the left, underlined as it is in the bar, a
// 44 px target, with the sheet's motion control at the right. From 768 px the bar has room for it
// and the foot is gone, so exactly one Read as page is ever shown. It precedes the control in the
// DOM, so Tab reaches it first, as the eye does.
export function Foot({ control }: { control?: ReactNode }) {
  return (
    <div className="foot">
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
