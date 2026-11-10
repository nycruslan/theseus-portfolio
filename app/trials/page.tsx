import type { Metadata } from "next";
import { Trials } from "@/components/trials";
import { HOME } from "@/lib/trials";
import { sweptTrial, trialsMetadata } from "@/lib/trials-words";

// The trials page at 1440 × 900 (.crew/sprint/63/contract.md): every other window has its own
// address (app/trials/[window]/page.tsx). It reads no query, so it is prerendered whole.
const trial = sweptTrial(HOME);

export const metadata: Metadata = trialsMetadata(trial);

export default function TrialsPage() {
  return <Trials trial={trial} />;
}
