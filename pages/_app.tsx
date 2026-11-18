import type { AppProps } from "next/app";
// What the App Router's layout loads for every page: the site's stylesheet and the text face, whose
// variable pages/_document.tsx puts on the root. A face's CSS ships only from a module the page's
// own graph imports, and the document isn't in it.
import "@/app/document";
import "@/app/globals.css";

// The Pages Router's app, for its one page, the trials' frame (pages/trials/frame.tsx).
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
