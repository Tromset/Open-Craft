import * as THREE from "three";

/** Full day/night cycle ≈ 8 minutes. */
export const DAY_LENGTH = 8 * 60;

export class GameTime {
  /** Seconds into the cycle. 0 = dawn. */
  elapsed = DAY_LENGTH * 0.28;

  update(dt: number): void {
    this.elapsed = (this.elapsed + dt) % DAY_LENGTH;
  }

  /** 0..1 around the cycle. 0 dawn, 0.25 noon, 0.5 dusk, 0.75 midnight. */
  get phase(): number {
    return this.elapsed / DAY_LENGTH;
  }

  isNight(): boolean {
    const p = this.phase;
    return p > 0.52 && p < 0.98;
  }

  get sunAngle(): number {
    return this.phase * Math.PI * 2 - Math.PI / 2;
  }

  apply(
    scene: THREE.Scene,
    sun: THREE.DirectionalLight,
    ambient: THREE.AmbientLight,
    hemi: THREE.HemisphereLight,
    fog: THREE.Fog,
  ): void {
    const p = this.phase;
    const sunH = Math.sin(this.sunAngle);
    const day = THREE.MathUtils.smoothstep(sunH, -0.15, 0.25);

    const daySky = new THREE.Color(0x87ceeb);
    const duskSky = new THREE.Color(0xc45c32);
    const nightSky = new THREE.Color(0x050818);
    const dawnSky = new THREE.Color(0xff9966);

    let sky: THREE.Color;
    if (p < 0.08) sky = dawnSky.clone().lerp(daySky, p / 0.08);
    else if (p < 0.42) sky = daySky.clone();
    else if (p < 0.55) sky = daySky.clone().lerp(duskSky, (p - 0.42) / 0.13);
    else if (p < 0.62) sky = duskSky.clone().lerp(nightSky, (p - 0.55) / 0.07);
    else if (p < 0.92) sky = nightSky.clone();
    else sky = nightSky.clone().lerp(dawnSky, (p - 0.92) / 0.08);

    scene.background = sky;
    fog.color.copy(sky);

    sun.position.set(Math.cos(this.sunAngle) * 120, Math.max(-40, sunH * 140), 50);
    sun.intensity = 0.08 + day * 1.28;
    sun.color.set(day > 0.3 ? 0xfff5e0 : 0xff7733);

    ambient.intensity = 0.07 + day * 0.48;
    ambient.color.set(day > 0.4 ? 0x8ec8ff : 0x1a2240);
    hemi.intensity = 0.08 + day * 0.28;
  }

  debugLabel(): string {
    const h = Math.floor(this.phase * 24);
    const m = Math.floor((this.phase * 24 * 60) % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
}
