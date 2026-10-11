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

## Pass bar

- Every criterion scores at least **6**, and the weighted score is at least **7**.
- It's **better than production**, or at least not worse, when compared side by side at the same viewports.

## Fails on sight ("AI slop")

- Purple-to-blue gradients, glassmorphism or glow without a reason
- Generic hero copy and centered-everything layouts
- Emoji as icons or bullets
- Uniform rounded cards for everything
- Motion that decorates instead of guiding, or that ignores `prefers-reduced-motion`
- Low-contrast gray text on gray
