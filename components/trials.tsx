import { type CSSProperties, Fragment } from "react";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { SkipLink } from "@/components/skip-link";
import { TrialsChart, TrialsFits } from "@/components/trials-chart";
import { TrialsCorner } from "@/components/trials-corner";
import { profile } from "@/content/profile";
import { REPO_URL } from "@/lib/site";
import {
  addressOf,
  keyOf,
  PIN_WINDOWS,
  RUN_WINDOWS,
  type Rule,
  rulesAt,
  sizeOf,
  type Win,
} from "@/lib/trials";
import {
  CAPTION_DRAG,
  COPY,
  CORNER_KEYS,
  cornerOf,
  frameTitleOf,
  RECORD,
} from "@/lib/trials-answer";
import {
  answerOf,
  depthOf,
  signedOf,
  type Trial,
  VERDICT,
} from "@/lib/trials-words";
import home from "../e2e/home-door.spec.ts?raw";
import live from "../e2e/live-layer.spec.ts?raw";
import particulars from "../e2e/particulars.spec.ts?raw";
import phone from "../e2e/phone-window.spec.ts?raw";
import words from "../e2e/plain-words.spec.ts?raw";
import sheet from "../e2e/sheet.spec.ts?raw";
import tablet from "../e2e/tablet-window.spec.ts?raw";
import laptop from "../e2e/window.spec.ts?raw";

// The trials page (.crew/sprint/63/contract.md; Iris's placement.md and words.md): Ruslan's first
// page framed at a window, the waterline drawn at the window's foot, the contact links' freeboard
// from the committed sweep, and what the crew's record answers. Server HTML, whole without script.
// One DOM for both layouts, in reading order: the head, the readout, the drawing, the answer, the
// form, the crew's windows, the record (app/globals.css, "The trials"). With script, the frame's
// corner, the live region and Copy link come alive (.crew/sprint/64/contract.md): the controller
// (lib/trials-live.ts) loads on the first touch and rewrites this DOM in place as a window settles,
// from the same words (lib/trials-answer.ts). Without script the corner and Copy link don't show.

// The specs each rule links into, read into the server's bundle when the site is built, so a
// window rendered on demand finds its lines on a server without the repository's files, as the
// keel's quotes do (components/keel.tsx).
const SPECS: Record<string, string> = {
  "home-door.spec.ts": home,
  "live-layer.spec.ts": live,
  "particulars.spec.ts": particulars,
  "phone-window.spec.ts": phone,
  "plain-words.spec.ts": words,
  "sheet.spec.ts": sheet,
  "tablet-window.spec.ts": tablet,
  "window.spec.ts": laptop,
};

/** The rule's test at the build's commit, at the line its title starts on. */
function hrefOf(rule: Rule) {
  const line =
    (SPECS[rule.spec] ?? "")
      .split("\n")
      .findIndex((text) => text.includes(rule.title)) + 1;
  // A rule linked to no line would cite nothing: fail the build instead.
  if (line === 0)
    throw new Error(`"${rule.title}" isn't in e2e/${rule.spec} any more`);
  return `${REPO_URL}/blob/${process.env.KEEL_REF || "main"}/e2e/${rule.spec}#L${line}`;
}

/** Iris's groups (words.md, 9), by width. */
const GROUPS = [
  { name: "Phones", holds: (w: number) => w < 768 },
  { name: "Tablets", holds: (w: number) => w >= 768 && w < 1280 },
  { name: "Laptops", holds: (w: number) => w >= 1280 },
] as const;

const byWidth = (a: Win, b: Win) => a[0] - b[0] || a[1] - b[1];
const isRun = (win: Win) => RUN_WINDOWS.some((r) => keyOf(r) === keyOf(win));
const LISTED = PIN_WINDOWS.filter((win) => !isRun(win)).toSorted(byWidth);
const RUN = RUN_WINDOWS.toSorted(byWidth);

/** A run's summary: "And every width from 1380 to 1439 at 900 tall". */
const runWords = (run: readonly Win[]) =>
  `And every width from ${run[0]?.[0]} to ${run.at(-1)?.[0]} at ${run[0]?.[1]} tall`;

function WindowLink({
  win,
  shown,
  short,
}: {
  win: Win;
  shown: Win;
  short?: boolean;
}) {
  return (
    <a
      data-window={keyOf(win)}
      href={addressOf(win)}
      aria-current={keyOf(win) === keyOf(shown) ? "page" : undefined}
      aria-label={short ? sizeOf(win) : undefined}
      className="trials-window"
    >
      {short ? win[0] : sizeOf(win)}
    </a>
  );
}

/** `{f} px`, unbroken (memory, sprint 30), one text node so the server's HTML holds it whole. */
function Px({ children }: { children: string }) {
  return <span className="whitespace-nowrap">{`${children} px`}</span>;
}

/** The frame scaled to its column, its dimensions, the waterline and the freeboard (placement.md, 3). */
function Drawing({ trial }: { trial: Trial }) {
  const [w, h] = trial.win;
  const f = trial.freeboard;
  // Where the links' foot sits down the frame, and the freeboard dimension's length, as fractions
  // of the window's height: CSS scales both with the frame, so the server needs no column width.
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--w": String(w),
    "--h": String(h),
    "--fa": Math.min(1 - f / h, 1).toFixed(5),
    "--fs": (Math.abs(f) / h).toFixed(5),
  };
  return (
    <figure className="trials-figure">
      <div className="trials-drawing" style={style}>
        <div className="trials-dim trials-dim-w" aria-hidden="true">
          <span>{w}</span>
        </div>
        <div className="trials-dim trials-dim-h" aria-hidden="true">
          <span>{h}</span>
        </div>
        <div className="trials-frame">
          {/* Sandboxed without scripts and inert: / as built, which nothing reaches by Tab. */}
          <iframe
            src="/trials/frame"
            sandbox="allow-same-origin"
            inert
            title={frameTitleOf(trial.win, profile.name)}
            width={w}
            height={h}
          />
        </div>
        <div className="trials-sea" />
        <div className="trials-waterline" data-waterline="" />
        <div className="trials-freeboard" data-dimension="" aria-hidden="true">
          <span />
        </div>
        <span className="trials-freeboard-label" aria-hidden="true">
          {signedOf(trial)}
        </span>
        <span className="trials-waterline-label" aria-hidden="true">
          Waterline
        </span>
        {/* The frame's corner, a crop bracket and a handle with script only (T12; Iris's
          placement.md, 1), last so it paints over the frame. Its keys are told in a hidden
          description, which aria-describedby still reads. */}
        <button
          type="button"
          data-corner=""
          aria-label={cornerOf(trial.win)}
          aria-describedby="trials-keys"
          className="trials-corner"
        >
          <span className="trials-bracket" aria-hidden="true" />
        </button>
        <span id="trials-keys" hidden>
          {CORNER_KEYS}
        </span>
      </div>
      <figcaption>
        His first page as the site builds it, without the crew's live updates,
        in a <span className="whitespace-nowrap">{sizeOf(trial.win)}</span>{" "}
        window.
        <span className="trials-scripted">{` ${CAPTION_DRAG}`}</span>
      </figcaption>
    </figure>
  );
}

function Answer({ trial }: { trial: Trial }) {
  const { before, after, margin } = answerOf(trial);
  return (
    <p data-answer="" data-kind={trial.kind} className="trials-answer">
      {before}
      <Px>{depthOf(trial)}</Px>
      {after}
      {margin ? (
        <>
          <span className="whitespace-nowrap">{margin.before}</span>
          {margin.after}
        </>
      ) : null}
    </p>
  );
}

function Field({
  label,
  name,
  min,
  max,
  value,
}: {
  label: string;
  name: string;
  min: number;
  max: number;
  value: number;
}) {
  const id = `trials-${name}`;
  return (
    <div className="trials-field">
      <label htmlFor={id}>{label}</label>
      <span>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          min={min}
          max={max}
          step={1}
          required
          defaultValue={value}
          aria-describedby="trials-hint"
        />
        <span aria-hidden="true">px</span>
      </span>
    </div>
  );
}

export function Trials({ trial }: { trial: Trial }) {
  const { win, rules } = trial;
  // What the controller can't read itself: the name and links from content/, and each check's link
  // to its test, which reads the specs into the server's bundle.
  const hrefs = Object.fromEntries(
    PIN_WINDOWS.flatMap(rulesAt).map((rule) => [rule.code, hrefOf(rule)]),
  );
  return (
    <>
      <SkipLink />
      <Bar at="page" className={sofiaCondensed.variable} />
      {/* tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`trials ${sofiaCondensed.variable}`}
      >
        <header className="trials-head">
          <h1>Sea trials</h1>
          <p className="trials-dare">Try to sink Ruslan's contact links.</p>
          <p className="trials-lead">
            Pick a window and his first page is drawn at its size. The window's
            foot is the waterline; how far the links stand above it is their
            freeboard.
          </p>
        </header>

        <div className="trials-readout">
          <dl>
            <div>
              <dt>Window</dt>
              <dd data-size="">{sizeOf(win)}</dd>
            </div>
            <div>
              <dt>Freeboard</dt>
              <dd data-freeboard={trial.freeboard.toFixed(1)}>
                <Px>{signedOf(trial)}</Px>
              </dd>
            </div>
          </dl>
          <p data-verdict="" className="trials-verdict">
            {VERDICT[trial.kind]}
          </p>
        </div>

        <Drawing trial={trial} />
        <Answer trial={trial} />
        {/* With script only, its own row after the answer (placement.md, 5): the address is
          always the shown window's, so it copies that. The line beside it is the live region's
          words for the eye. */}
        <div className="trials-share">
          <button type="button" data-copy="" className="trials-copy">
            Copy link
          </button>
          <span data-copied="" aria-hidden="true" className="trials-copied" />
        </div>
        {/* Said once a window settles, and after Copy link; never during a drag (T12). */}
        <p data-trials-live="" aria-live="polite" className="sr-only" />

        <section className="trials-section" aria-labelledby="trials-try">
          <h2 id="trials-try">Try any window</h2>
          <p id="trials-hint" className="trials-note">
            Widths from 320 to 1920 px, heights from 460 to 1100. A few windows
            are drawn exactly as typed, the crew's among them; any other snaps
            to the nearest 16 px of width and 5 px of height.
          </p>
          {/* A plain GET to a route handler that answers with the window's address, so it works
            without script, and native validation keeps it to the grid's limits. */}
          <form action="/trials/go" method="get" className="trials-form">
            <Field label="Width" name="w" min={320} max={1920} value={win[0]} />
            <Field
              label="Height"
              name="h"
              min={460}
              max={1100}
              value={win[1]}
            />
            <button type="submit" className="trials-submit">
              Try it
            </button>
          </form>
        </section>

        <section className="trials-section" aria-labelledby="trials-windows">
          <h2 id="trials-windows">The crew's windows</h2>
          <p className="trials-note">
            Every window where the crew's checks hold the contact links, and the
            one they leave out.
          </p>
          {GROUPS.map((group) => (
            <Fragment key={group.name}>
              <h3>{group.name}</h3>
              <ul className="trials-windows">
                {LISTED.filter((w) => group.holds(w[0])).map((w) => (
                  <li key={keyOf(w)}>
                    <WindowLink win={w} shown={win} />
                  </li>
                ))}
              </ul>
              {/* Sixty one-pixel steps are the record, not something to scan: closed, unless the
                shown window is one of them. */}
              {RUN.length > 0 && group.holds(RUN[0]?.[0] ?? 0) ? (
                <details className="trials-run" open={isRun(win)}>
                  <summary>{runWords(RUN)}</summary>
                  <ul className="trials-windows">
                    {RUN.map((w) => (
                      <li key={keyOf(w)}>
                        <WindowLink win={w} shown={win} short />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Fragment>
          ))}
        </section>

        <section className="trials-section" aria-labelledby="trials-record">
          <h2 id="trials-record">The record</h2>
          {rules.length > 0 ? (
            <>
              <p className="trials-note">{RECORD.note}</p>
              <ol className="trials-rules">
                {rules.map((rule) => (
                  <li key={rule.code} data-rule="" data-check={rule.code}>
                    <a href={hrefOf(rule)} className="trials-rule-link">
                      {rule.sentence}
                    </a>
                    <span className="trials-rule-sprint">{`Sprint ${rule.sprint}`}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p data-unclaimed="" className="trials-note">
              {RECORD.unclaimed}
            </p>
          )}
        </section>
        <TrialsChart win={win} />
        <TrialsFits win={win} />
        <TrialsCorner
          hands={{
            name: profile.name,
            links: profile.links.map((link) => link.href),
            hrefs,
            copy: COPY,
          }}
        />
      </main>
    </>
  );
}
