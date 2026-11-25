---
stepsCompleted: [validate-prerequisites, design-epics, create-stories, final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/gdds/gdd-verticopolis-2026-11-25-tower-3d-view/gdd.md
  - _bmad-output/planning-artifacts/architecture/architecture-tower-3d-view-2026-11-25/game-architecture.md
  - _bmad-output/party-mode/tower-3d-view-party-findings-2026-11-25.md
status: draft, awaiting owner sign-off
---

# Verticopolis Tower in 3D - Epic Breakdown

## Overview

This document breaks the Tower in 3D GDD and architecture into stories. Epic 1
is a gate: Epics 2 and 3 start only if its measurements pass and the owner
picks a look. Epics 2 and 3 each span both repositories: renderer stories
are Verticopolis/components PRs, window stories are Verticopolis/web PRs,
one story per PR.

## Requirements Inventory

### Functional Requirements

- FR1: Tower > "View in 3D…" opens a "Tower in 3D" window (desk window on computers, full-screen panel on phones) for an eligible tower.
- FR2: The window shows the player's tower in 3D: every room, floor, lobby, transport, sky bridge, the lot, street and ground cut with basements.
- FR3: Orbit, zoom and pan by mouse, touch and keyboard; Reset view; camera limits (no going under the ground or behind the lot).
- FR4: Live updates: room changes within 1 s, elevator cars every frame, people sampled up to the tier's cap.
- FR5: Time of day follows the game clock, with a Day, Dusk or Night pin for the window.
- FR6: Weather (rain) and fire show in 3D.
- FR7: Take a picture saves a PNG of the view named after the tower.
- FR8: No 3D available, or the 3D view lost while open: a one-sentence message, Close, and Try again where it applies.
- FR9: The side view stops drawing while the window covers it; the simulation keeps stepping.
- FR10: Screen-reader summary (tower name, floors, population, time of day) and reduced motion respected.
- FR11: Help page "Tower in 3D" and an analytics event for opens and for unavailable reasons.

### NonFunctional Requirements

- NFR1: Closed, zero cost: install precache, main-game frame time, memory and load time unchanged (within 5 percent, median of 5 runs).
- NFR2: Open, Android reference phone: 60 fps median, 45 fps 5th percentile over 60 s of orbiting the biggest test tower; iPhone and laptop: 60 and 50.
- NFR3: Under 150 MB extra memory while open; all of it freed on close.
- NFR4: First open under 2 s warm, under 4 s cold at 10 Mbit/s; 3D download under 650 KB raw, 175 KB gzipped.
- NFR5: Works offline from the second open.
- NFR6: Three quality tiers with automatic step-down (GDD table).

### Additional Requirements

- AR1: The renderer lives in Verticopolis/components under `render3d/`, pins three.js 0.187.0 exactly, and imports nothing from the engine or web.
- AR2: Input is `RenderSim` only; no new render-model or engine field in v1 (if one turns out to be needed, it is a separate engine issue any frontend could use).
- AR3: Every three.js object is disposed on close; the context is released.
- AR4: Hot-path checklist (`docs/performance/hot-path-review.md`) and its section 6 record for every story touching the frame loop.
- AR5: Original art only; the owner signs off the look before Epic 2 merges.
- AR6: Each PR follows its repository's template, carries a `.changes` note, and gets `/gds-code-review` (renderer, window) or `/bmad-code-review` (Vite, Workbox, build checks).

### UX Design Requirements

- UX1: One entry point (Tower menu), Win95 window chrome, three controls inside: time of day, Reset view, Take a picture.
- UX2: Phone panel with a thumb-reachable close button; one-finger orbit, pinch zoom, two-finger pan.

### FR Coverage Map

| Requirement | Stories |
| --- | --- |
| FR1 | 2.6 |
| FR2 | 1.1, 2.2, 2.3, 3.2 |
| FR3 | 2.4, 2.8 |
| FR4 | 2.3, 3.1, 3.3 |
| FR5, FR6 | 3.2 |
| FR7 | 3.4 |
| FR8 | 2.5, 2.9 |
| FR9 | 2.10 |
| FR10 | 2.4, 2.8 |
| FR11 | 3.5 |
| NFR1, NFR4, NFR5 | 2.7, 3.6 |
| NFR2, NFR3, NFR6 | 1.2, 2.5, 3.3, 3.6 |
| AR1-AR6 | every story |

## Epic List

1. **Prototype and gate:** a measured prototype and the owner's look pick, before production work.
2. **See my tower in 3D:** open the window and orbit a live model of your tower, at zero cost while closed.
3. **A living tower:** people, time of day, weather, fire, smooth updates, pictures, help and the release gate.

## Epic 1: Prototype and gate

Prove that a real maxed tower meets the gate on real devices, and let the
owner choose the look, before any merge to main.

### Story 1.1: Prototype the 3D view on a draft branch

As the owner,
I want my own saved towers drawn in 3D in a preview build,
So that I can judge the look and the speed on my devices.

**Acceptance Criteria:**

**Given** a draft branch in components and a draft web branch with a Vercel preview
**When** I open a saved tower and choose View in 3D…
**Then** the tower draws in 3D from its render model with banded geometry and instanced people and cars
**And** the main game's build output and precache are unchanged on that branch

### Story 1.2: Measure the gate

As the team,
I want the GDD's performance table measured on the reference devices,
So that we only build what we know will be fast.

**Acceptance Criteria:**

**Given** the thresholds written down before the run (GDD, Technical Specifications)
**When** the prototype runs the maxed test towers on the Android reference phone, an iPhone and the gate laptop, 5 runs each
**Then** a results file in project files records every row as pass or fail, with frame-time percentiles, draw calls and memory
**And** a failed row stops Epics 2 and 3 until the owner decides

### Story 1.3: Owner look pick

As the owner,
I want two or three 3D looks side by side on the same tower,
So that I choose the one we build.

**Acceptance Criteria:**

**Given** variants (for example: flat-shaded pastel, lit model, night-first)
**When** I pick one
**Then** the pick is recorded in the GDD decision log and in project memory
**And** no other look is built

## Epic 2: See my tower in 3D

A Modern player opens Tower > View in 3D… and orbits a live model of their
own tower (rooms, transport and moving cars) on any device, and the game
costs nothing extra while the window is closed. Stories 2.1 to 2.5 are
Verticopolis/components PRs; 2.6 to 2.10 are Verticopolis/web PRs after
components publishes.

### Story 2.1: Package the 3D entry point

As a frontend developer,
I want `@verticopolis/components/render3d/Tower3dView` as its own subpath,
So that importing the rest of the package never pulls in three.js.

**Acceptance Criteria:**

**Given** the components build
**When** a consumer imports any existing subpath
**Then** its bundle contains no three.js code
**And** `Tower3dView.mount(canvas, { sim })` draws the lot, ground cut and sky for an empty tower, and `dispose()` releases every object it created

### Story 2.2: A 3D look for every facility kind

As a player,
I want every room I can build to look right in 3D,
So that my tower reads the same as in the side view.

**Acceptance Criteria:**

**Given** the `looks3d` table keyed by `FacilityKind`
**When** the type checker runs
**Then** a kind without a look fails to compile
**And** a unit test with the catalog fixtures builds a non-empty look for every kind and every unit state (normal, construction, fire, vacant)
**And** the view rebuilds the tower's rooms whenever the tower revision changes (whole tower; Story 3.3 makes it incremental)

### Story 2.3: Transport, cars and sky bridges

As a player,
I want my elevators, stairs, escalators and sky bridges in 3D with moving cars,
So that the tower feels alive.

**Acceptance Criteria:**

**Given** a tower with each transport kind and a sky bridge
**When** the view draws
**Then** shafts span their floors, cars sit at `carPositions` every frame, stairs and escalators span two floors, and sky bridges connect their towers
**And** all cars of one kind draw in one instanced batch

### Story 2.4: Camera input and limits

As a player on any device,
I want to orbit, zoom and pan with mouse, touch or keyboard,
So that I can look at any part of my tower.

**Acceptance Criteria:**

**Given** the bindings table in the GDD
**When** I use each input
**Then** the camera orbits, zooms and pans, stays above the ground cut and in front of the lot's back, and Reset returns to the opening view
**And** with reduced motion on, there is no easing or automatic movement

### Story 2.5: Quality tiers and lost context

As a player on a slow device,
I want the view to step down by itself and recover when the device stops it,
So that it stays usable.

**Acceptance Criteria:**

**Given** frames over 20 ms at the 90th percentile for 2 s
**When** the tier is above Low
**Then** it drops one tier and never steps back up in that session
**And** on a lost context the loop stops and `onUnavailable("context-lost")` fires; on no WebGL 2, `onUnavailable("no-webgl")` fires from `mount`

### Story 2.6: Menu entry and window

As a Modern player,
I want Tower > View in 3D… to open a Tower in 3D window,
So that I can see my tower in 3D.

**Acceptance Criteria:**

**Given** an eligible tower (Modern in this draft)
**When** I choose View in 3D…
**Then** a desk window opens on computers and a full-screen panel on phones, with time of day, Reset view and Take a picture
**And** the item is absent for ineligible towers

### Story 2.7: Lazy load outside the install

As any player,
I want the 3D code downloaded only if I open the view,
So that the game installs and starts exactly as before.

**Acceptance Criteria:**

**Given** a production build
**When** `scripts/verify-precache.ts` runs
**Then** no `tower3d-*` chunk is in the precache and the build fails if one is
**And** after the first open the chunk is served from the runtime cache offline; a first open offline shows "Opening 3D needs a connection the first time."

### Story 2.8: Input and accessibility in the window

As a keyboard, touch or screen-reader player,
I want the window's controls and summary to work for me,
So that the 3D view is usable without a mouse.

**Acceptance Criteria:**

**Given** the window has focus
**When** I use the keyboard bindings, or a screen reader
**Then** the camera responds and the summary reads tower name, floors, population and time of day
**And** every control has a visible focus state and a 44 px touch target on phones

### Story 2.9: Unavailable states

As a player whose device cannot draw 3D,
I want a clear message,
So that I know it is the device and the game is fine.

**Acceptance Criteria:**

**Given** `onUnavailable("no-webgl")` or `("context-lost")`
**When** it fires
**Then** the window shows the one-sentence message, Close, and Try again for a lost context
**And** an `app_action` event records `tower_3d_unavailable` with the reason only

### Story 2.10: Pause the side view while covered, release on close

As a player on a laptop or phone,
I want only one view drawing at a time and nothing left behind,
So that my battery and memory are spared.

**Acceptance Criteria:**

**Given** the window is maximized or full screen
**When** it covers the side view
**Then** `holdTowerFrames` holds the side view's frames and releases them when uncovered or closed; the simulation keeps stepping
**And** on close the view is disposed and its context released

## Epic 3: A living tower

The 3D tower gets its people, day and night, weather and fire, smooth
updates while the player builds, pictures to share, a help page and the
release-candidate gate.

### Story 3.1: Sampled crowd

As a player,
I want people in 3D near where I am looking,
So that the tower feels busy without slowing down.

**Acceptance Criteria:**

**Given** a crowd larger than the tier's cap
**When** the camera moves
**Then** at most the cap's people draw, preferring visible floors and the nearest people, stable for 500 ms
**And** each person keeps the same depth in the room across frames

### Story 3.2: Time of day, weather and fire

As a player,
I want the 3D tower to follow the game's day, dusk, night, rain and fires,
So that it matches what the side view shows.

**Acceptance Criteria:**

**Given** a `RenderSim` clock, weather and fire response
**When** they change
**Then** lighting, lit windows, rain and the fire look follow within 1 s
**And** `setTimeOfDay("day" | "dusk" | "night")` pins the look until set back to "follow"

### Story 3.3: Incremental rebuilds

As a player building a big tower,
I want the 3D view to update without a hitch,
So that leaving it open while I play stays smooth.

**Acceptance Criteria:**

**Given** a change to one floor in a 100-floor tower
**When** the tower revision changes
**Then** only the bands containing changed floors rebuild, at most one band per frame, swapped in whole
**And** a tower load rebuilds every band

### Story 3.4: Take a picture

As a player proud of my tower,
I want to save a picture of the 3D view,
So that I can share it.

**Acceptance Criteria:**

**Given** the window is open
**When** I choose Take a picture
**Then** a PNG at the window's size (up to 2x) is saved, named after the tower
**And** the 3D view keeps running

### Story 3.5: Help, analytics and screenshots

As a player and as the team,
I want a help page, an open event and screenshots,
So that the feature is documented and measurable.

**Acceptance Criteria:**

**Given** the feature ships
**When** the release is cut
**Then** the help site has a "Tower in 3D" page in the manual style, `app_action action=tower_3d_open` fires once per open, and the gallery has a screenshot shard covering the window's states (open, unavailable, phone panel) made in the pinned container
**And** the dashboard gets a tile only by adding one (the curated dashboard is never edited otherwise)

### Story 3.6: Gate on the release candidate

As the team,
I want the GDD's performance table measured again on the release candidate,
So that what ships matches what the prototype promised.

**Acceptance Criteria:**

**Given** the release candidate build
**When** the measurement from Story 1.2 is repeated
**Then** every row passes, including "main game unchanged" with the window never opened
**And** the results file is linked from the release PR

