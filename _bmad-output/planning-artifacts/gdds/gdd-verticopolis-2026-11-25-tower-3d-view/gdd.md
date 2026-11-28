---
title: Tower in 3D
game_type: simulation
platforms: browser (desktop and phone, installed PWA and tab)
created: 2026-11-25
updated: 2026-11-25
status: draft, awaiting owner look pick
---

# Verticopolis Tower in 3D - Game Design Document

**Author:** Naftali (owner), drafted with gds-gdd
**Game Type:** Simulation (feature GDD for one 5.x addition)
**Target Platform(s):** Browser: desktop and phone, in a tab and as the installed PWA

Inputs: the 3D look study of 2026-11-25 (artifact "Verticopolis 3D Look
Study", images in project files `3d-exploration/`), the owner's pick of the
free 3D camera ("the spin version"), and the Web Game Room party of the same
day (`_bmad-output/party-mode/tower-3d-view-party-findings-2026-11-25.md`).

---

## Executive Summary

### Core Concept

A separate window shows the player's own tower as a 3D model they can orbit
and zoom: the cutaway front open, the sides glazed, the basements visible in
a cut through the ground, the people and elevator cars moving, and the light
following the game clock from day to dusk to night. It is a place to admire
the tower, never a place to build it. The side-view cutaway stays the game.

### Target Audience

Players of either mode, Classic or Modern, with a tower they are proud of,
on desktop and phone, including players who share pictures of their towers.

### Unique Selling Points (USPs)

- The tower the player built, room for room, as a 3D model, live.
- Costs nothing until it is opened: the main game downloads and runs exactly
  as before.

---

## Goals and Context

### Project Goals

1. Let a player see their tower in 3D from any angle within 2 seconds of
   opening the window (warm cache).
2. Keep the main game unchanged when the window is closed: install size,
   frame time, memory and load time do not move.
3. Run at 60 frames per second on the reference mid-range Android phone with
   the biggest test tower (the team's maxed saves).
4. Every room kind the game can show has a 3D look on the day it ships.

### Background and Rationale

Excalibur, the game's renderer, is 2D only, so a real 3D view needs a second
renderer. The look study compared an oblique 2.5D look, an isometric look
and a free 3D camera; the owner picked the free camera. A separate viewer
window keeps the 1994-style play view intact, keeps every rule in the
engine, and lets the 3D code load only when a player asks for it.

---

## Core Gameplay

### Game Pillars

1. **Your tower, exactly.** The 3D model shows the same rooms, transport,
   floors and people the side view shows, from the same render data. No
   invented rooms, no rules of its own.
2. **Never slower.** Closed, the feature costs zero bytes and zero frame
   time. Open, it holds 60 fps on the target phone or drops to a lower
   quality tier on its own.
3. **A window to look through, not a second game.** Orbit, zoom, time of
   day, take a picture. Building, inspecting and pricing stay in the side
   view.

### Core Gameplay Loop

Build in the side view, open Tower > View in 3D…, orbit to the part of the
tower that changed, watch the people and cars, take a picture, close the
window, keep building. The 3D view rewards the build loop by showing its
results from a new angle; it adds no action that changes the tower.

### Win/Loss Conditions

N/A. The viewer has no goals, score or failure state, and it cannot change
the tower.

---

## Game Mechanics

### Primary Mechanics

- **Open and close.** Tower menu, "View in 3D…". Opens a desk window (or a
  full-screen panel on phones) titled "Tower in 3D". The first open downloads
  the 3D code (target under 650 KB raw, under 175 KB gzipped); later opens
  load from the device. Closing releases the 3D drawing surface.
- **Camera.** Orbit around the tower's center, zoom from the whole lot to a
  single room (about 3 floors filling the window), pan along the tower. The
  camera cannot pass below the ground cut or behind the back wall of the lot.
  Reset view returns to the opening angle (front three-quarter view, whole
  tower in frame).
- **Time of day.** Follows the game clock by default (day, dusk, night as the
  side view draws them). A toggle can pin Day, Dusk or Night for the window
  only.
- **Live tower.** Room changes (built, removed, under construction, on fire)
  appear within 1 second. Elevator cars move every frame. People are sampled
  to at most 2,000 drawn figures, nearest the camera first.
- **Side view while covered.** While the Tower in 3D window is maximized or
  full screen, the side view stops drawing; the simulation keeps stepping at
  the player's speed. The side view draws again the moment it is uncovered.
- **Take a picture.** Saves a PNG of the current view at the window's size
  (up to 2x on high-density screens), named after the tower.
- **No 3D available.** If the device cannot draw 3D, the window says so in one
  sentence and offers to close. If the device stops the 3D view while it is
  open (the browser reclaims it, the app goes to the background), the window
  offers "Try again". The desk and the side view are unaffected either way.

### Controls and Input

| Input | Mouse and trackpad | Touch | Keyboard |
| --- | --- | --- | --- |
| Orbit | Left drag | One-finger drag | Arrow keys |
| Zoom | Wheel, pinch | Pinch | Plus and minus |
| Pan | Right drag, Shift + drag | Two-finger drag | Shift + arrows |
| Reset view | Button | Button | Home |
| Close | Window close box | Close button, back gesture | Escape (when focused) |

Reduced motion: no automatic spin and no camera easing. A text summary of the
view (tower name, floors, population, time of day) is exposed to screen
readers.

---

## Simulation Specific Elements

### Core Simulation Systems

The viewer reads the simulation; it never runs, steps or changes it. It reads
the same render model the side view reads: units (kind, floor, position,
width, state, occupants), transport (kind, span, car positions and
directions), sky bridges, lobby heights, the crowd, weather, the clock and
fire response. The simulation keeps running at the player's chosen speed
while the window is open.

### Management Mechanics

N/A. Pricing, evaluation, maps and inspection stay in the side view. A tap
in the 3D view does nothing in v1.

### Building and Construction

N/A for input. Rooms under construction show their construction look; the
viewer cannot build, bulldoze or move anything.

### Economic and Resource Loops

N/A. The viewer is free, adds no costs and touches no funds.

### Progression and Unlocks

No unlock. Available from the first room in any tower, Classic or Modern
(party re-run 2026-11-25, 8 to 3, at the owner's request). In Classic the
only addition is the Tower menu item: the play view, toolbar and rules stay
exactly as they are, and the window never opens or suggests itself on its
own in either mode.

### Sandbox vs. Scenario

Works in every tower, in both modes, at any population, on every lot size.
One 3D look set serves both modes: every kind a Classic tower can hold is
also a Modern kind, so Classic needs no 3D art of its own.

---

## Progression and Balance

### Player Progression

N/A (no progression in the viewer).

### Difficulty Curve

N/A.

### Economy and Resources

N/A.

---

## Level Design Framework

### Level Types

The model's extent is the tower's lot: from the lowest basement to the roof,
across the lot's width, with the street, sidewalk and a few trees around it.
The ground is cut on the front face to show basements and the metro.

### Level Progression

N/A.

---

## Art and Audio Direction

### Art Style

Low-poly, flat-shaded models in the game's own palette, matching the look
study: each room kind is a shallow box with its back wall, floor and a few
pieces of furniture; glazed side walls; a roof with plant and tanks. People
are simple figures in the side view's colors. Day, dusk and night lighting
follow the side view's sky. All art is original to Verticopolis and made in
code; no third-party models. The owner picks the final look before merge.

Coverage: one 3D look for each of the 37 facility kinds the render model can
send (floor and lobby among them, tall lobbies included), plus sky bridges,
the metro train, parking cars, fire and rain.

### Audio and Music

No new audio. The game's music and sounds continue as they are.

---

## Technical Specifications

### Performance Requirements

Measured on the biggest test tower (the team's maxed saves), thresholds fixed
before measuring. Each figure is the median of 5 runs; "no change" means
within 5 percent of the baseline median. Reference devices: a mid-range
Android phone from 2023 (about 6 GB of memory), an iPhone 12 or newer, and an
8 GB laptop with integrated graphics at 1366x768 (the low-end laptop row).

| Metric | Target |
| --- | --- |
| Main game, window never opened | No change in install size, frame time, memory or load time (within run-to-run noise) |
| Main game after the window is closed | Frame time back to the never-opened level within 2 seconds |
| Frame rate, window open, Android reference phone | 60 fps median, 45 fps 5th percentile, over 60 s of orbiting at 1x speed |
| Frame rate, window open, iPhone and laptop | 60 fps median, 50 fps 5th percentile, same run |
| Extra memory while open | Under 150 MB |
| First open, warm cache | Under 2 s to the first drawn frame |
| First open, cold, 10 Mbit/s | Under 4 s |
| Install precache | Unchanged: the 3D code is not part of the install |

### Quality Tiers

Three tiers, chosen when the window opens from the device and stepped down
one at a time (never up) when frames run long: more than 20 ms at the 90th
percentile for 2 seconds.

| Tier | Sharpness | Shadows | People drawn | Default on |
| --- | --- | --- | --- | --- |
| Low | 1x | none | up to 800 | phones |
| Medium | up to 1.5x | yes, still | up to 2,000 | tablets, integrated graphics |
| High | up to 2x | yes, still | up to 2,000 | desktop graphics |

### Platform-Specific Details

- Needs WebGL 2. Where it is missing or blocked (some managed Chromebooks),
  the window shows its message instead.
- iOS and iPadOS: closing the window frees all the memory the 3D view used.
- Phones: full-screen panel with a thumb-reachable close button; desktop: a
  normal desk window that can maximize and resize.
- Offline: works offline from the second open onward. The first open needs a
  connection and says so if there is none.

### Asset Requirements

No new image or model files ship: every 3D look is drawn by the game's own
code. 3D code download target: under 650 KB raw, under 175 KB gzipped (the 3D library alone measures 563 KB raw, 139 KB gzipped).

---

## Development Epics

### Epic Structure

| # | Epic | Delivers |
| --- | --- | --- |
| 1 | Prototype and gate | A measured prototype on a draft branch: the gate numbers above on a phone and a laptop, and the owner's look pick |
| 2 | See my tower in 3D | Open the window and orbit a live model of every room, transport and moving car, at zero cost while closed |
| 3 | A living tower | People, time of day, weather, fire, smooth updates while building, pictures, help, analytics and the release gate |

Sequence: 1, 2, 3. Each epic spans both repositories: renderer stories in
Verticopolis/components, window stories in Verticopolis/web.
Details in `epics.md`.

---

## Success Metrics

### Technical Metrics

The Performance Requirements table, measured before merge and again on the
release candidate.

### Gameplay Metrics

- Share of sessions that open the 3D view at least once, by mode (an
  `app_action` event, `action=tower_3d_open`), read from the governed
  dashboard after release.
- Share of opens that end in "3D isn't available on this device" (target:
  under 3 percent).

---

## Out of Scope

v1 (5.x):
- Building, bulldozing, inspecting or pricing in 3D.
- Replacing or restyling the side view.
- Overlays: Eval, Pricing, Hotel, Traffic and Occupancy maps in 3D.
- Free walking camera inside the tower, VR or AR.
- A Classic-only 3D look, or any change to Classic's play view, toolbar or
  rules.

Later, if v1 lands well: tap a room to inspect it, a camera path for a
tower "flyover", sharing straight to social sites.

---

## Open Questions

1. The final 3D look: the owner picks from variants in Epic 1.

Settled: any tower, Classic and Modern (owner asked the party to decide,
8 to 3, 2026-11-25); start Epic 1 (owner, 2026-11-25).

---

## Assumptions and Dependencies

- The render model already carries everything the viewer needs (units,
  transport, crowd, clock, weather, fire). [ASSUMPTION: no new engine or
  render-model field is required for v1; the architecture checks this.]
- A 3D library is added to Verticopolis/components as a dependency of a new,
  separate entry point. Its license must be on the allowlist (MIT).
- The owner signs off the look (standing design rule) before Epic 2 merges.

### Assumptions Index

1. No new engine or render-model field is required for v1 (Assumptions and
   Dependencies).
