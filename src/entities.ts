import * as THREE from "three";
import { Block, isSolid } from "./blocks";
import type { World } from "./world";
import type { Player } from "./player";
import type { AudioEngine } from "./audio";

const SPEED = 2.6;
const TOUCH_RANGE = 1.15;
const MAX_ZOMBIES = 3;

export class Zombie {
  mesh: THREE.Mesh;
  hp = 4;
  x: number;
  y: number;
  z: number;
  vy = 0;
  private hitCd = 0;
  private burn = 0;

  constructor(scene: THREE.Scene, x: number, y: number, z: number) {
    const geo = new THREE.BoxGeometry(0.55, 1.7, 0.4);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3d5c2a });
    this.mesh = new THREE.Mesh(geo, mat);
    this.x = x;
    this.y = y;
    this.z = z;
    scene.add(this.mesh);
    this.sync();
  }

  private sync(): void {
    this.mesh.position.set(this.x, this.y + 0.85, this.z);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  update(dt: number, world: World, player: Player, audio: AudioEngine, isNight: boolean): boolean {
    this.hitCd = Math.max(0, this.hitCd - dt);

    if (!isNight) {
      this.burn += dt;
      const mat = this.mesh.material as THREE.MeshLambertMaterial;
      mat.color.set(0x884422);
      if (this.burn >= 0.5) {
        this.hp -= 1;
        this.burn = 0;
      }
    } else {
      this.burn = 0;
      (this.mesh.material as THREE.MeshLambertMaterial).color.set(0x3d5c2a);
    }

    if (this.hp <= 0) return false;

    const dx = player.position.x - this.x;
    const dz = player.position.z - this.z;
    const dist = Math.hypot(dx, dz) || 1;
    let mx = (dx / dist) * SPEED * dt;
    let mz = (dz / dist) * SPEED * dt;

    this.vy -= 28 * dt;
    this.y += this.vy * dt;
    if (this.collides(world)) {
      this.y = Math.floor(this.y) + 1.001;
      this.vy = 0;
    }

    this.x += mx;
    if (this.collides(world)) {
      this.x -= mx;
      this.vy = 6;
    }
    this.z += mz;
    if (this.collides(world)) {
      this.z -= mz;
      this.vy = 6;
    }

    this.sync();
    this.mesh.lookAt(player.position.x, this.y + 0.85, player.position.z);

    const pdx = player.position.x - this.x;
    const pdy = player.position.y + 0.9 - (this.y + 0.85);
    const pdz = player.position.z - this.z;
    if (Math.hypot(pdx, pdy, pdz) < TOUCH_RANGE && this.hitCd <= 0 && !player.creative) {
      player.hurt(2, audio);
      this.hitCd = 1.05;
    }
    return true;
  }

  private collides(world: World): boolean {
    const x0 = Math.floor(this.x - 0.25);
    const x1 = Math.floor(this.x + 0.25);
    const y0 = Math.floor(this.y);
    const y1 = Math.floor(this.y + 1.6);
    const z0 = Math.floor(this.z - 0.18);
    const z1 = Math.floor(this.z + 0.18);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          if (isSolid(world.getBlock(x, y, z))) return true;
        }
      }
    }
    return false;
  }
}

export class ZombieHorde {
  private list: Zombie[] = [];
  private spawnCd = 4;

  update(dt: number, scene: THREE.Scene, world: World, player: Player, audio: AudioEngine, isNight: boolean): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!this.list[i].update(dt, world, player, audio, isNight)) {
        this.list[i].dispose(scene);
        this.list.splice(i, 1);
      }
    }

    if (!isNight) {
      this.spawnCd = 3;
      return;
    }

    this.spawnCd -= dt;
    if (this.spawnCd > 0 || this.list.length >= MAX_ZOMBIES) return;
    this.spawnCd = 8 + Math.random() * 10;

    const ang = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 12;
    const x = player.position.x + Math.cos(ang) * dist;
    const z = player.position.z + Math.sin(ang) * dist;
    const y = world.surfaceY(x, z);
    const ground = world.getBlock(Math.floor(x), y - 1, Math.floor(z));
    if (ground === Block.Air || ground === Block.Water) return;
    this.list.push(new Zombie(scene, x, y, z));
  }
}
