// The drawing's key, shared by the revision block on / and the ship on /read so the two say the
// same words (.crew/sprint/23/contract.md, B2.5): how many planks the crew has replaced, and the
// two states the drawing's fills show. On / the legend names the pencil, and copper, only while
// they are on the drawing (.crew/sprint/34/contract.md, "The legend").

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
  pencil = false,
  copper = false,
}: {
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
      </li>{" "}
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="swatch bg-card-old" />
        Original
      </li>
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
