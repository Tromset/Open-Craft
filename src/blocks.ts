export const Block = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  Wood: 5,
  Leaves: 6,
  Water: 7,
  Cobble: 8,
  Planks: 9,
} as const;

export type BlockId = (typeof Block)[keyof typeof Block];

export const BLOCK_NAMES: Record<number, string> = {
  [Block.Grass]: "Herbe",
  [Block.Dirt]: "Terre",
  [Block.Stone]: "Pierre",
  [Block.Sand]: "Sable",
  [Block.Wood]: "Bois",
  [Block.Leaves]: "Feuilles",
  [Block.Water]: "Eau",
  [Block.Cobble]: "Pavé",
  [Block.Planks]: "Planches",
};

export const HOTBAR: number[] = [
  Block.Grass,
  Block.Dirt,
  Block.Stone,
  Block.Sand,
  Block.Wood,
  Block.Leaves,
  Block.Cobble,
  Block.Planks,
  Block.Water,
];

export function isSolid(id: number): boolean {
  return id !== Block.Air && id !== Block.Water;
}

export function isOpaque(id: number): boolean {
  return id !== Block.Air && id !== Block.Water && id !== Block.Leaves;
}

/** True if this item can be placed as a world block (not tools, coal, sticks, …). */
export function isPlaceable(id: number): boolean {
  return FACE_TILES[id] != null;
}

/** Face order: +X, -X, +Y, -Y, +Z, -Z — atlas tile indices */
export type FaceTiles = [number, number, number, number, number, number];

/**
 * Atlas layout (4×4 tiles of 16px):
 *  0 grass_side  1 grass_top  2 dirt     3 stone
 *  4 sand        5 wood_side  6 wood_top 7 leaves
 *  8 water       9 cobble    10 planks
 */
export const FACE_TILES: Record<number, FaceTiles> = {
  [Block.Grass]: [0, 0, 1, 2, 0, 0],
  [Block.Dirt]: [2, 2, 2, 2, 2, 2],
  [Block.Stone]: [3, 3, 3, 3, 3, 3],
  [Block.Sand]: [4, 4, 4, 4, 4, 4],
  [Block.Wood]: [5, 5, 6, 6, 5, 5],
  [Block.Leaves]: [7, 7, 7, 7, 7, 7],
  [Block.Water]: [8, 8, 8, 8, 8, 8],
  [Block.Cobble]: [9, 9, 9, 9, 9, 9],
  [Block.Planks]: [10, 10, 10, 10, 10, 10],
};

export const TILE_SIZE = 16;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 3;
