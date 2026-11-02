import { LINK } from "@/components/crew";
import { type KeelRule, keelRules } from "@/lib/keel";
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

/** The label's verdict, up to and including its first colon, or the whole label without one. */
function Enforcer({ enforcer }: KeelRule) {
  const colon = enforcer.indexOf(":") + 1;
  const verdict = colon === 0 ? enforcer : enforcer.slice(0, colon);
  return (
    <p data-enforcer="" className="keel-enforcer">
      <span className="keel-verdict">{verdict}</span>
      {enforcer.slice(verdict.length)}
    </p>
  );
}

/** Where the link lands, as its words: one string, so the HTML holds it whole. */
const at = ({ path, start, end }: KeelRule) =>
  start === end ? `${path}, line ${start}` : `${path}, lines ${start}–${end}`;

/**
 * The keel (.crew/sprint/46/first-contract.md; Iris's .crew/sprint/47/placement.md): server HTML
 * after the panel. Each rule keeps its number from KEEL, so a dropped rule leaves a gap; with none
 * left the page sets nothing, not an empty heading.
 */
export function Keel() {
  if (RULES.length === 0) return null;
  return (
    <section aria-labelledby="keel" className="keel">
      <h2 id="keel">Keel</h2>
      <p className="keel-lead">{LEAD}</p>
      <ol className="keel-rules">
        {RULES.map((rule) => (
          <li
            key={rule.n}
            value={rule.n}
            data-rule={rule.n}
            data-kind={kindOf(rule)}
          >
            <p className="keel-sentence">{rule.sentence}</p>
            <Enforcer {...rule} />
            <blockquote cite={rule.href} className="keel-quote">
              {rule.text}
            </blockquote>
            <p className="keel-source">
              <a href={rule.href} className={LINK}>
                {at(rule)}
              </a>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
