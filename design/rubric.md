# Design rubric

Iris scores every sprint against this rubric. The weights favor what a model tends to skip:
taste and originality, not only working code.

| Criterion | Weight | 10 means |
|---|---|---|
| **Design quality** | ×2 | Color, type, layout and imagery form one coherent whole with a distinct mood. |
| **Originality** | ×2 | Deliberate creative choices. It doesn't look like a template or a library default. |
| **Craft** | ×1 | Type hierarchy, spacing rhythm, alignment, contrast and responsive details are precise. |
| **Functionality** | ×1 | Content is easy to scan, actions are obvious, and it works on mobile, keyboard and reduced motion. |

**Weighted score** = (2 × design quality + 2 × originality + craft + functionality) / 6

## Hard gates (pass or fail, before any score)

Any one failing is `Verdict: changes`, whatever the score.
- No placeholder renders: no `TODO(owner)` text, and none of the seed's stand-ins ("Company name").
- axe finds no serious or critical issues.
- impeccable's detector reports nothing at error level.
- Reduced motion: nothing moves that isn't essential, and nothing is lost.
- It reflows at 320 px wide with no horizontal scrolling.
- Phone budget: the largest content paints within 2.5 s on a mid phone, and nothing shifts after
  load.

## First verdict: compared with production

Before scoring, look at production and the change side by side at the same viewports (390, 1024
and 1440 px). Say whether it's **better**, **the same** or **worse**. Worse fails, whatever the
score.

## Pass bar

- Every criterion scores at least **6**, and the weighted score is at least **7**.
- Iris's scores count once they match the owner's scored examples in `design/calibration/`
  within one point. Until then her verdict is advisory, and large visual work goes to the owner.

## Fails on sight ("AI slop")

- Purple-to-blue gradients, glassmorphism or glow without a reason
- Generic hero copy and centered-everything layouts
- Emoji as icons or bullets
- Uniform rounded cards for everything
- Motion that decorates instead of guiding, or that ignores `prefers-reduced-motion`
- Low-contrast gray text on gray
