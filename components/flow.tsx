// A case study's system as a schematic: real text in boxes, so it reflows, prints and reads aloud.
export function Flow({ stages, title }: { stages: string[][]; title: string }) {
  return (
    <ol className="flow" aria-label={`How ${title} fits together, in order`}>
      {stages.map((parts) => (
        <li key={parts.join()} className="flow-stage">
          {parts.map((part) => (
            <div key={part} className="flow-part">
              {part}
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}
