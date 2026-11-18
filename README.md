# solmara-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/fhrianata-muse/solmara-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/fhrianata-muse/solmara-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMARA HEAT — an original 3D open-world crime game in the sun-soaked coastal city of Solmara Bay. Play as Mara Voss, a courier turned getaway driver: work 7 story jobs across the bay, steal and drive cars, dodge or outrun a 5-star police response with helicopter support, fight on foot, and bank your earnings. Traffic, pedestrians, a live minimap, synth radio and local saves — all running offline in a desktop browser from static files, built with Three.js.

## Rebuild v2

The first build played complete but looked like stacked boxes, so the visuals were rebuilt under the game-dev workflow (LOOK.md / CHARACTERS.md / BAR.md in this repo): extruded car profiles with bevels, an authored character rig, deco facades from seeded canvas textures, a PMREM sky-lighting preset with real shadows, event-driven effects (sparks, dust, skid marks, camera trauma), and a genre HUD with a mission timer bar. The before/after scorecard lives in SCORECARD.md. Gameplay is unchanged: same 7 jobs, traffic, wanted system and saves.

## Rebuild v3

Same game, re-authored end to end in a fresh session (v2's recording could not be sealed, so its transcripts were unusable). V3 keeps every v2 system and fixes the four weaknesses its own scorecard admitted: the hero coupe is now a deep red-coral that stays red under the noon sun, palm crowns are folded multi-plane blades with droop variance, the skyline mixes three facade rhythms with parapet/dome/water-tower rooflines, and cruiser lightbars reflect on the asphalt while the HUD gains key-cap hints and a speed bar. Scorecard: SCORECARD.md (v3 column).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — WASD move/drive, E enter/exit car, Shift sprint/boost, Space handbrake, F fire, M radio, Esc pause.

---

<sub>Entered on [make.fun](https://make.fun/?ref=q4engdna&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
