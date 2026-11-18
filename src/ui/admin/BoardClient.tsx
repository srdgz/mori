"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { SUBSCRIBED_SAFETY_MS, subscribeLive } from "@/ui/live/subscribe";

const SOUND_KEY = "mori-board-sound";
const SEEN_KEY = "mori-board-seen";
const soundListeners = new Set<() => void>();

function readSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeSound(on: boolean) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {}
  soundListeners.forEach((listener) => listener());
}

function subscribeSound(listener: () => void) {
  soundListeners.add(listener);
  return () => soundListeners.delete(listener);
}

function chime() {
  try {
    const context = new AudioContext();
    const now = context.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, now + index * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.18);
      oscillator.stop(now + index * 0.18 + 0.45);
    });
  } catch {}
}

function readSeen(day: string): Set<string> | null {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? "null") as { day: string; codes: string[] } | null;
    return stored && stored.day === day ? new Set(stored.codes) : null;
  } catch {
    return null;
  }
}

function writeSeen(day: string, codes: readonly string[]) {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify({ day, codes }));
  } catch {}
}

export function SoundToggle({ label, on, off }: { label: string; on: string; off: string }) {
  const enabled = useSyncExternalStore(subscribeSound, readSound, () => true);
  return (
    <button type="button" className="tag admin-sound" aria-pressed={enabled} onClick={() => writeSound(!enabled)}>
      {label}: {enabled ? on : off}
    </button>
  );
}

export function BoardWatcher({
  day,
  version,
  codes,
  live,
  intervalMs = 5000,
  realtime = false,
  announce,
}: {
  day: string;
  version: string;
  codes: readonly string[];
  live: boolean;
  intervalMs?: number;
  realtime?: boolean;
  announce: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const announced = useRef(false);

  useEffect(() => {
    const seen = readSeen(day);
    const fresh = seen ? codes.filter((code) => !seen.has(code)) : [];
    writeSeen(day, codes);
    if (fresh.length > 0 && !announced.current) {
      announced.current = true;
      if (readSound()) chime();
      setMessage(fresh.map((code) => announce.replace("{code}", code)).join(". "));
    }
    return () => {
      announced.current = false;
    };
  }, [day, codes, announce]);

  useEffect(() => {
    if (!live) return;
    const url = `/api/admin/board?day=${day}`;
    const etag = `W/"${version}"`;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let subscribed = false;
    let closeRealtime: (() => void) | undefined;

    async function check() {
      clearTimeout(timer);
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch(url, { headers: { "If-None-Match": etag }, cache: "no-store" });
          if (response.status === 200) {
            router.refresh();
            return;
          }
        } catch {}
      }
      if (!stopped) timer = setTimeout(check, subscribed ? SUBSCRIBED_SAFETY_MS : intervalMs);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    timer = setTimeout(check, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    if (realtime) {
      void subscribeLive(
        "/api/live/board",
        { day },
        {
          onChange: () => void check(),
          onLive: (isLive) => {
            const wasSubscribed = subscribed;
            subscribed = isLive;
            if (wasSubscribed && !isLive) void check();
          },
        },
      ).then((close) => {
        if (stopped) close();
        else closeRealtime = close;
      });
    }
    return () => {
      stopped = true;
      closeRealtime?.();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [day, version, live, intervalMs, realtime, router]);

  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}

type ActionResult = "done" | "forbidden" | "not_found" | "invalid_transition" | "invalid_input";

export function AdvanceButton({
  action,
  code,
  next,
  label,
  failed,
  className = "btn btn--small w-full",
}: {
  action: (code: string, next: string) => Promise<ActionResult>;
  code: string;
  next: string;
  label: string;
  failed: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="grid gap-1">
      <button
        type="button"
        className={className}
        aria-busy={pending || undefined}
        data-pending={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await action(code, next);
            if (result !== "done") setError(failed);
            router.refresh();
          })
        }
      >
        {pending && <span className="spinner" aria-hidden="true" />}
        {label}
      </button>
      <p role="alert" className="text-xs text-[#8f2f1c] empty:hidden">
        {error}
      </p>
    </div>
  );
}

export function ConfirmActionButton({
  action,
  code,
  label,
  confirm,
  errors,
  done,
  className = "btn btn--ghost btn--small",
}: {
  action: (code: string) => Promise<ActionResult>;
  code: string;
  label: string;
  confirm: string;
  errors: Record<"forbidden" | "not_found" | "invalid_transition" | "invalid_input", string>;
  done: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="grid gap-1">
      <button
        type="button"
        className={className}
        aria-busy={pending || undefined}
        data-pending={pending || undefined}
        onClick={() => {
          if (!window.confirm(confirm)) return;
          startTransition(async () => {
            const result = await action(code);
            setMessage(result === "done" ? done : errors[result]);
            router.refresh();
          });
        }}
      >
        {pending && <span className="spinner" aria-hidden="true" />}
        {label}
      </button>
      <p role="status" className="text-sm text-ink-soft empty:hidden">
        {message}
      </p>
    </div>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>
      {label}
    </button>
  );
}
