// A file imported with `?raw` is its text (next.config.ts's Turbopack rule).
declare module "*?raw" {
  const text: string;
  export default text;
}
