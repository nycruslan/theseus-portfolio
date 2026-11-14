import { LINK } from "@/components/crew-link";
import { FIRST_NAME } from "@/lib/crew-key";
import { type KeelRule, keelRules } from "@/lib/keel";
import type { SprintEntry } from "@/lib/sprint-log";
import { DARE } from "@/lib/trials-dare";
import gate from "../.crew/gate.mjs?raw";
import guard from "../.crew/guard.mjs?raw";
import scope from "../.crew/scope.mjs?raw";
import codeowners from "../.github/CODEOWNERS?raw";
import claude from "../CLAUDE.md?raw";

// The five files the six rules quote, read into the server's bundle as text when the site is
// built (next.config.ts's `?raw` rule). /crew regenerates on servers that don't have them
// (.crew/**/*.mjs isn't traced), so reading them while rendering would drop every rule on the
// first regeneration (.crew/sprint/46/plan.md, "A build constraint").
const SOURCES = {
  "CLAUDE.md": claude,
  ".github/CODEOWNERS": codeowners,
  ".crew/scope.mjs": scope,
  ".crew/guard.mjs": guard,
  ".crew/gate.mjs": gate,
};

const RULES = keelRules(SOURCES, process.env.KEEL_REF || "main");

const LEAD =
  "The rules the crew builds under. The crew replaces the planks sprint by sprint; the keel stays. These rules live in files that are Ruslan's, so a change to any of them waits for his approval. Each is quoted from its file.";

/** A rule that only guides says so first (K5); the rest bind. */
const kindOf = ({ enforcer }: KeelRule) =>
  enforcer.startsWith("Guidance only") ? "guidance" : "binds";

/** The label, its verdict apart: up to and including its first colon, or all of it without one. */
function Enforcer({ label }: { label: string }) {
  const colon = label.indexOf(":") + 1;
  const verdict = colon === 0 ? label : label.slice(0, colon);
  return (
    <p data-enforcer="" className="keel-enforcer">
      <span className="keel-verdict">{verdict}</span>
      {label.slice(verdict.length)}
    </p>
  );
}

/** Where the link lands, as its words: one string, so the HTML holds it whole. */
const at = ({ path, start, end }: KeelRule) =>
  start === end ? `${path}, line ${start}` : `${path}, lines ${start}–${end}`;

type Retros = readonly Pick<SprintEntry, "ownersCall">[];

/** LINK's ink and underline (components/crew-link.ts), with the line's own box for `.crew-link`'s. */
const RECORD_LINK =
  "keel-record-link text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2";

/**
 * The record behind the rules (.crew/sprint/48/contract.md, K12): how every merged sprint was
 * approved, counted by its retro's `ownersCall` as /log's Approved column reads it (Gate or Owner),
 * so the two can't disagree. One string, so the HTML holds it whole; none before the first merge.
 * The whole line links to the Log's revisions that back it, as each rule's source line does
 * (.crew/sprint/50/link.md): LINK's ink without `.crew-link`'s box, which would stop it wrapping;
 * `.keel-record-link` (app/globals.css) gives it its target.
 */
function Approvals({ retros }: { retros: Retros }) {
  if (retros.length === 0) return null;
  const owner = retros.filter((retro) => retro.ownersCall).length;
  return (
    <p data-keel-record="" className="keel-record">
      <a href="/log#every-revision" className={RECORD_LINK}>
        {`${retros.length} sprints merged: ${retros.length - owner} on the checks alone, ${owner} on ${FIRST_NAME}'s own call.`}
      </a>
    </p>
  );
}

/**
 * The door into the trials, the coda of rule 1 ("Nothing merges until three checks pass"): a
 * visitor who has just read it is dared to test the site themselves (Iris's
 * .crew/sprint/66/placement.md, section 1). Keyed on the rule's number, not its place, so if rule 1
 * drops its door drops with it rather than moving under rule 2. The words are /trials's own dare
 * without its full stop, so the visitor lands on the sentence they clicked, and they name no window,
 * which would give the answer away. Rule 1's source link's classes, so the two read as one voice.
 */
function TrialsDoor() {
  return (
    <p data-trials-door="" className="keel-door">
      <a href="/trials" className={LINK}>
        {DARE}
      </a>
    </p>
  );
}

/**
 * The keel (.crew/sprint/46/first-contract.md; Iris's .crew/sprint/47/placement.md): server HTML
 * after the panel. Each rule keeps its number from KEEL, so a dropped rule leaves a gap; with none
 * left the page sets nothing, not an empty heading. Its h2 is where "his rules" on / and the
 * panel's Approval land (.crew/sprint/48/contract.md, K9 to K11).
 */
export function Keel({
  retros,
}: {
  /** Every merged sprint's retro, newest first, as /log reads them (lib/sprint-log.ts). */
  retros: Retros;
}) {
  if (RULES.length === 0) return null;
  return (
    <section aria-labelledby="keel" className="keel">
      <h2 id="keel">Keel</h2>
      <p className="keel-lead">{LEAD}</p>
      <Approvals retros={retros} />
      <ol className="keel-rules">
        {RULES.map((rule) => (
          <li
            key={rule.n}
            value={rule.n}
            data-rule={rule.n}
            data-kind={kindOf(rule)}
          >
            <p className="keel-sentence">{rule.sentence}</p>
            <Enforcer label={rule.enforcer} />
            <blockquote cite={rule.href} className="keel-quote">
              {rule.text}
            </blockquote>
            <p className="keel-source">
              <a href={rule.href} className={LINK}>
                {at(rule)}
              </a>
            </p>
            {rule.n === 1 ? <TrialsDoor /> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
