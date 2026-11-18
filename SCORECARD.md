# SCORECARD — Rebuild v2 (Phase 3 evidence)

Scored against the anchors in the AAA builder skill (scene-1 = 1, scene-3 = 2.5–3)
using the four staged screenshots in `screenshots/` (1280×720, seed 1), each also
checked at the judge's 768×480 frame. v1 scores are the parent's baseline from BAR.md.

| Category | v1 | v2 | Evidence (one line) |
|---|---|---|---|
| Art direction | 1 | 2.5 | LOOK.md hexes drive facades, signs, vehicles, water and HUD alike; deco cream/coral/teal reads in all 4 frames. |
| Hero | 1 | 2.5 | Extruded coral coupe: bevel profile, glasshouse, spoiler, cream racing stripes, splitter, rolling hubbed wheels; Mara is an authored rig with long-hair signature and aim pose. |
| Obstacles / enemies | 1 | 2 | Cruiser wears white-over-navy livery with lightbar + point light and a uniformed officer; helicopter has authored body, spinning rotor, searchlight cone; traffic runs 3 readable body styles. |
| Interactables | 1 | 2.5 | Mission target is a gradient beacon beam + bright core + breathing ring + an authored courier crate prop; banner carries a live timer bar, minimap shows the target. |
| World | 1 | 2.5 | Foreground props (lamps, benches, signs, lifeguard stands), mid blocks with trim/awnings/water towers, skyline + beach + marina behind; palms frame the coast shot. |
| Materials | 1 | 2.5 | Seven seeded canvas textures (asphalt, sidewalk, sand, water, facades, pier, signs) on shared material roles with world-scale UVs; glass reflects the PMREM sky. |
| Lighting / render | 1 | 2.5 | One preset as a unit: warm sun + fitted 2048 shadows, hemisphere fill, PMREM sky env, ACES at 0.92 exposure, horizon fog; contact shadows sit under every car. |
| VFX / motion | 1 | 2 | Event-driven only: hit sparks, dust, skid marks, muzzle-flash light, lightbar light, beacon pulse, trauma shake, speed FOV kick — verified live in the QA smoke run, not in stills. |
| UI / HUD | 1 | 2 | Genre HUD: pill star/cash cluster, mission banner with draining timer bar, big speed readout, circular minimap in the LOOK palette, fading toasts, styled menus. |
| Performance | 1 | 2 | Renderer diagnostics below; triangles far under budget on every frame; zero console/page errors during capture. |

**Average: 1.0 → 2.30. Premium gate (BAR.md): every category ≥ 2 ✓, average ≥ 2.3 ✓, no automatic failures ✓ — GATE PASSED.**

Automatic-failure check: no primitive-box hero (extruded profiles), no single flat
material family (textured roles + glass/metal/fabric), no rectangular stat-card HUD
(pills + circular minimap), no stock sky or flat light (gradient sky + PMREM + shadows),
no greybox interactables (crate prop + beam), no empty arena (layered city), no stock
particles (pooled event effects), timer bar is functional, no clipping seen in frames.

## Renderer diagnostics (window.__diagnostics, after final paint)

| Shot | Draw calls | Triangles | File size |
|---|---|---|---|
| 1-cover.jpg (chase) | 291 | 99,434 | 143,955 B |
| 2-foot.jpg (on foot) | 327 | 96,980 | 133,316 B |
| 3-mission.jpg (mission) | 105 | 73,616 | 138,585 B |
| 4-coast.jpg (coast) | 421 | 111,980 | 135,621 B |

Budget note: triangles sit at ~5% of the 2M ceiling everywhere. The coast frame's
421 draw calls exceed the <300 advisory: the fitted shadow pass re-renders the whole
beachfront (marina boats, instanced palms/umbrellas, lifeguard stands) on top of the
main pass. Documented tradeoff — call count is a software-GL headless figure, the
geometry is merged/instanced, and no hot-loop allocation was added.

## What remains weak (honest)

- Palm fronds read thin and cross-like from behind; the canopy is the least authored silhouette left.
- The hero coupe still renders pink-coral under the noon sun rather than deep red.
- Distant towers repeat the same facade rhythm; the far field relies on fog.
- No post chain (bloom/glare) — the vignette is a CSS overlay, and VFX cannot be proven from stills.
- The hint bar at the bottom is a plain text strip, the one HUD element without its own visual treatment.
