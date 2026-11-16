import { backWave, frontWave, WAVE_HEIGHT, WAVE_WIDTH } from "./wave-paths";

type Props = { from: string; to: string; accent?: string };

const viewBox = `0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`;

export function Wave({ from, to, accent = "var(--color-sage)" }: Props) {
  return (
    <div className="relative -mb-px block h-[clamp(56px,8vw,120px)] overflow-hidden" style={{ background: from }} aria-hidden="true">
      <svg
        className="absolute bottom-0 left-0 h-full w-[200%] [animation:wave_26s_linear_infinite_reverse] opacity-60"
        style={{ color: accent }}
        viewBox={viewBox}
        preserveAspectRatio="none"
      >
        <path fill="currentColor" d={backWave} />
      </svg>
      <svg
        className="absolute bottom-0 left-0 h-full w-[200%] [animation:wave_17s_linear_infinite]"
        style={{ color: to }}
        viewBox={viewBox}
        preserveAspectRatio="none"
      >
        <path fill="currentColor" d={frontWave} />
      </svg>
    </div>
  );
}
