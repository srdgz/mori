import { describe, expect, it } from "vitest";
import { MemoryPreferenceRepository } from "@/infrastructure/memory/memory-account-repositories";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { makeGetTheme, makeSetTheme } from "./profile";

describe("appearance", () => {
  it("follows the system until the customer picks light or dark", async () => {
    const identity = new MemoryIdentity();
    const preferences = new MemoryPreferenceRepository();
    identity.signInAs(identity.addUser({ email: "ana@example.com" }));
    expect(await makeGetTheme(identity, preferences)()).toBe("system");
    expect(await makeSetTheme(identity, preferences)("dark")).toBe(true);
    expect(await makeGetTheme(identity, preferences)()).toBe("dark");
    expect(await makeSetTheme(identity, preferences)("neon")).toBe(false);
    expect(await makeGetTheme(identity, preferences)()).toBe("dark");
  });

  it("has no saved preference for visitors", async () => {
    const identity = new MemoryIdentity();
    const preferences = new MemoryPreferenceRepository();
    expect(await makeGetTheme(identity, preferences)()).toBeNull();
    await expect(makeSetTheme(identity, preferences)("light")).rejects.toThrow();
  });
});
