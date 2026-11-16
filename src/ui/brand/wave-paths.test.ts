import { describe, expect, it } from "vitest";
import { backWave, frontWave, pointAt, WAVE_HEIGHT, WAVE_PERIOD, WAVE_WIDTH, waveSegments } from "./wave-paths";

const waves = { backWave, frontWave };

function sample(path: string, steps = 200) {
  return waveSegments(path).flatMap((segment) => Array.from({ length: steps + 1 }, (_, i) => pointAt(segment, i / steps)));
}

describe.each(Object.entries(waves))("%s", (_name, path) => {
  const segments = waveSegments(path);

  it("spans the whole drawing in four curves", () => {
    expect(segments).toHaveLength(4);
    expect(segments[0]?.[0][0]).toBe(0);
    expect(segments[3]?.[3][0]).toBe(WAVE_WIDTH);
  });

  it("repeats exactly after half its width, so the -50% loop has no jump", () => {
    const [a, b, c, d] = segments;
    expect(c?.map(([x, y]) => [x - WAVE_PERIOD, y])).toEqual(a?.map(([x, y]) => [x, y]));
    expect(d?.map(([x, y]) => [x - WAVE_PERIOD, y])).toEqual(b?.map(([x, y]) => [x, y]));
  });

  it("starts and ends at the same height with the same slope", () => {
    const first = segments[0]!;
    const last = segments[3]!;
    expect(first[0][1]).toBe(last[3][1]);
    const startSlope = (first[1][1] - first[0][1]) / (first[1][0] - first[0][0]);
    const endSlope = (last[3][1] - last[2][1]) / (last[3][0] - last[2][0]);
    expect(startSlope).toBeCloseTo(endSlope);
  });

  it("never touches the top or bottom edge, so no part of the crest is flattened", () => {
    const ys = sample(path).map(([, y]) => y);
    expect(Math.max(...ys)).toBeLessThan(WAVE_HEIGHT);
    expect(Math.min(...ys)).toBeGreaterThan(0);
  });
});
