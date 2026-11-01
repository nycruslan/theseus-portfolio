import { revalidateTag } from "next/cache";
import { EVALS_TAG, runEvals } from "@/lib/evals";

// Vercel Cron calls this weekly (vercel.json) with CRON_SECRET as a bearer token.

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  const { overall, passed, total } = await runEvals();
  revalidateTag(EVALS_TAG, "max");
  return Response.json({ overall, passed, total });
}
