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
  CoalOre: 10,
  IronOre: 11,
  DiamondOre: 12,
  CoalBlock: 13,
  Glass: 14,
  Brick: 15,
  Gravel: 16,
  Snow: 17,
  Cactus: 18,
  Torch: 19,
  CraftingTable: 20,
  Furnace: 21,
  Bedrock: 22,
} as const;

export const Item = {
  Coal: 100,
  Stick: 101,
  WoodPick: 102,
  StonePick: 103,
  Diamond: 104,
  RawIron: 105,
} as const;

export type BlockId = (typeof Block)[keyof typeof Block];
export type ItemId = (typeof Item)[keyof typeof Item];

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
  [Block.CoalOre]: "Minerai de charbon",
  [Block.IronOre]: "Minerai de fer",
  [Block.DiamondOre]: "Minerai de diamant",
  [Block.CoalBlock]: "Bloc de charbon",
  [Block.Glass]: "Verre",
  [Block.Brick]: "Briques",
  [Block.Gravel]: "Gravier",
  [Block.Snow]: "Neige",
  [Block.Cactus]: "Cactus",
  [Block.Torch]: "Torche",
  [Block.CraftingTable]: "Établi",
  [Block.Furnace]: "Fourneau",
  [Block.Bedrock]: "Bedrock",
  [Item.Coal]: "Charbon",
  [Item.Stick]: "Bâton",
  [Item.WoodPick]: "Pioche en bois",
  [Item.StonePick]: "Pioche en pierre",
  [Item.Diamond]: "Diamant",
  [Item.RawIron]: "Fer brut",
};

/** Creative palette used to fill empty hotbar slots when entering creative. */
export const CREATIVE_PALETTE: number[] = [
  Block.Grass,
  Block.Dirt,
  Block.Stone,
  Block.Sand,
  Block.Wood,
  Block.Cobble,
  Block.Planks,
  Block.Glass,
  Block.Torch,
];

export const STACK_SIZE = 64;

export function isItem(id: number): boolean {
  return id >= 100;
}

export function isPlaceable(id: number): boolean {
  return id > 0 && id < 100 && id !== Block.Air && id !== Block.Bedrock;
}

export function isSolid(id: number): boolean {
  return id !== Block.Air && id !== Block.Water && id !== Block.Torch;
}

export function isOpaque(id: number): boolean {
  return (
    id !== Block.Air &&
    id !== Block.Water &&
    id !== Block.Leaves &&
    id !== Block.Glass &&
    id !== Block.Torch
  );
}

export function isReplaceable(id: number): boolean {
  return id === Block.Air || id === Block.Water;
}

export function isUnbreakable(id: number): boolean {
  return id === Block.Bedrock;
}

export function isInteractable(id: number): boolean {
  return id === Block.CraftingTable;
}

/** True if this item can be placed as a world block (not tools, coal, sticks, …). */
export function isPlaceable(id: number): boolean {
  return FACE_TILES[id] != null;
}

/** Face order: +X, -X, +Y, -Y, +Z, -Z — atlas tile indices */
export type FaceTiles = [number, number, number, number, number, number];

/**
 * Atlas layout (8×6 tiles of 16px):
 *  0 grass_side   1 grass_top    2 dirt          3 stone
 *  4 sand         5 wood_side    6 wood_top      7 leaves
 *  8 water        9 cobble      10 planks       11 coal_ore
 * 12 iron_ore    13 diamond_ore 14 coal_block   15 glass
 * 16 brick       17 gravel      18 snow         19 cactus_side
 * 20 cactus_top  21 torch       22 table_side   23 table_top
 * 24 furnace_front 25 furnace_side 26 furnace_top 27 bedrock
 * 28 coal        29 stick       30 wood_pick    31 stone_pick
 * 32 diamond     33 raw_iron    34 snow_side    35 crack
 * 36-47 reserved
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
  [Block.CoalOre]: [11, 11, 11, 11, 11, 11],
  [Block.IronOre]: [12, 12, 12, 12, 12, 12],
  [Block.DiamondOre]: [13, 13, 13, 13, 13, 13],
  [Block.CoalBlock]: [14, 14, 14, 14, 14, 14],
  [Block.Glass]: [15, 15, 15, 15, 15, 15],
  [Block.Brick]: [16, 16, 16, 16, 16, 16],
  [Block.Gravel]: [17, 17, 17, 17, 17, 17],
  [Block.Snow]: [18, 18, 18, 18, 18, 18],
  [Block.Cactus]: [19, 19, 20, 20, 19, 19],
  [Block.Torch]: [21, 21, 21, 21, 21, 21],
  [Block.CraftingTable]: [22, 22, 23, 10, 22, 22],
  [Block.Furnace]: [25, 25, 26, 26, 24, 25],
  [Block.Bedrock]: [27, 27, 27, 27, 27, 27],
};

export const ITEM_TILES: Record<number, number> = {
  [Item.Coal]: 28,
  [Item.Stick]: 29,
  [Item.WoodPick]: 30,
  [Item.StonePick]: 31,
  [Item.Diamond]: 32,
  [Item.RawIron]: 33,
};

export const TILE_SIZE = 16;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 6;

export function iconTile(id: number): number {
  if (ITEM_TILES[id] !== undefined) return ITEM_TILES[id];
  const faces = FACE_TILES[id];
  if (faces) return faces[2]; // top face
  return 3;
}

/** Seconds to break with the given tool (Infinity = unbreakable). */
export function mineDuration(blockId: number, toolId: number): number {
  if (blockId === Block.Air || blockId === Block.Water) return Infinity;
  if (blockId === Block.Bedrock) return Infinity;
  if (blockId === Block.Torch) return 0.05;

  const woodPick = toolId === Item.WoodPick;
  const stonePick = toolId === Item.StonePick;
  const pick = woodPick || stonePick;

  switch (blockId) {
    case Block.Leaves:
    case Block.Snow:
      return 0.2;
    case Block.Glass:
      return 0.25;
    case Block.Dirt:
    case Block.Grass:
    case Block.Sand:
    case Block.Gravel:
    case Block.Cactus:
      return 0.4;
    case Block.Wood:
    case Block.Planks:
    case Block.CraftingTable:
      return 0.85;
    case Block.Stone:
    case Block.Cobble:
    case Block.CoalOre:
    case Block.IronOre:
    case Block.DiamondOre:
    case Block.CoalBlock:
    case Block.Brick:
    case Block.Furnace:
    case Block.Bedrock:
      if (stonePick) return 0.4;
      if (woodPick) return 0.85;
      return 4.8;
    default:
      return pick ? 0.7 : 1.2;
  }
}

/** What drops when the block is broken. null = nothing. */
export function blockDrop(blockId: number): { id: number; count: number } | null {
  switch (blockId) {
    case Block.Stone:
      return { id: Block.Cobble, count: 1 };
    case Block.Grass:
      return { id: Block.Dirt, count: 1 };
    case Block.CoalOre:
      return { id: Item.Coal, count: 1 };
    case Block.IronOre:
      return { id: Item.RawIron, count: 1 };
    case Block.DiamondOre:
      return { id: Item.Diamond, count: 1 };
    case Block.Leaves:
      return null;
    case Block.Bedrock:
    case Block.Air:
    case Block.Water:
      return null;
    default:
      return { id: blockId, count: 1 };
  }
}

export function particleColor(id: number): [number, number, number] {
  switch (id) {
    case Block.Grass:
    case Block.Leaves:
      return [0.35, 0.58, 0.2];
    case Block.Dirt:
      return [0.52, 0.38, 0.26];
    case Block.Stone:
    case Block.Cobble:
    case Block.Bedrock:
      return [0.47, 0.47, 0.47];
    case Block.Sand:
      return [0.82, 0.76, 0.55];
    case Block.Wood:
    case Block.Planks:
    case Block.CraftingTable:
      return [0.55, 0.38, 0.2];
    case Block.Water:
      return [0.16, 0.39, 0.78];
    case Block.CoalOre:
    case Block.CoalBlock:
    case Item.Coal:
      return [0.18, 0.18, 0.18];
    case Block.IronOre:
    case Item.RawIron:
      return [0.78, 0.55, 0.35];
    case Block.DiamondOre:
    case Item.Diamond:
      return [0.3, 0.85, 0.85];
    case Block.Glass:
      return [0.75, 0.88, 0.95];
    case Block.Brick:
      return [0.65, 0.28, 0.22];
    case Block.Gravel:
      return [0.5, 0.48, 0.45];
    case Block.Snow:
      return [0.92, 0.94, 0.97];
    case Block.Cactus:
      return [0.2, 0.5, 0.2];
    case Block.Torch:
      return [1, 0.7, 0.2];
    case Block.Furnace:
      return [0.35, 0.35, 0.35];
    default:
      return [0.6, 0.6, 0.6];
  }
}
