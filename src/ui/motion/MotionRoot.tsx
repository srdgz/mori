"use client";

import "lenis/dist/lenis.css";
import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MotionModule = typeof import("./setup-motion");

function whenLoadedAndIdle(callback: () => void): () => void {
  let cancel = () => {};
  const start = () => {
    cancel = whenIdle(callback);
  };
  if (document.readyState === "complete") start();
  else {
    window.addEventListener("load", start, { once: true });
    cancel = () => window.removeEventListener("load", start);
  }
  return () => cancel();
}

function whenIdle(callback: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout: 1200 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 200);
  return () => clearTimeout(id);
}

export function MotionRoot() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const [motion, setMotion] = useState<MotionModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    let teardown = () => {};
    const cancelIdle = whenLoadedAndIdle(async () => {
      const [mod, { default: LenisClass }, { gsap }] = await Promise.all([import("./setup-motion"), import("lenis"), import("gsap")]);
      if (cancelled) return;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const lenis = new LenisClass({ duration: 1.1, smoothWheel: true, anchors: { offset: -80 }, autoRaf: false });
        lenisRef.current = lenis;
        lenis.on("scroll", mod.ScrollTrigger.update);
        const raf = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        const onMenu = (e: Event) => ((e as CustomEvent<boolean>).detail ? lenis.stop() : lenis.start());
        document.addEventListener("mori:menu", onMenu);
        teardown = () => {
          document.removeEventListener("mori:menu", onMenu);
          gsap.ticker.remove(raf);
          lenis.destroy();
          lenisRef.current = null;
        };
      }
      setMotion(mod);
    });
    return () => {
      cancelled = true;
      cancelIdle();
      teardown();
    };
  }, []);

  useEffect(() => {
    if (!motion) return;
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    const cleanup = motion.setupMotion();
    const frame = requestAnimationFrame(() => motion.ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [motion, pathname]);

  return null;
}
