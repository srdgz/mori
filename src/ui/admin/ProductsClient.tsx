"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminProductRow } from "@/core/application/ports/admin-catalog";
import { Link } from "@/i18n/navigation";
import { productPhoto } from "@/ui/brand/photos";
import { cx } from "@/ui/primitives/cx";

export function Switch({
  checked,
  label,
  onLabel,
  offLabel,
  onChange,
}: {
  checked: boolean;
  label: string;
  onLabel: string;
  offLabel: string;
  onChange: (next: boolean) => Promise<boolean>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(checked);
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      aria-busy={pending || undefined}
      className={cx("switch", value && "is-on")}
      onClick={() => {
        const next = !value;
        setValue(next);
        startTransition(async () => {
          if (!(await onChange(next))) setValue(!next);
          router.refresh();
        });
      }}
    >
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__text">{value ? onLabel : offLabel}</span>
    </button>
  );
}

export function ProductTable({
  products,
  locale,
  labels,
  setAvailability,
}: {
  products: readonly AdminProductRow[];
  locale: "es" | "en";
  labels: {
    search: string;
    available: string;
    soldOut: string;
    availabilityLabel: string;
    edit: string;
    featured: string;
    noResults: string;
  };
  setAvailability: (id: string, available: boolean) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle ? products.filter((p) => p.name.toLowerCase().includes(needle) || p.slug.includes(needle)) : products;
  const price = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", { style: "currency", currency: "EUR" });

  return (
    <div className="grid gap-4">
      <label className="field max-w-[420px]">
        <span className="field-label">{labels.search}</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {visible.length === 0 ? (
        <p className="text-ink-soft">{labels.noResults}</p>
      ) : (
        <ul className="grid gap-2">
          {visible.map((product) => (
            <li key={product.id} className="admin-row">
              <span className="media size-14 flex-none rounded-[10px]">
                <Image src={productPhoto(product.image)} alt="" sizes="56px" className="size-full object-cover" />
              </span>
              <div className="grid min-w-0 flex-1">
                <span className="truncate font-semibold text-forest">
                  {product.name}
                  {product.isFeatured && <span className="tag ml-2">{labels.featured}</span>}
                </span>
                <span className="text-sm text-ink-soft">
                  {product.categoryName[locale]} · {price.format(product.priceCents / 100)}
                </span>
              </div>
              <Switch
                checked={product.isAvailable}
                label={labels.availabilityLabel.replace("{name}", product.name)}
                onLabel={labels.available}
                offLabel={labels.soldOut}
                onChange={(next) => setAvailability(product.id, next)}
              />
              <Link href={{ pathname: "/admin/products/[id]", params: { id: product.id } }} className="btn btn--ghost btn--small">
                {labels.edit}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
