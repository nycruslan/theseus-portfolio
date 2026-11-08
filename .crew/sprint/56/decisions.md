# Sprint 56 decisions (Atlas)

1. **M, Yd, as the plan staffs it:** Pixel leads the 3D (the paced flight and the riffle's look),
   Forge builds the controller's page side (holds, keys, stops, the hand-off link, the riders), Probe
   writes Y20 to Y24 red first with a contract mutant, and Iris calls the pace curve and judges the
   running build. The contract is Atlas's: the plan and Iris's direction already made the product
   calls.
2. **Yc took Y19** (the numbers' dark contrast), so Yd's checks are Y20 to Y24 and Ye's move to Y25
   to Y27.
3. **Home and End act only with focus on a step link.** Iris's direction has them go to the first and
   newest steps; taken page-wide, they would stop scrolling the Log for a keyboard visitor reading the
   revision table, the page's longest part. ← and → stay page-wide, as Yc built them, since the page
   never scrolls sideways.
4. **Backward stops mirror forward ones:** 45, 23 and the first step. The plan names the forward
   chapters only; a riffle back from the newest that ran past 45 and 23 would skip both payoffs.
5. **The hand-off link is server HTML** on `/log` and the newest record, so it is there in Off and
   with no script, and a press reaches it by Yc's swap of the server's words, with no new client
   markup.
6. **Iris's riffle calls are built as written** (`riffle-iris.md`): the pace gap(k) =
   max(80, round(400 × 0.725^(k−1))); a chapter step plays Yc's whole press; during a riffle only
   the Theseus caption and count follow, and the record, URL, title and live region change once, at
   the stop or release (stricter than contract point 5, which allowed more). Her five additions are
   accepted, the touch one with a reading of Y20: under touch, "steps once at once" means at a tap's
   release or once the finger has held still 400 ms, never at pointerdown, since a scroll that
   starts on a step link must not step the yard.
7. **The contract mutant's kept reds, named before the build** (Probe). The mutant: on a scratch
   build of 3f578f9, the hand-off link as server HTML on `/log` (in `.log-start`, after Start
   again) and in the newest record, and a bare hold in `yard.ts` (a pointer or key hold riffling
   at a ratio pace with the chapter stops, Escape, Home and End, a cancelled contextmenu, and touch
   per Iris's addition 1). The kept suite that could see it (every `e2e/log*.spec.ts`, keel-ways,
   keyboard, one-site, plain-words, read, sheet, crew-model-off, invariants, content, crew-bar and
   not-found: 219 tests) found two reds by design, both the new link, rewritten for Lens to accept:
   - **B5.25** (`e2e/log-control.spec.ts`), `/log`'s Tab order: the hand-off is a new stop right
     after Start again, before the key's `/crew#keel` (Iris's placement). Rewrite: the expected
     order gains `/crew` there, and the title says so. No stop is dropped.
   - **B5.6** (`e2e/log-record.spec.ts`), each record's links: on the newest record the list
     gains `/crew`, named "Watch the crew build the next one on Crew". Rewrite: where there is no
     Next, the wanted links hold the hand-off, with its count of 1 and its name checked as the
     record's other links are.
   - Not a kept red: Y7's overflow on the newest `/log/55` at 320, 390 and 1024 (16 to 48 px) came
     from the mutant putting the link in Next's slot, which Iris rules out because it doesn't fit
     (`riffle-iris.md`, section 4). Y7 stays unedited, and holds the build to her placement.
   - Not kept reds either: Y13, Y14, Y15 and Y17 went red because the bare hold landed every press
     on its release, so a quick click never flew. Iris's rule is that a release lands the plank
     only in a riffle, and a quick press plays Yc's flight. On a corrected mutant (that rule, and
     the link on its own row under the head, as Iris places it) log-press, log-yard, log-control,
     log-record, log-model, log-pick and log-riffle ran 64 of 64 green, Y7 and the two rewrites
     among them: no further kept red.
   - The words are one constant, `YARD_WORDS.handOff` in `e2e/log.ts`, which Y22 reads too.
