import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface CartLine {
  key: string;
  menuItemId: string;
  cafeId: string;
  name: string;
  unitPricePaise: number;
  quantity: number;
  optionIds: string[];
  optionLabel: string | null;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotalPaise: number;
  add: (line: Omit<CartLine, 'key'>) => void;
  updateQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'cmf_cart_v1';

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage unavailable (private mode); cart simply won't persist.
    }
  }, [lines]);

  const add = (line: Omit<CartLine, 'key'>) => {
    setLines((prev) => {
      const key = `${line.menuItemId}::${[...line.optionIds].sort().join('|')}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l));
      }
      return [...prev, { ...line, key }];
    });
  };

  const updateQuantity = (key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity } : l)),
    );
  };

  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const clear = () => setLines([]);

  const { count, subtotalPaise } = useMemo(
    () => ({
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalPaise: lines.reduce((n, l) => n + l.unitPricePaise * l.quantity, 0),
    }),
    [lines],
  );

  const value = useMemo(
    () => ({ lines, count, subtotalPaise, add, updateQuantity, remove, clear }),
    [lines, count, subtotalPaise],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}