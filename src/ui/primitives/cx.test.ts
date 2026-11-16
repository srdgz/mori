import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("joins truthy classes with single spaces", () => {
    expect(cx("btn", false, "is-open", null, undefined, "")).toBe("btn is-open");
  });
});
