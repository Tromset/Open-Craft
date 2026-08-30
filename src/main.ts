import "./style.css";
import * as THREE from "three";
import { World } from "./world";
import { Player } from "./player";
import { BLOCK_NAMES, HOTBAR } from "./blocks";
import { createHotbarIcon } from "./textures";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div id="overlay">
    <h1>MINECRAFT</h1>
    <p>Clique pour jouer</p>
    <div class="hint">
      ZQSD / WASD — bouger · Souris — regarder · Espace — sauter<br/>
      Clic gauche — casser · Clic droit — poser · 1–9 / molette — inventaire<br/>
      Shift — sprint
    </div>
  </div>
  <div id="crosshair"></div>
  <div id="hotbar"></div>
  <div id="info"></div>
`;

const overlay = document.querySelector<HTMLDivElement>("#overlay")!;
const crosshair = document.querySelector<HTMLDivElement>("#crosshair")!;
const hotbarEl = document.querySelector<HTMLDivElement>("#hotbar")!;
const infoEl = document.querySelector<HTMLDivElement>("#info")!;

HOTBAR.forEach((block, i) => {
  const slot = document.createElement("div");
  slot.className = "slot" + (i === 0 ? " selected" : "");
  slot.dataset.index = String(i);
  const icon = createHotbarIcon(block);
  slot.appendChild(icon);
  const key = document.createElement("span");
  key.className = "key";
  key.textContent = String(i + 1);
  slot.appendChild(key);
  hotbarEl.appendChild(slot);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 48, 96);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x87ceeb, 1);
app.insertBefore(renderer.domElement, overlay);

const sun = new THREE.DirectionalLight(0xfff5e0, 1.35);
sun.position.set(60, 100, 40);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x8ec8ff, 0.55));
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x5a8a3a, 0.35));

const world = new World(scene, 1337);
const player = new Player(world, camera, scene);

overlay.querySelector("p")!.textContent = "Génération du monde…";
requestAnimationFrame(() => {
  world.updateAround(8, 8);
  player.spawn();
  overlay.querySelector("p")!.textContent = "Clique pour jouer";
});

function setPlaying(playing: boolean): void {
  if (playing) {
    overlay.classList.add("hidden");
    crosshair.classList.add("visible");
    hotbarEl.classList.add("visible");
    infoEl.classList.add("visible");
    player.setLocked(true);
  } else {
    overlay.classList.remove("hidden");
    crosshair.classList.remove("visible");
    hotbarEl.classList.remove("visible");
    infoEl.classList.remove("visible");
    player.setLocked(false);
  }
}

overlay.addEventListener("click", async () => {
  try {
    await renderer.domElement.requestPointerLock();
  } catch {
    setPlaying(true);
  }
});

document.addEventListener("pointerlockchange", () => {
  setPlaying(document.pointerLockElement === renderer.domElement);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let last = performance.now();
let frames = 0;
let fps = 0;
let fpsTimer = 0;

function updateHotbar(): void {
  hotbarEl.querySelectorAll(".slot").forEach((el, i) => {
    el.classList.toggle("selected", i === player.selected);
  });
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

  if (document.pointerLockElement === renderer.domElement) {
    player.update(dt);
  } else {
    world.updateAround(player.position.x, player.position.z);
  }

  updateHotbar();
  const b = player.getSelectedBlock();
  infoEl.textContent = `${fps} FPS\nXYZ ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)}\n${BLOCK_NAMES[b] ?? ""}`;

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
