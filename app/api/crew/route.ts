import { connection } from "next/server";
import { readCrew } from "@/lib/crew-feed";
import type { AgentState, Crew, MomentKind, RosterRole } from "@/lib/crew-run";

// What /crew's poll reads (.crew/sprint/35/contract.md, "The route"): the crew's state from the
// same cached read as the pages, narrowed to the fields the panel shows, under the feed contract's
// names. The browser talks only to this route, so the feed's address stays on the server.

type CrewAnswer =
  | { version: 1; state: "down"; run: null }
  | {
      version: 1;
      state: "live" | "open" | "resting";
      run: {
        sprint: number | null;
        goal: string | null;
        pr: { number: number; url: string | null } | null;
        health: { state: string; line: string | null; quote: boolean };
        now: string | null;
        roles: { role: RosterRole; state: AgentState; line: string | null }[];
        moments: Said[];
        url: string | null;
        mergedAt: string | null;
        /** Only in a resting answer that offers a replay (.crew/sprint/37/contract.md, call 6). */
        replay?: Said[];
      };
    };

type Said = { kind: MomentKind; at: string; text: string };

const said = ({ kind, at, text }: Said): Said => ({ kind, at, text });

// The CDN holds an answer 30 s, so the Studio sees about two reads a minute however many watch;
// the browser never reuses one, so each poll asks the CDN. The same in every state: a down answer
// is retried as soon as a told one.
const HEADERS = { "Cache-Control": "public, max-age=0, s-maxage=30" };

/** Each field named, so nothing the read gains later reaches the browser unless it is added here. */
function answerOf(crew: Crew): CrewAnswer {
  if (crew.state === "down") return { version: 1, state: "down", run: null };
  const { run } = crew;
  return {
    version: 1,
    state: crew.state,
    run: {
      sprint: run.sprint,
      goal: run.goal,
      pr: run.pr && { number: run.pr.number, url: run.pr.url },
      health: {
        state: run.health.state,
        line: run.health.line,
        quote: run.health.quote,
      },
      now: run.now,
      roles: run.roles.map(({ role, state, line }) => ({ role, state, line })),
      moments: run.moments.map(said),
      url: run.studio,
      mergedAt: run.mergedAt,
      // Absent otherwise, so every other answer keeps its exact keys (B4.25).
      ...(run.replay ? { replay: run.replay.map(said) } : {}),
    },
  };
}

export async function GET() {
  // Dynamic, never prerendered: a prerendered answer is the build's down, which Vercel serves
  // after a quiet spell, just when a poll is meant to correct the page.
  await connection();
  return Response.json(answerOf(await readCrew()), { headers: HEADERS });
}
