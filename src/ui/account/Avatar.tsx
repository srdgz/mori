import Image from "next/image";
import { initials } from "@/core/domain/account/account";
import { cx } from "@/ui/primitives/cx";

type Props = { name: string; image: string | null; size?: number; className?: string };

export function Avatar({ name, image, size = 40, className }: Props) {
  return (
    <span className={cx("avatar", className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {image ? (
        <Image src={image} alt="" width={size} height={size} unoptimized referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
