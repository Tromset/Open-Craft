/** Lightweight 2D/3D value noise + fBm for terrain. */

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function hash2(x: number, z: number, seed: number): number {
  let n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function hash3(x: number, y: number, z: number, seed: number): number {
  let n =
    Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 269.5) * 43758.5453;
  return n - Math.floor(n);
}

export function noise2(x: number, z: number, seed = 0): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = fade(xf);
  const v = fade(zf);

  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);

  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function noise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const aaa = hash3(xi, yi, zi, seed);
  const baa = hash3(xi + 1, yi, zi, seed);
  const aba = hash3(xi, yi + 1, zi, seed);
  const bba = hash3(xi + 1, yi + 1, zi, seed);
  const aab = hash3(xi, yi, zi + 1, seed);
  const bab = hash3(xi + 1, yi, zi + 1, seed);
  const abb = hash3(xi, yi + 1, zi + 1, seed);
  const bbb = hash3(xi + 1, yi + 1, zi + 1, seed);

  return lerp(
    lerp(lerp(aaa, baa, u), lerp(aba, bba, u), v),
    lerp(lerp(aab, bab, u), lerp(abb, bbb, u), v),
    w,
  );
}

export function fbm2(
  x: number,
  z: number,
  octaves = 4,
  seed = 0,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, z * freq, seed + i * 31) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

export function fbm3(
  x: number,
  y: number,
  z: number,
  octaves = 3,
  seed = 0,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x * freq, y * freq, z * freq, seed + i * 47) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
