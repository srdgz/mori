import "server-only";
import { headers } from "next/headers";

export async function clientKey(): Promise<string> {
  const all = await headers();
  return all.get("x-forwarded-for")?.split(",")[0]?.trim() || all.get("x-real-ip") || "local";
}
