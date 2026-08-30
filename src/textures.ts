import { ATLAS_COLS, ATLAS_ROWS, TILE_SIZE, Block } from "./blocks";

function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function fillNoise(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  base: [number, number, number],
  variance: number,
  seed: number,
): void {
  const r = rand(seed);
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
    const n = (r() - 0.5) * variance;
    d[i * 4] = Math.max(0, Math.min(255, base[0] + n));
    d[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n));
    d[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n));
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, x, y);
}

function drawGrassSide(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [134, 96, 67], 28, 11);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < 4; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const i = (py * TILE_SIZE + px) * 4;
      const n = ((px * 7 + py * 13) % 17) - 8;
      d[i] = Math.max(0, Math.min(255, 90 + n));
      d[i + 1] = Math.max(0, Math.min(255, 150 + n));
      d[i + 2] = Math.max(0, Math.min(255, 50 + n));
    }
  }
  ctx.putImageData(img, x, y);
}

function drawLeaves(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const r = rand(77);
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
    const hole = r() > 0.72;
    if (hole) {
      d[i * 4 + 3] = 0;
    } else {
      const n = (r() - 0.5) * 40;
      d[i * 4] = Math.max(0, Math.min(255, 60 + n));
      d[i * 4 + 1] = Math.max(0, Math.min(255, 130 + n));
      d[i * 4 + 2] = Math.max(0, Math.min(255, 40 + n));
      d[i * 4 + 3] = 220;
    }
  }
  ctx.putImageData(img, x, y);
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const r = rand(42);
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
    const n = (r() - 0.5) * 20;
    d[i * 4] = Math.max(0, Math.min(255, 40 + n));
    d[i * 4 + 1] = Math.max(0, Math.min(255, 100 + n));
    d[i * 4 + 2] = Math.max(0, Math.min(255, 200 + n));
    d[i * 4 + 3] = 160;
  }
  ctx.putImageData(img, x, y);
}

function drawWoodSide(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [110, 75, 40], 18, 55);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (const px of [2, 3, 8, 9, 13, 14]) {
      const i = (py * TILE_SIZE + px) * 4;
      d[i] = Math.max(0, d[i] - 25);
      d[i + 1] = Math.max(0, d[i + 1] - 20);
      d[i + 2] = Math.max(0, d[i + 2] - 15);
    }
  }
  ctx.putImageData(img, x, y);
}

function drawWoodTop(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [130, 95, 55], 12, 66);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  const cx = 7.5;
  const cy = 7.5;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const dist = Math.hypot(px - cx, py - cy);
      const ring = Math.floor(dist) % 2 === 0;
      if (ring) {
        const i = (py * TILE_SIZE + px) * 4;
        d[i] = Math.max(0, d[i] - 18);
        d[i + 1] = Math.max(0, d[i + 1] - 14);
      }
    }
  }
  ctx.putImageData(img, x, y);
}

export function createAtlas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE_SIZE;
  canvas.height = ATLAS_ROWS * TILE_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#7f7f7f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 0 grass_side
  drawGrassSide(ctx, 0, 0);
  // 1 grass_top
  fillNoise(ctx, TILE_SIZE, 0, [90, 150, 50], 30, 22);
  // 2 dirt
  fillNoise(ctx, TILE_SIZE * 2, 0, [134, 96, 67], 28, 33);
  // 3 stone
  fillNoise(ctx, TILE_SIZE * 3, 0, [120, 120, 120], 35, 44);

  // 4 sand
  fillNoise(ctx, 0, TILE_SIZE, [210, 195, 140], 20, 55);
  // 5 wood_side
  drawWoodSide(ctx, TILE_SIZE, TILE_SIZE);
  // 6 wood_top
  drawWoodTop(ctx, TILE_SIZE * 2, TILE_SIZE);
  // 7 leaves
  drawLeaves(ctx, TILE_SIZE * 3, TILE_SIZE);

  // 8 water
  drawWater(ctx, 0, TILE_SIZE * 2);
  // 9 cobble
  fillNoise(ctx, TILE_SIZE, TILE_SIZE * 2, [100, 100, 100], 45, 88);
  // 10 planks
  fillNoise(ctx, TILE_SIZE * 2, TILE_SIZE * 2, [160, 120, 70], 18, 99);
  const plank = ctx.getImageData(TILE_SIZE * 2, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE);
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      if (py % 4 === 0 || (py % 8 < 4 && px === 8) || (py % 8 >= 4 && px === 0)) {
        const i = (py * TILE_SIZE + px) * 4;
        plank.data[i] = Math.max(0, plank.data[i] - 40);
        plank.data[i + 1] = Math.max(0, plank.data[i + 1] - 30);
        plank.data[i + 2] = Math.max(0, plank.data[i + 2] - 20);
      }
    }
  }
  ctx.putImageData(plank, TILE_SIZE * 2, TILE_SIZE * 2);

  return canvas;
}

export function createHotbarIcon(block: number): HTMLCanvasElement {
  const atlas = createAtlas();
  const tiles: Record<number, number> = {
    [Block.Grass]: 1,
    [Block.Dirt]: 2,
    [Block.Stone]: 3,
    [Block.Sand]: 4,
    [Block.Wood]: 5,
    [Block.Leaves]: 7,
    [Block.Water]: 8,
    [Block.Cobble]: 9,
    [Block.Planks]: 10,
  };
  const tile = tiles[block] ?? 3;
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);
  const c = document.createElement("canvas");
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    atlas,
    col * TILE_SIZE,
    row * TILE_SIZE,
    TILE_SIZE,
    TILE_SIZE,
    0,
    0,
    TILE_SIZE,
    TILE_SIZE,
  );
  return c;
}
