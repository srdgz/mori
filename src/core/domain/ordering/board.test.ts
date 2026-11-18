import { describe, expect, it } from "vitest";
import { boardColumn, groupByColumn, nextStaffStep } from "./board";

describe("board", () => {
  it("places each status in its column and leaves the rest out", () => {
    expect(boardColumn("received")).toBe("new");
    expect(boardColumn("out_for_delivery")).toBe("ready");
    expect(boardColumn("completed")).toBe("done");
    expect(boardColumn("cancelled")).toBeNull();
  });

  it("groups cards in their columns in order", () => {
    const cards = [
      { code: "A", status: "received" as const },
      { code: "B", status: "ready" as const },
      { code: "C", status: "received" as const },
      { code: "D", status: "refunded" as const },
    ];
    const columns = groupByColumn(cards);
    expect(columns.new.map((c) => c.code)).toEqual(["A", "C"]);
    expect(columns.ready.map((c) => c.code)).toEqual(["B"]);
    expect(columns.preparing).toEqual([]);
    expect(columns.done).toEqual([]);
  });

  it("suggests the next kitchen step for each kind of order", () => {
    expect(nextStaffStep("received", "pickup")).toBe("preparing");
    expect(nextStaffStep("preparing", "pickup")).toBe("ready");
    expect(nextStaffStep("preparing", "delivery")).toBe("out_for_delivery");
    expect(nextStaffStep("ready", "pickup")).toBe("completed");
    expect(nextStaffStep("out_for_delivery", "delivery")).toBe("completed");
    expect(nextStaffStep("completed", "pickup")).toBeNull();
    expect(nextStaffStep("pending_payment", "pickup")).toBeNull();
  });
});
