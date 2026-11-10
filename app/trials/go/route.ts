import type { NextRequest } from "next/server";
import { goTo } from "@/lib/trials";

// The form's action (.crew/sprint/63/contract.md, "The addresses"): a GET with the typed width and
// height, answered with a 303 to that window's address, so the trials page itself reads no query
// and stays prerendered. The Location is a path, so it holds behind any host.
export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  return new Response(null, {
    status: 303,
    headers: { Location: goTo(query.get("w"), query.get("h")) },
  });
}
