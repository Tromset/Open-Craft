import { BLOCK_NAMES } from "./blocks";
import { createHotbarIcon } from "./textures";
import type { Inventory, Slot } from "./inventory";
import { CraftGrid } from "./inventory";
import { matchRecipe, occupiedMask, canTakeResult, takeResult } from "./crafting";
import type { AudioEngine } from "./audio";

function slotEl(slot: Slot | null, extra = ""): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "slot" + (extra ? " " + extra : "");
  if (slot) {
    el.appendChild(createHotbarIcon(slot.id));
    if (slot.count > 1) {
      const n = document.createElement("span");
      n.className = "count";
      n.textContent = String(slot.count);
      el.appendChild(n);
    }
    el.title = BLOCK_NAMES[slot.id] ?? "";
  }
  return el;
}

export class Hud {
  readonly overlay: HTMLDivElement;
  readonly death: HTMLDivElement;
  readonly invScreen: HTMLDivElement;
  readonly hotbar: HTMLDivElement;
  readonly hearts: HTMLDivElement;
  readonly hunger: HTMLDivElement;
  readonly air: HTMLDivElement;
  readonly info: HTMLDivElement;
  readonly toast: HTMLDivElement;
  readonly crosshair: HTMLDivElement;
  readonly mineBar: HTMLDivElement;
  readonly cursorItem: HTMLDivElement;

  held: Slot | null = null;
  craft: CraftGrid | null = null;
  craftSize = 2;
  inventoryOpen = false;
  f3 = false;

  private hotbarSig = "";
  private vitalsSig = "";

  constructor(app: HTMLDivElement) {
    app.innerHTML = `
      <div id="overlay">
        <h1>Open-Craft</h1>
        <p>Clique pour jouer</p>
        <div class="hint">
          ZQSD / WASD — bouger · Souris — regarder · Espace — sauter<br/>
          Clic gauche (maintenir) — miner · Clic droit — poser / établi<br/>
          E — inventaire · N — créatif · K — sauver · F3 — debug
        </div>
      </div>
      <div id="death" class="hidden">
        <h1>Vous êtes mort</h1>
        <p id="respawn-btn">Cliquez pour réapparaître</p>
      </div>
      <div id="inv-screen" class="hidden">
        <div class="inv-panel">
          <h2 id="inv-title">Inventaire</h2>
          <div id="craft-row"></div>
          <div id="inv-grid"></div>
          <p class="inv-hint">Clic gauche : prendre / déposer · Clic droit : un par un · E / Échap : fermer</p>
        </div>
      </div>
      <div id="crosshair"></div>
      <div id="mine-bar"><div id="mine-fill"></div></div>
      <div id="status">
        <div id="hearts"></div>
        <div id="hunger-bar"></div>
        <div id="air-bar"></div>
      </div>
      <div id="hotbar"></div>
      <div id="info"></div>
      <div id="toast" class="hidden"></div>
      <div id="cursor-item" class="hidden"></div>
    `;
    this.overlay = app.querySelector("#overlay")!;
    this.death = app.querySelector("#death")!;
    this.invScreen = app.querySelector("#inv-screen")!;
    this.hotbar = app.querySelector("#hotbar")!;
    this.hearts = app.querySelector("#hearts")!;
    this.hunger = app.querySelector("#hunger-bar")!;
    this.air = app.querySelector("#air-bar")!;
    this.info = app.querySelector("#info")!;
    this.toast = app.querySelector("#toast")!;
    this.crosshair = app.querySelector("#crosshair")!;
    this.mineBar = app.querySelector("#mine-bar")!;
    this.cursorItem = app.querySelector("#cursor-item")!;
  }

  showToast(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.remove("hidden");
    window.setTimeout(() => this.toast.classList.add("hidden"), 1600);
  }

  setPlaying(playing: boolean): void {
    this.overlay.classList.toggle("hidden", playing);
    this.crosshair.classList.toggle("visible", playing);
    this.hotbar.classList.toggle("visible", playing);
    document.getElementById("status")!.classList.toggle("visible", playing);
    if (this.f3) this.info.classList.toggle("visible", playing);
    else this.info.classList.remove("visible");
  }

  updateHotbar(inv: Inventory, selected: number): void {
    const sig = `${selected}|${inv.slots
      .slice(0, 9)
      .map((s) => (s ? `${s.id}:${s.count}` : ""))
      .join(",")}`;
    if (sig === this.hotbarSig) return;
    this.hotbarSig = sig;
    this.hotbar.replaceChildren();
    for (let i = 0; i < 9; i++) {
      const el = slotEl(inv.slots[i], i === selected ? "selected" : "");
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = String(i + 1);
      el.appendChild(key);
      this.hotbar.appendChild(el);
    }
  }

  updateVitals(health: number, hunger: number, air: number, underwater: boolean, creative: boolean): void {
    const vSig = `${health}|${hunger}|${air}|${underwater}|${creative}`;
    if (vSig === this.vitalsSig) return;
    this.vitalsSig = vSig;
    this.hearts.replaceChildren();
    this.hunger.replaceChildren();
    this.air.replaceChildren();
    if (creative) {
      const tag = document.createElement("span");
      tag.className = "mode-tag";
      tag.textContent = "Créatif";
      this.hearts.appendChild(tag);
      this.air.classList.add("hidden");
      return;
    }
    for (let i = 0; i < 10; i++) {
      const h = document.createElement("span");
      const v = health - i * 2;
      h.className = "icon heart" + (v >= 2 ? " full" : v >= 1 ? " half" : " empty");
      h.textContent = v >= 1 ? "♥" : "♡";
      this.hearts.appendChild(h);
    }
    for (let i = 0; i < 10; i++) {
      const h = document.createElement("span");
      const v = hunger - i * 2;
      h.className = "icon drum" + (v >= 2 ? " full" : v >= 1 ? " half" : " empty");
      h.textContent = "🍖";
      this.hunger.appendChild(h);
    }
    if (underwater || air < 20) {
      this.air.classList.remove("hidden");
      for (let i = 0; i < 10; i++) {
        const b = document.createElement("span");
        const v = air - i * 2;
        b.className = "icon bubble" + (v >= 1 ? " full" : " empty");
        b.textContent = v >= 1 ? "●" : "○";
        this.air.appendChild(b);
      }
    } else {
      this.air.classList.add("hidden");
    }
  }

  setMine(progress: number): void {
    const fill = this.mineBar.querySelector("#mine-fill") as HTMLDivElement;
    if (progress <= 0 || progress >= 1) {
      this.mineBar.classList.remove("visible");
      fill.style.width = "0%";
      return;
    }
    this.mineBar.classList.add("visible");
    fill.style.width = `${Math.min(100, progress * 100)}%`;
  }

  openInventory(inv: Inventory, audio: AudioEngine, size: number): void {
    this.inventoryOpen = true;
    this.craftSize = size;
    this.craft = new CraftGrid(size);
    this.invScreen.classList.remove("hidden");
    this.overlay.classList.add("hidden");
    (this.invScreen.querySelector("#inv-title") as HTMLElement).textContent =
      size === 3 ? "Établi" : "Inventaire";
    audio.ui();
    this.renderInv(inv, audio);
  }

  closeInventory(inv: Inventory): void {
    if (this.craft) this.craft.drainTo(inv);
    if (this.held) {
      inv.add(this.held.id, this.held.count);
      this.held = null;
    }
    this.craft = null;
    this.inventoryOpen = false;
    this.invScreen.classList.add("hidden");
    this.cursorItem.classList.add("hidden");
  }

  private renderInv(inv: Inventory, audio: AudioEngine): void {
    const grid = this.invScreen.querySelector("#inv-grid")!;
    const craftRow = this.invScreen.querySelector("#craft-row")!;
    grid.replaceChildren();
    craftRow.replaceChildren();
    if (!this.craft) return;

    const refresh = () => this.renderInv(inv, audio);

    const craftWrap = document.createElement("div");
    craftWrap.className = `craft-grid cols-${this.craftSize}`;
    for (let i = 0; i < this.craft.size * this.craft.size; i++) {
      const el = slotEl(this.craft.slots[i]);
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.held = this.craft!.click(i, this.held, e.button === 2);
        audio.ui();
        refresh();
      });
      craftWrap.appendChild(el);
    }

    const arrow = document.createElement("div");
    arrow.className = "craft-arrow";
    arrow.textContent = "→";

    const result = matchRecipe(this.craft.ids(), this.craftSize);
    const resultSlot = slotEl(result ? { id: result.id, count: result.count } : null, "result");
    resultSlot.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!result || !this.craft) return;
      if (!canTakeResult(this.held, result)) return;
      this.held = takeResult(this.held, result);
      this.craft.consumeOneEach(occupiedMask(this.craft.ids()));
      audio.ui();
      refresh();
    });

    craftRow.appendChild(craftWrap);
    craftRow.appendChild(arrow);
    craftRow.appendChild(resultSlot);

    for (let i = 0; i < 36; i++) {
      const el = slotEl(inv.slots[i], i < 9 ? "hot" : "");
      el.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.held = inv.clickSlot(i, this.held, ev.button === 2);
        audio.ui();
        refresh();
      });
      grid.appendChild(el);
    }

    this.drawCursor();
  }

  trackMouse(e: MouseEvent): void {
    this.cursorItem.style.left = `${e.clientX + 12}px`;
    this.cursorItem.style.top = `${e.clientY + 12}px`;
  }

  private drawCursor(): void {
    this.cursorItem.replaceChildren();
    if (!this.held) {
      this.cursorItem.classList.add("hidden");
      return;
    }
    this.cursorItem.classList.remove("hidden");
    this.cursorItem.appendChild(createHotbarIcon(this.held.id));
    if (this.held.count > 1) {
      const n = document.createElement("span");
      n.className = "count";
      n.textContent = String(this.held.count);
      this.cursorItem.appendChild(n);
    }
  }
}
