# Sprint 76 decisions

1. **T36 allows `/`'s JSON-LD block** (Atlas, on Probe's ask). The contract said the frame's
   document has "no `<script>` element"; `/`'s `<script type="application/ld+json">` sits inside
   `main`, which kept T2 requires to equal `/`'s character for character. It's data the sandbox
   never refuses, so T36 counts every script but that one. T2 stays unedited.
