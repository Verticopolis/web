# Decision Log: Tower in 3D

- 2026-11-25: Look study compared an oblique 2.5D look, an isometric look and a free 3D camera on one made-up tower. Excalibur 1.0 is 2D only, so a free 3D camera needs a second renderer (three.js 0.170 for the mockup: 482 KB raw, 121 KB gzipped).
- 2026-11-25: Owner picked the free 3D camera ("the spin version") and asked for BMAD/GDS planning for 5.x.
- 2026-11-25: Web Game Room party: a read-only viewer window, 11 to 0 (no building in 3D). Live structure and cars with people sampled to 2,000, 9 to 4 over a snapshot. Phones from the start with a low quality tier, 10 to 3. Modern only, 7 to 6 (open, owner decides).
- 2026-11-25: Gate thresholds fixed before any measurement (Tess): closed = zero cost; open = 60 fps median on a mid-range Android, under 150 draw calls, under 150 MB extra, first open under 2 s warm.
- 2026-11-25: The oblique 2.5D depth look (components#1) stays a separate, independent option; this GDD does not replace it.
- 2026-11-25: Open for the owner: Modern only or any tower (decision card posted); final art look (standing design sign-off); whether to start Epic 1 (prototype).
- 2026-11-25: gds-gdd discipline pass (validator subagent): fixed quality tiers, reference devices and noise band, side-view pause mechanic, eligible-tower wording, Open Questions section, implementation wording moved to the architecture; epics path set to design/epics-tower-3d-view-2026-11-25.md.
- 2026-11-25: Readiness check flagged repo-shaped epics (renderer, window) as technical milestones; restructured into player-value slices: 2 See my tower in 3D, 3 A living tower, each spanning both repositories.
- 2026-11-25: Owner chose to start Epic 1 (the prototype and gate) on draft branches.
- 2026-11-25: Owner was unsure on Modern only and asked a proper party to decide. Re-run with Kenji (veteran), John (PM) and Cloud Dragonborn (game architect) added: any tower, 8 to 3 (Samus, Grumbal, Tess for Modern only). Conditions: Classic's play view, toolbar and rules unchanged apart from one Tower menu item; one look set for both modes; the window never opens or suggests itself on its own; Epic 1 adds a maxed Classic tower as a smoke row; the help page says this view is a Verticopolis addition the 1994 game did not have.
