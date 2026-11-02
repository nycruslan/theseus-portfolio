import { keelRules } from "@/lib/keel";
import gate from "../.crew/gate.mjs?raw";
import guard from "../.crew/guard.mjs?raw";
import scope from "../.crew/scope.mjs?raw";
import codeowners from "../.github/CODEOWNERS?raw";
import claude from "../CLAUDE.md?raw";

// The six files, read into the server's bundle as text when the site is built (next.config.ts's
// `?raw` rule). /crew regenerates on servers that don't have them (.crew/**/*.mjs isn't traced), so
// reading them while rendering would drop every rule on the first regeneration
// (.crew/sprint/46/plan.md, "A build constraint").
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

/** The keel (.crew/sprint/46/first-contract.md): server HTML, after the panel, and nothing at all
 * when no file holds its quote any more. */
export function Keel() {
  if (RULES.length === 0) return null;
  return (
    <section aria-labelledby="keel" className="keel">
      <h2 id="keel">Keel</h2>
      <p>{LEAD}</p>
      <ol>
        {RULES.map((rule) => (
          <li key={rule.n} data-rule={rule.n}>
            <p>{rule.sentence}</p>
            <p data-enforcer="">{rule.enforcer}</p>
            <blockquote cite={rule.href}>
              <p>{rule.text}</p>
            </blockquote>
            <a href={rule.href}>{rule.path}</a>
          </li>
        ))}
      </ol>
    </section>
  );
}
