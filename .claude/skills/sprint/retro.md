# The sprint's retro.json

Every sprint closes with `.crew/sprint/<n>/retro.json`: a few fields measured the same way every
sprint, so model and lane choices can follow the data.

```json
{
  "sprint": 5, "pr": 18, "goal": "…", "goalFrom": "roadmap", "size": "M", "outcome": "merged",
  "fixRounds": 0,
  "minutes": 24,
  "agents": [{ "role": "engineer", "model": "opus", "tokens": 182000, "minutes": 9 }],
  "lens": { "runs": 1, "tokens": 96000, "important": 0, "actedOn": 0, "nits": 2 },
  "wentWrong": [{ "what": "…", "evidence": "…" }],
  "proposals": [{ "change": "…", "moves": "…" }],
  "followUps": [{ "who": "Probe", "what": "…" }]
}
```

- `goal`, `size`, `pr` and each `wentWrong.what` are public: `/sprints` prints them, and a malformed
  retro fails the build (`lib/sprint-log.ts`). Write them as copy a visitor reads.
- `goalFrom`: `owner` when the owner chose the goal, otherwise `roadmap`.
- `agents`: each agent that worked, with the model its file sets (`opus`) and the tokens
  and minutes from its result.
- `lens`: Lens's runs and findings, with the tokens from the footer of each review it posted.
- `wentWrong`: at most three things, each with its evidence.
- `proposals`: setup changes, each with the number it should move. Never apply them.
- `followUps`: what's left open, and whose it is.

Sprints before 5 used an older shape (snake_case fields such as `went_wrong`); leave those as they
are.
