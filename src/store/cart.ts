import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/types";

/**
 * A stable identity for a cart line: same product + same matrix option +
 * same custom-field values collapse into one line, while different custom
 * orders (a different design, a different uploaded file, different text) stay
 * separate. Callers pass this key to remove/update a specific line.
 */
export function cartLineKey(item: Pick<CartItem, "id" | "variantLabel" | "customFields">): string {
  const cf = item.customFields?.length
    ? item.customFields.map((f) => `${f.key}=${f.value}`).join("|")
    : "";
  return `${item.id}::${item.variantLabel || ""}::${cf}`;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const key = cartLineKey(item);
        const existing = get().items.find((i) => cartLineKey(i) === key);
        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              cartLineKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
            isOpen: true,
          }));
        } else {
          set((state) => ({
            items: [...state.items, item],
            isOpen: true,
          }));
        }
      },

      removeItem: (lineKey) => {
        set((state) => ({
          items: state.items.filter((i) => cartLineKey(i) !== lineKey),
        }));
      },

      updateQuantity: (lineKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineKey);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (cartLineKey(i) === lineKey ? { ...i, quantity } : i)),
        }));
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getTotalPrice: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
