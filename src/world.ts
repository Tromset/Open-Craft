import * as THREE from "three";
import {
  Block,
  FACE_TILES,
  ATLAS_COLS,
  ATLAS_ROWS,
  isOpaque,
  isSolid,
} from "./blocks";
import { fbm2, fbm3, noise2, noise3 } from "./noise";
import { createAtlas } from "./textures";

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 28;
export const RENDER_DISTANCE = 5;
const MESHES_PER_FRAME = 2;

export type Biome = "plains" | "forest" | "desert" | "snow";

const FACE_DIRS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const FACE_VERTS: number[][][] = [
  [
    [1, 0, 1],
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
  ],
];

const AO_DIRS: [number, number, number][][] = [
  [
    [1, -1, 1],
    [1, -1, -1],
    [1, 1, -1],
    [1, 1, 1],
  ],
  [
    [-1, -1, -1],
    [-1, -1, 1],
    [-1, 1, 1],
    [-1, 1, -1],
  ],
  [
    [-1, 1, 1],
    [1, 1, 1],
    [1, 1, -1],
    [-1, 1, -1],
  ],
  [
    [-1, -1, -1],
    [1, -1, -1],
    [1, -1, 1],
    [-1, -1, 1],
  ],
  [
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  [
    [1, -1, -1],
    [-1, -1, -1],
    [-1, 1, -1],
    [1, 1, -1],
  ],
];

type ChunkKey = string;

function key(cx: number, cz: number): ChunkKey {
  return `${cx},${cz}`;
}

function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function tileUV(tile: number): { u0: number; v0: number; u1: number; v1: number } {
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);
  const u0 = col / ATLAS_COLS;
  const v0 = row / ATLAS_ROWS;
  const u1 = (col + 1) / ATLAS_COLS;
  const v1 = (row + 1) / ATLAS_ROWS;
  const pad = 0.001;
  return { u0: u0 + pad, v0: v0 + pad, u1: u1 - pad, v1: v1 - pad };
}

export class World {
  readonly scene: THREE.Scene;
  readonly seed: number;
  private chunks = new Map<ChunkKey, Uint8Array>();
  private meshes = new Map<ChunkKey, THREE.Mesh>();
  private waterMeshes = new Map<ChunkKey, THREE.Mesh>();
  private material: THREE.MeshLambertMaterial;
  private waterMaterial: THREE.MeshLambertMaterial;
  private dirty = new Set<ChunkKey>();
  private edits = new Map<string, number>();
  private torches = new Set<string>();

  constructor(scene: THREE.Scene, seed = 42) {
    this.scene = scene;
    this.seed = seed;

    const atlas = createAtlas();
    const tex = new THREE.CanvasTexture(atlas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;

    this.material = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: false,
      alphaTest: 0.1,
      side: THREE.FrontSide,
      vertexColors: true,
    });

    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexColors: true,
    });
  }

  private chunkData(cx: number, cz: number): Uint8Array {
    const k = key(cx, cz);
    let data = this.chunks.get(k);
    if (!data) {
      data = this.generateChunk(cx, cz);
      this.chunks.set(k, data);
      this.applyEditsToChunk(cx, cz, data);
      this.dirty.add(k);
    }
    return data;
  }

  private idx(lx: number, y: number, lz: number): number {
    return (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
  }

  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_HEIGHT) return Block.Air;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const data = this.chunks.get(key(cx, cz));
    if (!data) return Block.Air;
    return data[this.idx(lx, y, lz)];
  }

  setBlock(x: number, y: number, z: number, id: number, record = true): void {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const data = this.chunkData(cx, cz);
    const prev = data[this.idx(lx, y, lz)];
    data[this.idx(lx, y, lz)] = id;
    this.dirty.add(key(cx, cz));
    if (lx === 0) this.dirty.add(key(cx - 1, cz));
    if (lx === CHUNK_SIZE - 1) this.dirty.add(key(cx + 1, cz));
    if (lz === 0) this.dirty.add(key(cx, cz - 1));
    if (lz === CHUNK_SIZE - 1) this.dirty.add(key(cx, cz + 1));

    const pk = posKey(x, y, z);
    if (prev === Block.Torch) this.torches.delete(pk);
    if (id === Block.Torch) this.torches.add(pk);
    if (record) this.edits.set(pk, id);
  }

  exportEdits(): number[] {
    const out: number[] = [];
    for (const [k, id] of this.edits) {
      const [x, y, z] = k.split(",").map(Number);
      out.push(x, y, z, id);
    }
    return out;
  }

  importEdits(packed: number[]): void {
    for (let i = 0; i + 3 < packed.length; i += 4) {
      this.edits.set(posKey(packed[i], packed[i + 1], packed[i + 2]), packed[i + 3]);
    }
    for (const [k, data] of this.chunks) {
      const [cx, cz] = k.split(",").map(Number);
      this.applyEditsToChunk(cx, cz, data);
      this.dirty.add(k);
    }
  }

  private applyEditsToChunk(cx: number, cz: number, data: Uint8Array): void {
    const x0 = cx * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    for (const [k, id] of this.edits) {
      const [x, y, z] = k.split(",").map(Number);
      if (x < x0 || x >= x0 + CHUNK_SIZE || z < z0 || z >= z0 + CHUNK_SIZE) continue;
      if (y < 0 || y >= WORLD_HEIGHT) continue;
      const lx = x - x0;
      const lz = z - z0;
      data[this.idx(lx, y, lz)] = id;
      const pk = posKey(x, y, z);
      if (id === Block.Torch) this.torches.add(pk);
      else this.torches.delete(pk);
    }
  }

  nearestTorches(px: number, py: number, pz: number, limit: number): [number, number, number][] {
    const list: { d: number; x: number; y: number; z: number }[] = [];
    for (const k of this.torches) {
      const [x, y, z] = k.split(",").map(Number);
      const d = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2;
      list.push({ d, x, y, z });
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, limit).map((t) => [t.x, t.y, t.z]);
  }

  heightAt(wx: number, wz: number): number {
    const n = fbm2(wx * 0.02, wz * 0.02, 4, this.seed);
    const mountain =
      Math.pow(Math.max(0, fbm2(wx * 0.01, wz * 0.01, 2, this.seed + 200) - 0.5), 2) * 22;
    return Math.floor(SEA_LEVEL + (n - 0.45) * 18 + mountain);
  }

  biomeAt(wx: number, wz: number): Biome {
    const h = this.heightAt(wx, wz);
    const moist = noise2(wx * 0.008, wz * 0.008, this.seed + 50);
    if (h >= SEA_LEVEL + 16) return "snow";
    if (moist < 0.32) return "desert";
    if (moist > 0.58) return "forest";
    return "plains";
  }

  biomeLabel(wx: number, wz: number): string {
    switch (this.biomeAt(wx, wz)) {
      case "forest":
        return "Forêt";
      case "desert":
        return "Désert";
      case "snow":
        return "Sommet enneigé";
      default:
        return "Plaine";
    }
  }

  private generateChunk(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
    const trees: [number, number, number][] = [];
    const cacti: [number, number, number][] = [];

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const h = this.heightAt(wx, wz);
        const biome = this.biomeAt(wx, wz);

        for (let y = 0; y <= Math.max(h, SEA_LEVEL); y++) {
          let id: number = Block.Air;
          if (y === 0) {
            id = Block.Bedrock;
          } else if (y <= h) {
            if (y === h) {
              if (h < SEA_LEVEL - 1) id = Block.Sand;
              else if (biome === "desert") id = Block.Sand;
              else if (biome === "snow") id = Block.Snow;
              else id = Block.Grass;
            } else if (y >= h - 3) {
              if (h < SEA_LEVEL - 1 || biome === "desert") id = Block.Sand;
              else id = Block.Dirt;
            } else {
              id = Block.Stone;
            }
          } else if (y <= SEA_LEVEL) {
            id = Block.Water;
          }
          data[this.idx(lx, y, lz)] = id;
        }

        for (let y = 1; y < h; y++) {
          const cur = data[this.idx(lx, y, lz)];
          if (cur !== Block.Stone) continue;

          const cave =
            fbm3(wx * 0.06, y * 0.09, wz * 0.06, 3, this.seed + 400) > 0.62 &&
            noise3(wx * 0.11, y * 0.12, wz * 0.11, this.seed + 801) > 0.52;
          if (cave && y < h - 1) {
            data[this.idx(lx, y, lz)] = Block.Air;
            continue;
          }

          const nDia = noise3(wx * 0.22, y * 0.22, wz * 0.22, this.seed + 33);
          const nIron = noise3(wx * 0.18, y * 0.18, wz * 0.18, this.seed + 22);
          const nCoal = noise3(wx * 0.14, y * 0.14, wz * 0.14, this.seed + 11);
          if (y < 12 && nDia > 0.935) data[this.idx(lx, y, lz)] = Block.DiamondOre;
          else if (y > 2 && y < 40 && nIron > 0.895) data[this.idx(lx, y, lz)] = Block.IronOre;
          else if (y > 2 && y < 56 && nCoal > 0.855) data[this.idx(lx, y, lz)] = Block.CoalOre;
          else if (nCoal < 0.08 && y < 20) data[this.idx(lx, y, lz)] = Block.Gravel;
        }

        const deco = noise2(wx * 0.5, wz * 0.5, this.seed + 999);
        const edge = lx > 1 && lx < CHUNK_SIZE - 2 && lz > 1 && lz < CHUNK_SIZE - 2;
        if (h > SEA_LEVEL && edge) {
          if (biome === "forest" && data[this.idx(lx, h, lz)] === Block.Grass && deco > 0.72) {
            trees.push([lx, h + 1, lz]);
          } else if (biome === "plains" && data[this.idx(lx, h, lz)] === Block.Grass && deco > 0.9) {
            trees.push([lx, h + 1, lz]);
          } else if (biome === "snow" && data[this.idx(lx, h, lz)] === Block.Snow && deco > 0.94) {
            trees.push([lx, h + 1, lz]);
          } else if (biome === "desert" && data[this.idx(lx, h, lz)] === Block.Sand && deco > 0.86) {
            cacti.push([lx, h + 1, lz]);
          }
        }
      }
    }

    for (const [tx, ty, tz] of trees) {
      const trunkH = 4 + Math.floor(noise2(tx + cx * 16, tz + cz * 16, this.seed) * 3);
      for (let i = 0; i < trunkH; i++) {
        if (ty + i < WORLD_HEIGHT) data[this.idx(tx, ty + i, tz)] = Block.Wood;
      }
      const top = ty + trunkH - 1;
      for (let dy = -1; dy <= 2; dy++) {
        const r = dy === 2 ? 1 : 2;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (dx === 0 && dz === 0 && dy < 2) continue;
            if (Math.abs(dx) === r && Math.abs(dz) === r && dy < 1) continue;
            const lx = tx + dx;
            const lz = tz + dz;
            const y = top + dy;
            if (
              lx >= 0 &&
              lx < CHUNK_SIZE &&
              lz >= 0 &&
              lz < CHUNK_SIZE &&
              y >= 0 &&
              y < WORLD_HEIGHT &&
              data[this.idx(lx, y, lz)] === Block.Air
            ) {
              data[this.idx(lx, y, lz)] = Block.Leaves;
            }
          }
        }
      }
    }

    for (const [tx, ty, tz] of cacti) {
      const ch = 2 + Math.floor(noise2(tx + 3, tz + 7, this.seed + 4) * 2);
      for (let i = 0; i < ch; i++) {
        const y = ty + i;
        if (y < WORLD_HEIGHT && data[this.idx(tx, y, tz)] === Block.Air) {
          data[this.idx(tx, y, tz)] = Block.Cactus;
        }
      }
    }

    return data;
  }

  private neighborSolid(wx: number, wy: number, wz: number): boolean {
    return isOpaque(this.getBlock(wx, wy, wz));
  }

  private vertexAO(
    wx: number,
    wy: number,
    wz: number,
    face: number,
    corner: number,
  ): number {
    const [sx, sy] = FACE_DIRS[face];
    const [cx, cy, cz] = AO_DIRS[face][corner];
    let s1x = 0,
      s1y = 0,
      s1z = 0,
      s2x = 0,
      s2y = 0,
      s2z = 0;
    if (sx !== 0) {
      s1y = cy;
      s2z = cz;
    } else if (sy !== 0) {
      s1x = cx;
      s2z = cz;
    } else {
      s1x = cx;
      s2y = cy;
    }
    const side1 = this.neighborSolid(wx + s1x, wy + s1y, wz + s1z) ? 1 : 0;
    const side2 = this.neighborSolid(wx + s2x, wy + s2y, wz + s2z) ? 1 : 0;
    const cornerB = this.neighborSolid(wx + cx, wy + cy, wz + cz) ? 1 : 0;
    if (side1 && side2) return 0;
    return 3 - (side1 + side2 + cornerB);
  }

  private addQuad(
    positions: number[],
    normals: number[],
    uvs: number[],
    colors: number[],
    indices: number[],
    base: number,
    wx: number,
    y: number,
    wz: number,
    f: number,
    tiles: [number, number, number, number, number, number],
    skipAO = false,
    tint?: [number, number, number],
  ): number {
    const [dx, dy, dz] = FACE_DIRS[f];
    const { u0, v0, u1, v1 } = tileUV(tiles[f]);
    const uvCoords = [
      [u0, v1],
      [u1, v1],
      [u1, v0],
      [u0, v0],
    ];
    const ao: number[] = [];
    for (let v = 0; v < 4; v++) {
      ao.push(skipAO ? 1 : this.vertexAO(wx, y, wz, f, v) / 3);
    }
    const flip = ao[0] + ao[2] > ao[1] + ao[3];
    for (let v = 0; v < 4; v++) {
      const vert = FACE_VERTS[f][v];
      positions.push(wx + vert[0], y + vert[1], wz + vert[2]);
      normals.push(dx, dy, dz);
      uvs.push(uvCoords[v][0], uvCoords[v][1]);
      const shade = 0.55 + ao[v] * 0.45;
      const faceShade = f === 2 ? 1 : f === 3 ? 0.55 : f === 0 || f === 1 ? 0.8 : 0.9;
      const s = shade * faceShade;
      if (tint) colors.push(s * tint[0], s * tint[1], s * tint[2]);
      else colors.push(s, s, s);
    }
    if (flip) indices.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
    else indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    return base + 4;
  }

  private addTorch(
    positions: number[],
    normals: number[],
    uvs: number[],
    colors: number[],
    indices: number[],
    base: number,
    wx: number,
    y: number,
    wz: number,
  ): number {
    const tiles = FACE_TILES[Block.Torch];
    const { u0, v0, u1, v1 } = tileUV(tiles[0]);
    const planes: { verts: number[][]; n: [number, number, number] }[] = [
      {
        n: [0, 0, 1],
        verts: [
          [0.15, 0, 0.5],
          [0.85, 0, 0.5],
          [0.85, 0.9, 0.5],
          [0.15, 0.9, 0.5],
        ],
      },
      {
        n: [1, 0, 0],
        verts: [
          [0.5, 0, 0.15],
          [0.5, 0, 0.85],
          [0.5, 0.9, 0.85],
          [0.5, 0.9, 0.15],
        ],
      },
    ];
    for (const plane of planes) {
      for (const sign of [1, -1]) {
        const uvCoords = [
          [u0, v1],
          [u1, v1],
          [u1, v0],
          [u0, v0],
        ];
        for (let v = 0; v < 4; v++) {
          const vert = plane.verts[v];
          positions.push(wx + vert[0], y + vert[1], wz + vert[2]);
          normals.push(plane.n[0] * sign, 0, plane.n[2] * sign);
          uvs.push(uvCoords[v][0], uvCoords[v][1]);
          colors.push(1.15, 1.05, 0.85);
        }
        if (sign > 0) indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        else indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
        base += 4;
      }
    }
    return base;
  }

  private buildMesh(cx: number, cz: number): void {
    const k = key(cx, cz);
    this.chunkData(cx, cz);
    this.chunkData(cx - 1, cz);
    this.chunkData(cx + 1, cz);
    this.chunkData(cx, cz - 1);
    this.chunkData(cx, cz + 1);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const wPos: number[] = [];
    const wNorm: number[] = [];
    const wUvs: number[] = [];
    const wColors: number[] = [];
    const wIndices: number[] = [];

    let solidCount = 0;
    let waterCount = 0;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const wx = cx * CHUNK_SIZE + lx;
          const wz = cz * CHUNK_SIZE + lz;
          const id = this.getBlock(wx, y, wz);
          if (id === Block.Air) continue;

          if (id === Block.Torch) {
            solidCount = this.addTorch(positions, normals, uvs, colors, indices, solidCount, wx, y, wz);
            continue;
          }

          const tiles = FACE_TILES[id];
          if (!tiles) continue;
          const isWater = id === Block.Water;

          for (let f = 0; f < 6; f++) {
            const [dx, dy, dz] = FACE_DIRS[f];
            const nId = this.getBlock(wx + dx, y + dy, wz + dz);

            if (isWater) {
              if (nId === Block.Water || isOpaque(nId)) continue;
            } else {
              if (isOpaque(nId)) continue;
              if (nId === Block.Leaves && id === Block.Leaves) continue;
              if (nId === Block.Glass && id === Block.Glass) continue;
            }

            if (isWater) {
              waterCount = this.addQuad(
                wPos,
                wNorm,
                wUvs,
                wColors,
                wIndices,
                waterCount,
                wx,
                y,
                wz,
                f,
                tiles,
                true,
                [0.7, 0.85, 1],
              );
            } else {
              solidCount = this.addQuad(
                positions,
                normals,
                uvs,
                colors,
                indices,
                solidCount,
                wx,
                y,
                wz,
                f,
                tiles,
              );
            }
          }
        }
      }
    }

    const old = this.meshes.get(k);
    if (old) {
      this.scene.remove(old);
      old.geometry.dispose();
    }
    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geo.setIndex(indices);
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.name = `chunk-${k}`;
      this.scene.add(mesh);
      this.meshes.set(k, mesh);
    } else {
      this.meshes.delete(k);
    }

    const oldW = this.waterMeshes.get(k);
    if (oldW) {
      this.scene.remove(oldW);
      oldW.geometry.dispose();
    }
    if (wPos.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(wPos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(wNorm, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(wUvs, 2));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(wColors, 3));
      geo.setIndex(wIndices);
      const mesh = new THREE.Mesh(geo, this.waterMaterial);
      this.scene.add(mesh);
      this.waterMeshes.set(k, mesh);
    } else {
      this.waterMeshes.delete(k);
    }

    this.dirty.delete(k);
  }

  ensureChunk(cx: number, cz: number): void {
    this.chunkData(cx, cz);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.chunkData(cx + dx, cz + dz);
      }
    }
    this.buildMesh(cx, cz);
  }

  flushMeshes(limit = 4): number {
    let built = 0;
    for (const k of [...this.dirty]) {
      const [cx, cz] = k.split(",").map(Number);
      this.buildMesh(cx, cz);
      built++;
      if (built >= limit) break;
    }
    return built;
  }

  updateAround(px: number, pz: number, genLimit = 4, meshLimit = MESHES_PER_FRAME): void {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);

    const needed: { k: ChunkKey; cx: number; cz: number; d: number }[] = [];
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        needed.push({ k: key(cx, cz), cx, cz, d: dx * dx + dz * dz });
      }
    }
    needed.sort((a, b) => a.d - b.d);
    const neededSet = new Set(needed.map((n) => n.k));

    let generated = 0;
    for (const n of needed) {
      if (!this.chunks.has(n.k)) {
        if (generated >= genLimit) continue;
        this.chunkData(n.cx, n.cz);
        generated++;
      }
    }

    for (const k of [...this.meshes.keys()]) {
      if (!neededSet.has(k)) {
        const m = this.meshes.get(k)!;
        this.scene.remove(m);
        m.geometry.dispose();
        this.meshes.delete(k);
      }
    }
    for (const k of [...this.waterMeshes.keys()]) {
      if (!neededSet.has(k)) {
        const m = this.waterMeshes.get(k)!;
        this.scene.remove(m);
        m.geometry.dispose();
        this.waterMeshes.delete(k);
      }
    }

    let built = 0;
    for (const k of [...this.dirty]) {
      if (!neededSet.has(k)) {
        this.dirty.delete(k);
        continue;
      }
      if (!this.chunks.has(k)) continue;
      const [cx, cz] = k.split(",").map(Number);
      this.buildMesh(cx, cz);
      built++;
      if (built >= meshLimit) break;
    }
  }

  collides(box: {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
  }): boolean {
    const x0 = Math.floor(box.minX);
    const y0 = Math.floor(box.minY);
    const z0 = Math.floor(box.minZ);
    const x1 = Math.floor(box.maxX);
    const y1 = Math.floor(box.maxY);
    const z1 = Math.floor(box.maxZ);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          if (isSolid(this.getBlock(x, y, z))) return true;
        }
      }
    }
    return false;
  }

  surfaceY(x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      const id = this.getBlock(ix, y, iz);
      if (isSolid(id) && id !== Block.Leaves) return y + 1;
    }
    return SEA_LEVEL + 5;
  }
}
