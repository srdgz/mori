import type { SealedLiveQuery } from "@neon/realtime/client";

export const SUBSCRIBED_SAFETY_MS = 60_000;

type SealResponse = { url: string; sealed: SealedLiveQuery<unknown> };

export type LiveHandlers = { onChange: () => void; onLive: (live: boolean) => void };

async function fetchSeal(endpoint: string, body: unknown): Promise<SealResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`live_${response.status}`);
  return (await response.json()) as SealResponse;
}

export async function subscribeLive(endpoint: string, body: unknown, handlers: LiveHandlers): Promise<() => void> {
  try {
    const [{ createRealtimeClient, QueryRefreshController }, first] = await Promise.all([
      import("@neon/realtime/client"),
      fetchSeal(endpoint, body),
    ]);
    const client = createRealtimeClient({ url: first.url });
    const subscription = client.subscribe(first.sealed, { materialize: false });
    const refresher = new QueryRefreshController({
      query: first.sealed,
      subscription,
      refreshQuery: async () => (await fetchSeal(endpoint, body)).sealed,
      renewSubscription: (next) => subscription.renew(next),
      onRefreshExhausted: () => handlers.onLive(false),
    });
    subscription.onUpdate(() => handlers.onChange());
    subscription.onStateChange((state) => handlers.onLive(state.status === "live"));
    refresher.start();
    return () => {
      refresher.stop();
      subscription.unsubscribe();
      client.close();
    };
  } catch {
    handlers.onLive(false);
    return () => undefined;
  }
}
