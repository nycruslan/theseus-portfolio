# Sprint 76 decisions

1. **T36 allows `/`'s JSON-LD block** (Atlas, on Probe's ask). The contract said the frame's
   document has "no `<script>` element"; `/`'s `<script type="application/ld+json">` sits inside
   `main`, which kept T2 requires to equal `/`'s character for character. It's data the sandbox
   never refuses, so T36 counts every script but that one. T2 stays unedited.

2. **The frame moves to the Pages Router** (Forge proposed, Atlas approved). Next 16.4.6 puts its
   runtime (bootstrap chunks and the inline RSC flight) into every App Router page, with no
   per-route opt-out. A route handler can't render the sheet, since it runs under `react-server`,
   where `react-dom/server` throws. Stripping the scripts per request would make the frame dynamic.
   So `pages/trials/frame.tsx` is static (`getStaticProps`) with `unstable_runtimeJS: false`. The
   flag is undocumented, and T36 is what goes red if a Next upgrade drops it.
3. **Side effects on the App Router, accepted as inert** (Atlas). Forge diffed a base build against
   the head file by file. A framework chunk is renamed, with code identical once ids are normalised.
   The text face's hashed class and its stylesheet's name change once, because the single
   `Sofia_Sans` call moved to `app/document.ts` (B1.10 wants one). The window pages' RSC no longer
   lists `frame` as a sibling. The static `500.html` is now the Pages Router's default `_error`
   instead of the App Router's built-in: both are unstyled Next defaults, shown only on a server
   fault. Apart from these, 960 App Router files are identical.
