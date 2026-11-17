"use client";

import { useSyncExternalStore } from "react";
import { addToCart, lineKey, setQuantity, type Cart, type CartLine } from "@/core/domain/cart/cart";

type CartState = Readonly<{ lines: Cart; open: boolean; ready: boolean; announcement: string }>;

const STORAGE_KEY = "mori-cart-v1";
const SERVER_STATE: CartState = { lines: [], open: false, ready: false, announcement: "" };

let state: CartState = SERVER_STATE;
const listeners = new Set<() => void>();
const changeListeners = new Set<(lines: Cart) => void>();

function emit(next: Partial<CartState>, persist = false) {
  state = { ...state, ...next };
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {}
    changeListeners.forEach((listener) => listener(state.lines));
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(): CartState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

function readStored(): Cart {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? (parsed as CartLine[]).filter((l) => typeof l?.productId === "string" && Number.isInteger(l.quantity))
      : [];
  } catch {
    return [];
  }
}

export const cart = {
  hydrate() {
    if (!state.ready) emit({ lines: readStored(), ready: true });
  },
  replace(lines: Cart) {
    emit({ lines }, true);
  },
  add(line: CartLine, announcement: string) {
    emit({ lines: addToCart(state.lines, line), open: true, announcement }, true);
  },
  setQuantity(key: string, quantity: number) {
    emit({ lines: setQuantity(state.lines, key, quantity) }, true);
  },
  remove(key: string) {
    emit({ lines: state.lines.filter((l) => lineKey(l) !== key) }, true);
  },
  clear() {
    emit({ lines: [] }, true);
  },
  open() {
    emit({ open: true, announcement: "" });
  },
  close() {
    emit({ open: false });
  },
  onChange(listener: (lines: Cart) => void) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  },
  snapshot(): Cart {
    return state.lines;
  },
};
