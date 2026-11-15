import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "@playwright/test";
import { installRgba } from "./helpers";
import { refuseWebGl } from "./webgl";

// The contexts a check opens a page in, and a reader's own default font: shared by the trials'
// doors (trials-doors.spec.ts, T22 to T26) and a large font's page (large-font.spec.ts, T27). Moved
// here from the doors' spec, which had them first. No assertions live here, so each spec keeps its
// own count (.crew/scope.mjs).

/** A context with scripts on or off, WebGL refused, in a scheme; web fonts refused if `blocked`. */
export async function contextOf(
  browser: Browser,
  options: {
    width: number;
    height: number;
    scheme?: "light" | "dark";
    scripts?: boolean;
    blocked?: boolean;
  },
) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: options.width, height: options.height },
    colorScheme: options.scheme ?? "light",
    javaScriptEnabled: options.scripts ?? true,
  });
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
  const aborted = { count: 0 };
  if (options.blocked)
    await context.route(/\.woff2(\?|$)/, (route) => {
      aborted.count += 1;
      return route.abort();
    });
  return { context, page: await context.newPage(), aborted };
}

/**
 * The reader's default font, Chrome's setting (Medium 16, Large 20, Very large 24), through CDP's
 * Page.setFontSizes before the page loads: rem and a media query's rem follow it. Assert the root's
 * computed font-size took (sprint 67, T25).
 */
export async function setDefaultFont(
  context: BrowserContext,
  page: Page,
  size: number,
) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: size } });
}
