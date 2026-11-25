# Tower in 3D: party findings, 2026-11-25

Room: Web Game Room (`bmad-party-mode --party web-room`, session mode). Voices
in the round: Theo, Juno, Sally, Samus, Wren, Tess, Priya, Femi, Lucia, Ben,
Tomasz, Grumbal, Boundary. Lior sat out (no player-facing strings beyond a
menu item and a window title).

## The ask

The owner saw the 3D look study (oblique 2.5D, isometric and a free 3D camera
on one made-up tower) and picked the free 3D camera: "I really love your 3d
mockup ... the spin version." He asked for it to be planned with the BMAD and
GDS skills for 5.x. The room's job: shape what the 3D view is, what it costs,
and what the owner still has to decide, before the GDD.

Facts on the table:

- Excalibur 1.0 is 2D only (orthographic camera, no depth buffer, no meshes),
  so the 3D view needs a second renderer. three.js 0.170 for the mockup's
  scene bundles to 482 KB raw, 121 KB gzipped; with orbit controls 504 KB
  raw, 126 KB gzipped (esbuild, minified).
- The mockup tower (17 floors, about 110 rooms, about 300 people) drew 1,492
  draw calls and 40,586 triangles per frame, one mesh per box. It was built
  to look right, not to be fast.
- The install budget is 6 MiB raw (`scripts/verify-precache.ts`); the game sat
  around 4.5 MiB in mid-November.
- Standing rules: nothing slower, ever; Modern features never gate the sim;
  new art needs the owner's own pick; all reusable UI and the renderer live in
  Verticopolis/components, which never imports the engine.

## The round, condensed

🎲 **Samus:** Start from the player. Nobody builds in that view. You open it
to *look* at what you made: spin it, zoom into the hotel floor, catch the
dusk. It's a showcase window. The play view stays the side cutaway, which is
the game.

🕸️ **Theo:** Then it's a window that loads its own code when you open it.
`import()` on first open, its chunk kept out of the precache, cached by the
worker after that so it works offline from the second time on. Close it and
we drop the WebGL context. Two live contexts on an iPhone is how you get a
white screen.

📱 **Ben:** Yes to dropping it. And on iPad the 2D tower behind it should stop
drawing while the 3D window covers it, or the fan... well, the battery.

⏱️ **Tess:** Numbers before adjectives. 1,492 draw calls for 110 rooms means a
maxed tower is a slideshow on Lucia's phone. The contract I'll sign: closed,
zero bytes and zero frame cost; open, 60 fps on a mid-range Android on the
biggest tower we can save, under 150 draw calls, under 150 MB extra memory,
first open under 2 s on a warm cache. Measured on the device, thresholds
written before the benchmark.

😤 **Grumbal:** And the day someone adds a facility, the 3D view shows a gray
box because nobody drew one. Two renderers, one art list. This is how a
feature rots.

📐 **Juno:** So the 3D look of each room kind comes from one table in
components, keyed by the same `FacilityKind` the 2D atlas uses, and a unit
test fails when a kind has no 3D entry. That's a test of behavior: "every
kind the render model can send has a model". No guard test reading files.

🌶️ **Boundary:** Edge list. A tower with zero rooms. A tower 100 floors tall
and the widest lot. A fire mid-orbit. Load a different tower while the window
is open. Switch Classic to Modern... you can't, but a Classic tower open on
the desk while the 3D menu item is Modern-only. Resize to 320 px. Lost
context on Android when the app is backgrounded. Each one needs an answer
in the stories.

🤖 **Lucia:** On my phone I want it full screen with one-finger orbit and
pinch zoom, and a big close button I can reach with my thumb. If it drops my
frame rate in the main game after I close it, I'm angry.

🎒 **Femi:** School Chromebook: WebGL is sometimes blocklisted. The window
must say "3D isn't available on this device" and not crash the desk.

💻 **Tomasz:** Integrated graphics, 1366 by 768. Give me a quality setting or
pick one for me. No real-time shadows by default.

♿ **Wren:** Keyboard orbit (arrows, plus and minus), no auto-spin when the
player asks for reduced motion, and a text summary the screen reader can read
("Tower One: 64 floors, 1,240 people, dusk"). The window title is not enough.

🎨 **Sally:** One entry point: the Tower menu, "View in 3D…", Win95 style, a
normal desk window that can maximize. Inside, three controls only: a
Day/Dusk/Night toggle that follows the game clock by default, Reset view,
and Take a picture. No second toolbar.

🌐 **Priya:** It's a camera, not a rule. Why is it Modern only? A Classic
player can want to admire a tower too. Classic's *play* view staying 1994 is
the promise; a separate viewer doesn't break it.

🎲 **Samus:** Because Classic is the homage and this is a clearly modern toy.
I'd keep it Modern for the launch and let the owner widen it later.

😤 **Grumbal:** Live or snapshot? Live means 17,000 people moving in 3D.

⏱️ **Tess:** Live structure and cabs, sampled people: at most 2,000 figures
drawn, instanced, picked nearest the camera. Rooms rebuild only when the
render model's tower revision changes, one floor at a time.

🕸️ **Theo:** And it reads the same render model the 2D renderer reads. No
engine calls, no rules. It lives in components as its own entry point so
three.js is only ever pulled in by that import.

## Options voted

Q1. **What the 3D view is in 5.x.**
- A. A read-only viewer window (orbit, zoom, time of day, picture). **11**
- B. A second play view with building in 3D. **0**
- C. Undecided until a prototype. **2** (Grumbal, Boundary)

Q2. **Live or snapshot.**
- A. Live: structure on change, cabs every frame, people sampled to a cap. **9**
- B. Snapshot when opened, with a Refresh button. **4** (Grumbal, Tomasz, Femi, Boundary)

Q3. **Which towers.**
- A. Modern towers only at launch. **7** (Samus, Sally, Juno, Tess, Grumbal, Ben, Lucia)
- B. Any tower (Classic too), since it never touches the play view. **6** (Priya, Theo, Wren, Femi, Tomasz, Boundary)

Q4. **Phones.**
- A. Phones and computers from the start, with a low quality tier, gated by a
  measurement on a mid-range Android. **10**
- B. Computers first, phones after a second measurement. **3** (Tess, Grumbal, Tomasz)

## Conditions the room attached

1. Zero cost when closed: the 3D code is a lazy chunk outside the install
   precache; the main game's frame time, memory and load time do not move
   (Tess, Theo). A build check proves the chunk is not precached.
2. A pre-registered performance gate on the biggest saved tower: 60 fps on a
   mid-range Android, under 150 draw calls, under 150 MB extra memory, first
   open under 2 s warm (Tess).
3. One 3D look per `FacilityKind`, defined in components; a unit test fails
   for a kind without one (Juno, Grumbal).
4. WebGL missing or context lost: a plain message in the window, the desk
   unaffected (Femi, Boundary).
5. The 2D tower pauses drawing while the 3D window covers it; the context is
   released on close (Ben, Theo).
6. Keyboard orbit, reduced-motion respected, a text summary (Wren).
7. Original art only, and the owner picks the final look (standing rule).
8. Help page and an analytics event in the same PR that ships it (standing
   rule).

Dissent: Grumbal still thinks two renderers will drift and wants a prototype
measured before any epic is scheduled. Priya holds that the viewer should not
be Modern only. Owner decides Q2, Q3 and Q4; Q1 went 11 to 0 for a viewer.
