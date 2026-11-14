const root = document.documentElement;

function safe(fn: () => void, name: string) {
  try {
    fn();
  } catch (err) {
    console.warn(`[MORI] ${name} failed`, err);
  }
}

function initHeader() {
  const header = document.querySelector<HTMLElement>("[data-header]");
  if (!header) return;
  const THRESHOLD = 64;
  let lastY = window.scrollY;
  let travel = 0;
  let hidden = false;
  let ticking = false;
  const setHidden = (value: boolean) => {
    if (value === hidden) return;
    hidden = value;
    header.classList.toggle("is-hidden", value);
  };
  const update = () => {
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    lastY = y;
    ticking = false;
    header.classList.toggle("is-scrolled", y > 24);
    if (y < 120 || root.classList.contains("menu-open") || header.contains(document.activeElement)) {
      travel = 0;
      setHidden(false);
      return;
    }
    if (delta === 0) return;
    if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
    travel += delta;
    if (travel > THRESHOLD) setHidden(true);
    else if (travel < -THRESHOLD) setHidden(false);
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  update();
}

function initMobileMenu() {
  const burger = document.querySelector<HTMLButtonElement>("[data-burger]");
  const menu = document.querySelector<HTMLElement>("[data-mobile-menu]");
  const label = document.querySelector<HTMLElement>("[data-burger-label]");
  if (!burger || !menu) return;
  const outside = [document.querySelector("main"), document.querySelector("footer")].filter(Boolean) as HTMLElement[];
  let closeTimer = 0;

  const setOpen = (open: boolean, restoreFocus = true) => {
    window.clearTimeout(closeTimer);
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = (open ? burger.dataset.closeLabel : burger.dataset.openLabel) ?? "";
    outside.forEach((el) => (el.inert = open));
    document.dispatchEvent(new CustomEvent("mori:menu", { detail: open }));
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => {
        menu.classList.add("is-open");
        menu.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
      });
    } else {
      menu.classList.remove("is-open");
      closeTimer = window.setTimeout(() => (menu.hidden = true), 700);
      if (restoreFocus) burger.focus({ preventScroll: true });
    }
  };

  burger.addEventListener("click", () => setOpen(!root.classList.contains("menu-open")));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false, false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("menu-open")) setOpen(false);
    if (e.key === "Tab" && root.classList.contains("menu-open")) {
      const focusables = [burger, ...Array.from(menu.querySelectorAll<HTMLElement>("a")), ...Array.from(document.querySelectorAll<HTMLElement>(".lang a"))];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!focusables.includes(document.activeElement as HTMLElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  window.matchMedia("(min-width: 64rem)").addEventListener("change", (mq) => {
    if (mq.matches && root.classList.contains("menu-open")) setOpen(false, false);
  });
}

function initRail() {
  document.querySelectorAll<HTMLElement>("[data-rail]").forEach((wrapper) => {
    const track = wrapper.querySelector<HTMLElement>("[data-rail-track]");
    if (!track) return;
    wrapper.querySelectorAll<HTMLButtonElement>("[data-rail-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = track.firstElementChild as HTMLElement | null;
        const step = card ? card.getBoundingClientRect().width + 24 : 320;
        const dir = Number(btn.dataset.railBtn);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        track.scrollBy({ left: step * dir, behavior: reduce ? "auto" : "smooth" });
      });
    });
  });
}

function madridNow() {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const o: Record<string, string> = {};
    parts.forEach((p) => (o[p.type] = p.value));
    const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[o.weekday], mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  } catch {
    const d = new Date();
    return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
  }
}

const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function initOpenNow() {
  const badges = document.querySelectorAll<HTMLElement>("[data-open-now]");
  const week = document.querySelector<HTMLElement>("[data-week]");
  if (!badges.length && !week) return;
  const render = () => {
    const now = madridNow();
    const weekend = now.day === 0 || now.day === 6;
    badges.forEach((b) => {
      const [from, to] = (weekend ? b.dataset.weekend : b.dataset.weekday)!.split("-");
      const open = now.mins >= toMins(from) && now.mins < toMins(to);
      const text = open
        ? `${b.dataset.openUntil} ${to}`
        : now.mins < toMins(from)
          ? `${b.dataset.closedOpensAt} ${from}`
          : `${b.dataset.closedTomorrow}`;
      const out = b.querySelector("[data-open-text]");
      if (out) out.textContent = text;
      b.classList.toggle("is-closed", !open);
      b.hidden = false;
    });
    week?.querySelectorAll<HTMLElement>("[data-day]").forEach((row) => {
      const days = row.dataset.day!.split(",").map(Number);
      const today = days.includes(now.day);
      row.classList.toggle("is-today", today);
      if (today) row.setAttribute("aria-current", "date");
      else row.removeAttribute("aria-current");
    });
  };
  render();
  window.setInterval(render, 60_000);
}

function initForm() {
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  if (!form) return;
  const status = form.querySelector<HTMLElement>("[data-form-status]");
  const done = form.querySelector<HTMLElement>("[data-form-done]");
  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[required], textarea[required]"));

  const check = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const err = document.getElementById(`${input.id}-error`);
    let msg = "";
    if (!input.checkValidity()) {
      if (input.validity.valueMissing) msg = input.type === "checkbox" ? form.dataset.msgConsent! : form.dataset.msgRequired!;
      else if (input.validity.typeMismatch) msg = form.dataset.msgEmail!;
      else if (input.validity.tooShort) msg = form.dataset.msgShort!;
    }
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg;
    return !msg;
  };

  fields.forEach((input) => {
    input.addEventListener("blur", () => {
      if (input.type !== "checkbox" && input.value) check(input);
    });
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") check(input);
    });
    input.addEventListener("change", () => {
      if (input.type === "checkbox") check(input);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const invalid = fields.filter((f) => !check(f));
    if (invalid.length) {
      if (status) status.textContent = form.dataset.msgSummary!.replace("{n}", String(invalid.length));
      invalid[0].focus();
      return;
    }
    if (status) status.textContent = form.dataset.msgSending!;
    form.classList.add("is-sending");
    form.setAttribute("aria-busy", "true");
    window.setTimeout(() => {
      form.classList.remove("is-sending");
      form.removeAttribute("aria-busy");
      if (status) status.textContent = "";
      if (done) {
        done.hidden = false;
        requestAnimationFrame(() => {
          form.classList.add("is-done");
          done.querySelector<HTMLElement>("[data-done-title]")?.focus();
        });
      }
    }, 900);
  });

  done?.querySelector("[data-form-reset]")?.addEventListener("click", () => {
    form.reset();
    fields.forEach((f) => f.setAttribute("aria-invalid", "false"));
    form.classList.remove("is-done");
    done.hidden = true;
    form.querySelector<HTMLElement>("input")?.focus();
  });
}

function initMarqueeToggle() {
  document.querySelectorAll<HTMLButtonElement>("[data-marquee-toggle]").forEach((btn) => {
    const marquee = btn.closest<HTMLElement>("[data-marquee]");
    if (!marquee) return;
    btn.addEventListener("click", () => {
      const paused = marquee.classList.toggle("is-paused");
      btn.setAttribute("aria-pressed", String(paused));
      const label = btn.querySelector("[data-marquee-label]");
      if (label) label.textContent = (paused ? btn.dataset.playLabel : btn.dataset.pauseLabel) ?? "";
    });
  });
}

safe(initHeader, "header");
safe(initMobileMenu, "mobileMenu");
safe(initRail, "rail");
safe(initOpenNow, "openNow");
safe(initForm, "form");
safe(initMarqueeToggle, "marquee");
