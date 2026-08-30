import { STACK_SIZE, CREATIVE_PALETTE, isPlaceable } from "./blocks";

export interface Slot {
  id: number;
  count: number;
}

export const INV_SIZE = 36;
export const HOTBAR_SIZE = 9;

function cloneSlot(s: Slot | null): Slot | null {
  return s ? { id: s.id, count: s.count } : null;
}

export class Inventory {
  slots: (Slot | null)[] = Array.from({ length: INV_SIZE }, () => null);
  selected = 0;

  getSelected(): Slot | null {
    return this.slots[this.selected];
  }

  selectedId(): number {
    return this.slots[this.selected]?.id ?? 0;
  }

  /** Add items; returns leftover that did not fit. */
  add(id: number, count: number): number {
    if (id === 0 || count <= 0) return count;
    for (let i = 0; i < INV_SIZE && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.count < STACK_SIZE) {
        const space = STACK_SIZE - s.count;
        const n = Math.min(space, count);
        s.count += n;
        count -= n;
      }
    }
    for (let i = 0; i < INV_SIZE && count > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(STACK_SIZE, count);
        this.slots[i] = { id, count: n };
        count -= n;
      }
    }
    return count;
  }

  consumeSelected(count = 1): boolean {
    const s = this.slots[this.selected];
    if (!s || s.count < count) return false;
    s.count -= count;
    if (s.count <= 0) this.slots[this.selected] = null;
    return true;
  }

  canPlaceSelected(): boolean {
    const s = this.slots[this.selected];
    return !!s && isPlaceable(s.id);
  }

  takeFrom(index: number, n?: number): Slot | null {
    const s = this.slots[index];
    if (!s) return null;
    if (n === undefined || n >= s.count) {
      this.slots[index] = null;
      return s;
    }
    s.count -= n;
    return { id: s.id, count: n };
  }

  /** Merge or swap `held` into slot. Returns the new held stack. */
  clickSlot(index: number, held: Slot | null, right: boolean): Slot | null {
    const dest = this.slots[index];
    if (right) {
      if (held) {
        if (!dest) {
          this.slots[index] = { id: held.id, count: 1 };
          held.count--;
          return held.count > 0 ? held : null;
        }
        if (dest.id === held.id && dest.count < STACK_SIZE) {
          dest.count++;
          held.count--;
          return held.count > 0 ? held : null;
        }
        return held;
      }
      if (dest) {
        const half = Math.ceil(dest.count / 2);
        dest.count -= half;
        const out = { id: dest.id, count: half };
        if (dest.count <= 0) this.slots[index] = null;
        return out;
      }
      return null;
    }

    if (!held) {
      this.slots[index] = null;
      return dest;
    }
    if (!dest) {
      this.slots[index] = held;
      return null;
    }
    if (dest.id === held.id) {
      const space = STACK_SIZE - dest.count;
      const n = Math.min(space, held.count);
      dest.count += n;
      held.count -= n;
      return held.count > 0 ? held : null;
    }
    this.slots[index] = held;
    return dest;
  }

  dumpInto(id: number, count: number): void {
    this.add(id, count);
  }

  serialize(): (Slot | null)[] {
    return this.slots.map(cloneSlot);
  }

  load(data: (Slot | null)[] | undefined): void {
    this.slots = Array.from({ length: INV_SIZE }, () => null);
    if (!data) return;
    for (let i = 0; i < INV_SIZE && i < data.length; i++) {
      const s = data[i];
      this.slots[i] = s && s.id && s.count ? { id: s.id, count: s.count } : null;
    }
  }

  fillCreativePalette(): void {
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      if (!this.slots[i]) {
        this.slots[i] = { id: CREATIVE_PALETTE[i], count: 1 };
      }
    }
  }
}

/** Independent crafting grid (2×2 or 3×3) plus result. */
export class CraftGrid {
  readonly size: number;
  slots: (Slot | null)[];

  constructor(size: number) {
    this.size = size;
    this.slots = Array.from({ length: size * size }, () => null);
  }

  ids(): (number | null)[] {
    return this.slots.map((s) => (s ? s.id : null));
  }

  consumeOneEach(mask: boolean[]): void {
    for (let i = 0; i < this.slots.length; i++) {
      if (!mask[i]) continue;
      const s = this.slots[i];
      if (!s) continue;
      s.count--;
      if (s.count <= 0) this.slots[i] = null;
    }
  }

  click(index: number, held: Slot | null, right: boolean): Slot | null {
    const dest = this.slots[index];
    if (right) {
      if (held) {
        if (!dest) {
          this.slots[index] = { id: held.id, count: 1 };
          held.count--;
          return held.count > 0 ? held : null;
        }
        if (dest.id === held.id && dest.count < STACK_SIZE) {
          dest.count++;
          held.count--;
          return held.count > 0 ? held : null;
        }
        return held;
      }
      if (dest) {
        dest.count--;
        const out = { id: dest.id, count: 1 };
        if (dest.count <= 0) this.slots[index] = null;
        return out;
      }
      return null;
    }
    if (!held) {
      this.slots[index] = null;
      return dest;
    }
    if (!dest) {
      this.slots[index] = held;
      return null;
    }
    if (dest.id === held.id) {
      const space = STACK_SIZE - dest.count;
      const n = Math.min(space, held.count);
      dest.count += n;
      held.count -= n;
      return held.count > 0 ? held : null;
    }
    this.slots[index] = held;
    return dest;
  }

  drainTo(inv: Inventory): void {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s) inv.add(s.id, s.count);
      this.slots[i] = null;
    }
  }
}
