/**
 * The desktop build: the game packaged inside a desktop app, which serves the
 * built files from its own disk and updates by shipping a new app.
 *
 * `VC_DESKTOP=1 npm run build` makes one. The page then registers no service
 * worker and polls for no update (src/pwa.ts), offers no Install anywhere
 * (src/pwaInstall.ts `isStandalone`), shows no Sponsor link
 * (src/ui/splashTemplate.ts `sponsorOffered`), and sends no analytics
 * (src/telemetry.ts `telemetryHostAllowed`). Everything else, the game and
 * its saves included, is the same build players get on the web. The page reads
 * the flag through src/deployTarget.ts, and the build's `version.json` carries
 * `"desktop": true` so the app's packaging can refuse a web build.
 *
 * Keep this file ERASABLE (see screenshot-env.ts) so `node` can import it.
 */

/** Whether this build is the desktop build. Fails on a misspelled value
 *  (`VC_DESKTOP=true` would quietly build the web game) and on a Vercel build,
 *  since a deploy with no service worker, Install or analytics must never
 *  reach the website. */
export function isDesktopBuild(env: Readonly<Record<string, string | undefined>>): boolean {
  const raw = env.VC_DESKTOP;
  if (raw === undefined || raw === "") return false;
  if (raw !== "1")
    throw new Error(`VC_DESKTOP must be "1" or unset; got "${raw}". Use VC_DESKTOP=1 for a desktop build.`);
  if (env.VERCEL)
    throw new Error(
      "VC_DESKTOP=1 is set in a Vercel build. The desktop build is for a packaged desktop app only; remove VC_DESKTOP from the Vercel environment.",
    );
  return true;
}
