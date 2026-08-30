import type { Slot } from "./inventory";

export const SAVE_KEY = "opencraft-save-v1";

export interface SaveData {
  v: 1;
  seed: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  hunger: number;
  air: number;
  inventory: (Slot | null)[];
  edits: number[];
  time: number;
  creative: boolean;
  flying: boolean;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data || data.v !== 1 || typeof data.seed !== "number") return null;
    if (!Array.isArray(data.edits) || !Array.isArray(data.inventory)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function parseSeedParam(): number | null {
  const q = new URLSearchParams(location.search).get("seed");
  if (q === null || q === "") return null;
  const n = Number(q);
  return Number.isFinite(n) ? n : null;
}
