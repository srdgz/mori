"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import type { TrackingSnapshot } from "@/core/application/checkout/tracking";
import type { Reorder } from "@/core/domain/ordering/reorder";
import { SUBSCRIBED_SAFETY_MS, subscribeLive } from "@/ui/live/subscribe";
import { subscribeToPush } from "@/ui/pwa/PwaClient";
import { Icon } from "@/ui/primitives/Icon";
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

type ReadyNotice = { title: string; body: string };

function notifyReady(notice: ReadyNotice) {
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(notice.title, { body: notice.body });
  } catch {}
}

export function LiveOrder({
  code,
  token,
  version,
  live,
  intervalMs = 10_000,
  realtime = false,
  readyTitle,
  readyBody,
}: {
  code: string;
  token: string | null;
  version: string;
  live: boolean;
  intervalMs?: number;
  realtime?: boolean;
  readyTitle: string;
  readyBody: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!live) return;
    const url = `/api/orders/${encodeURIComponent(code)}${token ? `?t=${encodeURIComponent(token)}` : ""}`;
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
            const snapshot = (await response.json()) as TrackingSnapshot;
            if (snapshot.version !== version) {
              if (snapshot.status === "ready") notifyReady({ title: readyTitle, body: readyBody });
              router.refresh();
              return;
            }
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
        "/api/live/order",
        { code, token },
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
  }, [code, token, version, live, intervalMs, realtime, readyTitle, readyBody, router]);

  return null;
}

const noSubscription = () => () => undefined;

const PUSH_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function pushSupported(): boolean {
  return Boolean(PUSH_KEY) && "serviceWorker" in navigator && "PushManager" in window;
}

export function NotifyButton({
  label,
  enabledLabel,
  failedLabel,
  code,
  token,
}: {
  label: string;
  enabledLabel: string;
  failedLabel: string;
  code: string;
  token: string | null;
}) {
  const current = useSyncExternalStore(
    noSubscription,
    () => ("Notification" in window ? Notification.permission : "unsupported"),
    () => "unsupported",
  );
  const [asked, setAsked] = useState<NotificationPermission | "failed" | null>(null);
  const state = asked ?? current;

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted" || !pushSupported()) {
      setAsked(permission);
      return;
    }
    const ok = await subscribeToPush(PUSH_KEY, code, token).catch(() => false);
    setAsked(ok ? "granted" : "failed");
  }

  if (state === "failed") return <p className="text-sm text-ink-soft">{failedLabel}</p>;

  if (state === "unsupported" || state === "denied") return null;
  if (state === "granted") {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Icon name="check" size={16} />
        {enabledLabel}
      </p>
    );
  }
  return (
    <button type="button" className="link-u w-fit text-sm text-forest" onClick={() => void enable()}>
      {label}
    </button>
  );
}

export function ReorderButton({
  action,
  code,
  token,
  labels,
  className = "btn",
}: {
  action: (code: string, token: string | null) => Promise<Reorder | null>;
  code: string;
  token: string | null;
  labels: { idle: string; pending: string; added: string; skipped: string; none: string };
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function reorder() {
    setMessage("");
    startTransition(async () => {
      const result = await action(code, token);
      if (!result || result.lines.length === 0) {
        setMessage(labels.none);
        return;
      }
      cart.hydrate();
      for (const line of result.lines) {
        try {
          cart.add(line, labels.added);
        } catch {}
      }
      if (result.skipped.length > 0) setMessage(labels.skipped.replace("{names}", result.skipped.join(", ")));
    });
  }

  return (
    <div className="grid content-start gap-2">
      <button type="button" className={className} onClick={reorder} aria-busy={pending || undefined} data-pending={pending || undefined}>
        {pending && <span className="spinner" aria-hidden="true" />}
        {pending ? labels.pending : labels.idle}
      </button>
      <p role="status" className="text-sm text-ink-soft empty:hidden">
        {message}
      </p>
    </div>
  );
}
