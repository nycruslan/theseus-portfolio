import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CANNOT_ANSWER, chatRequest, gateway } from "@/lib/assistant";

// The assistant's answers, streamed as plain text. Limits sit outside this code, where they hold
// whatever it does: a Vercel Firewall rule rate-limits this route per IP, and the AI Gateway key has
// a monthly quota.

export const maxDuration = 60;

const body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40)
    .refine((turns) => turns.at(-1)?.role === "user"),
});

/** Only this site's own page may spend the quota; the browser sets Origin and a page can't fake it. */
function fromThisSite(request: Request) {
  const origin = request.headers.get("origin");
  return (
    origin !== null && new URL(origin).host === request.headers.get("host")
  );
}

export async function POST(request: Request) {
  if (!fromThisSite(request)) return new Response(null, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  const encoder = new TextEncoder();
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
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const { stop_reason } = await stream.finalMessage();
        if (stop_reason === "refusal") {
          controller.enqueue(encoder.encode(CANNOT_ANSWER));
        }
      } catch (error) {
        // A visitor leaving mid-answer is no failure. Anything else (the quota spent, the Gateway
        // down) gets the same way forward, and only the error's name reaches the logs.
        if (!(error instanceof Anthropic.APIUserAbortError)) {
          console.error("chat failed:", (error as Error).name);
          controller.enqueue(encoder.encode(CANNOT_ANSWER));
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
