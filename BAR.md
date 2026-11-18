# BAR — gta6-01 "Make GTA 6", rebuild v2

## Result (Phase 3, builder)
Gate PASSED at the threshold: every category ≥ 2, average 2.30, no automatic failures.
Full evidence, diagnostics and the honest weak list: SCORECARD.md. The pass needed two
extra iterations after the first v2 capture (light-balance fix, then a density pass:
hero racing stripes, courier-crate prop, rooftop water towers, lifeguard stands) —
scores were only written after those landed in the frames.

## Judging metric (from competition.yaml, read 2026-11-18)
AI judge pairwise from a contact sheet of 3-4 screenshots + short source outline.
Criteria order: (1) complete open world SHOWN (city on foot + by car, traffic +
pedestrians, wanted + police, missions); (2) depth/fun; (3) feel/polish (HUD +
minimap, effects, menus); (4) original sun-soaked city, own names; (5) source in
well-named single-job files. Final = full rejudge, top-100 paid of ~4,500+ entries.
Calibration before rebuild: P(paid zone) 2% (v1). Rebuild target: raise the
screenshot-visible quality to premium scorecard so pairwise wins are plausible;
honest post-build estimate reported to Ari before resubmit.

## Scorecard (threejs-aaa-graphics-builder), genre equivalents
Hero = Mara + hero car; Obstacles/enemies = police + traffic; Interactables =
mission beacons, delivery points, pickups; World = Solmara Bay city.
Pass = PREMIUM: every category >= 2, average >= 2.3, no automatic failure standing
(esp.: hero not a primitive+glow, HUD not rectangular stat cards, fog not standing
in for geometry), renderer diagnostics reported.

## v1 baseline (parent-scored from v1 screenshots, 2026-11-18)
Art direction 1 · Hero 1 · Obstacles 1 · Interactables 1 · World 1 · Materials 1 ·
Lighting 1 · VFX 1 · UI/HUD 1 · Performance 1 → avg 1.0. Automatic failures:
hero/cars primitive boxes; HUD rectangular cards; flat untextured materials.

## Reference anchors
Skill anchors scene-1 (=1) vs scene-3 (=2.5-3) viewed before scoring.
Judge-frame check: every staged screenshot must still read at 768x480.
