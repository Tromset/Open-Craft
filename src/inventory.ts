import { HOTBAR } from "./blocks";

export const HOTBAR_SIZE = 9;
export const MAX_STACK = 64;

export type ItemStack = {
  id: number;
  count: number;
};

/** 9-slot hotbar: the selected slot is the item in the player's hand. */
export class Inventory {
  readonly slots: (ItemStack | null)[] = [];

  constructor() {
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const id = HOTBAR[i];
      this.slots.push(id != null ? { id, count: MAX_STACK } : null);
    }
  }

  get(index: number): ItemStack | null {
    return this.slots[index] ?? null;
  }

  /** Remove `n` from a slot. Returns the item id, or null if the slot was empty. */
  consume(index: number, n = 1): number | null {
    const stack = this.slots[index];
    if (!stack || stack.count < n) return null;
    const id = stack.id;
    stack.count -= n;
    if (stack.count <= 0) this.slots[index] = null;
    return id;
  }
}
