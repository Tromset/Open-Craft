import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, FACE_TILES, ITEM_TILES, type FaceTiles } from "./blocks";
import { createAtlas } from "./textures";

/** Minecraft-style first-person offset (camera local space, bottom-right). */
const BASE = { x: 0.34, y: -0.24, z: -0.55 };
const CUBE_SCALE = 0.36;
const SPRITE_SCALE = 0.5;
const CUBE_ROT = new THREE.Euler(0.32, Math.PI * 0.25, 0.12);
const ITEM_ROT = new THREE.Euler(0.18, 0.55, 0.72);

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

function applyQuadUV(uv: THREE.BufferAttribute, i: number, tile: number): void {
  const { u0, v0, u1, v1 } = tileUV(tile);
  uv.setXY(i + 0, u0, v1);
  uv.setXY(i + 1, u1, v1);
  uv.setXY(i + 2, u0, v0);
  uv.setXY(i + 3, u1, v0);
}

/** Map a BoxGeometry's per-face UVs onto atlas tiles (FACE_TILES order: +X -X +Y -Y +Z -Z). */
function applyFaceUVs(geo: THREE.BufferGeometry, tiles: FaceTiles): void {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) applyQuadUV(uv, f * 4, tiles[f]);
  uv.needsUpdate = true;
}

function applySpriteUV(geo: THREE.BufferGeometry, tile: number): void {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  applyQuadUV(uv, 0, tile);
  uv.needsUpdate = true;
}

/**
 * First-person held item, parented to the camera.
 * Blocks = cube with atlas faces. Tools / coal / sticks = flat sprite.
 * Hidden when the selected hotbar slot is empty.
 */
export class HeldItem {
  readonly root: THREE.Group;
  private cube: THREE.Mesh;
  private sprite: THREE.Mesh;
  private currentId: number | null = null;
  private walkTime = 0;
  private amp = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.root = new THREE.Group();
    this.root.position.set(BASE.x, BASE.y, BASE.z);
    this.root.rotation.copy(CUBE_ROT);

    const tex = new THREE.CanvasTexture(createAtlas());
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;

    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      emissive: 0x666666,
      side: THREE.DoubleSide,
    });

    this.cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    this.cube.scale.setScalar(CUBE_SCALE);
    this.cube.frustumCulled = false;
    this.root.add(this.cube);

    this.sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.sprite.scale.setScalar(SPRITE_SCALE);
    this.sprite.frustumCulled = false;
    this.sprite.visible = false;
    this.root.add(this.sprite);

    this.root.visible = false;
    camera.add(this.root);
  }

  hide(): void {
    this.root.visible = false;
  }

  setItem(id: number | null): void {
    const faces = id != null ? FACE_TILES[id] : undefined;
    const itemTile = id != null ? ITEM_TILES[id] : undefined;
    const showCube = faces != null;
    const showSprite = !showCube && itemTile !== undefined;

    if (id !== this.currentId) {
      this.currentId = id;
      if (showCube && faces) {
        applyFaceUVs(this.cube.geometry, faces);
        this.root.rotation.copy(CUBE_ROT);
      } else if (showSprite && itemTile !== undefined) {
        applySpriteUV(this.sprite.geometry, itemTile);
        this.root.rotation.copy(ITEM_ROT);
      }
    }

    this.cube.visible = showCube;
    this.sprite.visible = showSprite;
    this.root.visible = showCube || showSprite;
  }

  /** Subtle walk bob; damps back to rest when standing still. */
  update(dt: number, walking: boolean): void {
    if (walking) this.amp = Math.min(1, this.amp + dt * 8);
    else this.amp = Math.max(0, this.amp - dt * 6);

    if (this.amp > 0.01) this.walkTime += dt * 9;
    const ox = Math.sin(this.walkTime) * 0.04 * this.amp;
    const oy = -Math.abs(Math.sin(this.walkTime)) * 0.03 * this.amp;
    this.root.position.set(BASE.x + ox, BASE.y + oy, BASE.z);
  }
}
