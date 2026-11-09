// The drawing's key, shared by the revision block on / and the ship on /read so the two say the
// same words (.crew/sprint/23/contract.md, B2.5): how many planks the crew has replaced, and the
// states the drawing's fills show, each named only while it is on the drawing. "Seated by a
// sprint" always; "Original" while a plank is still original, the count line's original number
// above 0 (.crew/sprint/60/contract.md, "The legend"); on / the pencil, and copper, while the crew
// draws them (.crew/sprint/34/contract.md, "The legend").

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
// whole. With the pencil and copper items it can be wider than a phone, so it wraps.
export function PlankLegend({
  planks,
  replaced,
  pencil = false,
  copper = false,
}: {
  /** The drawing's planks and how many the crew has replaced, the numbers its PlankCount reads. */
  planks: number;
  replaced: number;
  /** A plank is in pencil on the drawing. */
  pencil?: boolean;
  /** Its copper tip is on the drawing: the crew is live. */
  copper?: boolean;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="swatch bg-card" />
        Seated by a sprint
      </li>
      {planks - replaced > 0 ? (
        <>
          {" "}
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="swatch bg-card-old" />
            Original
          </li>
        </>
      ) : null}
      {pencil ? (
        <>
          {" "}
          <li data-key="pencil" className="flex items-center gap-2">
            <span aria-hidden="true" className="swatch swatch-pencil" />
            In progress
          </li>
        </>
      ) : null}
      {copper ? (
        <>
          {" "}
          <li data-key="copper" className="flex items-center gap-2">
            <span aria-hidden="true" className="swatch-tip" />
            Drawing now
          </li>
        </>
      ) : null}
    </ul>
  );
}
