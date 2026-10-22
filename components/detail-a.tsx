// The connectors, drawn once: an arrow to the right for the row layout, one down for the stacked
// one, and the fan from the gateway to the three providers. Lines, not words, so assistive tech
// skips them (.crew/sprint/23/notes-iris.md, section 4).
const RIGHT = (
  <svg
    className="da-right"
    aria-hidden="true"
    viewBox="0 0 56 12"
    width="56"
    height="12"
  >
    <path d="M2 6H52M46 1l6 5-6 5" />
  </svg>
);

const DOWN = (
  <svg
    className="da-down"
    aria-hidden="true"
    viewBox="0 0 12 22"
    width="12"
    height="22"
  >
    <path d="M6 1v19M1 15l5 5 5-5" />
  </svg>
);

// Its arms at 14, 49 and 84 meet the centres of the three provider boxes stacked beside it.
const FAN = (
  <svg
    className="da-right"
    aria-hidden="true"
    viewBox="0 0 56 98"
    width="56"
    height="98"
  >
    <path d="M2 49h18M20 14v70M20 14h32M20 49h32M20 84h32M46 9l6 5-6 5M46 44l6 5-6 5M46 79l6 5-6 5" />
  </svg>
);

/**
 * Detail A, the gateway the JPMorgan summary describes, drawn from that summary's own words
 * (lib/detail-a.ts): who routes through it, the gateway, and the three providers it sits over.
 * Real text in ruled boxes, laid out by the figure's own width (app/globals.css, "Detail A").
 */
export function DetailA({ labels }: { labels: readonly string[] }) {
  const [teams, gateway, ...providers] = labels;
  return (
    <figure className="da">
      <div className="da-draw">
        <p className="da-box">{teams}</p>
        {RIGHT}
        {DOWN}
        <p className="da-box da-gateway">{gateway}</p>
        {FAN}
        {DOWN}
        <div className="da-over">
          {providers.map((label) => (
            <p key={label} className="da-box da-small">
              {label}
            </p>
          ))}
        </div>
      </div>
      <figcaption>
        Detail A. Drawn from the summary's own words: the gateway, who routes
        through it, and what it sits over.
      </figcaption>
    </figure>
  );
}
