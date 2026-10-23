# B3 as a sequence of sprints (Quill)

Quill, 2026-10-22, during sprint 24 (Pixel's spike, `.crew/sprint/24/contract.md`). B3 is "the 3D
card model and the registered loft" (`ROADMAP.md`), built to `.crew/sprint/17/direction-iris.md`
and the owner-approved canvas frames `main.webp`, `loft.webp`, `loft-390.webp`, `motion-*.webp` and
`night-1440.webp` in `.crew/sprint/17/design/`. Three build sprints follow the spike, each one PR
that leaves the site whole. The first one's contract is drafted in
`.crew/sprint/24/b3-first-contract.md`, with its numbers from the spike (`.crew/sprint/24/spike/spike.md`).

## What the visitor gets, and what decides the order

The hiring executive opens `/` and reads the name in the first second, as today. A moment later
the drawing becomes the hull it describes: a white card model lands exactly on the inked profile
and lifts off it in one camera move, while every word on the page stays still. That is B3's whole
promise, and the order below protects it:

1. **The desktop loft first.** It is the signature moment, it is where registration is exact
   (the three-view plan from 1024 px is what `main.webp` and `loft.webp` draw), and it is where a
   weak GPU is rare. Sprint 25 ships it to production with no control: it plays once, for under
   five seconds, is skipped by any input, and opens settled under reduced motion. That is honest
   without a control (WCAG 2.2.2 applies only past 5 s) and avoids a control that changes nothing.
2. **Phones and tablets second.** That's where the 30 fps budget and quality stepping matter, and
   where an open design call sits (what the phone loft lands on). A plank of its own keeps sprint 25
   inside one review.
3. **The Full/Calm/Off control last.** It controls what exists by then at every width. Shipped
   before phones had a model, its three buttons would change nothing on a phone, which sprint 22
   ruled out (`.crew/sprint/22/decisions.md`, 1).

**The default once the 3D exists is Full.** B1's "Off as everyone's default" held while there was
no 3D (sprint 22 notes 9). The approved canvas sets the rule for B3: `Motion-Control.html` labels
Full "the default", reduced motion starts at Calm, and Off is for no WebGL, no JavaScript, print and
slow devices. The roadmap's B1 line can stay as history. The B3 line should say Full.

## The sprints

### Sprint 25 (M): the hull lifts off the drawing, at 1024 px and up

- **Outcome.** On `/` at 1024 px and wider, after the name has painted, the card model lands on the
  inked profile within 1 CSS px. It lifts off in one dolly-zoom to the settled three-quarter pose,
  once a visit. It is skipped by any input, settled under reduced motion, and still at rest. The
  page and every word stay still. Below 1024 px, without WebGL, in print, in forced colours and with
  scripts off, the page is today's sheet and loads no 3D.
- **Size: M.** The scene, its loader and the loft are in. Phones, quality stepping beyond a
  still-frame net, the control, and labels on the model are out.
- **Checks it adds:** B3.1 to B3.10 in the draft contract: registration, the loft's held size, once a
  visit and skippable, reduced motion, the Off paths, draws, triangles and bytes, 0 frames at rest,
  the planks as the record, teardown, and the harness.
- **Live checks it must keep:**
  - B1.1 (the fold), B1.4 (the drawing, inert and uncropped), C6 (its bytes), C9 (axe, nothing hit,
    no console error), B1.9 (LCP is text), B1.10 (two fonts) and B1.6 (no copper): all unedited.
  - B1.8 (no script needed, nothing moves) is rewritten with the same assertions. Its pixel
    comparisons run on the 2D sheet with WebGL refused, and the model's own stillness is B3.6.
  - B2.10's script bytes on `/` are measured with WebGL refused, against the same 2,048 B if the
    loader fits (the spike didn't isolate the loader's bytes). A larger number needs the owner.
  - Nothing retires.
- **What the owner sees:** the loft on the PR's preview at 1440, in both schemes. Also the stack call
  (below), taken there.

### Sprint 26 (M): the hull on phones and tablets, at 30 fps

- **Outcome.** Below 1024 px the model lands on the drawing the phone shows and lifts off as the
  desktop one does. Quality steps itself:
  - DPR at most 1.5;
  - the phone's triangle level, at most 12k;
  - a step down above 22 ms and up below 12 ms;
  - a still frame if the loft can't hold 30 fps.

  The page still scrolls through the canvas (`touch-action: pan-y`).
- **Size: M.**
- **The phone lands on the profile it already draws** (B1.4's two-view plan below 768 px). The
  spike registered it there within 1.0 CSS px at DPR 1 and 0.5 px at DPR 1.5 (S4). The body-plan
  landing of `loft-390.webp` no longer applies, since the narrow sheet has had no body plan since
  sprint 22. That keeps the planks, the record, in the phone's first screen, and it changes no live
  check.
- **Opens with a decision (Iris):** the phone's model scale. On the narrow profile at scale 0.5 the
  hull is 59 px tall (spike S7's notes).
- **Checks it adds:**
  - B3.1 to B3.3 at 390 × 844 (DPR 1 and 2) and 768 × 1024;
  - the triangle level ≤ 12k and DPR ≤ 1.5 by the harness;
  - the stepping rule, driven by a throttled CPU in headless Chromium (a floor, not a phone, so it is
    reported);
  - vertical scroll through the canvas on a touch emulation.
- **Live checks it must keep:** B1.1 at 390 (the fold), B1.4's phone plan, the invariants at 320 (no
  overflow; the canvas is sized to its container), and everything sprint 25 kept.
- **What the owner sees:** the loft on their own phone, which is the only 30 fps measurement the crew
  can't make (`.crew/sprint/24/contract.md`, out of scope).

### Sprint 27 (S, M if the phone strip moves): Full, Calm, Off

- **Outcome.** The bar carries the approved control: three real buttons with `aria-pressed`, 44 px on
  phones, the choice remembered on the device (inside try/catch). Reduced motion starts at Calm.
  - **Full:** the loft once a visit.
  - **Calm:** opens settled, renders on events only.
  - **Off:** today's 2D sheet, byte for byte. It never requests the 3D chunk or a WebGL context, and
    switching to it mid-visit releases the context.

  The control is rendered only when scripts run, in a reserved slot (CLS 0), as Print is on `/read`.
- **Size:** S, or M if Iris keeps the canvas's phone placement (the first screen's bottom strip),
  which moves B1.1's 390 layout.
- **Checks it adds:**
  - each state's behaviour;
  - the choice surviving a reload, and storage that throws;
  - Off's no-chunk, no-context guarantee;
  - Calm's 0 frames between events;
  - the 24 px (44 px phone) targets;
  - one ring per focused button in forced colours.
- **Live checks it rewrites, same assertions:**
  - B2.3 (the bar's controls: the four links, then the group of three buttons; Read as page stays
    the right-most link);
  - keyboard's "Contact's first link is the 12th Tab stop", which becomes the 15th with three
    buttons before it. Probe raises `tabUntil`'s bound, a harness change, not a weaker test.
- **What the owner sees: the B3 demo.** On the preview, at 1440 and on their phone:
  - the loft;
  - Calm and Off;
  - the dark scheme;
  - a reload that opens settled;
  - reduced motion.

### Not in B3

- **DOM labels on the model,** the "15" and "17" of `loft.webp`'s frame 5. They point at the pencil
  plank and the newest seat, which are B4's live layer.
- **The ambient light that "follows one shared clock".** It is ambient motion, so it needs the
  control's pause and breaks "0 frames at rest". It's a follow-up after 27, if Iris still wants it.
- The graphite, copper and vellum states: the scene carries their slots from sprint 25, and B4 and
  B5 fill them.
- A static AVIF render for Off (research B3's proposal): Off is the drawing itself, which already
  shows every plank.

## The owner's stack call: before sprint 25 merges

The call has to come **before sprint 25's PR merges**, not at the end of the milestone:
- Sprint 25 writes nearly all the renderer-specific code (the scene, its materials, the loader). A
  call at sprint 27's demo would put a stack in production that the owner may reverse, and cost a
  port of sprint 25's work.
- Neither option fits every owner-approved line as written:
  - **Option A (WebGL: 178,873 B gzip in Turbopack, spike S1)** fits the budget, but it departs
    from `design/brief.md`'s "Technology" (three.js `WebGPURenderer`, TSL, GSAP). That is the
    owner's file.
  - **Option B (WebGPU with its WebGL 2 fallback: 280,606 B gzip)** misses the direction's 250 kB in
    either encoding, since Vercel's brotli is about gzip's size (spike S1). Choosing it raises a
    budget the owner approved with the direction.
  - Either way, it is the owner's call, not the crew's.
- **The cheapest way to ask:**
  - Atlas puts S7's paragraph in sprint 24's PR as a non-blocking question, so the owner can answer
    before sprint 25 starts.
  - Sprint 25 builds on the spike's provisional pick, A (S7; Atlas's decision 6).
  - Its PR carries the call as "Needs owner decision", with the loft running on the preview, which
    is the best place to weigh bytes against reach.
  - If the owner picks the other stack, the port happens in that PR before it merges.
- If the owner picks A, `design/brief.md`'s Technology section is stale: propose its edit in sprint
  25's retro (an owner path).

## Riders B3 carries

- From sprint 22's dropped riders (`.crew/sprint/22/contract.md`, "The roadmap's riders"):
  - the 3D's teardown, and a reduced-motion change mid-visit: sprint 25, B3.4 and B3.8;
  - the draw count under load: sprint 25, B3.6.
- **Iris's one-line revision descriptions,** if Atlas takes them (sprint 24 report). They ride the
  first B3 PR that waits for the owner, which is sprint 25.
- The roadmap's font and facts riders don't ride: B3 touches neither.
