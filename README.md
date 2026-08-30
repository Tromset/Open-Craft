# Open-Craft

Jeu voxel dans le navigateur (TypeScript + Three.js + Vite). Survie, craft, jour/nuit, biomes et sauvegarde locale.

Browser voxel game. Survival, crafting, day/night, biomes, and local saves.

## Lancer / Launch

```bash
npm install
npm run dev
```

Ouvre l’URL affichée (souvent `http://localhost:5173`), clique pour capturer la souris.

Seed optionnel : `http://localhost:5173/?seed=42`

## Survie vs créatif

Le jeu démarre en **survie** : 20 cœurs, 20 faim, barres d’air sous l’eau, dégâts de chute (> 3 blocs), noyade après ~15 s. La faim baisse avec le temps et le sprint, puis la vie. Inventaire 36 cases (hotbar = 9 premières), piles de 64. Maintenir le clic gauche pour miner (la pioche accélère la pierre).

**N** bascule le **créatif** : blocs infinis, minage instantané, vol (double-espace ou **F** ; Espace / Shift pour monter / descendre).

## Contrôles

| Action | Touche |
|--------|--------|
| Avancer / reculer / straf | ZQSD ou WASD |
| Regarder | Souris |
| Sauter / nager | Espace |
| Sprint | Shift |
| Accroupi (pas de chute de bord) | Contrôle |
| Miner (maintenir) | Clic gauche |
| Poser / ouvrir l’établi | Clic droit |
| Hotbar | 1–9 ou molette |
| Inventaire (craft 2×2) | E |
| Établi (craft 3×3) | Clic droit sur un établi |
| Créatif / survie | N |
| Vol (créatif) | F ou double-espace |
| Debug (FPS, XYZ, biome, heure) | F3 |
| Sauvegarder | K (autosave 60 s) |
| Pause | Échap (relâche le pointer lock) |

## Craft

- 1 bois → 4 planches
- 2 planches → 4 bâtons
- 4 planches (carré 2×2) → établi
- 3 planches + 2 bâtons (forme de pioche) → pioche en bois
- 3 pavés + 2 bâtons → pioche en pierre
- 8 pavés (couronne) → fourneau
- charbon + bâton → 4 torches
- **sable + charbon → verre** (raccourci craft, analogue fourneau)

La pierre casse en pavé. Minerais : charbon, fer brut, diamant. Le bedrock (y = 0) est incassable. On ne pose pas de bloc dans le joueur.

## Monde

Chunks 16, hauteur 64, niveau de la mer 28. Distance de rendu ~5. Grottes, minerais (charbon fréquent, fer intermédiaire, diamant rare sous y=12). Biomes : plaine, forêt dense, désert (sable + cactus), neige sur les sommets. Cycle jour/nuit ~8 min. Torches = PointLights (16 plus proches). Zombies la nuit (4 PV, 2 dégâts au contact, brûlent le jour).

Sauvegarde `localStorage` clé `opencraft-save-v1` : seed, position, vie, faim, inventaire, modifications de blocs.
