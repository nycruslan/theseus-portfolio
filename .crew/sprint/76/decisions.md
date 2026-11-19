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
4. **B5.7's red is a real defect, fixed in this sprint** (Atlas, fix round 1). The close-out's row
   made `/log/67` B5.7's tenth row, and its heading opened at 782.9 to 877.4 under a phone's
   844 px fold. That was already true on production for 13 of the 75 records (chapter steps, the
   newest step, and four-line goals). Below 1024 a record page now puts the Log's lines figure
   after the record (`.log-open .log-lines { order: 9 }`). Every record's h2 opens in view at
   390 × 844 (0 of 75 out of view, against 13), and nothing moves at 1440. B5.7 stays unedited.
   The visible reorder on phones and tablets is Iris's call, asked as advice.
5. **Iris on the reorder: the figure belongs after the record** (Verdict: changes, 7.8/10). Below
   1024 it already introduces Every revision on `/log`. Her one change, made in fix round 2: on a
   record below 1024 the figure drops its 1 px rule, which had doubled the record box's edge 16 px
   above, and sits 24 px under the box. Lens's two comment nits rode along: the order comment
   names the figure's move, and `.log-revs` is `order: 10`, so DOM order no longer breaks a tie.
