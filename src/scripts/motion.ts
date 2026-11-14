import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const ease = "expo.out";

function safe(fn: () => void, name: string) {
  try {
    fn();
  } catch (err) {
    console.warn(`[MORI] motion ${name} failed`, err);
    document.querySelectorAll<HTMLElement>("[data-anim]").forEach((el) => (el.style.visibility = "visible"));
  }
}

const all = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(sel));
const delayOf = (el: HTMLElement) => parseFloat(el.dataset.delay ?? "0") || 0;

let lenis: Lenis | null = null;

function initLenis() {
  if (reduceMQ.matches) return;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: { offset: -80 }, autoRaf: false });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener("mori:menu", (e) => {
    if ((e as CustomEvent<boolean>).detail) lenis?.stop();
    else lenis?.start();
  });
}

function showAll() {
  gsap.set(all("[data-anim]"), { autoAlpha: 1, clearProps: "transform" });
}

function initHero() {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  const media = hero.querySelector<HTMLElement>("[data-hero-media]");
  const lines = all("[data-hero-line]", hero);
  const scrub = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 } });
  if (lines[0]) scrub.to(lines[0], { xPercent: -14, ease: "none" }, 0);
  if (lines[1]) scrub.to(lines[1], { xPercent: 12, ease: "none" }, 0);
  if (media) scrub.to(media.querySelector("img"), { yPercent: 12, scale: 1.08, ease: "none" }, 0);
}

function initPageHero() {
  const el = document.querySelector<HTMLElement>("[data-page-hero]");
  if (!el) return;
  const kanji = el.querySelector("[data-kanji]");
  if (kanji) {
    gsap.to(kanji, { yPercent: 30, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
  }
}

function initFades() {
  const items = all("[data-anim='fade']");
  if (!items.length) return;
  gsap.set(items, { autoAlpha: 0, y: 34 });
  ScrollTrigger.batch(items, {
    start: "top 92%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: 1.1,
        ease,
        stagger: 0.09,
        delay: delayOf(batch[0] as HTMLElement),
        overwrite: true,
      }),
  });
}

function initLines() {
  all("[data-anim='lines']").forEach((el) => {
    gsap.set(el, { autoAlpha: 1 });
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      aria: "none",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 105,
          duration: 1.2,
          ease,
          stagger: 0.1,
          delay: delayOf(el),
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }),
    });
  });
}

function initClip() {
  all("[data-anim='clip']").forEach((el) => {
    gsap.set(el, { autoAlpha: 1 });
    gsap.fromTo(
      el,
      { clipPath: "inset(14% 8% 14% 8% round 18px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 18px)",
        duration: 1.5,
        ease,
        delay: delayOf(el),
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      },
    );
    const img = el.querySelector("img");
    if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease, delay: delayOf(el), scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });
}

function initParallax() {
  all("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax ?? "10");
    gsap.fromTo(
      el,
      { yPercent: -amount },
      { yPercent: amount, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } },
    );
  });
}

function initWords() {
  all("[data-words]").forEach((el) => {
    gsap.set(el, { autoAlpha: 1 });
    SplitText.create(el, {
      type: "words",
      aria: "none",
      autoSplit: true,
      onSplit: (self) =>
        gsap.fromTo(
          self.words,
          { color: "#7e877a" },
          {
            color: "#183d2b",
            ease: "none",
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 45%", scrub: true },
          },
        ),
    });
  });
}

function initHScroll() {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 64rem)", () => {
    all("[data-hscroll]").forEach((section) => {
      const track = section.querySelector<HTMLElement>("[data-rail-track]");
      if (!track) return;
      section.classList.add("is-pinned");
      const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
      const progress = section.querySelector<HTMLElement>("[data-hscroll-progress]");
      gsap.to(track.children, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (st) => progress && gsap.set(progress, { scaleX: st.progress }),
        },
      });
      return () => section.classList.remove("is-pinned");
    });
  });
}

function initCounters() {
  all("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count ?? "0");
    const decimals = (el.dataset.count ?? "").includes(".") ? 1 : 0;
    const obj = { v: 0 };
    el.textContent = "0";
    gsap.to(obj, {
      v: target,
      duration: 2,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => (el.textContent = obj.v.toFixed(decimals).replace(".", ",")),
    });
  });
}

function initDraw() {
  all("[data-draw]").forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, scale: 0.6, rotate: -60 },
      { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.6, ease, scrollTrigger: { trigger: el, start: "top 92%", once: true } },
    );
  });
}

function initFooterWord() {
  const word = document.querySelector<HTMLElement>("[data-footer-word]");
  if (!word) return;
  gsap.fromTo(word, { "--fill": "0%" }, { "--fill": "100%", ease: "none", scrollTrigger: { trigger: word, start: "top 95%", end: "bottom bottom", scrub: true } });
}

function initMagnetic() {
  if (!finePointer) return;
  all("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.25);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });
  });
}

function boot() {
  root.classList.add("motion-ready");
  if (reduceMQ.matches) {
    showAll();
    return;
  }
  safe(initLenis, "lenis");
  safe(initHero, "hero");
  safe(initPageHero, "pageHero");
  safe(initFades, "fades");
  safe(initLines, "lines");
  safe(initClip, "clip");
  safe(initParallax, "parallax");
  safe(initWords, "words");
  safe(initHScroll, "hscroll");
  safe(initCounters, "counters");
  safe(initDraw, "draw");
  safe(initFooterWord, "footerWord");
  safe(initMagnetic, "magnetic");
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

boot();
