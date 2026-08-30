import "./style.css";
import * as THREE from "three";
import { World, RENDER_DISTANCE, CHUNK_SIZE } from "./world";
import { Player } from "./player";
import { BLOCK_NAMES } from "./blocks";
import { Inventory } from "./inventory";
import { AudioEngine } from "./audio";
import { BreakParticles } from "./particles";
import { GameTime } from "./time";
import { loadSave, writeSave, parseSeedParam, type SaveData } from "./save";
import { Hud } from "./hud";
import { ZombieHorde } from "./entities";

const TORCH_LIGHTS = 16;

const app = document.querySelector<HTMLDivElement>("#app")!;
const hud = new Hud(app);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const fogFar = RENDER_DISTANCE * CHUNK_SIZE * 1.15;
scene.fog = new THREE.Fog(0x87ceeb, fogFar * 0.45, fogFar);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 280);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x87ceeb, 1);
app.insertBefore(renderer.domElement, hud.overlay);

const sun = new THREE.DirectionalLight(0xfff5e0, 1.35);
sun.position.set(60, 100, 40);
scene.add(sun);
const ambient = new THREE.AmbientLight(0x8ec8ff, 0.55);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x5a8a3a, 0.35);
scene.add(hemi);

const torchPool: THREE.PointLight[] = [];
for (let i = 0; i < TORCH_LIGHTS; i++) {
  const l = new THREE.PointLight(0xffb040, 0, 10, 2);
  scene.add(l);
  torchPool.push(l);
}

const saved = loadSave();
const seedParam = parseSeedParam();
let seed = 1337;
if (seedParam !== null) seed = seedParam >>> 0 || seedParam;
else if (saved) seed = saved.seed;

const world = new World(scene, seed);
const inv = new Inventory();
const audio = new AudioEngine();
const particles = new BreakParticles(scene);
const player = new Player(world, camera, scene, inv, audio, particles);
const clock = new GameTime();
const zombies = new ZombieHorde();

const applySave = saved && (seedParam === null || saved.seed === seed);
if (applySave && saved) {
  world.importEdits(saved.edits);
  inv.load(saved.inventory);
  player.health = saved.health;
  player.hunger = saved.hunger;
  player.air = saved.air;
  player.yaw = saved.yaw;
  player.pitch = saved.pitch;
  player.creative = saved.creative;
  player.flying = saved.flying;
  clock.elapsed = saved.time;
}

function persist(): boolean {
  const data: SaveData = {
    v: 1,
    seed: world.seed,
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    yaw: player.yaw,
    pitch: player.pitch,
    health: player.health,
    hunger: player.hunger,
    air: player.air,
    inventory: inv.serialize(),
    edits: world.exportEdits(),
    time: clock.elapsed,
    creative: player.creative,
    flying: player.flying,
  };
  return writeSave(data);
}

hud.overlay.querySelector("p")!.textContent = "Génération du monde…";
requestAnimationFrame(() => {
  const px = applySave && saved ? saved.x : 8;
  const pz = applySave && saved ? saved.z : 8;
  world.updateAround(px, pz, 200, 200);
  if (applySave && saved) {
    player.position.set(saved.x, saved.y, saved.z);
    player.spawnX = saved.x;
    player.spawnY = saved.y;
    player.spawnZ = saved.z;
    player.yaw = saved.yaw;
    player.pitch = saved.pitch;
    player.syncCamera();
  } else {
    player.spawn();
  }
  hud.overlay.querySelector("p")!.textContent = "Clique pour jouer";
});

type Screen = "pause" | "play" | "inventory" | "dead";
let screen: Screen = "pause";

function enterPlay(): void {
  screen = "play";
  hud.setPlaying(true);
  hud.death.classList.add("hidden");
  player.setLocked(true);
  audio.resume();
}

function pauseGame(): void {
  if (screen === "inventory") {
    hud.closeInventory(inv);
  }
  screen = player.dead ? "dead" : "pause";
  player.setLocked(false);
  hud.setPlaying(false);
  if (player.dead) {
    hud.death.classList.remove("hidden");
    hud.overlay.classList.add("hidden");
  }
}

function openInv(size: number): void {
  screen = "inventory";
  player.setLocked(false);
  if (document.pointerLockElement) document.exitPointerLock();
  hud.setPlaying(false);
  hud.overlay.classList.add("hidden");
  hud.hotbar.classList.add("visible");
  document.getElementById("status")!.classList.add("visible");
  hud.openInventory(inv, audio, size);
}

player.onOpenCraft = () => openInv(3);
player.onDeath = () => {
  screen = "dead";
  player.setLocked(false);
  if (document.pointerLockElement) document.exitPointerLock();
  hud.setPlaying(false);
  hud.overlay.classList.add("hidden");
  hud.death.classList.remove("hidden");
};
player.onToggleCreative = () => {
  hud.showToast(player.creative ? "Mode créatif" : "Mode survie");
};

hud.overlay.addEventListener("click", async () => {
  if (player.dead) return;
  try {
    await renderer.domElement.requestPointerLock();
  } catch {
    enterPlay();
  }
});

hud.death.addEventListener("click", async () => {
  player.respawn();
  hud.death.classList.add("hidden");
  try {
    await renderer.domElement.requestPointerLock();
  } catch {
    enterPlay();
  }
});

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked) enterPlay();
  else if (screen === "play") pauseGame();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("mousemove", (e) => hud.trackMouse(e));

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyE") {
    e.preventDefault();
    if (screen === "inventory") {
      hud.closeInventory(inv);
      screen = "pause";
      hud.setPlaying(false);
      void renderer.domElement.requestPointerLock();
    } else if (screen === "play" || screen === "pause") {
      openInv(2);
    }
  }
  if (e.code === "Escape" && screen === "inventory") {
    hud.closeInventory(inv);
    pauseGame();
  }
  if (e.code === "KeyK") {
    const ok = persist();
    hud.showToast(ok ? "Sauvegardé" : "Échec de la sauvegarde");
    audio.ui();
  }
  if (e.code === "F3") {
    e.preventDefault();
    hud.f3 = !hud.f3;
    hud.info.classList.toggle("visible", hud.f3 && screen === "play");
  }
});

window.addEventListener("beforeunload", () => persist());

let last = performance.now();
let frames = 0;
let fps = 0;
let fpsTimer = 0;
let autoSave = 0;

function updateTorches(): void {
  const near = world.nearestTorches(
    player.position.x,
    player.position.y + 1.6,
    player.position.z,
    TORCH_LIGHTS,
  );
  for (let i = 0; i < TORCH_LIGHTS; i++) {
    const l = torchPool[i];
    if (i < near.length) {
      l.position.set(near[i][0] + 0.5, near[i][1] + 0.7, near[i][2] + 0.5);
      l.intensity = 1.15;
      l.distance = 11;
    } else {
      l.intensity = 0;
    }
  }
}

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fps = Math.round(frames / fpsTimer);
    frames = 0;
    fpsTimer = 0;
  }

  if (screen === "play" && !player.dead) {
    player.update(dt);
    clock.update(dt);
    particles.update(dt);
    zombies.update(dt, scene, world, player, audio, clock.isNight());
    autoSave += dt;
    if (autoSave >= 60) {
      autoSave = 0;
      persist();
    }
  } else {
    world.updateAround(player.position.x, player.position.z);
    particles.update(dt);
  }

  clock.apply(scene, sun, ambient, hemi, scene.fog as THREE.Fog);
  updateTorches();
  hud.updateHotbar(inv, player.selected);
  hud.updateVitals(
    player.health,
    player.hunger,
    player.air,
    player.headUnderwater(),
    player.creative,
  );
  hud.setMine(player.mineProgress);

  if (hud.f3) {
    const b = player.getSelectedBlock();
    const biome = world.biomeLabel(player.position.x, player.position.z);
    hud.info.textContent =
      `${fps} FPS\nXYZ ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)}\n` +
      `Biome ${biome}\nHeure ${clock.debugLabel()}\n` +
      `${player.creative ? "Créatif" : "Survie"}${player.flying ? " (vol)" : ""}\n` +
      `${BLOCK_NAMES[b] ?? ""}\nSeed ${world.seed}`;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
