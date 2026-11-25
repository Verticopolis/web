import { readFileSync } from "node:fs";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { expectEngineHosted } from "./helpers";

/**
 * The 1994 desk in a real browser: a computer gets the tower, Info, Tools,
 * the Map and the Bulletin as windows on a teal desk with a taskbar. Windows
 * minimize to the taskbar and come back from it, the tower maximizes and
 * resizes, the Control Panel opens from the tray, a sideways tablet gets it
 * with touch chrome, a touch phone gets the pocket desk, a phone without touch
 * never gets it, and `?desk=on` brings it to a smaller screen (there is no
 * player switch; `?desk=off` is for testing).
 * The other specs turn the desk off through the config's storageState; this
 * one clears that.
 */

test.use({ storageState: { cookies: [], origins: [] } });

// Every test that reaches a tower must end with it still on the engine.
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => !document.getElementById("splash"))) await expectEngineHosted(page);
});

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

type Box = { x: number; y: number; width: number; height: number };

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error("no box");
  return b;
}

/** Load the game and wait for its handle, leaving the title screen up. */
async function load(page: Page, url = "/"): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => Boolean(window.game));
  await expect(page.locator("#boot-cover")).toHaveCount(0);
}

/** Leave the title screen the way a player does, from its first button. */
async function enterTower(page: Page): Promise<void> {
  await page.locator('#splash [data-splash="continue"], #splash [data-splash="new"]').first().click();
  // A first visit founds a tower: take the rule-set the dialog offers.
  const found = page.locator('[data-act="found"]');
  if (await found.isVisible().catch(() => false)) await found.click();
  await page.evaluate(() => document.getElementById("onboard")?.remove());
  await expect(page.locator("#splash")).toHaveCount(0);
}

/** Click the center of `locator` with the mouse. */
async function press(page: Page, locator: Locator): Promise<void> {
  const b = await box(locator);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

/** Drag from a point near the left of `locator` by (dx, dy). */
async function drag(page: Page, locator: Locator, dx: number, dy: number): Promise<void> {
  const b = await box(locator);
  const x = b.x + Math.min(30, b.width / 2);
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}

const body = (page: Page) => page.locator("body");
const task = (page: Page, id: string) => page.locator(`.desk-task[data-win="${id}"]`);

test.describe("the desk on a computer", () => {
  test.use({ viewport: DESKTOP });

  test("the title screen sits in its own window, and entering a tower opens the desk", async ({ page }) => {
    await load(page);
    await expect(body(page)).toHaveClass(/\bdesk-title\b/);
    await expect(page.locator(".desk-title-bar")).toBeVisible();
    await expect(page.locator(".desk-taskbar-title")).toBeVisible();
    await enterTower(page);
    await expect(body(page)).toHaveClass(/\bdesk\b/);
    await expect(body(page)).not.toHaveClass(/\bdesk-title\b/);
    for (const id of ["#desk-win-tower", "#desk-win-info", "#overview-map", "#bulletin-win"])
      await expect(page.locator(id)).toBeVisible();
    for (const id of ["tower", "info", "tools", "map", "bulletin"]) await expect(task(page, id)).toHaveCount(1);
  });

  test("the title screen opens the Control Panel over its window, under the menus", async ({ page }) => {
    await load(page);
    const panel = page.locator("#desk-win-control");
    await expect(panel).toBeHidden();
    await press(page, page.locator(".desk-taskbar-title .desk-start"));
    await press(page, page.locator('.desk-start-menu [data-item="desk-control-panel"]'));
    await expect(panel).toBeVisible();
    // Over the title window, so a click reaches its icons.
    const display = panel.locator('[data-control="display"]');
    const hit = await display.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    });
    expect(hit).toBe(true);
    // A menu opens on top of it.
    await press(page, page.locator("#mb-options"));
    const item = page.locator("#mb-control-panel");
    await expect(item).toBeVisible();
    const onTop = await item.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    });
    expect(onTop).toBe(true);
    await page.keyboard.press("Escape");
    await press(page, panel.locator(".desk-btn-close"));
    await expect(panel).toBeHidden();
    // The tray's monitor opens it too.
    await press(page, page.locator(".desk-taskbar-title .desk-tray-display"));
    await expect(panel).toBeVisible();
  });

  test("a window minimizes to the taskbar and comes back from it", async ({ page }) => {
    await load(page);
    await enterTower(page);
    const map = page.locator("#overview-map");
    await press(page, page.locator("#overview-map .desk-btn-min"));
    await expect(map).toBeHidden();
    await expect(task(page, "map")).toHaveAttribute("aria-pressed", "false");
    await press(page, task(page, "map"));
    await expect(map).toBeVisible();
    await expect(task(page, "map")).toHaveAttribute("aria-pressed", "true");
    // The front window's own button minimizes it.
    await press(page, task(page, "map"));
    await expect(map).toBeHidden();
  });

  test("the tower maximizes and restores, and its grip makes it smaller", async ({ page }) => {
    await load(page);
    await enterTower(page);
    const tower = page.locator("#desk-win-tower");
    const home = await box(tower);
    await press(page, page.locator("#desk-win-tower .desk-btn-max"));
    const full = await box(tower);
    expect(full.width).toBeGreaterThan(home.width);
    expect(full.height).toBeGreaterThan(home.height);
    await press(page, page.locator("#desk-win-tower .desk-btn-max"));
    await expect.poll(async () => Math.round((await box(tower)).width)).toBe(Math.round(home.width));
    await drag(page, page.locator("#desk-win-tower > .desk-grip"), -200, -120);
    const smaller = await box(tower);
    expect(smaller.width).toBeLessThan(home.width - 150);
    expect(smaller.height).toBeLessThan(home.height - 80);
  });

  test("a moved window keeps its place across a reload", async ({ page }) => {
    await load(page);
    await enterTower(page);
    const bulletin = page.locator("#bulletin-win");
    const before = await box(bulletin);
    await drag(page, page.locator("#bulletin-win > .win-title"), -400, 40);
    const moved = await box(bulletin);
    expect(moved.x).toBeLessThan(before.x - 350);
    await page.reload();
    await page.waitForFunction(() => Boolean(window.game));
    await enterTower(page);
    const after = await box(bulletin);
    expect(after.x).toBeCloseTo(moved.x, 0);
    expect(after.y).toBeCloseTo(moved.y, 0);
  });

  test("the Start menu opens, moves by arrow keys and closes on Escape", async ({ page }) => {
    await load(page);
    await enterTower(page);
    const menu = page.locator("#desk-start-menu");
    await press(page, page.locator(".desk-start"));
    await expect(menu).toBeVisible();
    await expect(menu.locator(".mb-item").first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.locator(".mb-item").nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.locator(".desk-start")).toBeFocused();
  });

  test("Options keeps Settings and Sound, and its Control Panel… opens the panel from the keyboard", async ({
    page,
  }) => {
    await load(page);
    await enterTower(page);
    await page.keyboard.press("Alt+o");
    const options = page.locator("#mb-options-menu");
    await expect(options).toBeVisible();
    const shown = options.locator(".mb-item:visible, .mb-sep:visible");
    await expect(shown).toHaveCount(4);
    await expect(options.locator(".mb-item:visible")).toHaveText(["Settings…", "Sound", "Control Panel…"]);
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#mb-control-panel")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#desk-win-control")).toBeVisible();
    await expect(page.locator('#desk-win-control [data-control="display"]')).toBeFocused();
    // A screen too small for the desk gives Options all of its items back.
    await page.setViewportSize(PHONE);
    await page.locator("#mb-options").click();
    await expect(page.locator("#mb-screensaver")).toBeVisible();
    await expect(page.locator("#mb-appearance")).toBeVisible();
    await expect(page.locator("#mb-control-panel")).toBeHidden();
  });

  test("no window is ever lost: Info and Tools never close, and the Window menu brings back a closed or minimized one", async ({
    page,
  }) => {
    await load(page);
    await enterTower(page);
    await expect(page.locator("#desk-win-info .desk-btn-close")).toHaveCount(0);
    await expect(page.locator("#palette .desk-btn-close")).toHaveCount(0);
    await press(page, page.locator("#overview-map .overview-map-close"));
    await expect(page.locator("#overview-map")).toBeHidden();
    await press(page, page.locator("#desk-win-info .desk-btn-min"));
    await press(page, page.locator("#palette .desk-btn-min"));
    await expect(page.locator("#desk-win-info")).toBeHidden();
    await expect(page.locator("#palette")).toBeHidden();
    for (const [item, win] of [
      ["#mb-dw-map", "#overview-map"],
      ["#mb-dw-info", "#desk-win-info"],
      ["#mb-dw-tools", "#palette"],
    ]) {
      await press(page, page.locator("#mb-window"));
      await press(page, page.locator(item));
      await expect(page.locator(win)).toBeVisible();
    }
  });

  test("a right-click on a taskbar button opens the window menu, and its Minimize sends the window down", async ({
    page,
  }) => {
    await load(page);
    await enterTower(page);
    const b = await box(task(page, "map"));
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" });
    const menu = page.locator(".desk-win-menu");
    await expect(menu).toBeVisible();
    await expect(menu.locator('[data-command="maximize"]')).toBeDisabled();
    await press(page, menu.locator('[data-command="minimize"]'));
    await expect(menu).toBeHidden();
    await expect(page.locator("#overview-map")).toBeHidden();
  });

  test("the Control Panel opens from the tray, with no Desktop switch, and Options has none either", async ({
    page,
  }) => {
    await load(page);
    await enterTower(page);
    await press(page, page.locator(".desk-tray-display"));
    const panel = page.locator("#desk-win-control");
    await expect(panel).toBeVisible();
    await expect(task(page, "control")).toHaveCount(1);
    await expect(panel.locator(".desk-control-icon")).toHaveCount(4);
    await expect(page.locator("#mb-desk")).toHaveCount(0);
  });
});

test.describe("the desk on a computer-sized touch screen", () => {
  test.use({ viewport: DESKTOP, hasTouch: true });

  test("a sideways tablet gets the full desk with touch chrome", async ({ page }) => {
    await load(page);
    await expect(body(page)).toHaveClass(/\bdesk-title\b/);
    await enterTower(page);
    await expect(body(page)).toHaveClass(/\bdesk\b/);
    await expect(body(page)).toHaveClass(/\bdesk-touch\b/);
    await expect(body(page)).not.toHaveClass(/\bdesk-pocket\b/);
  });
});

test.describe("the desk on a touch phone", () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test("a phone gets the title screen in a window on the pocket desk, then the pocket desk: the tower window holds Info, Tools and the tower, the Map floats in the tower's view", async ({
    page,
  }) => {
    await load(page);
    await expect(body(page)).toHaveClass(/\bdesk-title\b/);
    await expect(body(page)).toHaveClass(/\bdesk-title-pocket\b/);
    await expect(page.locator(".desk-title-bar")).toBeVisible();
    await enterTower(page);
    await expect(body(page)).not.toHaveClass(/\bdesk-title\b/);
    await expect(body(page)).toHaveClass(/\bdesk-pocket\b/);
    await expect(body(page)).toHaveClass(/\bdesk-touch\b/);
    const grid = page.locator("#desk-win-tower .desk-pocket-body");
    await expect(grid.locator("> #topbar")).toHaveCount(1);
    await expect(grid.locator("> #palette")).toHaveCount(1);
    await expect(grid.locator("> #stage")).toHaveCount(1);
    await expect(page.locator("#stage > #overview-map")).toBeVisible();
    const map = await box(page.locator("#overview-map .overview-map-body"));
    expect(Math.round(map.width)).toBe(150);
    expect(Math.round(map.height)).toBe(216);
  });
});

test.describe("the pocket desk in the installed app on a phone", () => {
  test.use({ viewport: PHONE, isMobile: true, hasTouch: true });

  test("Window and Options end on an item, with no line left over Full Screen", async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) => real(q.includes("display-mode: standalone") ? "all" : q);
    });
    await load(page);
    await enterTower(page);
    await expect(body(page)).toHaveClass(/\bdesk-pocket\b/);
    for (const [title, last] of [
      ["#mb-window", "Tower Info"],
      ["#mb-options", "Control Panel…"],
    ]) {
      await page.locator(title).tap();
      const shown = page.locator(`${title}-menu > :visible`);
      await expect(shown.last()).toHaveText(last);
      await page.keyboard.press("Escape");
    }
    await expect(page.locator("#mb-fullscreen")).toBeHidden();
  });
});

/** Site storage the live 4.2.0 game wrote, so the title screen offers Continue. */
const SAVED: Record<string, string> = JSON.parse(
  readFileSync(new URL("./fixtures/storage-4.2.json", import.meta.url), "utf8"),
);

/** Seed the site storage the 4.2.0 game wrote, once per test. */
async function seed(page: Page): Promise<void> {
  await page.addInitScript((seeded) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    for (const [key, value] of Object.entries(seeded)) localStorage.setItem(key, value);
  }, SAVED);
}

/**
 * Stop the page's installed clock a moment from now. The round trip can
 * outlast the moment on a busy machine, and the clock refuses a time in its
 * past, so it tries again from the new time.
 */
async function stopClock(page: Page): Promise<void> {
  for (let tries = 1; ; tries++) {
    const now = await page.evaluate(() => Date.now());
    try {
      await page.clock.pauseAt(now + 200);
      return;
    } catch (error) {
      if (tries >= 5) throw error;
    }
  }
}

/** True when two boxes share any area. */
function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** True when a tap at the control's center lands on it, after scrolling it into view. */
async function reachable(control: Locator): Promise<boolean> {
  await control.scrollIntoViewIfNeeded();
  return control.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (r.width === 0 || x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit));
  });
}

// A phone's screen under the browser's own bars: upright and sideways.
for (const viewport of [
  { width: 411, height: 796 },
  { width: 852, height: 330 },
]) {
  test.describe(`the title screen on a ${viewport.width} by ${viewport.height} phone`, () => {
    test.use({ viewport, hasTouch: true });

    test("every control on the title screen can be reached and tapped", async ({ page }) => {
      await seed(page);
      await load(page);
      await expect(page.locator("body")).toHaveClass(/desk-title-pocket/);
      await expect(page.locator('#splash [data-splash="continue"]')).toBeVisible();
      const controls = [
        ...(await page.locator("#splash [data-splash]").all()),
        ...(await page.locator(".menubar .mb-title:visible").all()),
        page.getByRole("button", { name: "Start" }),
      ];
      expect(controls.length).toBeGreaterThanOrEqual(10);
      for (const control of controls) {
        const name = (await control.getAttribute("data-splash")) ?? (await control.textContent())?.trim();
        expect(await reachable(control), `${name} can be tapped`).toBe(true);
      }
      await page.locator("#splash .splash-attrib").scrollIntoViewIfNeeded();
      await expect(page.locator("#splash .splash-attrib")).toBeInViewport();
    });

    test("the notice that a closed tower is saved covers neither the logo nor the buttons, and the menus open over it", async ({
      page,
    }) => {
      await page.clock.install();
      await seed(page);
      await load(page);
      await enterTower(page);
      await page.evaluate(() => document.getElementById("mb-close")!.click());
      await expect(page.locator("body")).toHaveClass(/desk-title-pocket/);
      const notice = page.locator("#toast-wrap .toast", { hasText: "Press Continue to go back to it." });
      await expect(notice).toBeInViewport({ ratio: 1 });
      // The page's clock stops so the notice stays up while it and the menus are checked.
      await stopClock(page);
      const covered = [page.locator("#splash .splash-word"), page.locator("#splash .splash-tag")];
      covered.push(...(await page.locator("#splash .splash-btn").all()));
      expect(covered.length).toBeGreaterThanOrEqual(6);
      const shown = await box(notice);
      for (const part of covered) {
        const name = (await part.getAttribute("data-splash")) ?? (await part.getAttribute("class"));
        expect(overlap(shown, await box(part)), `the notice clears ${name}`).toBe(false);
      }
      // The menus open over the notice: every item they hold stays tappable.
      await page.getByRole("button", { name: "Start" }).click();
      const starts = await page.locator("#desk-start-menu [role=menuitem]:visible").all();
      expect(starts.length).toBeGreaterThanOrEqual(2);
      for (const item of starts) expect(await reachable(item), `${await item.textContent()} can be tapped`).toBe(true);
      await page.keyboard.press("Escape");
      for (const title of await page.locator(".menubar .mb-title:visible").all()) {
        await title.click();
        const items = await page.locator(".menubar .mb-pop:visible > .mb-item:visible").all();
        expect(items.length, `${await title.textContent()} has items`).toBeGreaterThan(0);
        for (const item of items) expect(await reachable(item), `${await item.textContent()} can be tapped`).toBe(true);
        await page.keyboard.press("Escape");
      }
      await expect(notice).toBeVisible();
    });
  });
}

test.describe("the desk on other screens", () => {
  test("a phone-sized window with a mouse never gets the desk", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await load(page);
    await expect(body(page)).not.toHaveClass(/\bdesk-title\b/);
    await enterTower(page);
    await expect(body(page)).not.toHaveClass(/\bdesk\b/);
    await expect(page.locator("#desk-taskbar")).toHaveCount(0);
  });

  test("?desk=on brings the desk to a screen narrower than a computer's, and ?desk=off turns it off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await load(page);
    await enterTower(page);
    await expect(body(page)).not.toHaveClass(/\bdesk\b/);
    await load(page, "/?desk=on");
    await enterTower(page);
    await expect(body(page)).toHaveClass(/\bdesk\b/);
    expect(await page.evaluate(() => localStorage.getItem("vc-desk"))).toBe("any");
    await load(page, "/?desk=off");
    await enterTower(page);
    await expect(body(page)).not.toHaveClass(/\bdesk\b/);
    expect(await page.evaluate(() => localStorage.getItem("vc-desk"))).toBe("off");
  });

  test("a smaller browser window pulls the windows back onto the desk", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await load(page);
    await enterTower(page);
    await drag(page, page.locator("#bulletin-win > .win-title"), 2000, 0);
    await page.setViewportSize({ width: 1100, height: 700 });
    await expect
      .poll(async () => {
        const b = await box(page.locator("#bulletin-win"));
        return b.x + b.width <= 1100;
      })
      .toBe(true);
    const tower = await box(page.locator("#desk-win-tower"));
    expect(tower.x + tower.width).toBeLessThanOrEqual(1100);
  });

  test("the desk leaves when the window gets too small, and comes back with every window", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await load(page);
    await enterTower(page);
    await expect(body(page)).toHaveClass(/\bdesk\b/);
    await page.setViewportSize({ width: 800, height: 700 });
    await expect(body(page)).not.toHaveClass(/\bdesk\b/);
    await expect(page.locator("#stage")).toBeVisible();
    await page.setViewportSize(DESKTOP);
    await expect(body(page)).toHaveClass(/\bdesk\b/);
    await expect(page.locator("#desk-win-tower")).toBeVisible();
  });
});
