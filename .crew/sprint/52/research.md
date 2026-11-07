# What makes a site something people play with and send on (late 2026)

Iris, 2026-11-07, for sprint 52 ("something to play with"). This updates
`design/research/2027-redesign.md` (Oct 2026) and `design/research/2026-ui-ux-and-3d.md`
(22 Oct 2026) for what has shipped since; it doesn't repeat them. Their findings still hold: one
specific idea carried by one gesture, liveness as the newest differentiator, the FWA's blind jury
and FWAi critic from 3 November 2026, and a list of what is taken (driving worlds, tiny planets,
fake AI launches, purple glow, preloader plus Enter).

**Method, and its limit.** Every pick below was found with web search on 2026-11-07. This session
couldn't open awwwards.com or thefwa.com (both refuse to resolve from the cloud sandbox), so
Awwwards entries are confirmed from their listing pages as the search index shows them (title,
date, award tags), not from the sites themselves, and I didn't play them. Codrops articles were
read through search excerpts. Where a fact comes from a secondary write-up, it says so. Nothing
here is from my memory of the sites.

## 1. The picks

| Pick (date) | The toy: what you do | The loop and its payoff | The share moment | Its cost | For Theseus |
|---|---|---|---|---|---|
| **Why Zero**, Zero University (Awwwards Site of the Day and Developer Award 7 Sep 2026; Site of the Month Sep 2026) ([Awwwards listing via search](https://www.awwwards.com/websites/sites_of_the_month/); [BUNQ LABS](https://bunqlabs.com/insights/why-zero-awards), the builder's own write-up) | You draw a zero to get in. Recognition is a plain check of angle, roundness and closure, no neural network ([tproger's summary of the Codrops case study](https://tproger.ru/articles/zero-na-three-js-inzhenernyj-razbor-interaktivnogo-sajta), secondary) | Six scroll chapters (glass, burning money, a tunnel) to a city with the school's tower at its centre | The gate gesture itself: "you have to draw a zero" | Over 1 GB of sources shipped as 10 MB, 60 fps on a budget Android, four months (same secondary source) | A gesture native to the subject is what people describe. A gate in front of the facts is what the brief bans |
| **Cursor Camp**, neal.fun (launched about 29 Apr 2026) ([PC Gamer](https://pcgamer.com/games/mmo/the-creator-of-infinite-craft-has-a-new-game-where-you-explore-a-secret-filled-social-hub-as-your-mouse-cursor/); [Aftermath](https://aftermath.site/cursor-camp-impressions/)) | Every visitor is a mouse cursor in one shared campsite; no text box, so people coordinate through activities (s'mores, shells, caves) | Find the secrets, with strangers, in real time | "Come find me in here", a place, not a picture | WebSockets for up to 1,000 cursors (a self-reported figure in [a contributor's case study](https://contra.com/p/Q2orOmL7-cursor-camp-a-real-time-multiplayer)) | Presence without chat works. Cursors as avatars are now taken (also [Cursor Party](https://blog.partykit.io/posts/cursor-party)), and visitors can't steer this crew |
| **Unusual Suspects**, neal.fun (2 Sep 2026) ([Boing Boing](https://boingboing.net/2026/09/02/can-you-draw-the-unusual-suspects.html)) | You sketch a suspect from a witness's description with a simple tool | After the cases you see how close your sketch came to the real face ([zeli.app](https://zeli.app/story/49538069), secondary) | The comparison: yours beside the truth | One drawing tool; one reader reports it lags in Firefox on Linux | A short loop that ends in a reveal against the truth is the most shareable shape. Theseus has a truth to reveal: its real record |
| **Endless glass xylophone**, Sujen Phea on Codrops (4 Aug 2026) ([Codrops](https://tympanus.net/codrops/2026/08/04/building-an-endless-interactive-glass-xylophone-with-three-js/)) | Sweep the cursor across a helix of frosted glass bars; each rings, swings and floods with colour | Scroll adds bars forever: 64 instanced bars cycling | A screen recording with sound | Instancing, a fluid simulation as a colour mask, glass faked in the shader | Sweep-to-play is instant and fun. It is also the exact precedent for a "play the planks" sound toy, and it needs sound on: we stay off it |
| **Digital stamp collection**, Marijana Pavlinić on Codrops (9 Jun 2026) ([Codrops](https://tympanus.net/codrops/2026/06/09/building-an-interactive-digital-stamp-collection-with-shaders-postcards-and-playful-inspection/)) | Drag stamps around and inspect them under a shader loupe | Collect and inspect; a postcard "genie" dialog for feedback | A stamp, a postcard | The loupe rebuilds the stamp in an offscreen canvas rather than magnifying the page; arrow keys move it, a native input sets the zoom ([engineered.at summary](https://engineered.at/articles/building-an-interactive-digital-stamp-collection-with-shaders-postcards-and-playful-inspection), secondary) | The proof that a toy can be keyboard-first from the start. The genie captures to a texture, animates, then shows the real accessible dialog: the DOM stays the truth |
| **Bend, Aim, Fling**, Yuri Artiukh on Codrops (1 Sep 2026) ([Codrops](https://tympanus.net/codrops/2026/09/01/bend-aim-fling-turning-the-eiffel-tower-into-a-catapult-with-three-js/)) | Drag the Eiffel Tower back like a spring and let go: it flings a ball across Paris | Aim, release, land at the conference venue | The absurd image, made for the first three.js conference in Paris | Bones and spring wiggle on a model, a physics engine for the flight, Google's 3D tiles | Deforming a known object is the cheapest delight (Pixel's class A). Springs are enough; the brief rules out a physics engine |
| **Yestalgia**, Decathlon (Codrops, 12 Sep 2026) ([Codrops](https://tympanus.net/codrops/2026/09/12/yestalgia-bringing-decathlons-90s-spirit-to-life-through-a-playful-digital-experience/)) | Navigation is a cassette player: each tape is a section | Pick a tape, watch it play into the page | The retro object | GSAP, Lenis, Rive, Tailwind v4, on WordPress in 7 languages | A retro-device menu is becoming a trope. The note worth keeping: it stayed editable by the client |
| **Inside Heron**, Bearplus (Codrops, 12 Oct 2026) ([Codrops](https://tympanus.net/codrops/2026/10/12/heron-ai/)) | (A product site, not a toy) floor plans, redlines and violation marks as the whole visual language | Motion and red appear only when the system finds or acts on something | — | — | Already in our October research; still the closest visual neighbour. Their rule, motion only when the system acts, is our principle 2 |
| **Atelier UI**, Jérémie Nallet (Codrops, 21 Oct 2026) ([Codrops](https://tympanus.net/codrops/?p=124298)) | (A library) WebGL text and media synced to the DOM: liquid and pixel effects on hover | — | — | A fixed full-screen R3F canvas behind the page | WebGL text, liquid hovers and pixel media are now a component kit. Anything from that kit reads as a template |
| **Mineral Collection** (Codrops, 3 Nov 2026) ([Codrops](https://tympanus.net/codrops/2026/11/03/mineral-collection/)) | (A study) minerals designed in Paper's shader panel: dithering, halftone, lens distortion | — | Posters | Midjourney assets, shader presets | Dithered and halftone shader looks are now presets in a design tool. Avoid them as the look |
| **bleibtgleich'26** (Codrops, 23 Sep 2026) ([Codrops](https://tympanus.net/codrops/2026/09/23/bleibtgleich26-a-180-turn-from-brutalism-to-minimalism/)) | A portfolio rebuilt from scratch every year since 2022, this year from brutalism to calm | — | The yearly reveal | Webflow, GSAP, WebGL | The rebuilt-portfolio genre exists (also [Lynn Fisher's archive](https://lynnandtonic.com/archive/)). Ours is rebuilt per sprint by named agents with a record of each plank: the record, not the rebuild, is ours alone |
| **Awwwards Sites of the Day, 1 to 7 Nov 2026** ([Awwwards listing via search](https://www.awwwards.com/websites/sites_of_the_day/)) | Dont Look up game (1 Nov, Developer Award; "a game about the price of attention", per [its Awwwards page](https://www.awwwards.com/sites/dont-look-up-game)); Grids, Obys (2 Nov, Developer); DeepBook, HOLOGRAPHIK (3 Nov); Grail, denormalized (4 Nov); Agrumea Farm, Studio K95 (5 Nov, Developer); ViV (6 Nov, Developer; [Honorable Mention 3 Sep](https://www.awwwards.com/sites/viv), an artist-management identity); Justin Jefferson (7 Nov, Developer; intro animation, a record-books carousel, page transitions, per [its page](https://www.awwwards.com/sites/justin-jefferson)) | | | | One week, one browser game and six brand sites. I could open none of them, so I score none of them |
| **Earlier 2026 winners** for scale | Floema, Bürocratik (Site of the Month May 2026, [Awwwards studio page](https://www.awwwards.com/burocratik/)); Hiroto Sato's portfolio (Site of the Day and Developer Award 17 Jul 2026, 7.24, [Awwwards](https://www.awwwards.com/sites/hiroto-sato)); Oryzo AI (Apr) is in the October research | | | | |
| **Spotify Wrapped 2025** (Dec 2025) ([inkl, reporting Spotify's figures](https://www.inkl.com/news/record-breaking-spotify-wrapped-2025-sees-200m-engage-and-500m-shares-in-a-day)) | Tap through your own year | Ends on a card that is yours | Over 500 million shares in the first day (native shares, screenshots, downloads), up 41%; more than 630 million by the end, company-reported | A product's whole data platform | The share is a single card about one surprising, true thing, and each card stands alone |
| **The Pudding, 2026** (Sizing Chaos, Feb; Comparisons as Predictable as the Sunrise, May; Onomatopoeia Odyssey, Jun) ([webiano](https://webiano.digital/the-pudding-proves-that-a-website-can-still-be-journalism/), secondary) | Play with a real dataset as you read | The finding arrives through your own hands | The finding | Data work, not rendering | Real data you can handle is a toy in itself: the closest kin to a replay of a real record |
| **Product sites, 2026 roundups** ([metabrand](https://www.metabrand.digital/learn/best-startup-website-examples-2026); [themasterly](https://www.themasterly.com/blog/b2b-saas-website-design)) | Cursor's autocomplete demo, Stripe's payment explainer, Linear's product-in-layout | Try a slice of the product on the home page | — | — | Low-rigour roundups, but one consistent finding: show the thing working. Ours is the crew, and the record of what it did |

What I set aside: "tactile maximalism" and "squishy" UI trend pieces (vendor blogs; the one concrete
artefact is [Jelly UI](https://sesamedisk.com/jelly-ui-soft-body-physics-html/), soft-body form
controls as web components, mid 2026, which shows squish is becoming a kit too), and daily-puzzle
share grids, whose 2026 crop is Wordle's form unchanged
([dinogame](https://dinogame.gg/blog/rise-of-daily-web-puzzles/)).

## 2. What makes them memorable, fun and sent on

1. **One gesture from the subject's own world, learnable in a second.** Draw the zero, sweep the
   bars, bend the tower, sketch the face, slot the tape. Nobody explains it, and it's the thing
   people describe when they send the link.
2. **An answer in a material, at once.** Glass rings, a tower wobbles, a stamp warps under the
   loupe. The response says what the thing is made of, in under 100 ms.
3. **A short loop that ends in a reveal against the truth.** Unusual Suspects shows your sketch
   beside the real face; Wrapped ends on your top artist; Why Zero lands on the city. Toys without
   an ending (the xylophone, a squishy button) are played, not sent.
4. **A share that is one frame, and a URL that reproduces it.** Wrapped's cards stand alone; a link
   to one moment beats a link to the start.
5. **Shared presence or a shared question.** Cursor Camp is people; Bruno's shared weather
   (October research) is a shared clock. A question everyone can answer is the cheap version.
6. **Built for the cheap phone.** Why Zero's 60 fps on a budget Android is part of why it won the
   Developer award.

## 3. Newly taken by late 2026 (add to the October list)

| Taken | Where | So Theseus avoids |
|---|---|---|
| Cursors as avatars, multiplayer presence by cursor | Cursor Camp (Apr), Cursor Party | Any visitor cursor on the hull |
| Sweep-to-play sound toys | The glass xylophone (Aug) | Playing the planks as an instrument |
| Retro-device menus | Yestalgia's cassettes (Sep) | Drawers, dials or cranks as navigation |
| Preset shader looks: dither, halftone, liquid hover, pixel media | Paper's shader panel (Nov), Atelier UI (Oct) | A shader look as the style |
| Squish as a UI kit | Jelly UI (mid 2026) | Squishy controls |
| Draw-to-enter gates | Why Zero (Sep) | Any gesture in front of the facts |

## 4. What this means for a playable Theseus

- **The record is the toy.** No neighbour can copy 51 sprints with real authors, real failures and
  real approvals. A toy that lets a visitor handle that record, at their own pace, is original by
  construction and honest by principle 2.
- **The gesture is the shipwright's: seat a plank.** It is native, it is one press, and it maps to
  the unit of the crew's work.
- **The reveal is Hobbes's question, made literal.** At sprint 23 the last original plank leaves;
  the planks taken out make a whole second ship with the same 22 numbers. "Which one is the
  Theseus?" is a question everyone can answer and nobody can settle: the share.
- **The share is a card per sprint**, at a URL that reproduces that moment (`/log/23`).
- **Presence stays the crew's.** The replay ends where the live layer begins; visitors watch, never
  steer.
- **Keep it off the five-second screen.** The October research's novelty budget names an archive
  moment; that slot is where a toy fits without changing the brief.

The directions, the recommendation and the first slice are in `direction-iris.md` beside this file;
the canvas is linked at its top.
