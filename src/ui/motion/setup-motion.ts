import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const ease = "expo.out";

const all = <T extends Element = HTMLElement>(selector: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<T>(selector));

const delayOf = (el: HTMLElement) => parseFloat(el.dataset.delay ?? "0") || 0;

const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.92;

function safe(fn: () => void, name: string) {
  try {
    fn();
  } catch (error) {
    console.warn(`[MORI] motion ${name} failed`, error);
  }
}

function heroScrub() {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  const media = hero.querySelector<HTMLElement>("[data-hero-media] img");
  const [first, second] = all("[data-hero-line]", hero);
  const scrub = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 } });
  if (first) scrub.to(first, { xPercent: -14, ease: "none" }, 0);
  if (second) scrub.to(second, { xPercent: 12, ease: "none" }, 0);
  if (media) scrub.to(media, { yPercent: 12, scale: 1.08, ease: "none" }, 0);
}

function kanjiScrub() {
  const hero = document.querySelector<HTMLElement>("[data-page-hero]");
  const kanji = hero?.querySelector("[data-kanji]");
  if (!hero || !kanji) return;
  gsap.to(kanji, { yPercent: 30, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
}

function fades() {
  const items = all("[data-anim='fade']").filter(belowFold);
  if (!items.length) return;
  gsap.set(items, { autoAlpha: 0, y: 34 });
  ScrollTrigger.batch(items, {
    start: "top 92%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease, stagger: 0.09, delay: delayOf(batch[0] as HTMLElement), overwrite: true }),
  });
}

function lines() {
  all("[data-anim='lines']")
    .filter(belowFold)
    .forEach((el) => {
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

function clips() {
  all("[data-anim='clip']")
    .filter(belowFold)
    .forEach((el) => {
      const trigger = { trigger: el, start: "top 88%", once: true };
      gsap.fromTo(
        el,
        { clipPath: "inset(14% 8% 14% 8% round 18px)" },
        { clipPath: "inset(0% 0% 0% 0% round 18px)", duration: 1.5, ease, delay: delayOf(el), scrollTrigger: trigger },
      );
      const img = el.querySelector("img");
      if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease, delay: delayOf(el), scrollTrigger: trigger });
    });
}

function parallax() {
  all("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax ?? "10");
    gsap.fromTo(
      el,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: "none",
        scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true },
      },
    );
  });
}

function words() {
  all("[data-words]").forEach((el) => {
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

function horizontalScroll() {
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
          onUpdate: (st) => {
            if (progress) gsap.set(progress, { scaleX: st.progress });
          },
        },
      });
    });
    return () => all("[data-hscroll]").forEach((section) => section.classList.remove("is-pinned"));
  });
  return mm;
}

function counters() {
  all("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count ?? "0");
    const counter = { value: 0 };
    el.textContent = "0";
    gsap.to(counter, {
      value: target,
      duration: 2,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(counter.value));
      },
    });
  });
}

function draws() {
  all("[data-draw]").forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, scale: 0.6, rotate: -60 },
      { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.6, ease, scrollTrigger: { trigger: el, start: "top 92%", once: true } },
    );
  });
}

function footerWord() {
  const word = document.querySelector<HTMLElement>("[data-footer-word]");
  if (!word) return;
  gsap.fromTo(
    word,
    { "--fill": "0%" },
    { "--fill": "100%", ease: "none", scrollTrigger: { trigger: word, start: "top 95%", end: "bottom bottom", scrub: true } },
  );
}

function magnetic() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const cleanups = all("[data-magnetic]").map((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.25);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });
  return () => cleanups.forEach((fn) => fn());
}

export function setupMotion(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }
  let removeMagnetic = () => {};
  let media: gsap.MatchMedia | undefined;
  const ctx = gsap.context(() => {
    safe(heroScrub, "hero");
    safe(kanjiScrub, "kanji");
    safe(fades, "fades");
    safe(lines, "lines");
    safe(clips, "clips");
    safe(parallax, "parallax");
    safe(words, "words");
    safe(() => (media = horizontalScroll()), "hscroll");
    safe(counters, "counters");
    safe(draws, "draws");
    safe(footerWord, "footerWord");
    safe(() => (removeMagnetic = magnetic()), "magnetic");
  });
  const refresh = () => ScrollTrigger.refresh();
  void document.fonts?.ready.then(refresh);
  window.addEventListener("load", refresh);
  return () => {
    window.removeEventListener("load", refresh);
    removeMagnetic();
    media?.revert();
    ctx.revert();
  };
}

export { ScrollTrigger };
