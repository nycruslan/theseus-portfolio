# Sprint 40 decisions (Atlas)

1. **The sprint is Pb, from the roadmap.** The pre-flight said start, nothing open, no goal from the
   owner, 5 of 6 daily merges used.
2. **Atlas wrote the contract, not Quill.** Quill's plan (`.crew/sprint/38/plan.md`, Pb) already
   fixed the outcome and P8 to P13; what was left was the words and the markup, which are a lead's
   call and the owner may overrule after the merge.
3. **The key names the owner by first name** ("agents Ruslan directs", "Ruslan's rules"), from
   `profile.name`, where `/log` said "the owner's". A stranger doesn't know who "the owner" is;
   the name is already the page's `h1`. The meaning of Gate and Owner is `/log`'s, unchanged.
4. **`/crew`'s label lives in the job cell as `<word>, AI agent`.** The crew oracles read the job
   cell as the word, so any visible label in the row changes a pinned cell; the job cell is the
   least surprising place, and "Forge. Code, AI agent. Working." reads in order to a screen reader.
   The oracles' expected word changes with it, named in the PR.
5. **The long `expire` rider is dropped** (contract, "Out of scope"): `readCrew` serves `/` too, and
   the build's page no longer claims a state.
6. **P13 takes the 2D half of Iris's chip note only.** The 3D label's half is Pixel's and touches
   the hull the owner's demos judge.
7. **The key's hook is `p[data-crew-key]`, not `p[data-key]`** (Forge found it): `data-key` is
   already the live layer's legend hook, and B4.18 and B4.20 count it on any tag. Renaming the new
   attribute keeps both checks unedited, where narrowing their selectors would edit kept checks.
8. **The key is one line, and shorter** (Forge measured the first wording): two lines at the
   caption's 13 px put the contact links 3.7 px past the fold at 1440 × 900 in the resting state,
   and tighter leading left 5.6 px, too thin for the next rest line or legend change. One line,
   "Every name is an AI agent Ruslan directs. Approved: Gate is CI, his rules and Lens's review;
   Owner is his own call." (115 characters), leaves about 20 px. Drawn, Checked and Tested lose
   their glosses: with "AI agent" said, the column heads read as plain English, and Gate and Owner
   were the words a stranger couldn't read.
9. **The key shows at 1440 and up and below 1024, not between** (Forge measured two kept checks
   red): at 1024 the block's measure is 516.8 px, the key wraps to two lines, and B4.22's resting
   contact links drop to 807.1 px against the 768 fold (main: 758.1); at 1280 × 800, B4.49
   (`crew-replay-home.spec.ts`) has them at 829.1 against 800 (main: 799.6), 825.1 even with
   Iris's 4 px tuck. Nothing fits under the table between 1024 and 1439 whatever the words, so
   there the key stays in the HTML, hidden, the same range where `/crew`'s job column now folds
   (Iris's should 1), and the caption still says a team of AI agents builds the site. B4.22 and
   B4.49 stay unedited. An earlier version of this line said 1280 × 800 had no check; it has.
