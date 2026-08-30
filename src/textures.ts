import { ATLAS_COLS, ATLAS_ROWS, TILE_SIZE, iconTile } from "./blocks";

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
  alpha = 255,
): void {
  const r = rand(seed);
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
    const n = (r() - 0.5) * variance;
    d[i * 4] = Math.max(0, Math.min(255, base[0] + n));
    d[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n));
    d[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n));
    d[i * 4 + 3] = alpha;
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

function drawSnowSide(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [134, 96, 67], 28, 19);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < 4; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const i = (py * TILE_SIZE + px) * 4;
      const n = ((px * 5 + py * 11) % 13) - 6;
      d[i] = Math.max(0, Math.min(255, 230 + n));
      d[i + 1] = Math.max(0, Math.min(255, 235 + n));
      d[i + 2] = Math.max(0, Math.min(255, 240 + n));
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

function drawPlanks(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [160, 120, 70], 18, 99);
  const plank = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
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
  ctx.putImageData(plank, x, y);
}

function drawOre(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  speck: [number, number, number],
  density: number,
  seed: number,
): void {
  fillNoise(ctx, x, y, [120, 120, 120], 35, seed);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  const r = rand(seed + 91);
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
    if (r() > density) continue;
    const n = (r() - 0.5) * 30;
    d[i * 4] = Math.max(0, Math.min(255, speck[0] + n));
    d[i * 4 + 1] = Math.max(0, Math.min(255, speck[1] + n));
    d[i * 4 + 2] = Math.max(0, Math.min(255, speck[2] + n));
  }
  ctx.putImageData(img, x, y);
}

function drawGlass(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const i = (py * TILE_SIZE + px) * 4;
      const edge = px < 2 || px > 13 || py < 2 || py > 13;
      d[i] = edge ? 210 : 170;
      d[i + 1] = edge ? 230 : 200;
      d[i + 2] = edge ? 240 : 220;
      d[i + 3] = edge ? 230 : 0;
    }
  }
  ctx.putImageData(img, x, y);
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [150, 70, 55], 22, 120);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const row = Math.floor(py / 4);
      const offset = row % 2 === 0 ? 0 : 8;
      const mortar = py % 4 === 0 || (px + offset) % 8 === 0;
      if (mortar) {
        const i = (py * TILE_SIZE + px) * 4;
        d[i] = 180;
        d[i + 1] = 170;
        d[i + 2] = 155;
      }
    }
  }
  ctx.putImageData(img, x, y);
}

function drawCactusSide(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [50, 130, 50], 22, 140);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (const px of [0, 1, 7, 8, 14, 15]) {
      const i = (py * TILE_SIZE + px) * 4;
      d[i] = Math.max(0, d[i] - 25);
      d[i + 1] = Math.max(0, d[i + 1] - 35);
      d[i + 2] = Math.max(0, d[i + 2] - 20);
    }
  }
  ctx.putImageData(img, x, y);
}

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) d[i * 4 + 3] = 0;
  const set = (px: number, py: number, r: number, g: number, b: number, a = 255) => {
    if (px < 0 || py < 0 || px >= TILE_SIZE || py >= TILE_SIZE) return;
    const i = (py * TILE_SIZE + px) * 4;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = a;
  };
  for (let py = 6; py < 16; py++) {
    for (let px = 7; px <= 8; px++) set(px, py, 110, 70, 35);
  }
  for (let py = 1; py <= 6; py++) {
    for (let px = 6; px <= 9; px++) {
      const dist = Math.abs(px - 7.5) + Math.abs(py - 3.5);
      if (dist < 3.2) set(px, py, 255, 180 - py * 8, 40);
    }
  }
  set(7, 2, 255, 240, 160);
  set(8, 2, 255, 240, 160);
  ctx.putImageData(img, x, y);
}

function drawTableTop(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [150, 105, 55], 16, 160);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      if (px === 0 || py === 0 || px === 15 || py === 15 || px === 7 || px === 8 || py === 7 || py === 8) {
        const i = (py * TILE_SIZE + px) * 4;
        d[i] = Math.max(0, d[i] - 50);
        d[i + 1] = Math.max(0, d[i + 1] - 40);
        d[i + 2] = Math.max(0, d[i + 2] - 25);
      }
    }
  }
  ctx.putImageData(img, x, y);
}

function drawTableSide(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [130, 90, 45], 16, 161);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      if (py < 3 || px === 3 || px === 12) {
        const i = (py * TILE_SIZE + px) * 4;
        d[i] = Math.max(0, d[i] - 30);
        d[i + 1] = Math.max(0, d[i + 1] - 22);
      }
    }
  }
  ctx.putImageData(img, x, y);
}

function drawFurnaceFront(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [90, 90, 90], 20, 170);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const opening = px >= 4 && px <= 11 && py >= 4 && py <= 11;
      const i = (py * TILE_SIZE + px) * 4;
      if (opening) {
        const glow = py > 8;
        d[i] = glow ? 220 : 20;
        d[i + 1] = glow ? 90 : 18;
        d[i + 2] = glow ? 30 : 15;
      }
    }
  }
  ctx.putImageData(img, x, y);
}

function drawFurnaceSide(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillNoise(ctx, x, y, [95, 95, 95], 18, 171);
  const img = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px of [0, 15]) {
      const i = (py * TILE_SIZE + px) * 4;
      d[i] = 50;
      d[i + 1] = 50;
      d[i + 2] = 50;
    }
  }
  ctx.putImageData(img, x, y);
}

function drawItemBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: [number, number, number],
  seed: number,
): void {
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) d[i * 4 + 3] = 0;
  const r = rand(seed);
  for (let py = 3; py < 13; py++) {
    for (let px = 3; px < 13; px++) {
      const dist = Math.hypot(px - 7.5, py - 7.5);
      if (dist > 5.2 + r() * 0.6) continue;
      const n = (r() - 0.5) * 40;
      const i = (py * TILE_SIZE + px) * 4;
      d[i] = Math.max(0, Math.min(255, color[0] + n));
      d[i + 1] = Math.max(0, Math.min(255, color[1] + n));
      d[i + 2] = Math.max(0, Math.min(255, color[2] + n));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, x, y);
}

function drawStick(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) d[i * 4 + 3] = 0;
  for (let t = 0; t < 14; t++) {
    const px = 3 + t;
    const py = 12 - t;
    for (let k = 0; k < 2; k++) {
      const i = ((py + k) * TILE_SIZE + px) * 4;
      if (py + k < 0 || py + k >= 16) continue;
      d[i] = 120;
      d[i + 1] = 80;
      d[i + 2] = 40;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, x, y);
}

function drawPick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  head: [number, number, number],
): void {
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) d[i * 4 + 3] = 0;
  const set = (px: number, py: number, r: number, g: number, b: number) => {
    if (px < 0 || py < 0 || px >= 16 || py >= 16) return;
    const i = (py * TILE_SIZE + px) * 4;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  };
  for (let t = 0; t < 12; t++) set(4 + Math.floor(t * 0.7), 13 - t, 120, 80, 40);
  for (let px = 4; px <= 14; px++) {
    set(px, 3, head[0], head[1], head[2]);
    set(px, 4, head[0], head[1], head[2]);
  }
  set(4, 5, head[0], head[1], head[2]);
  set(14, 5, head[0], head[1], head[2]);
  ctx.putImageData(img, x, y);
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = img.data;
  for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) d[i * 4 + 3] = 0;
  for (let py = 2; py < 14; py++) {
    for (let px = 2; px < 14; px++) {
      const dx = Math.abs(px - 7.5);
      const dy = Math.abs(py - 7.5);
      if (dx + dy > 6) continue;
      const i = (py * TILE_SIZE + px) * 4;
      const hi = dx + dy < 2;
      d[i] = hi ? 200 : 50;
      d[i + 1] = hi ? 255 : 200;
      d[i + 2] = 230;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, x, y);
}

function tileXY(index: number): [number, number] {
  const col = index % ATLAS_COLS;
  const row = Math.floor(index / ATLAS_COLS);
  return [col * TILE_SIZE, row * TILE_SIZE];
}

let cachedAtlas: HTMLCanvasElement | null = null;

export function createAtlas(): HTMLCanvasElement {
  if (cachedAtlas) return cachedAtlas;

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE_SIZE;
  canvas.height = ATLAS_ROWS * TILE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const at = (i: number) => tileXY(i);

  drawGrassSide(ctx, ...at(0));
  fillNoise(ctx, ...at(1), [90, 150, 50], 30, 22);
  fillNoise(ctx, ...at(2), [134, 96, 67], 28, 33);
  fillNoise(ctx, ...at(3), [120, 120, 120], 35, 44);
  fillNoise(ctx, ...at(4), [210, 195, 140], 20, 55);
  drawWoodSide(ctx, ...at(5));
  drawWoodTop(ctx, ...at(6));
  drawLeaves(ctx, ...at(7));
  drawWater(ctx, ...at(8));
  fillNoise(ctx, ...at(9), [100, 100, 100], 45, 88);
  drawPlanks(ctx, ...at(10));
  drawOre(ctx, ...at(11), [25, 25, 25], 0.18, 200);
  drawOre(ctx, ...at(12), [200, 140, 90], 0.16, 201);
  drawOre(ctx, ...at(13), [50, 220, 210], 0.12, 202);
  fillNoise(ctx, ...at(14), [30, 30, 32], 18, 203);
  drawGlass(ctx, ...at(15));
  drawBrick(ctx, ...at(16));
  fillNoise(ctx, ...at(17), [130, 125, 118], 50, 204);
  fillNoise(ctx, ...at(18), [235, 240, 245], 16, 205);
  drawCactusSide(ctx, ...at(19));
  fillNoise(ctx, ...at(20), [40, 120, 45], 18, 206);
  drawTorch(ctx, ...at(21));
  drawTableSide(ctx, ...at(22));
  drawTableTop(ctx, ...at(23));
  drawFurnaceFront(ctx, ...at(24));
  drawFurnaceSide(ctx, ...at(25));
  fillNoise(ctx, ...at(26), [80, 80, 80], 14, 207);
  fillNoise(ctx, ...at(27), [45, 40, 50], 40, 208);
  drawItemBlob(ctx, ...at(28), [28, 28, 30], 300);
  drawStick(ctx, ...at(29));
  drawPick(ctx, ...at(30), [160, 120, 70]);
  drawPick(ctx, ...at(31), [140, 140, 145]);
  drawDiamond(ctx, ...at(32));
  drawItemBlob(ctx, ...at(33), [180, 110, 70], 301);
  drawSnowSide(ctx, ...at(34));

  cachedAtlas = canvas;
  return canvas;
}

export function createHotbarIcon(id: number): HTMLCanvasElement {
  const atlas = createAtlas();
  const tile = iconTile(id);
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);
  const c = document.createElement("canvas");
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
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
