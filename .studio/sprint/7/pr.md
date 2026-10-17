## Goal

Roadmap item "A subtle 3D hero element that degrades gracefully on low-end devices", the only unticked item, chosen from the roadmap. It is L, so this sprint ships the L lane's first step only: Iris's direction and Quill's contract, for the owner to accept by merging. **No product code changes.** Pixel builds Part A next sprint against the merged contract.

**Size:** L (contract step) · Iris direction · Quill contract · Lens in CI.

## What's in it

- `.studio/sprint/7/direction-iris.md`: a shipwright's lift half-model, seven planks with one copper plank (the freshly fitted part), hung right after the header, matte, in the five tokens, moving only on scroll. An inline SVG every visitor gets; WebGL as an upgrade loaded after idle. Rejected: glossy blob, particle globe, turntable ship, full-bleed canvas behind the name.
- `.studio/sprint/7/contract.md`: two M parts. **Part A** (static inline SVG, no client JS, no dependency), checks C1–C9. **Part B** (WebGL upgrade), draft checks C10–C16. It binds to every existing spec with no test edited (the hero is a `div`, `aria-hidden`, no tabindex, tones through `color-mix(in oklab, …)` only, ids prefixed `hero-`).
- Iris's board (`direction-iris.png`, not in git) shows a prototype SVG hull injected into a local build of main at 320/390/1024/1440 in both schemes. The silhouette is a stand-in.

## Review

Lens said changes on 96f0b2a, f96f53f and 2355550. Rounds 1 and 2 fixed C3 (bow tip at every width), C14 (WebGL chunk found by comparison), C9 (`main`'s tabindex -1) and C10 (chunk after load). Lens's third review raised a new important finding in Part B (C10's proximity test passes at load) plus nits. The fix-round cap was spent, so I cut scope (decisions.md #4, "Contract change" in the contract): **Part A is the contract, and Part B is a draft** that its own sprint rewrites after Probe's WebGL spike, carrying Lens's open findings. I also took Lens's C7 nits into Part A. `lens` stays red, and `gate` is red because of `needs-owner`. `check` is green.

## Needs owner decision

By merging, the owner accepts:
1. **The symbol:** the half-model with one copper plank, after the header. It is new visual language. If you want it bolder, Iris's next step is a hull running in from the left edge, not glow or spin.
2. **The split:** Part A binding now, and Part B drafted, to be re-contracted after a spike. You can also call A enough and drop B.
3. **The 15 KB gzip budget** for Part B, which rules out three.js.
4. **Quill's two calls:** darkening the dark top face below 3:1 rather than exempting it, and capping the hero at 172 px tall below 768. Also the 390–768 width ramp, which Iris hasn't reviewed.
5. **Merging with `lens` red:** its open finding is in the Part B draft, which is listed in the contract and not accepted by this merge.

## Not verified

Nothing was built. The contrast figures are Iris's prototype measurements. Whether the CI browser grants a WebGL context at all is unknown (Part B's spike). Phone LCP under throttling was not measured.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Cp6bdDoKQ5MhmP4eChx4H5
