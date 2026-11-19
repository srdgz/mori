"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Address } from "@/core/domain/account/address";
import { Icon } from "@/ui/primitives/Icon";
import { Field, FormMessage, Submit, useAccountForm } from "./form";
import { IDLE, type FormAction } from "./form-state";

type Props = { addresses: Address[]; zone: string[]; save: FormAction; remove: FormAction };

function AddressForm({ address, save, onDone }: { address: Address | null; save: FormAction; onDone: () => void }) {
  const t = useTranslations("account.addresses");
  const router = useRouter();
  const { state, formAction, pending, formRef } = useAccountForm(save);

  useEffect(() => {
    if (state.status === "ok") {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>('[name="label"]')?.focus();
  }, [formRef]);

  return (
    <form ref={formRef} action={formAction} noValidate className="address-form grid gap-5 sm:grid-cols-2" aria-busy={pending}>
      <input type="hidden" name="id" value={address?.id ?? ""} />
      <Field name="label" label={t("label")} state={state} defaultValue={address?.label} placeholder={t("labelHint")} required />
      <Field name="line1" label={t("line1")} state={state} defaultValue={address?.line1} autoComplete="address-line1" required />
      <Field
        name="line2"
        label={t("line2")}
        optional={t("optional")}
        state={state}
        defaultValue={address?.line2 ?? ""}
        autoComplete="address-line2"
      />
      <Field
        name="postalCode"
        label={t("postalCode")}
        state={state}
        defaultValue={address?.postalCode}
        autoComplete="postal-code"
        inputMode="numeric"
        maxLength={5}
        required
      />
      <Field name="city" label={t("city")} state={state} defaultValue={address?.city ?? "Madrid"} autoComplete="address-level2" required />
      <Field
        name="instructions"
        label={t("instructions")}
        optional={t("optional")}
        state={state}
        defaultValue={address?.instructions ?? ""}
      />
      <div className="flex items-start gap-3 text-[.92rem] text-ink-soft sm:col-span-2">
        <input
          id="isDefault"
          name="isDefault"
          type="checkbox"
          defaultChecked={address?.isDefault}
          className="mt-0.5 size-5 flex-none accent-forest"
        />
        <label htmlFor="isDefault">{t("isDefault")}</label>
      </div>
      <div className="grid gap-4 sm:col-span-2">
        <FormMessage state={state} />
        <div className="flex flex-wrap gap-3">
          <Submit pending={pending} className="btn--matcha-forest">
            {t("save")}
          </Submit>
          <button type="button" className="btn btn--ghost" onClick={onDone}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}

function RemoveButton({ address, remove }: { address: Address; remove: FormAction }) {
  const t = useTranslations("account.addresses");
  const router = useRouter();
  const [state, formAction] = useActionState(remove, IDLE);
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={address.id} />
      <button type="submit" className="link-u text-sm text-forest" aria-label={t("removeLabel", { label: address.label })}>
        {t("remove")}
      </button>
    </form>
  );
}

export function AddressBook({ addresses, zone, save, remove }: Props) {
  const t = useTranslations("account.addresses");
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setEditing(null);
    requestAnimationFrame(() => addRef.current?.focus());
  };

  return (
    <div className="grid gap-6">
      <p className="text-sm text-ink-soft">{t("zone", { codes: zone.join(", ") })}</p>
      {addresses.length === 0 && editing === null && <p className="text-ink-soft">{t("empty")}</p>}
      <ul className="grid gap-4">
        {addresses.map((address) =>
          editing !== "new" && editing?.id === address.id ? (
            <li key={address.id} className="account-card">
              <h3 className="mb-5 font-semibold text-forest">{t("editing", { label: address.label })}</h3>
              <AddressForm address={address} save={save} onDone={close} />
            </li>
          ) : (
            <li key={address.id} className="account-card flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold text-forest">
                  {address.label}
                  {address.isDefault && <span className="tag">{t("default")}</span>}
                  {!zone.includes(address.postalCode) && <span className="tag">{t("outOfZone")}</span>}
                </p>
                <p className="mt-2 text-ink-soft">
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                  <br />
                  {address.postalCode} {address.city}
                </p>
                {address.instructions && <p className="mt-1 text-sm text-ink-soft">{address.instructions}</p>}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  className="link-u text-sm text-forest"
                  onClick={() => setEditing(address)}
                  aria-label={t("editLabel", { label: address.label })}
                >
                  {t("edit")}
                </button>
                <RemoveButton address={address} remove={remove} />
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <div className="account-card">
          <h3 className="mb-5 font-semibold text-forest">{t("add")}</h3>
          <AddressForm address={null} save={save} onDone={close} />
        </div>
      ) : (
        <button ref={addRef} type="button" className="btn btn--ghost w-fit" onClick={() => setEditing("new")}>
          <Icon name="plus" size={18} />
          {t("add")}
        </button>
      )}
    </div>
  );
}
