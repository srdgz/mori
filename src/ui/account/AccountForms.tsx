"use client";

import { useLocale, useTranslations } from "next-intl";
import { Field, FormMessage, Submit, useAccountForm } from "./form";
import type { FormAction } from "./form-state";
import { Icon } from "@/ui/primitives/Icon";

type ProfileProps = {
  action: FormAction;
  profile: { name: string; email: string; phone: string | null; locale: "es" | "en"; marketingOptIn: boolean };
};

export function ProfileForm({ action, profile }: ProfileProps) {
  const t = useTranslations("account.profile");
  const { state, formAction, pending, formRef } = useAccountForm(action);
  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5 sm:grid-cols-2" aria-busy={pending}>
      <Field name="name" label={t("name")} state={state} defaultValue={profile.name} autoComplete="name" required />
      <Field
        name="phone"
        label={t("phone")}
        state={state}
        defaultValue={profile.phone ?? ""}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        hint={t("phoneHint")}
      />
      <div className="field sm:col-span-2">
        <label htmlFor="email" className="field-label">
          {t("email")}
        </label>
        <input id="email" value={profile.email} readOnly aria-describedby="email-hint" className="is-readonly" />
        <p id="email-hint" className="text-xs text-ink-soft">
          {t("emailHint")}
        </p>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="field-label mb-2.5">{t("locale")}</legend>
        <div className="opt-grid">
          {(["es", "en"] as const).map((l) => (
            <label key={l} className="opt">
              <input type="radio" name="emailLocale" value={l} defaultChecked={profile.locale === l} />
              <span>{l === "es" ? t("localeEs") : t("localeEn")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-start gap-3 text-[.92rem] text-ink-soft sm:col-span-2">
        <input
          id="marketing"
          name="marketing"
          type="checkbox"
          defaultChecked={profile.marketingOptIn}
          className="mt-0.5 size-5 flex-none accent-forest"
        />
        <label htmlFor="marketing">{t("marketing")}</label>
      </div>
      <div className="grid gap-4 sm:col-span-2">
        <FormMessage state={state} success={t("saved")} />
        <Submit pending={pending} className="btn--matcha-forest w-fit">
          {t("save")}
        </Submit>
      </div>
    </form>
  );
}

export function PasswordForm({ action }: { action: FormAction }) {
  const t = useTranslations("account.security");
  const { state, formAction, pending, formRef } = useAccountForm(action);
  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5" aria-busy={pending}>
      <Field name="current" label={t("current")} state={state} type="password" autoComplete="current-password" required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="password" label={t("password")} state={state} type="password" autoComplete="new-password" minLength={8} required />
        <Field name="confirmation" label={t("confirmation")} state={state} type="password" autoComplete="new-password" required />
      </div>
      <FormMessage state={state} success={t("changed")} />
      <Submit pending={pending} className="w-fit">
        {t("save")}
      </Submit>
    </form>
  );
}

export function DeleteAccountForm({ action, word, needsPassword }: { action: FormAction; word: string; needsPassword: boolean }) {
  const t = useTranslations("account.security");
  const locale = useLocale();
  const { state, formAction, pending, formRef } = useAccountForm(action);
  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5" aria-busy={pending}>
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="word" label={t("deleteConfirm", { word })} state={state} autoComplete="off" required />
        {needsPassword && (
          <Field name="password" label={t("deletePassword")} state={state} type="password" autoComplete="current-password" required />
        )}
      </div>
      <FormMessage state={state} />
      <Submit pending={pending} className="btn--danger w-fit">
        {t("deleteSubmit")}
      </Submit>
    </form>
  );
}

export function SignOutButton({
  action,
  label,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  className?: string;
}) {
  const locale = useLocale();
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={className}>
        <Icon name="logout" size={18} />
        {label}
      </button>
    </form>
  );
}
