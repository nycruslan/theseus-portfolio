import type { Metadata } from "next";
import { Sheet } from "@/components/sheet";
import { readSprintLog } from "@/lib/sprint-log";

// The frame's address (.crew/sprint/63/decisions.md, 2): / as the site builds it, in the feed's
// down state, for the trials page to frame at any window. The frame's size is the iframe's box, so
// one address serves every window. It keeps /'s title and description; it isn't a page of its own,
// so search engines skip it and credit /. Only this path may be framed, and only by the site
// (next.config.ts). It is framed sandboxed and inert, so none of /'s scripts runs in it.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: false },
};

export default function Frame() {
  return (
    <>
      {/* The window never scrolls and draws no scrollbar, so its document is exactly the window's
        width: a scrollbar would lay / out narrower than the window it claims (plan.md, risk 6). */}
      <style>{"html{overflow:hidden}"}</style>
      <Sheet entries={readSprintLog()} layer={{ state: "down" }} />
    </>
  );
}
