"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cart } from "./cart-store";

export function ClearCartFor({ code }: { code: string }) {
  useEffect(() => {
    const key = `mori-order-cleared-${code}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {}
    cart.hydrate();
    cart.clear();
  }, [code]);
  return null;
}

export function RefreshWhilePending({ intervalMs = 2500, maxTries = 30 }: { intervalMs?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > maxTries) clearInterval(timer);
      else router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs, maxTries]);
  return null;
}
