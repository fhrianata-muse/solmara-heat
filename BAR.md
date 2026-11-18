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

## Rebuild v3 (this session) — why and what

v2 passed this bar at exactly 2.30, but its submission recording failed to
seal for a tooling reason, so v2's transcripts can never be submitted. V3 is
a full re-author of the same game in a fresh recorded session: same systems,
same LOOK/CHARACTERS contract, every file written again — plus fixes for the
four weaknesses v2's own SCORECARD.md admitted, and a higher gate for margin:

- Hero paint: deep red-coral #C22E23, envMapIntensity 0.5 — must read red,
  not pink, in the cover frame.
- Palms: folded two-plane fronds (V cross-section), two tiers, droop variance.
- Skyline: three facade window rhythms per building hash; rooflines vary
  (parapet rim, AC dome, water tower, step-back crown).
- Two of {Obstacles, VFX, UI, Performance} must move clearly off 2:
  lightbar reflection pools on asphalt (VFX/Obstacles), beacon ground glow +
  pickup/paid particle bursts (VFX/Interactables), key-cap hint chips +
  speed bar + star/cash pulse (UI).
- V3 gate: every category ≥ 2, average ≥ 2.45 (target, above the 2.3 premium
  line, so the pass is not balanced on the threshold again).

### v3 phase notes
- Phase 0: contract docs refreshed (LOOK/CHARACTERS v3 notes above), entry
  files re-authored (main.ts, serve.ts), claim file and shots list rewritten,
  vendored Three.js r128 re-copied in-session.
- Phase 2a forms: rig, car profiles, helicopter re-authored; hero finish and
  lightbar pool added; palms rebuilt as folded two-plane fronds; three
  facade rhythms wired per building; parapet + AC-dome rooflines added.
- Phase 2b materials: facadeTexture(variant) paints the three rhythms;
  paintMaterial takes a finish (hero env 0.5 / roughness 0.40); glow-disc
  texture shared; all brushes re-seeded.
- Phase 2c lighting: world factory re-authored, preset unchanged as a unit.
- Phase 2d effects: celebrate burst added; beacon ground glow + flare.
- Phase 2e HUD + loop: key-cap chips, speed bar, compass chip, star/cash
  pulses; loop/player/traffic/audio/save/shots re-authored.
- Phase 3 evidence: 4 shots retaken (all ≤ 154,340 B), 768×480 readability
  verified, SCORECARD v3 column written: average 2.45, gate PASSED.
- Phase 5 QA: node --check clean on all game JS; dossier.json byte-identical
  across two MAKEFUN_OUTPUT_DIR runs (sha256 afb8735f…); play-loop smoke
  passed (menu → walk 3.3 m → enter car → drive → fire → pause) with 0 page
  errors. One cosmetic note from live headless play is logged in
  BUILD-LOG-V3.md (a pale coral plate reads near spawn in live frames —
  absent from all four staged shots; grazing-angle paint/awning wash is the
  leading explanation, not isolated to one mesh).
