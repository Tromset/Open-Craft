import { Block, Item, STACK_SIZE } from "./blocks";
import type { Slot } from "./inventory";

export interface RecipeResult {
  id: number;
  count: number;
}

interface ShapedRecipe {
  kind: "shaped";
  pattern: (number | null)[][];
  result: RecipeResult;
}

interface ShapelessRecipe {
  kind: "shapeless";
  ingredients: number[];
  result: RecipeResult;
}

type Recipe = ShapedRecipe | ShapelessRecipe;

const P = Block.Planks;
const C = Block.Cobble;
const S = Item.Stick;
const W = Block.Wood;
const Coal = Item.Coal;

const RECIPES: Recipe[] = [
  { kind: "shapeless", ingredients: [W], result: { id: Block.Planks, count: 4 } },
  { kind: "shapeless", ingredients: [P, P], result: { id: Item.Stick, count: 4 } },
  {
    kind: "shaped",
    pattern: [
      [P, P],
      [P, P],
    ],
    result: { id: Block.CraftingTable, count: 1 },
  },
  {
    kind: "shaped",
    pattern: [
      [P, P, P],
      [null, S, null],
      [null, S, null],
    ],
    result: { id: Item.WoodPick, count: 1 },
  },
  {
    kind: "shaped",
    pattern: [
      [C, C, C],
      [null, S, null],
      [null, S, null],
    ],
    result: { id: Item.StonePick, count: 1 },
  },
  {
    kind: "shaped",
    pattern: [
      [C, C, C],
      [C, null, C],
      [C, C, C],
    ],
    result: { id: Block.Furnace, count: 1 },
  },
  { kind: "shapeless", ingredients: [Coal, S], result: { id: Block.Torch, count: 4 } },
  // Shortcut: sand + coal → glass (also the documented furnace analogue)
  { kind: "shapeless", ingredients: [Block.Sand, Coal], result: { id: Block.Glass, count: 1 } },
];

function counts(ids: (number | null)[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const id of ids) {
    if (id === null || id === 0) continue;
    m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

function matchShapeless(grid: (number | null)[], ingredients: number[]): boolean {
  const have = counts(grid);
  const need = counts(ingredients);
  if (have.size !== need.size) return false;
  for (const [id, n] of need) {
    if (have.get(id) !== n) return false;
  }
  return true;
}

function matchShaped(grid: (number | null)[], size: number, pattern: (number | null)[][]): boolean {
  const ph = pattern.length;
  const pw = pattern[0]?.length ?? 0;
  if (ph > size || pw > size) return false;

  for (let oy = 0; oy <= size - ph; oy++) {
    for (let ox = 0; ox <= size - pw; ox++) {
      let ok = true;
      for (let y = 0; y < size && ok; y++) {
        for (let x = 0; x < size && ok; x++) {
          const g = grid[y * size + x];
          const inPat = y >= oy && y < oy + ph && x >= ox && x < ox + pw;
          const p = inPat ? pattern[y - oy][x - ox] : null;
          const gv = g === 0 ? null : g;
          if ((p ?? null) !== (gv ?? null)) ok = false;
        }
      }
      if (ok) return true;
    }
  }
  return false;
}

export function matchRecipe(grid: (number | null)[], size: number): RecipeResult | null {
  for (const r of RECIPES) {
    if (r.kind === "shapeless") {
      if (matchShapeless(grid, r.ingredients)) return r.result;
    } else if (matchShaped(grid, size, r.pattern)) {
      return r.result;
    }
  }
  return null;
}

/** Occupied cells that should be consumed on craft (any non-empty). */
export function occupiedMask(grid: (number | null)[]): boolean[] {
  return grid.map((id) => id !== null && id !== 0);
}

export function takeResult(held: Slot | null, result: RecipeResult): Slot | null {
  if (!held) return { id: result.id, count: result.count };
  if (held.id !== result.id) return held;
  if (held.count + result.count > STACK_SIZE) return held;
  return { id: held.id, count: held.count + result.count };
}

export function canTakeResult(held: Slot | null, result: RecipeResult): boolean {
  if (!held) return true;
  return held.id === result.id && held.count + result.count <= STACK_SIZE;
}
