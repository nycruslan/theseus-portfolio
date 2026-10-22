// The drawing's key, shared by the revision block on / and the ship on /read so the two say the
// same words (.crew/sprint/23/contract.md, B2.5): how many planks the crew has replaced, and the
// two states the drawing's fills show.

export function PlankCount({
  planks,
  replaced,
}: {
  planks: number;
  replaced: number;
}) {
  return (
    <p className="tabular-nums">
      {planks} planks: {replaced} replaced, {planks - replaced} original
    </p>
  );
}

// The space between the items keeps the list's text two words apart for anything that reads it
// whole.
export function PlankLegend() {
  return (
    <ul className="flex gap-x-4">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="swatch bg-card" />
        Seated by a sprint
      </li>{" "}
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="swatch bg-card-old" />
        Original
      </li>
    </ul>
  );
}
