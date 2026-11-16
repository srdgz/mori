import Image from "next/image";
import type { ReactNode } from "react";
import { photos } from "@/ui/brand/photos";

type Props = { title: string; lede: string; children: ReactNode };

export function AuthShell({ title, lede, children }: Props) {
  return (
    <section className="pt-[calc(var(--nav-h)+clamp(24px,5vw,64px))] pb-[clamp(64px,9vw,128px)]">
      <div className="wrap grid items-stretch gap-[clamp(28px,5vw,80px)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="media relative hidden min-h-[520px] md:block" aria-hidden="true">
          <Image src={photos.takeaway} alt="" fill sizes="45vw" className="object-cover" />
        </div>
        <div className="auth-card">
          <h1 className="display text-[clamp(2.4rem,5vw,4.2rem)] text-forest">{title}</h1>
          <p className="lede mt-4 mb-8">{lede}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
