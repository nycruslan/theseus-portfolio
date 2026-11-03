// The guard on /log's Approved column (.crew/sprint/49/first-contract.md, R4), which
// merge-record.mjs runs over every merged sprint. A squash that touched an owner path waited at
// `gate` for the owner's approval, so its retro must read as the owner's call, or /log, /log/<n>
// and the keel's line count it as Gate (sprint 36, #91, did until sprint 50). Pure, so
// owners-call.test.mjs beside it checks it without git: `node --test .crew/sprint/32/*.test.mjs`.

/**
 * Whether a retro reads as the owner's call: /log's own rule, `needs-owner` in its `outcome`
 * (lib/sprint-log.ts's `ownersCall`, and Probe's oracle in e2e/retros.ts). Change all three or none.
 */
export const readsAsOwnersCall = (outcome) =>
  typeof outcome === "string" && /\bneeds-owner\b/i.test(outcome);

/**
 * The owner paths a squash touched while its retro reads as Gate, in the order given; empty when
 * the record is right. It only refuses Gate: an owner's call that touched no owner path stands,
 * since `gate` also holds any PR that ever carried the needs-owner label (gate.mjs).
 * @param outcome the retro's `outcome`.
 * @param files every path the squash changed (both sides of a rename).
 * @param isOwned the owner-path test from the CODEOWNERS its merge was gated on (scope.mjs).
 */
export function ownerPathsUnderGate({ outcome, files, isOwned }) {
  return readsAsOwnersCall(outcome) ? [] : files.filter((path) => isOwned(path));
}

const SHOWN = 5;

/** The refusal for one sprint: its number, its PR and the owner paths it touched. */
export function refusal({ sprint, pr, paths }) {
  const named = paths.slice(0, SHOWN).join(", ");
  const more = paths.length > SHOWN ? ` and ${paths.length - SHOWN} more` : "";
  return `sprint ${sprint}, #${pr}, changed ${named}${more}, the owner's by the CODEOWNERS of its parent, so gate held it for him; but its retro's outcome has no "needs-owner", so /log reads it as Gate. Put the token in .crew/sprint/${sprint}/retro.json's outcome.`;
}
