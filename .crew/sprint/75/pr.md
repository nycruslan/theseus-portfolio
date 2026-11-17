## Sprint 75 (S): Next.js past its security advisory

**Goal** (the roadmap's stand-down rule, and sprints 73 and 74's Forge follow-up): production runs
Next.js 16.4.3, inside a moderate advisory (GHSA-mfr8-8qww-v76h, information disclosure across root
params, vulnerable 16.3.0 to 16.4.4, patched from 16.4.5), and its build notice stopped `pnpm build`
about half the time in sprint 74. Move `next` to 16.4.6, the latest 16.4 patch (published
2026-11-09, past the one-day release-age rule), with the site unchanged.

**Size:** S. One builder (Forge); the existing suite stays green. No contract.

### Checks and evidence

To be filled by the build.

### Retired checks

None.

### Not verified

To be filled.
