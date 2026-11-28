/**
 * The desktop build: the game packaged inside a desktop app, which serves the
 * built files from its own disk and updates by shipping a new app.
 *
 * `npm run build:desktop` makes one: the game's build and then the manual's
 * (help-site/), both with `VC_DESKTOP=1`. The page then registers no service
 * worker and polls for no update (src/pwa.ts), offers no Install anywhere
 * (src/pwaInstall.ts `isStandalone`), shows no Sponsor link
 * (src/ui/splashTemplate.ts `sponsorOffered`), and loads no Vercel page
 * scripts while its events still go to `/api/ingest` on whatever host serves
 * it (src/telemetry.ts); the manual offers no Sponsor
 * item (src/ui/helpSiteMenu.ts) and saves no offline worker
 * (src/manual/manualOffline.ts). Everything else, the game and
 * its saves included, is the same build players get on the web. The page reads
 * the flag through src/deployTarget.ts, and the build's `version.json` carries
 * `"desktop": true` so the app's packaging can refuse a web build.
 *
 * Keep this file ERASABLE (see screenshot-env.ts) so `node` can import it.
 */

/** Whether this build is the desktop build. Fails on a misspelled value
 *  (`VC_DESKTOP=true` would quietly build the web game) and on a Vercel build,
 *  since a deploy with no service worker, Install or page telemetry must never
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
