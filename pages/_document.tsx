import { Head, Html, Main, NextScript } from "next/document";
import { bodyAttributes, htmlAttributes } from "@/app/document";

// The Pages Router's document, for its one page, the trials' frame (pages/trials/frame.tsx): the
// root and body the App Router's layout gives every other page. NextScript writes nothing for a
// page without runtime JavaScript.
export default function Document() {
  return (
    <Html {...htmlAttributes}>
      <Head />
      <body {...bodyAttributes}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
