import { LoadB } from "../_spike/load-b.jsx";

// B3 spike (sprint 24), S1: a canvas and a loader, nothing else, so pages differ only by the import.
export default function Page() {
  return (
    <main>
      <canvas id="scene" aria-hidden="true" />
      <LoadB />
    </main>
  );
}
