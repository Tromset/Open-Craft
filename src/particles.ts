import * as THREE from "three";
import { particleColor } from "./blocks";

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export class BreakParticles {
  private items: Particle[] = [];
  private scene: THREE.Scene;
  private geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(x: number, y: number, z: number, blockId: number): void {
    const [r, g, b] = particleColor(blockId);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(r, g, b),
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.position.set(
        x + 0.5 + (Math.random() - 0.5) * 0.6,
        y + 0.5 + (Math.random() - 0.5) * 0.6,
        z + 0.5 + (Math.random() - 0.5) * 0.6,
      );
      this.scene.add(mesh);
      this.items.push({
        mesh,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 1,
        vz: (Math.random() - 0.5) * 3,
        life: 0.45 + Math.random() * 0.25,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.y += dt * 5;
      const mat = p.mesh.material as THREE.MeshLambertMaterial;
      mat.opacity = Math.max(0, p.life * 2);
      mat.transparent = true;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        mat.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
