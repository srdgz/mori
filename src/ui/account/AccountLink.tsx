"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "@/ui/primitives/Icon";
import { Avatar } from "./Avatar";

type Me = { name: string; image: string | null } | null;

export function AccountLink({ label }: { label: string }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Me>) : null))
      .then((data) => active && setMe(data))
      .catch(() => active && setMe(null));
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <Link href="/account" className="account-link relative z-10 grid size-11 place-items-center rounded-full">
      {me ? <Avatar name={me.name} image={me.image} size={36} /> : <Icon name="user" size={20} />}
      <span className="sr-only">{me ? `${label}: ${me.name}` : label}</span>
    </Link>
  );
}
