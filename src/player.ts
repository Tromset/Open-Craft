import * as THREE from "three";
import { Block, isPlaceable, isSolid } from "./blocks";
import { HeldItem } from "./heldItem";
import { Inventory } from "./inventory";
import { World, WORLD_HEIGHT } from "./world";

const EYE_HEIGHT = 1.62;
const PLAYER_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const SPEED = 4.8;
const SPRINT = 7.2;
const JUMP = 8.2;
const GRAVITY = 28;
const REACH = 5;

export class Player {
  readonly camera: THREE.PerspectiveCamera;
  position = new THREE.Vector3(0, 40, 0);
  velocity = new THREE.Vector3();
  onGround = false;
  selected = 0;
  readonly inventory = new Inventory();

  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private world: World;
  private locked = false;
  private highlight: THREE.LineSegments;
  private held: HeldItem;
  private target: {
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
  } | null = null;

  constructor(world: World, camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.world = world;
    this.camera = camera;
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

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.replace("Digit", ""), 10);
        if (n >= 1 && n <= 9) this.selected = n - 1;
      }
      if (e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    window.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    });

    window.addEventListener("mousedown", (e) => {
      if (!this.locked) return;
      if (e.button === 0) this.breakBlock();
      if (e.button === 2) this.placeBlock();
    });

    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("wheel", (e) => {
      if (!this.locked) return;
      const n = this.inventory.slots.length;
      if (e.deltaY > 0) this.selected = (this.selected + 1) % n;
      else this.selected = (this.selected - 1 + n) % n;
    });
  }

  setLocked(v: boolean): void {
    this.locked = v;
  }

  spawn(): void {
    const x = 8;
    const z = 8;
    const cx = Math.floor(x / 16);
    const cz = Math.floor(z / 16);
    this.world.ensureChunk(cx, cz);
    const y = this.world.surfaceY(x, z) + 0.01;
    this.position.set(x + 0.5, y, z + 0.5);
    this.velocity.set(0, 0, 0);
    this.yaw = 0.8;
    this.pitch = -0.2;
    this.syncCamera();
  }

  private syncCamera(): void {
    this.camera.position.set(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z,
    );
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

  update(dt: number): void {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wish = new THREE.Vector3();
    if (this.keys.has("KeyW") || this.keys.has("KeyZ")) wish.add(forward);
    if (this.keys.has("KeyS")) wish.sub(forward);
    if (this.keys.has("KeyD")) wish.add(right);
    if (this.keys.has("KeyA") || this.keys.has("KeyQ")) wish.sub(right);
    const walking = wish.lengthSq() > 0;
    if (walking) wish.normalize();

    const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const speed = sprint ? SPRINT : SPEED;
    this.velocity.x = wish.x * speed;
    this.velocity.z = wish.z * speed;

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
    const inWater = feet === Block.Water || body === Block.Water;

    if (inWater) {
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

    this.onGround = false;
    this.position.y += this.velocity.y * dt;
    this.resolve("y");
    this.position.x += this.velocity.x * dt;
    this.resolve("x");
    this.position.z += this.velocity.z * dt;
    this.resolve("z");

    // ground probe
    if (
      this.world.collides(
        this.aabb(this.position.x, this.position.y - 0.05, this.position.z),
      )
    ) {
      this.onGround = true;
    }

    this.camera.position.set(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z,
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    this.updateRaycast();
    this.world.updateAround(this.position.x, this.position.z);
    this.held.setItem(this.handItemId());
    this.held.update(dt, walking && this.onGround);
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
      this.highlight.position.set(
        this.target.x + 0.5,
        this.target.y + 0.5,
        this.target.z + 0.5,
      );
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }

  private breakBlock(): void {
    if (!this.target) return;
    this.world.setBlock(this.target.x, this.target.y, this.target.z, Block.Air);
  }

  private placeBlock(): void {
    const stack = this.inventory.get(this.selected);
    if (!stack || !isPlaceable(stack.id)) return;
    if (!this.target) return;

    const x = this.target.x + this.target.nx;
    const y = this.target.y + this.target.ny;
    const z = this.target.z + this.target.nz;
    if (y < 0 || y >= WORLD_HEIGHT) return;

    const existing = this.world.getBlock(x, y, z);
    if (existing !== Block.Air && existing !== Block.Water) return;

    const box = this.aabb(this.position.x, this.position.y, this.position.z);
    if (
      x + 1 > box.minX &&
      x < box.maxX &&
      y + 1 > box.minY &&
      y < box.maxY &&
      z + 1 > box.minZ &&
      z < box.maxZ
    )
      return;

    this.world.setBlock(x, y, z, stack.id);
    this.inventory.consume(this.selected);
    this.held.setItem(this.handItemId());
  }

  /** Block currently in hand, or null if the selected slot is empty. */
  handItemId(): number | null {
    const stack = this.inventory.get(this.selected);
    return stack && stack.count > 0 ? stack.id : null;
  }

  getSelectedBlock(): number {
    return this.handItemId() ?? 0;
  }
}
