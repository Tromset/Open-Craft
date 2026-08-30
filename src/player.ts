import * as THREE from "three";
import {
  Block,
  isSolid,
  isPlaceable,
  isReplaceable,
  isUnbreakable,
  isInteractable,
  mineDuration,
  blockDrop,
} from "./blocks";
import { World, WORLD_HEIGHT, CHUNK_SIZE } from "./world";
import { HeldItem } from "./heldItem";
import type { Inventory } from "./inventory";
import type { AudioEngine } from "./audio";
import type { BreakParticles } from "./particles";

const EYE_HEIGHT = 1.62;
const PLAYER_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const SPEED = 4.8;
const SPRINT = 7.2;
const SNEAK_SPEED = 1.6;
const FLY_SPEED = 10;
const JUMP = 8.2;
const GRAVITY = 28;
const REACH = 5;
const MAX_HEALTH = 20;
const MAX_HUNGER = 20;
const MAX_AIR = 20;

export class Player {
  readonly camera: THREE.PerspectiveCamera;
  position = new THREE.Vector3(0, 40, 0);
  velocity = new THREE.Vector3();
  onGround = false;
  selected = 0;
  yaw = 0.8;
  pitch = -0.2;

  health = MAX_HEALTH;
  hunger = MAX_HUNGER;
  air = MAX_AIR;
  creative = false;
  flying = false;
  dead = false;
  spawnX = 8.5;
  spawnY = 40;
  spawnZ = 8.5;

  mineProgress = 0;
  mineTarget: { x: number; y: number; z: number } | null = null;

  private keys = new Set<string>();
  private world: World;
  private inv: Inventory;
  private audio: AudioEngine;
  private particles: BreakParticles;
  private locked = false;
  private held: HeldItem;
  private highlight: THREE.LineSegments;
  private crack: THREE.Mesh;
  private lmb = false;
  private lastSpace = 0;
  private fallY: number | null = null;
  private wasInWater = false;
  private hurtCd = 0;
  private hungerAcc = 0;
  private starveAcc = 0;
  private drownAcc = 0;
  private regenAcc = 0;
  private footAcc = 0;
  private target: {
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
  } | null = null;
  onOpenCraft: (() => void) | null = null;
  onDeath: (() => void) | null = null;
  onToggleCreative: (() => void) | null = null;

  constructor(
    world: World,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    inv: Inventory,
    audio: AudioEngine,
    particles: BreakParticles,
  ) {
    this.world = world;
    this.camera = camera;
    this.inv = inv;
    this.audio = audio;
    this.particles = particles;
    scene.add(this.camera);
    this.held = new HeldItem(camera);
    this.held.setItem(this.handItemId());

    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlight = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x111111 }),
    );
    this.highlight.visible = false;
    scene.add(this.highlight);

    const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    this.crack = new THREE.Mesh(
      crackGeo,
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.crack.visible = false;
    scene.add(this.crack);

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") e.preventDefault();
      if (e.repeat) {
        this.keys.add(e.code);
        return;
      }
      this.keys.add(e.code);
      if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.replace("Digit", ""), 10);
        if (n >= 1 && n <= 9) {
          this.selected = n - 1;
          this.inv.selected = this.selected;
        }
      }
      if (e.code === "KeyN") {
        this.creative = !this.creative;
        if (!this.creative) this.flying = false;
        else this.inv.fillCreativePalette();
        this.onToggleCreative?.();
        this.audio.ui();
      }
      if (e.code === "KeyF" && this.creative) {
        this.flying = !this.flying;
        this.velocity.y = 0;
      }
      if (e.code === "Space" && this.creative && this.locked) {
        const now = performance.now();
        if (now - this.lastSpace < 280) {
          this.flying = !this.flying;
          this.velocity.y = 0;
        }
        this.lastSpace = now;
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    window.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    });

    window.addEventListener("mousedown", (e) => {
      if (!this.locked || this.dead) return;
      if (e.button === 0) this.lmb = true;
      if (e.button === 2) this.tryUse();
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.lmb = false;
        this.resetMine();
      }
    });

    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("wheel", (e) => {
      if (!this.locked) return;
      if (e.deltaY > 0) this.selected = (this.selected + 1) % 9;
      else this.selected = (this.selected - 1 + 9) % 9;
      this.inv.selected = this.selected;
    });
  }

  setLocked(v: boolean): void {
    this.locked = v;
    if (!v) {
      this.lmb = false;
      this.resetMine();
    }
  }

  get lockedIn(): boolean {
    return this.locked;
  }

  spawn(): void {
    const x = 8;
    const z = 8;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    this.world.ensureChunk(cx, cz);
    const y = this.world.surfaceY(x, z) + 0.01;
    this.position.set(x + 0.5, y, z + 0.5);
    this.spawnX = this.position.x;
    this.spawnY = this.position.y;
    this.spawnZ = this.position.z;
    this.velocity.set(0, 0, 0);
    this.yaw = 0.8;
    this.pitch = -0.2;
    this.health = MAX_HEALTH;
    this.hunger = MAX_HUNGER;
    this.air = MAX_AIR;
    this.dead = false;
    this.flying = false;
    this.syncCamera();
  }

  respawn(): void {
    this.health = MAX_HEALTH;
    this.hunger = MAX_HUNGER;
    this.air = MAX_AIR;
    this.dead = false;
    this.velocity.set(0, 0, 0);
    this.flying = false;
    const y = this.world.surfaceY(this.spawnX, this.spawnZ) + 0.01;
    this.position.set(this.spawnX, y, this.spawnZ);
    this.syncCamera();
  }

  syncCamera(): void {
    this.camera.position.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private aabb(px: number, py: number, pz: number) {
    return {
      minX: px - PLAYER_WIDTH,
      maxX: px + PLAYER_WIDTH,
      minY: py,
      maxY: py + PLAYER_HEIGHT,
      minZ: pz - PLAYER_WIDTH,
      maxZ: pz + PLAYER_WIDTH,
    };
  }

  private resolve(axis: "x" | "y" | "z"): void {
    const box = this.aabb(this.position.x, this.position.y, this.position.z);
    if (!this.world.collides(box)) return;

    const x0 = Math.floor(box.minX);
    const y0 = Math.floor(box.minY);
    const z0 = Math.floor(box.minZ);
    const x1 = Math.floor(box.maxX);
    const y1 = Math.floor(box.maxY);
    const z1 = Math.floor(box.maxZ);

    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          const solid = this.world.getBlock(x, y, z);
          if (!isSolid(solid)) continue;

          const overlap = {
            minX: Math.max(box.minX, x),
            maxX: Math.min(box.maxX, x + 1),
            minY: Math.max(box.minY, y),
            maxY: Math.min(box.maxY, y + 1),
            minZ: Math.max(box.minZ, z),
            maxZ: Math.min(box.maxZ, z + 1),
          };
          if (
            overlap.maxX <= overlap.minX ||
            overlap.maxY <= overlap.minY ||
            overlap.maxZ <= overlap.minZ
          )
            continue;

          if (axis === "y") {
            const fromTop = this.velocity.y <= 0;
            if (fromTop) {
              this.position.y = y + 1;
              this.velocity.y = 0;
              this.onGround = true;
            } else {
              this.position.y = y - PLAYER_HEIGHT - 0.001;
              this.velocity.y = 0;
            }
            return;
          }
          if (axis === "x") {
            const center = (box.minX + box.maxX) / 2;
            if (center < x + 0.5) this.position.x = x - PLAYER_WIDTH - 0.001;
            else this.position.x = x + 1 + PLAYER_WIDTH + 0.001;
            this.velocity.x = 0;
            return;
          }
          if (axis === "z") {
            const center = (box.minZ + box.maxZ) / 2;
            if (center < z + 0.5) this.position.z = z - PLAYER_WIDTH - 0.001;
            else this.position.z = z + 1 + PLAYER_WIDTH + 0.001;
            this.velocity.z = 0;
            return;
          }
        }
      }
    }
  }

  inWater(): boolean {
    const feet = this.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y),
      Math.floor(this.position.z),
    );
    const body = this.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 1.2),
      Math.floor(this.position.z),
    );
    return feet === Block.Water || body === Block.Water;
  }

  headUnderwater(): boolean {
    return (
      this.world.getBlock(
        Math.floor(this.position.x),
        Math.floor(this.position.y + EYE_HEIGHT),
        Math.floor(this.position.z),
      ) === Block.Water
    );
  }

  hurt(amount: number, audio?: AudioEngine): void {
    if (this.creative || this.dead || amount <= 0) return;
    if (this.hurtCd > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtCd = 0.5;
    (audio ?? this.audio).hurt();
    if (this.health <= 0) {
      this.dead = true;
      this.audio.death();
      this.onDeath?.();
    }
  }

  update(dt: number): void {
    if (this.dead) {
      this.syncCamera();
      this.world.updateAround(this.position.x, this.position.z);
      return;
    }

    this.hurtCd = Math.max(0, this.hurtCd - dt);
    this.inv.selected = this.selected;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wish = new THREE.Vector3();
    if (this.keys.has("KeyW") || this.keys.has("KeyZ")) wish.add(forward);
    if (this.keys.has("KeyS")) wish.sub(forward);
    if (this.keys.has("KeyD")) wish.add(right);
    if (this.keys.has("KeyA") || this.keys.has("KeyQ")) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    const sneak = this.keys.has("ControlLeft") || this.keys.has("ControlRight");
    const sprint =
      !sneak &&
      !this.flying &&
      (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"));
    const water = this.inWater();

    let speed = SPEED;
    if (this.flying) speed = FLY_SPEED;
    else if (sneak) speed = SNEAK_SPEED;
    else if (sprint) speed = SPRINT;
    if (water && !this.flying) speed *= 0.6;

    this.velocity.x = wish.x * speed;
    this.velocity.z = wish.z * speed;

    if (water && !this.wasInWater) this.audio.splash();
    this.wasInWater = water;

    if (this.flying && this.creative) {
      let vy = 0;
      if (this.keys.has("Space")) vy += FLY_SPEED;
      if (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) vy -= FLY_SPEED;
      this.velocity.y = vy;
    } else if (water) {
      this.velocity.y -= GRAVITY * 0.25 * dt;
      this.velocity.y *= 0.92;
      if (this.keys.has("Space")) this.velocity.y = 5;
    } else {
      this.velocity.y -= GRAVITY * dt;
      if ((this.keys.has("Space") || this.keys.has("KeyC")) && this.onGround) {
        this.velocity.y = JUMP;
        this.onGround = false;
      }
    }

    if (!this.onGround && this.fallY === null) this.fallY = this.position.y;
    if (this.flying || water) this.fallY = null;

    const oldX = this.position.x;
    const oldZ = this.position.z;

    this.onGround = false;
    this.position.y += this.velocity.y * dt;
    this.resolve("y");
    this.position.x += this.velocity.x * dt;
    this.resolve("x");
    this.position.z += this.velocity.z * dt;
    this.resolve("z");

    if (
      this.world.collides(this.aabb(this.position.x, this.position.y - 0.05, this.position.z))
    ) {
      this.onGround = true;
    }

    if (sneak && this.onGround && !this.flying) {
      const still =
        this.world.collides(
          this.aabb(this.position.x, this.position.y - 0.15, this.position.z),
        );
      if (!still) {
        this.position.x = oldX;
        this.position.z = oldZ;
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    if (this.onGround && this.fallY !== null) {
      const dist = this.fallY - this.position.y;
      if (dist > 3 && !this.creative && !water) {
        this.hurt(Math.floor(dist - 3));
      }
      this.fallY = null;
    }

    if (!this.creative) {
      if (this.headUnderwater()) {
        this.air -= dt * (MAX_AIR / 15);
        if (this.air <= 0) {
          this.air = 0;
          this.drownAcc += dt;
          if (this.drownAcc >= 0.5) {
            this.hurt(1);
            this.drownAcc = 0;
          }
        } else {
          this.drownAcc = 0;
        }
      } else {
        this.air = Math.min(MAX_AIR, this.air + dt * 10);
      }

      this.hungerAcc += dt * (sprint ? 0.18 : 0.05);
      if (this.hungerAcc >= 1) {
        this.hungerAcc -= 1;
        this.hunger = Math.max(0, this.hunger - 1);
      }
      if (this.hunger <= 0) {
        this.starveAcc += dt;
        if (this.starveAcc >= 4) {
          this.starveAcc = 0;
          this.hurt(1);
        }
      } else if (this.hunger >= 16 && this.health < MAX_HEALTH) {
        this.regenAcc += dt;
        if (this.regenAcc >= 4) {
          this.regenAcc = 0;
          this.health = Math.min(MAX_HEALTH, this.health + 1);
        }
      } else {
        this.regenAcc = 0;
      }
    } else {
      this.air = MAX_AIR;
    }

    const moving = wish.lengthSq() > 0 && this.onGround && !this.flying;
    if (moving) {
      this.footAcc += dt * speed;
      if (this.footAcc > 1.4) {
        this.footAcc = 0;
        this.audio.footstep();
      }
    }

    this.syncCamera();
    this.updateRaycast();
    this.updateMining(dt);
    this.world.updateAround(this.position.x, this.position.z);
    const walking = wish.lengthSq() > 0 && this.onGround && !this.flying;
    this.held.setItem(this.handItemId());
    this.held.update(dt, walking);
  }

  private updateRaycast(): void {
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const step = 0.05;
    let prevX = origin.x;
    let prevY = origin.y;
    let prevZ = origin.z;

    this.target = null;
    for (let t = step; t < REACH; t += step) {
      const px = origin.x + dir.x * t;
      const py = origin.y + dir.y * t;
      const pz = origin.z + dir.z * t;
      const bx = Math.floor(px);
      const by = Math.floor(py);
      const bz = Math.floor(pz);
      const id = this.world.getBlock(bx, by, bz);
      if (id !== Block.Air && id !== Block.Water) {
        const pbx = Math.floor(prevX);
        const pby = Math.floor(prevY);
        const pbz = Math.floor(prevZ);
        let nx = pbx - bx;
        let ny = pby - by;
        let nz = pbz - bz;
        if (nx === 0 && ny === 0 && nz === 0) {
          const ax = Math.abs(dir.x);
          const ay = Math.abs(dir.y);
          const az = Math.abs(dir.z);
          if (ax >= ay && ax >= az) nx = -Math.sign(dir.x) || -1;
          else if (ay >= az) ny = -Math.sign(dir.y) || -1;
          else nz = -Math.sign(dir.z) || -1;
        }
        this.target = { x: bx, y: by, z: bz, nx, ny, nz };
        break;
      }
      prevX = px;
      prevY = py;
      prevZ = pz;
    }

    if (this.target) {
      this.highlight.position.set(this.target.x + 0.5, this.target.y + 0.5, this.target.z + 0.5);
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }

  private resetMine(): void {
    this.mineProgress = 0;
    this.mineTarget = null;
    this.crack.visible = false;
    (this.crack.material as THREE.MeshBasicMaterial).opacity = 0;
  }

  private updateMining(dt: number): void {
    if (!this.lmb || !this.target) {
      this.resetMine();
      return;
    }
    const { x, y, z } = this.target;
    const id = this.world.getBlock(x, y, z);
    if (isUnbreakable(id) && !this.creative) {
      this.resetMine();
      return;
    }
    if (this.creative) {
      this.breakAt(x, y, z, id);
      this.lmb = true;
      return;
    }

    if (!this.mineTarget || this.mineTarget.x !== x || this.mineTarget.y !== y || this.mineTarget.z !== z) {
      this.mineTarget = { x, y, z };
      this.mineProgress = 0;
    }
    const tool = this.inv.selectedId();
    const dur = mineDuration(id, tool);
    if (!Number.isFinite(dur) || dur <= 0) {
      this.resetMine();
      return;
    }
    this.mineProgress += dt / dur;
    this.crack.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.crack.visible = true;
    (this.crack.material as THREE.MeshBasicMaterial).opacity = Math.min(0.55, this.mineProgress * 0.55);
    if (this.mineProgress >= 1) {
      this.breakAt(x, y, z, id);
      this.resetMine();
    }
  }

  private breakAt(x: number, y: number, z: number, id: number): void {
    if (id === Block.Air || id === Block.Water) return;
    if (isUnbreakable(id) && !this.creative) return;
    this.particles.spawn(x, y, z, id);
    this.world.setBlock(x, y, z, Block.Air);
    this.audio.break();
    if (!this.creative) {
      const drop = blockDrop(id);
      if (drop) this.inv.add(drop.id, drop.count);
    }
  }

  private tryUse(): void {
    if (!this.target) return;
    const tid = this.world.getBlock(this.target.x, this.target.y, this.target.z);
    if (isInteractable(tid)) {
      this.onOpenCraft?.();
      return;
    }
    this.placeBlock();
  }

  private placeBlock(): void {
    if (!this.target) return;
    const x = this.target.x + this.target.nx;
    const y = this.target.y + this.target.ny;
    const z = this.target.z + this.target.nz;
    if (y < 0 || y >= WORLD_HEIGHT) return;

    const existing = this.world.getBlock(x, y, z);
    if (!isReplaceable(existing)) return;

    const held = this.inv.getSelected();
    if (!held || !isPlaceable(held.id)) return;

    const box = this.aabb(this.position.x, this.position.y, this.position.z);
    const solidPlace = isSolid(held.id);
    if (
      solidPlace &&
      x + 1 > box.minX &&
      x < box.maxX &&
      y + 1 > box.minY &&
      y < box.maxY &&
      z + 1 > box.minZ &&
      z < box.maxZ
    )
      return;

    if (!this.creative && !this.inv.consumeSelected(1)) return;
    this.world.setBlock(x, y, z, held.id);
    this.audio.place();
    this.held.setItem(this.handItemId());
  }

  /** Block currently in the selected hotbar slot, or null if empty. */
  handItemId(): number | null {
    const stack = this.inv.getSelected();
    return stack && stack.count > 0 ? stack.id : null;
  }

  getSelectedBlock(): number {
    return this.handItemId() ?? 0;
  }
}
