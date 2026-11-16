export const WAVE_WIDTH = 2880;
export const WAVE_HEIGHT = 120;
export const WAVE_PERIOD = WAVE_WIDTH / 2;

export const backWave = "M0 70C240 20 480 20 720 70S1200 120 1440 70S1920 20 2160 70S2640 120 2880 70V120H0Z";

export const frontWave = "M0 80C240 115 480 115 720 80S1200 45 1440 80S1920 115 2160 80S2640 45 2880 80V120H0Z";

type Point = readonly [number, number];
type Segment = readonly [Point, Point, Point, Point];

export function waveSegments(path: string): Segment[] {
  const tokens = path.match(/[MCSVHZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const segments: Segment[] = [];
  let index = 0;
  let current: Point = [0, 0];
  let lastControl: Point | null = null;
  const next = () => Number(tokens[index++]);
  while (index < tokens.length) {
    const command = tokens[index++];
    if (command === "M") {
      current = [next(), next()];
    } else if (command === "C" || command === "S") {
      const c1: Point =
        command === "C" ? [next(), next()] : lastControl ? [2 * current[0] - lastControl[0], 2 * current[1] - lastControl[1]] : current;
      const c2: Point = [next(), next()];
      const end: Point = [next(), next()];
      segments.push([current, c1, c2, end]);
      lastControl = c2;
      current = end;
    } else {
      break;
    }
  }
  return segments;
}

export function pointAt([p0, p1, p2, p3]: Segment, t: number): Point {
  const u = 1 - t;
  const x = u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0];
  const y = u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1];
  return [x, y];
}
