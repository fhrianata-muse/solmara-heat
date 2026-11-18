# LOOK — SOLMARA HEAT (rebuild v2)

## Rebuild v2 phase notes (builder)
- 2b: all seven textures shipped as seeded canvas textures in materials.js. Asphalt is painted one tone lighter (#565d66 base) because sRGB colour maps decode darker than the same hex as a flat material colour — the rendered road lands on the #3C4147 target.
- 2c: preset applied as one unit. First capture came out washed: sun + hemisphere + PMREM env stacked. Balance fix: exposure 1.05 → 0.92, hemisphere 0.7 → 0.5, matte materials clamped to envMapIntensity 0.45 in createWorld (paint/glass/chrome keep their own). Palette saturation recovered without touching the hex contract.
- Fog far stays 720: the skyline must stay readable in the coast frame.

Art direction: sun-soaked coastal crime, late-morning light, pastel art-deco bay city.
The look must read in a 768x480 judge contact sheet: strong silhouettes, saturated
but disciplined palette, no grey fog hiding missing geometry.

## Palette (named hex)
- Sky zenith #2E7CD6, sky horizon #BFE3F2, sea #1F8AAD, sand #EAD9A0
- Asphalt #3C4147, lane paint #F5F2E8, sidewalk #C9C2B4
- Deco cream #F2E3C6, deco coral #F08A6B, deco teal #3FA7A0, deco mustard #E8B54A
- Palm green #3E9B4F, trunk #8A6B4A
- Player accent (Mara) coral red #E2483D; police livery white #F4F6F8 + navy #22406B + lightbar red/blue
- Traffic palette: 8 muted car paints, none neon

## Light (one preset, moved as a unit — threejs-scene)
- Sun: warm white #FFF2D8, high SE, casts shadows (2048 map, tight frustum on player area)
- Hemisphere: sky #BFE3F2 / ground #E8D9B0
- Environment: PMREM from painted gradient sky; ACES tone mapping, exposure 1.05
- Fog: pale horizon #CFE8F2, far enough to frame the skyline, never to hide the city

## Material language
- Seeded canvas textures (deterministic): asphalt with lane wear, sidewalk slabs,
  deco facades (window grids, awnings, trim lines), sand, water normal-ish sparkle
- World-scale UVs; colour maps sRGB; one shared material-role set (facade, trim,
  road, glass, foliage, metal, rubber), not per-object improvisation
- Glass: MeshPhysical/Standard with env reflection, slight teal tint

## Camera
- Chase cam FOV 62, low and close enough that the hero car fills frame bottom-third
- On foot: over-shoulder, FOV 58; speed FOV kick +6 at boost (game-feel)
