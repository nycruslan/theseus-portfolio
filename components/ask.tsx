"use client";

import { type FormEvent, useRef, useState } from "react";

type Exchange = { question: string; answer: string; done: boolean };

const STARTERS = [
  "What scale has Ruslan led AI at?",
  "How does he keep agents safe in production?",
  "What broke, and what did he change?",
  "Why build a crew of AI agents for his own site?",
];

// The question and answer record behind /ask. Answers stream into a polite live region, so a screen
// reader hears them, and earlier turns go back to the server as the conversation's history.
export function Ask({ fallback }: { fallback: string }) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const update = (answer: string, done: boolean) =>
    setExchanges((all) => [
      ...all.slice(0, -1),
      { ...(all.at(-1) as Exchange), answer, done },
    ]);

  async function ask(question: string) {
    const history = exchanges.flatMap(({ question: q, answer }) => [
      { role: "user", content: q },
      { role: "assistant", content: answer },
    ]);
    setBusy(true);
    setDraft("");
    setExchanges((all) => [...all, { question, answer: "", done: false }]);
    let answer = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: question }],
        }),
      });
      if (!response.ok || !response.body) throw new Error(`${response.status}`);
      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        update(answer, false);
      }
      update(answer || fallback, true);
    } catch {
      // A rate limit, or the network gone: the visitor still has a way forward.
      update(answer ? `${answer}\n\n${fallback}` : fallback, true);
    }
    setBusy(false);
    input.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (question && !busy) void ask(question);
  }

  return (
    <div className="sched-body">
      {exchanges.length === 0 ? (
        <div className="ask-starters">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              className="ask-starter"
              onClick={() => void ask(starter)}
            >
              {starter}
            </button>
          ))}
        </div>
      ) : (
        <div aria-live="polite">
          {exchanges.map((exchange, index) => (
            // Turns only ever append, so the index is stable.
            // biome-ignore lint/suspicious/noArrayIndexKey: an append-only list
            <div key={index} className="ask-turn">
              <h3>{exchange.question}</h3>
              <p className="ask-answer">
                {exchange.answer ||
                  (exchange.done ? null : (
                    <span className="ask-wait">Reading the record</span>
                  ))}
              </p>
            </div>
          ))}
        </div>
      )}

      <form className="ask-form" onSubmit={submit}>
        <label htmlFor="ask-question">Your question</label>
        <input
          id="ask-question"
          ref={input}
          value={draft}
          maxLength={500}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="ask-submit"
          disabled={busy || !draft.trim()}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
