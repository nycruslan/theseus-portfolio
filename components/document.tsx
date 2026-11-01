import type { ComponentProps, ReactNode } from "react";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { SkipLink } from "@/components/skip-link";

// The frame of a reading page (a case study, /ask, /evals): the bar and its main, inside the same
// 16 px sheet margin as /.
export function Document({
  at = "page",
  children,
}: {
  at?: ComponentProps<typeof Bar>["at"];
  children: ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <Bar at={at} className={sofiaCondensed.variable} />
      {/* tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`lg:mx-4 ${sofiaCondensed.variable}`}
      >
        {children}
      </main>
    </>
  );
}
