import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, FACE_TILES, type FaceTiles } from "./blocks";
import { createAtlas } from "./textures";

/** Minecraft-style first-person offset (camera local space, bottom-right). */
const BASE = { x: 0.46, y: -0.36, z: -0.68 };
const SCALE = 0.34;

function tileUV(tile: number): { u0: number; v0: number; u1: number; v1: number } {
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);
  const pad = 0.001;
  return {
    u0: col / ATLAS_COLS + pad,
    v0: row / ATLAS_ROWS + pad,
    u1: (col + 1) / ATLAS_COLS - pad,
    v1: (row + 1) / ATLAS_ROWS - pad,
  };
}

/** Map a BoxGeometry's per-face UVs onto atlas tiles (FACE_TILES order: +X -X +Y -Y +Z -Z). */
function applyFaceUVs(geo: THREE.BufferGeometry, tiles: FaceTiles): void {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const { u0, v0, u1, v1 } = tileUV(tiles[f]);
    const i = f * 4;
    uv.setXY(i + 0, u0, v1);
    uv.setXY(i + 1, u1, v1);
    uv.setXY(i + 2, u0, v0);
    uv.setXY(i + 3, u1, v0);
  }
  uv.needsUpdate = true;
}

/**
 * First-person held block, parented to the camera.
 * Hidden when the selected hotbar slot is empty or the item has no block mesh.
 */
export class HeldItem {
  readonly root: THREE.Group;
  private mesh: THREE.Mesh;
  private currentId: number | null = null;
  private walkTime = 0;
  private amp = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.root = new THREE.Group();
    this.root.position.set(BASE.x, BASE.y, BASE.z);
    // Tilt so the top and two sides read like a Minecraft hand cube.
    this.root.rotation.set(0.32, Math.PI * 0.25, 0.12);

    const tex = new THREE.CanvasTexture(createAtlas());
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;

    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      emissive: 0x3a3a3a,
    });

    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.scale.setScalar(SCALE);
    this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
    this.root.visible = false;
    camera.add(this.root);
  }

  setItem(id: number | null): void {
    if (id === this.currentId) return;
    this.currentId = id;
    const tiles = id != null ? FACE_TILES[id] : undefined;
    if (id == null || !tiles) {
      this.root.visible = false;
      return;
    }
    applyFaceUVs(this.mesh.geometry, tiles);
    this.root.visible = true;
  }

  /** Subtle walk bob; damps back to rest when standing still. */
  update(dt: number, walking: boolean): void {
    if (walking) this.amp = Math.min(1, this.amp + dt * 8);
    else this.amp = Math.max(0, this.amp - dt * 6);

    if (this.amp > 0.01) this.walkTime += dt * 9;
    const ox = Math.sin(this.walkTime) * 0.022 * this.amp;
    const oy = -Math.abs(Math.sin(this.walkTime)) * 0.018 * this.amp;
    this.root.position.set(BASE.x + ox, BASE.y + oy, BASE.z);
  }
}
