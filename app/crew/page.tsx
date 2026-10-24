import { pullHref, readCrew } from "@/lib/crew-feed";

// The cache measurement's stub (.crew/sprint/31/brief-forge.md, step 1): it prints what the feed
// says, and the page replaces it.
export default async function Crew() {
  const crew = await readCrew();
  const run = crew.state === "down" ? null : crew.run;
  return (
    <main id="main" data-crew-state={crew.state}>
      <h1>Crew</h1>
      <p>
        state={crew.state} sprint={run?.sprint ?? ""} now={run?.now ?? ""} pr=
        {run?.pr ? (pullHref(run.pr) ?? "unlinked") : ""}
      </p>
    </main>
  );
}
