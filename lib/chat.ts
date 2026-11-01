// What the assistant's page and its route agree on. Apart from lib/assistant.ts so the page doesn't
// bundle the model's SDK.

/** Past this many turns, older ones are dropped. Odd, so the kept history starts with a question. */
export const HISTORY_TURNS = 11;

/** Long enough for the longest answer the request allows (2,000 tokens) to come back as history. */
export const TURN_MAX_CHARS = 10_000;
