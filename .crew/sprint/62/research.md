# What playful sites are doing now, second round (late 2026)

Iris, 2026-11-10, for sprint 62 ("the next cool thing, beyond the yard"). This builds on sprint
52's round (`.crew/sprint/52/research.md`, 2026-11-07) and doesn't repeat it. Its findings hold:
one gesture from the subject's own world, an answer in a material at once, a short loop that ends
in a reveal against the truth, a share that is one frame at a URL that reproduces it, and a toy
built for the cheap phone. Its "taken" list holds too (cursors as avatars, sweep-to-play sound
toys, retro-device menus, preset shader looks, squishy UI, draw-to-enter gates).

**Method, and its limit.** Every pick below was found with web search on 2026-11-10. This session
can't open awwwards.com, thefwa.com, cssdesignawards.com or tympanus.net (all four fail to resolve
from the cloud sandbox; Vercel preview hosts are refused by its proxy too), so award entries are
confirmed from search listings (title, date, tags), Codrops pieces from their search excerpts, and
anything marked *secondary* from a third party's write-up. I played none of them. thefwa.com and
CSSDA returned nothing usable through search either, so this round cites no FWA or CSSDA winner.

## 1. What changed in three days

Very little. Sprint 52's round is three days old, and the field moves by weeks:

| New since 2026-11-07 | What it is | For Theseus |
|---|---|---|
| Awwwards Site of the Day, 8 Nov: **Extrafazant** ([Awwwards listing via search](https://www.awwwards.com/sites/extrafazant)) | An animation and video studio from Tilburg, "visual content for brands that aren't afraid to stand out" | A studio reel site. Nothing to play |
| Awwwards Site of the Day, 9 Nov: **ZIRKA Interceptor** ([Sites of the Day listing via search](https://www.awwwards.com/websites/sites_of_the_day/)) | Search finds only the listing's title and date | I can't say what it is, so I score nothing |
| Codrops, 5 Nov: **Mathias Adolfsson '26** ([Codrops via search](https://tympanus.net/codrops/?p=125103)) | A portfolio: projects bent into an arc, each opening into a barrel-shaped gallery; Nuxt, three.js WebGPU, GSAP | The curved carousel and the barrel gallery are now the studio-portfolio default for a case-study index |
| Codrops, 9 Nov: **Au-rel.io** (Codrops listing via search) | A portfolio on a twelve-column grid with masked reveals, cursor-led page transitions and an interactive self-portrait | Masked reveals and cursor-led transitions are the other default. Our case studies stay familiar, as the brief says |
| Codrops, 4 Nov: **Brandon Yasin** (Codrops listing via search) | An editorial portfolio designed in Figma, animated with GSAP | The quiet editorial lane ('kin's in calibration) is crowded and well made |
| Codrops, 1 Nov: **Design systems and agents** ([Codrops via search](https://tympanus.net/codrops/2026/11/01/design-systems-agents/)) | A guide for designers building with AI agents, "keeping human judgment central" | Agents in the design process are now a topic, not a novelty. A crew that shows its own judgment record is still rare |
| Codrops Creative Hub, 1 to 8 Nov (listing via search) | Demos: Moss and Fold (Ricardo Cabello, TSL and WebGPU), Melt (Jaume Sanchez), Discography, Splat Walk, Record Player | TSL on WebGPU is the house style of the newest demos. Pixel's sprint 52 headroom still rules it out for us: three/webgpu is over the chunk's budget |

So this round widens the lens rather than the dates. The yard plays with **what** the crew built.
The question for the next toy is what else people play with, and what the crew's record has that
nobody else's does.

## 2. Five kinds of thing the last round didn't cover

| Pick (date) | What you do | Memorable, playable, shareable | What it costs | For Theseus |
|---|---|---|---|---|
| **Pixel Agents** (2026), and its forks Pixel Agent Desk and pixtuoid ([GitHub](https://github.com/martinmunozhr/pixel-agents), [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fpablodelucca%2Fpixel-agents)) | Each Claude Code session becomes a pixel character in an office; it walks to a desk and acts out what the agent is doing, read from the session's transcript | Instantly charming, and the most-copied way to show agents working. It shows activity, never judgment | A VS Code extension, a bought tileset, transcript parsing | **Taken:** agents as characters in an office. Our crew is shown by its record, not by avatars, and visitors only watch |
| **AI Village** (2025 to 2026) ([timeline](https://theaidigest.org/village/timeline), [how it works](https://theaidigest.org/village/blog/how-the-ai-village-works)) | Watch agents chase a weekly goal in public (raise money for a charity, build a game, run an event), with a timeline of goals | The closest neighbour to a crew in public. Its interest is the agents fumbling | A research org's whole operation | Its agents are unsupervised and compete; ours are governed, by checks, review and a gate. That governance is what nobody else shows |
| **Cursor's Year in Code 2025** ([forum](https://forum.cursor.com/t/view-your-year-2025-in-cursor/146960)); **GitHub Wrapped 2025** ([Product Hunt](https://www.producthunt.com/p/github-wrapped-2024-your-year-in-code/github-wrapped-2025)) | A page of your own year: messages, coding days, tokens | Wrapped's form applied to code; the token count is the brag | A product's usage data | **Taken:** a tokens-and-days stat page. A "crew wrapped" would be a copy |
| **Git of Theseus**, Erik Bernhardsson (Dec 2016), named for our ship ([his post](https://erikbern.com/2016/12/05/the-half-life-of-code), [GitHub](https://github.com/erikbern/git-of-theseus); ports in Go, Rust and TypeScript) | Charts how much of a repository's code from each cohort still survives, as stacked strata, and its half-life | The ship of Theseus applied to git, already: "does the new code just add on top of the old code? Or does it replace the old code slowly over time?" | A Python script over `git blame` | **Taken**, the chart and the name. Any code-survival picture on this site is his idea unless it adds a gesture he doesn't have |
| **Git City** (srizzon, covered April 2026) and its copies GitCity and Git World ([Duke DDMC](https://sites.duke.edu/ddmc/2026/04/13/we-built-this-github-city-on-rock-and-roll/), [GitHub](https://github.com/lohithb26/git-city)) | Your GitHub profile becomes a building in a shared 3D city; one copy lets you drive through it | A data city is a picture everyone gets | Public GitHub stats, a 3D city | **Taken**, and already copied twice in a season. Data cities are a kit |
| **Lynn Fisher's annual refresh**, 2025 edition ([case study, secondary](https://fooqux.com/article/3333); her 2017 notes on [andyet.com](https://blog.andyet.com/2018/01/09/case-study-lynnandtonic-refresh/)) | Resize the browser and the illustrated page stretches and squashes, a different design at every breakpoint | Resizing is the play. In her words, "a lot of people that view my site are other designers and developers who probably, like me, resize every site to see how responsive it is" | One person's craft, every year, desktop only (it reverts to a plain layout under 500 px) | The peers `PRODUCT.md` names second do this on every award site. Resize-as-delight is hers; resize-as-proof, where the page answers with the truth about itself, is open |
| **The Pudding's mowing experiment** (game June 2026, results 4 Aug) ([pudding.cool](https://pudding.cool/2026/06/mow/); [FlowingData](https://flowingdata.com/2026/08/05/lawn-mowing-game-as-traveling-salesman-problem-in-disguise/), [Gigazine](https://gigazine.net/gsc_news/en/20260806-mow-a-lawn-better/), secondary) | Mow five lawns by keyboard, then see the shortest route and how 30,954 others did | The year's clearest "play, then see how you compare". 16% found the optimum on the biggest lawn | A keyboard game and a data story | Push against something real, then get the truth back. The truth here is the crew's own measurements |
| **Product sites, 2026 roundups** ([vezadigital](https://vezadigital.com/post/best-saas-homepage-design-examples), [colorlib](https://colorlib.com/wp/?p=368351); low rigour, vendor blogs) | "Say one thing clearly, prove it instantly, show the product in action"; interactive demos and self-serve walkthroughs on the home page | One consistent finding across them: let the visitor try the thing | — | The crew's product is verified change. The part a board most needs to trust is the verifying |

What I set aside: daily puzzles (still Wordle's form), Spotify Wrapped 2026 (not out until
December), "interactive website" listicles, and midterm prediction games (Newsweek's, the Boston
Globe's), which show that "call it yourself, then see" travels but are about elections.

## 3. Newly taken (add to sprint 52's list)

| Taken | Where | So Theseus avoids |
|---|---|---|
| Agents as characters in a shared office | Pixel Agents and forks (2026) | Any avatar, desk or walking figure for Atlas, Iris and the rest |
| A "wrapped" stats page of tokens and days | Cursor, GitHub Wrapped (Dec 2025) | A crew-wrapped page of token counts |
| Code survival as stacked strata | Git of Theseus (2016) | Strata of code by sprint as the picture |
| Data cities | Git City and copies (2026) | Towers, cities or terrains of commits |
| Curved project carousels and barrel galleries | Mathias Adolfsson '26 (Nov) | Bending the case studies |
| Masked reveals and cursor-led transitions | Au-rel.io (Nov), a studio default | Those on any page |
| Resize-to-stretch layouts | Lynn Fisher (2025) | A layout that squashes for fun as you resize |

## 4. What this means for the next toy

- **The yard covered the record of what was built.** The record of how each plank was proven is
  the part no neighbour has: AI Village's agents aren't checked, Pixel Agents shows activity, and
  Wrapped counts tokens. This crew writes the checks first, measures every window, and says where
  it gave up.
- **The peers resize every site anyway.** Lynn Fisher built play on that habit; nobody has made the
  page answer it honestly, with its own measurements and the record of who made each answer true.
- **Play-then-compare is still the most shareable shape** (the mowing experiment, Unusual
  Suspects). The truth to compare against is real and measured here: the crew's windows, its
  margins, its accepted gaps.
- **Keep it cheap.** The newest demos run TSL on WebGPU, which our budget can't carry; a toy that
  needs no new 3D at all is a strength this season, not a compromise.

The directions, the recommendation and the measurements behind it are in `direction-iris.md`
beside this file; the canvas is linked at its top.
