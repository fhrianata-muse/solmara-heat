// SOLMARA HEAT — entrypoint the grader runs (Node 22, standard library only).
//
// What this program does, in full: copy the playable game (game/) and the four
// staged screenshots (screenshots/) into the output directory, then ask the
// vendored make.fun library to summarise that tree as dossier.json — the one
// document the judge reads beside the screenshots.
//
// The game itself is plain browser JS with Three.js vendored under
// game/vendor/, so it needs no network and no build step. Mara Voss, courier
// turned getaway driver, works 7 jobs across the coastal city of Solmara Bay
// against traffic, pedestrians and a 1–5 star police response.
//
// Play it locally:  node serve.ts   →   http://localhost:8080
// Emit a dossier:   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The caps below mirror the scorer's own gate (reference/gate.json): an entry
// the scorer would refuse — a fifth screenshot, one screenshot over 256 KiB,
// more than 993 game files or 48 MiB of game in total — is refused here too,
// at authoring time, instead of after submission.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
