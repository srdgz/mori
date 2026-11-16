"use client";

import { useEffect, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/ui/primitives/Icon";
import { cx } from "@/ui/primitives/cx";

type State = { signedIn: boolean; favourite: boolean };

type Props = {
  slug: string;
  status: (slug: string) => Promise<State>;
  toggle: (slug: string) => Promise<State>;
  labels: { add: string; remove: string; added: string; removed: string; signIn: string };
  next: string;
};

export function FavouriteButton({ slug, status, toggle, labels, next }: Props) {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    status(slug)
      .then((s) => active && setState(s))
      .catch(() => active && setState({ signedIn: false, favourite: false }));
    return () => {
      active = false;
    };
  }, [slug, status]);

  if (state && !state.signedIn) {
    return (
      <Link href={{ pathname: "/account/sign-in", query: { next } }} className="fav-btn">
        <Icon name="heart" size={18} />
        {labels.signIn}
      </Link>
    );
  }

  const onClick = () =>
    startTransition(async () => {
      const result = await toggle(slug);
      setState(result);
      setMessage(result.signedIn ? (result.favourite ? labels.added : labels.removed) : "");
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={cx("fav-btn", state?.favourite && "is-on")}
        aria-pressed={state?.favourite ?? false}
        disabled={!state || pending}
        onClick={onClick}
      >
        <Icon name="heart" size={18} />
        {state?.favourite ? labels.remove : labels.add}
      </button>
      <p role="status" className="text-sm text-ink-soft">
        {message}
      </p>
    </div>
  );
}
