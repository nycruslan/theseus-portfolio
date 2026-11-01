import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CANNOT_ANSWER, chatRequest, gateway } from "@/lib/assistant";
import { HISTORY_TURNS, QUESTION_MAX_CHARS, TURN_MAX_CHARS } from "@/lib/chat";

// The assistant's answers, streamed as plain text. Limits sit outside this code, where they hold
// whatever it does: a Vercel Firewall rule rate-limits this route per IP, and the AI Gateway key has
// a monthly quota.

export const maxDuration = 60;

const body = z.object({
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({
          role: z.literal("user"),
          content: z.string().trim().min(1).max(QUESTION_MAX_CHARS),
        }),
        z.object({
          role: z.literal("assistant"),
          content: z.string().trim().min(1).max(TURN_MAX_CHARS),
        }),
      ]),
    )
    .min(1)
    .max(HISTORY_TURNS)
    .refine((turns) => turns.at(-1)?.role === "user"),
});

/**
 * Keeps other sites' pages off this route. A script can send any Origin, so this isn't what limits
 * spend: the Firewall rule and the key's quota above are. An Origin that isn't a URL ("null") fails.
 */
function fromThisSite(request: Request) {
  const origin = request.headers.get("origin");
  return (
    origin !== null &&
    URL.canParse(origin) &&
    new URL(origin).host === request.headers.get("host")
  );
}

export async function POST(request: Request) {
  if (!fromThisSite(request)) return new Response(null, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  const encoder = new TextEncoder();
  let sent = false;
  const closing = () => (sent ? `\n\n${CANNOT_ANSWER}` : CANNOT_ANSWER);
  const answer = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = gateway().messages.stream(
          chatRequest(parsed.data.messages),
          { signal: request.signal },
        );
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            sent = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const { stop_reason } = await stream.finalMessage();
        // A refusal, or an answer cut off at the length limit: never leave it hanging.
        if (stop_reason !== "end_turn") {
          controller.enqueue(encoder.encode(closing()));
        }
      } catch (error) {
        // A visitor leaving mid-answer is no failure. Anything else (the quota spent, the Gateway
        // down) gets the same way forward, and only the error's name reaches the logs.
        if (!(error instanceof Anthropic.APIUserAbortError)) {
          console.error("chat failed:", (error as Error).name);
          controller.enqueue(encoder.encode(closing()));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(answer, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
