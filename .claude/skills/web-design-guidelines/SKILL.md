---
name: web-design-guidelines
description: Audits UI code against Vercel's Web Interface Guidelines, covering accessibility, focus, animation, typography, images, performance, touch, theming and copy. Use when reviewing UI or UX, checking accessibility, or before handing a visual change to review.
---

# Web Interface Guidelines

The rules are in [guidelines.md](guidelines.md): Vercel's Web Interface Guidelines, pinned to one
reviewed version so a review never runs on text nobody read (Vercel's own skill fetches them fresh
on every run). Update the copy by hand.

Read the files under review, or the ones a change touched, and check them against every rule that
can apply. Report findings grouped by file as `file:line - issue`, as the guidelines' output format
says, and skip rules for things the page doesn't have (forms, locale switching).

Where a rule conflicts with the owner's facts in `content/`, with `design/rubric.md` or with
`design/brief.md`, those win: the copy rules, for example, never rewrite the owner's own words.
