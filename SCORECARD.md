# SCORECARD — v1 baseline, Rebuild v2 (Phase 3), Rebuild v3 (Phase 3)

Scored against the anchors in the AAA builder skill (scene-1 = 1, scene-3 =
2.5–3) using the four staged screenshots in `screenshots/` (1280×720, seed 1),
each also checked at the judge's 768×480 frame. v1 scores are the parent's
baseline from BAR.md; v2 scores are the v2 builder's; the v3 column is this
session's own scoring of the re-authored build, one evidence line each.

| Category | v1 | v2 | v3 | Evidence (v3, one line) |
|---|---|---|---|---|
| Art direction | 1 | 2.5 | 2.5 | LOOK hexes still drive facades, signs, vehicles, water and HUD; the three facade rhythms now vary the deco beat without leaving the palette. |
| Hero | 1 | 2.5 | 2.5 | The coupe is RED now: deep red-coral #C22E23 at env 0.5 reads red in the mission/coast profiles and red-coral from behind in the cover — the v2 pink wash is gone. |
| Obstacles / enemies | 1 | 2 | 2.5 | Cruiser lightbars throw alternating red/blue reflection pools on the asphalt (visible under the cruisers in cover + mission), beside the livery, officer and searchlight helicopter. |
| Interactables | 1 | 2.5 | 2.5 | The beacon stands in a pulsing gold ground glow (foot frame: glow disc + breathing ring + crate prop), and pickup/delivery fire a gold celebrate burst (live-verified in smoke). |
| World | 1 | 2.5 | 2.5 | Foreground props, mid blocks in three facade rhythms with parapet/dome/water-tower rooflines, skyline + beach + marina behind; palm crowns are wide folded fans now. |
| Materials | 1 | 2.5 | 2.5 | Ten seeded canvas textures (three facade rhythms added) on shared material roles with world-scale UVs; glass reflects the PMREM sky; hero paint is its own finish. |
| Lighting / render | 1 | 2.5 | 2.5 | Same preset as a unit (warm sun, fitted 2048 shadows, hemisphere, PMREM env, ACES 0.92, horizon fog); the hero finish retune is what changed — saturation survives noon. |
| VFX / motion | 1 | 2 | 2.5 | Everything v2 had (sparks, dust, skids, muzzle light, trauma shake, FOV kick) plus lightbar pools, beacon glow pulse and celebrate bursts — all event-driven, all decay to rest. |
| UI / HUD | 1 | 2 | 2.5 | Key-cap hint chips, a gradient speed bar under the readout, compass chip on the minimap, star/cash pulse animations, gold-accented banner and toast — the hint strip is furniture now, not a text strip. |
| Performance | 1 | 2 | 2 | Triangles rose with the folded fronds (≈96–137K, still ~6% of the 2M ceiling) and the coast frame still spends 443 calls; zero errors everywhere. Held at 2 honestly. |

**Averages: v1 1.0 → v2 2.30 → v3 2.45. Premium gate (BAR.md): every category
≥ 2 ✓, average ≥ 2.3 ✓ — and above the v3 target of 2.45 ✓ — no automatic
failures ✓ — GATE PASSED with margin this time.**

Automatic-failure check (v3): no primitive-box hero (extruded profiles), no
single flat material family (textured roles + glass/metal/fabric), no
rectangular stat-card HUD (pills + circular minimap + chips), no stock sky or
flat light (gradient sky + PMREM + shadows), no greybox interactables (crate +
beam + glow), no empty arena (layered city), no stock particles (pooled event
effects), timer bar functional, no clipping seen in frames.

## Renderer diagnostics — v3 (window.__diagnostics, after final paint)

| Shot | Draw calls | Triangles | File size |
|---|---|---|---|
| 1-cover.jpg (chase) | 304 | 123,152 | 154,340 B |
| 2-foot.jpg (on foot) | 358 | 120,660 | 130,283 B |
| 3-mission.jpg (mission) | 107 | 95,628 | 142,538 B |
| 4-coast.jpg (coast) | 443 | 136,570 | 126,769 B |

All four ≤ 256 KiB (262,144 B cap) ✓. 768×480 downscales checked: banner text,
stars/cash, minimap, hero and beacon all still read at judge size.

## Renderer diagnostics — v2 (for comparison)

| Shot | Draw calls | Triangles | File size |
|---|---|---|---|
| 1-cover.jpg (chase) | 291 | 99,434 | 143,955 B |
| 2-foot.jpg (on foot) | 327 | 96,980 | 133,316 B |
| 3-mission.jpg (mission) | 105 | 73,616 | 138,585 B |
| 4-coast.jpg (coast) | 421 | 111,980 | 135,621 B |

Budget note (unchanged tradeoff): the coast frame's draw calls exceed the
<300 advisory because the fitted shadow pass re-renders the whole beachfront
(marina boats, instanced palms/umbrellas, lifeguard stands) on top of the main
pass. The geometry is merged/instanced and no hot-loop allocation was added.

## What remains weak (v3, honest)

- The lightbar reflection pool is subtle in daylight stills — additive gold/
  red/blue on sunlit asphalt reads clearly in motion, faintly in a frame.
- Palm crowns are wide fans now, but still read stylised-flat from directly
  behind; they are the least volumetric silhouette left.
- The hero's rear three-quarter view is dominated by the glasshouse, so the
  deepened red shows mostly at the flanks — the cover frame is coral-red,
  not the rich red of the side profiles.
- Coast draw calls (443) still exceed the <300 advisory; triangles are fine.
- No post chain (bloom/glare) — the vignette is still a CSS overlay, and the
  celebrate/pulse feedback can only be proven live, not from stills.
