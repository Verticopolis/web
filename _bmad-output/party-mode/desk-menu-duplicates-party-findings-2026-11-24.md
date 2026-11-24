# Duplicate desk menu entries: party findings (2026-11-24)

Room: Web Game Room (Sally, Juno, Samus, Wren, Theo, Priya, Lucia, Grumbal,
Boundary) with Kenji summoned from the Player Panel. Asked by Naftali in
issue #2600 (2026-11-23): on the desk, the Verticopolis menu, Options, the
Control Panel, the tray and Help all offer the same settings, sound, screen
saver, appearance and manual commands. Should each feature get one obvious
home? No code until the owner picks.

The earlier round (`windowed-game-party-findings-2026-11-15.md`, rounds 2d
and 7) kept second doors on purpose: "every tray item stays in a menu" (Wren)
and "Options > Sound stays as the quick toggle". This round revisits that in
light of the owner's new instruction; it does not quietly drop it.

## What the room checked first

- **The Verticopolis menu** (`START_ITEMS`, `src/ui/desk/deskGlue.ts`) has
  New…, Open… / Player's Manual, Screen Saver…, Control Panel…, Settings…,
  About Verticopolis… / Close Verticopolis. The title screen's desk gets the
  same list without Control Panel (`startItems(false)`). Every item runs its
  menu twin by `getElementById(id)?.click()` in `taskbarCommon`
  (`src/ui/desk/deskController.ts`).
- **Options** (`src/game/menuModel.ts`) has Settings…, Sound (checked),
  Screen Saver…, Appearance… / Tools, Status Bar, Full Screen. On the desk,
  Status Bar and Full Screen move into Window and Tools has its own window,
  so the four settings items are what Options holds there.
- **The Control Panel** (`CONTROL_ITEMS`, `deskGlue.ts`) has Display (runs
  `mb-screensaver`), Appearance (`mb-appearance`), Sounds (`mb-sound`) and
  Settings (`btn-settings`), again by `click()` on the menu twin. The tray has
  the speaker (one tap toggles sound) and the Control Panel button.
- **Help** has Player's Manual, Classic vs Modern, Replay Getting Started,
  Sponsor and About Verticopolis…. The manual window's own Help menu
  (`src/ui/desk/deskHelpMenu.ts`) is a separate menu and is out of scope.
- **Hiding is safe for dispatch.** A hidden menu entry stays in the DOM with
  `hidden` set (`setMenuState`, `src/game/menuBarHost.ts`), so its `click()`
  and its actions still run. `setDeskMenus` (`src/ui/desk/deskMenus.ts`)
  already hides Tower's window items on the desk and they still work from the
  Window menu. The sound observer watches `mb-sound`'s `aria-checked`, which
  a hidden item keeps updating.
- **The desk is not everywhere.** Phones' title screen, small computer
  windows and every layout with no tower have no Control Panel, so Options
  must stay whole there.
- **Canon.** The 1994 game's own Options menu held Sound (Elevators,
  Background, Events), Animation, Fast Mode and Call Fire Rescue (manual
  p.30-31, Options Menu). A screen saver and the color scheme were Windows'
  Display Properties, in the Control Panel, never in a game's menu.
- **The Appearance dialog holds High Contrast** (`SCHEMES`,
  `src/ui/appearance/appearancePrefs.ts`), so it is an accessibility route,
  not only a look.
- **No keyboard shortcut opens the Verticopolis menu** (the taskbar handles
  Escape and arrows inside the menu only). Alt+O opens Options.

## Round 1: what is the actual problem?

🏢 **Kenji:** On my 1995 machine the Start menu said Programs, Documents,
Settings, Find, Help, Run, Shut Down. SimTower was one line under Programs.
Its screen saver was never in SimTower's menus. It was in Display
Properties. SimTower's Options menu had Sound, Animation, Fast Mode. That's
it.

🎨 **Sally:** And that's the scene on the phone screenshot. Lucia taps the
Verticopolis button to start a new tower and gets a menu that reads like a
settings page. Eight lines, five of which open a dialog she can also reach
two other ways.

🤖 **Lucia:** On the bus I want New, Open, and out. I don't want to scroll a
menu with my thumb past Screen Saver.

😤 **Grumbal:** I said it on the 15th: "the start menu doesn't grow into a
second menu bar. Six items." It grew to eight. So yes, trim it. That part
isn't a debate.

♿ **Wren:** Trimming the Verticopolis menu, fine. But that's not where my
rule lives. My rule is that nothing a player needs is reachable only through
the pretend desktop. Watch what you do to Options.

📐 **Juno:** Then let's split the question, because the owner's issue mashes
two different things together. A command copied into every menu is clutter.
One home with several doors (a menu item, a tray icon, a Control Panel icon)
is how a desktop works. The fix is one home per command, chosen by who owns
it, and doors only where a desktop has doors.

## Round 2: who owns each command?

📐 **Juno:** Two kinds of thing. The game's (Settings, Sound) and the
computer's (Screen Saver, Appearance). Kenji just told us which menu each sat
in. The game's live in Options. The computer's live in the Control Panel.

🕸️ **Theo:** That's also how we store them. Sound and the game's Settings
are ours; the screen saver and the scheme are device-flavored preferences.
And the Control Panel is a window, not a menu, so its icons aren't the
clutter the owner is pointing at.

🎲 **Samus:** Hang on, why keep Options at all on the desk? The tray speaker
is one tap for sound, the Control Panel has the rest. Kill Options on the
desk. Fewer menus, less to read, more tower. That's the feel.

🏢 **Kenji:** Because SimTower had Options, Samus. Its Sound menu was where
you turned the elevators' ding off. A desk where the program has no Options
menu isn't 1995, it's a kiosk.

♿ **Wren:** And the tray speaker is a pointer target in a corner. A keyboard
player gets to sound through Alt+O, Down, Enter today. Take Options away and
the keyboard route to mute is Tab, Tab, Tab to a taskbar icon, if the
taskbar is even in the tab order. No.

🌐 **Priya:** My worry is the other way round. I play in a browser window
that's sometimes big enough for the desk and sometimes not. If Options has
four items in one size and two in the other, I'll think something broke.

🌶️ **Boundary:** That already happens, Priya. Status Bar and Full Screen move
to Window on the desk today, and Tower's window items hide. The menus already
follow the layout. What has to hold is that the desk going down puts every
item back, every time: shrink the window, rotate the tablet, File > Close to
the title.

😤 **Grumbal:** Everything moving per layout is exactly how you end up with
a stranded separator or an empty Options menu on some screen nobody tested.
Smallest change: trim the Verticopolis menu, touch nothing else. That's A.

## Round 3: Screen Saver and Appearance leave Options on the desk

🎨 **Sally:** If Screen Saver and Appearance leave Options on the desk, the
player who goes looking for them in Options needs a signpost, not a dead end.

♿ **Wren:** And Appearance carries High Contrast. If it leaves Options, I
need a keyboard route to it from the menu bar. That's my condition.

📐 **Juno:** The 15th already wrote the answer and nobody built it: "Options >
Screen Saver… becomes Options > Control Panel…". On the desk, Options reads
Settings…, Sound, then a line, then Control Panel…. That's the signpost and
Wren's keyboard route in one item. Alt+O, Up, Enter, and you're in Display
and Appearance.

🌶️ **Boundary:** One door to the Control Panel from the menu bar is a door,
not a copy of the command. I can live with it. Off the desk, Control Panel…
is hidden and Screen Saver… and Appearance… come back.

😤 **Grumbal:** Three doors to the Control Panel now. Verticopolis menu,
tray, Options.

🏢 **Kenji:** Windows 95 had Start > Settings > Control Panel, My Computer >
Control Panel, and the tray clock opening Date/Time. Doors were the point.

😤 **Grumbal:** Fine. One rule: no command appears twice in menus. Doors to a
window are allowed. Write that down or this comes back in a month.

## Round 4: Help, Settings and the title screen

🎨 **Sally:** Player's Manual and About Verticopolis… leave the Verticopolis
menu. Help is in the tower window's menu bar, which is where a program's
help lived.

😤 **Grumbal:** Minimize the tower and the menu bar goes with it. Now there's
no way to the manual.

🏢 **Kenji:** Click the tower's taskbar button, it comes back with its Help
menu. That's exactly 1995. SimTower's manual wasn't on the Start menu
either.

🎲 **Samus:** Settings leaves the Verticopolis menu too? It's the one I
actually open mid-game.

📐 **Juno:** It stays in Options, where every other layout already has it,
and in the Control Panel. You lose nothing but the copy.

🌶️ **Boundary:** The title screen's desk has no Control Panel. Take Screen
Saver… and Settings… out of its Verticopolis menu and it reads New…, Open….
Close is already left out there, with no tower to close. Is two items okay?

🎨 **Sally:** It's a desktop with nothing installed but the game. Two is
honest. The title screen's own Options keeps all four, because there's no
Control Panel there, which is the same rule as everywhere: Options trims only
while a Control Panel exists.

🌐 **Priya:** As long as that rule is the same rule on every screen, I'm
calmer. I still vote for less moving.

## Round 5: the Control Panel's Settings icon

🌶️ **Boundary:** Under Juno's own rule, Settings is the game's. Why is it an
icon in the computer's Control Panel?

🏢 **Kenji:** It wouldn't have been. Drop it.

🤖 **Lucia:** On the pocket desk the Control Panel is the big friendly grid
I can hit with my thumb. Settings is the one I use there. Keep it.

🎨 **Sally:** The owner's complaint was crowded menus. The Control Panel is a
window of four icons. Leave it alone this round.

Verdict on the icon: keep it, 6-4 (Sally, Samus, Lucia, Wren, Priya, Theo
keep; Kenji, Juno, Boundary, Grumbal drop). Owner may overrule.

## The vote

- **D, one home per command (emerged in round 2):** Kenji, Juno, Sally, Wren
  (with Control Panel… in Options), Theo, Lucia, Boundary. **7.**
- **A, trim the Verticopolis menu only:** Grumbal, Priya. **2.**
- **B, hide every settings item from Options on the desk (and Options with
  it):** Samus. **1.**
- **C, B but keep Sound:** 0. Everyone who wanted Sound kept also wanted
  Settings kept, which is D.

Grumbal's dissent stands: per-layout menus are where stranded separators
come from, so the tests below are his condition for not reopening it.

## Proposed menus (option D)

| Screen | Verticopolis menu | Options | Help | Control Panel | Tray |
| --- | --- | --- | --- | --- | --- |
| Title screen, no desk (phones, small windows) | none | Settings…, Sound, Screen Saver…, Appearance… / Full Screen | unchanged | none | none |
| Title screen on the desk (computer) | New…, Open… | as the row above | unchanged | none | speaker |
| A tower, no desk (small computer windows) | none | unchanged today: Settings…, Sound, Screen Saver…, Appearance… / Tools, Status Bar, Full Screen | unchanged | none | none |
| Desktop desk | New…, Open… / Control Panel… / Close Verticopolis | Settings…, Sound / Control Panel… | unchanged | unchanged: Display, Appearance, Sounds, Settings | unchanged: speaker, Control Panel |
| Pocket desk | as the desktop desk | as the desktop desk | unchanged | unchanged | unchanged |

The rule, in one line: no command appears in two menus; doors to a window
(the Control Panel) are allowed; Options trims only while a Control Panel
exists, and gets every item back when the desk goes down.

## What option D changes in code (all in this repository)

- `START_ITEMS` (`deskGlue.ts`): drop Player's Manual, Screen Saver…,
  Settings… and About Verticopolis…; Control Panel… sits between two lines.
- `menuModel.ts`: one new Options item, Control Panel… (`mb-control-panel`),
  hidden off the desk, after `mb-display-sep`.
- `setDeskMenus` (`deskMenus.ts`): on the desk hide `mb-screensaver` and
  `mb-appearance` and show `mb-control-panel`; off the desk the reverse. The
  desk opens the Control Panel for `mb-control-panel` through `onMenuItem`.
- The Control Panel and the Verticopolis menu run their items with
  `runMenuItem` instead of `click()` on a menu element, so nothing depends on
  a hidden element (Theo). Analytics are unchanged: `desk_start` and
  `desk_control` still report from the desk itself.
- `analyticsMenus.ts`: `mb-control-panel` reports as `control_panel`;
  `docs/analytics-data-map.md` lists it and the shorter `desk_start` set.
- Help pages: `help-site/src/content/docs/desktop.mdx` and
  `your-towers/settings.mdx` say where each command lives.
- Gallery: the desk and pocket desk menu screenshots change.

No engine, save or gameplay change. Fits the 4.x Pocket desk minor, since it
only trims the desk that minor ships.

## Testable outcomes

1. On the desktop and pocket desks, the Verticopolis menu reads exactly New…,
   Open…, Control Panel…, Close Verticopolis, with lines between groups.
2. On the title screen's desk it reads New…, Open… (Close is left out with no
   tower open).
3. On the desk, Options reads Settings…, Sound, Control Panel… with one line
   before Control Panel…: no Screen Saver…, no Appearance…, no doubled,
   leading or trailing line.
4. When the desk goes down (window shrinks below the desk, a tablet turns
   upright to a layout without one, File > Close to the title), Options reads
   Settings…, Sound, Screen Saver…, Appearance… again and Control Panel… is
   gone. Up and down twice in a row ends the same way.
5. Control Panel Display, Appearance, Sounds and Settings still open or
   toggle while their Options twins are hidden; the Sound check stays the
   same on Options, the tray speakers and the Sounds label.
6. Keyboard: Alt+O, Up, Enter opens the Control Panel with focus inside it;
   Escape closes it and returns focus.
7. Screen reader: the menus announce only the items that show; the Control
   Panel's icons keep their names.
8. Analytics: Options > Control Panel… reports `menu_pick` as
   `control_panel`; the data map matches.

## Open for the owner

- Pick D (recommended), A, B or C.
- Keep or drop the Control Panel's Settings icon (room: keep, 6-4).
