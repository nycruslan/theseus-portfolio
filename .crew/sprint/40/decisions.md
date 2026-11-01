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
