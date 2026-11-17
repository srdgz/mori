"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { passwordStrength } from "@/core/domain/account/account";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/ui/primitives/Icon";
import { Check, Field, FormMessage, PendingButton, Submit, useAccountForm } from "./form";
import type { FormAction } from "./form-state";

function Done({ title, children }: { title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="auth-done" role="status">
      <span className="grid size-12 place-items-center rounded-full bg-matcha text-forest" aria-hidden="true">
        <Icon name="check" />
      </span>
      <h2 ref={ref} tabIndex={-1} className="h-md mt-5 text-forest outline-none">
        {title}
      </h2>
      {children}
    </div>
  );
}

type SignInProps = {
  action: FormAction;
  googleAction: ((formData: FormData) => Promise<void>) | null;
  next: string | null;
  notice: string | null;
};

export function SignInForm({ action, googleAction, next, notice }: SignInProps) {
  const t = useTranslations("account.signIn");
  const p = useTranslations("account.pending");
  const locale = useLocale();
  const { state, formAction, pending, formRef } = useAccountForm(action);
  return (
    <div className="grid gap-6">
      {notice && (
        <p role="status" className="form-note is-ok">
          {notice}
        </p>
      )}
      {googleAction && (
        <>
          <form action={googleAction}>
            <input type="hidden" name="locale" value={locale} />
            {next && <input type="hidden" name="next" value={next} />}
            <PendingButton className="btn--ghost w-full" pendingLabel={p("google")}>
              <Icon name="google" size={18} />
              {t("google")}
            </PendingButton>
          </form>
          <p className="auth-or">{t("or")}</p>
        </>
      )}
      <form ref={formRef} action={formAction} noValidate className="grid gap-5" aria-busy={pending}>
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}
        <Field name="email" label={t("email")} state={state} type="email" autoComplete="email" inputMode="email" required />
        <div className="grid gap-2">
          <Field name="password" label={t("password")} state={state} type="password" autoComplete="current-password" required />
          <Link href="/account/forgot-password" className="link-u w-fit text-sm text-forest">
            {t("forgot")}
          </Link>
        </div>
        <FormMessage state={state} />
        <Submit pending={pending} pendingLabel={p("signIn")} className="w-full">
          {t("submit")}
        </Submit>
      </form>
      <p className="text-center text-sm text-ink-soft">
        {t("noAccount")}{" "}
        <Link href="/account/sign-up" className="link-u text-forest">
          {t("create")}
        </Link>
      </p>
    </div>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const t = useTranslations("account.signUp");
  const levels = t.raw("levels") as string[];
  const score = passwordStrength(password);
  return (
    <div className="grid gap-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <i key={step} className={`strength ${password && score >= step ? "is-on" : ""}`} />
        ))}
      </div>
      {password && <p className="text-xs text-ink-soft">{t("strength", { level: levels[score] ?? "" })}</p>}
    </div>
  );
}

export function SignUpForm({ action }: { action: FormAction }) {
  const t = useTranslations("account.signUp");
  const p = useTranslations("account.pending");
  const locale = useLocale();
  const { state, formAction, pending, formRef } = useAccountForm(action);
  const [password, setPassword] = useState("");

  if (state.status === "ok") {
    return (
      <Done title={t("doneTitle")}>
        <p className="mt-3 text-ink-soft">{t("doneText")}</p>
        <Link href="/account/sign-in" className="btn mt-6">
          {t("doneCta")}
        </Link>
      </Done>
    );
  }

  return (
    <div className="grid gap-6">
      <form ref={formRef} action={formAction} noValidate className="grid gap-5" aria-busy={pending}>
        <input type="hidden" name="locale" value={locale} />
        <Field name="name" label={t("name")} state={state} autoComplete="name" required />
        <Field name="email" label={t("email")} state={state} type="email" autoComplete="email" inputMode="email" required />
        <div className="grid gap-2">
          <Field
            name="password"
            label={t("password")}
            state={state}
            type="password"
            autoComplete="new-password"
            hint={t("passwordHint")}
            minLength={8}
            required
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <StrengthMeter password={password} />
        </div>
        <div className="grid gap-1">
          <Check name="privacy" label={t("privacy")} state={state} required />
          <Check name="marketing" label={t("marketing")} state={state} />
        </div>
        <FormMessage state={state} />
        {state.code === "already_exists" && (
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/account/sign-in" className="link-u text-forest">
              {t("signIn")}
            </Link>
            <Link href="/account/forgot-password" className="link-u text-forest">
              {t("forgot")}
            </Link>
          </p>
        )}
        <Submit pending={pending} pendingLabel={p("signUp")} className="w-full">
          {t("submit")}
        </Submit>
      </form>
      <p className="text-center text-sm text-ink-soft">
        {t("hasAccount")}{" "}
        <Link href="/account/sign-in" className="link-u text-forest">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm({ action }: { action: FormAction }) {
  const t = useTranslations("account.forgot");
  const locale = useLocale();
  const { state, formAction, pending, formRef } = useAccountForm(action);

  if (state.status === "ok") {
    return (
      <Done title={t("doneTitle")}>
        <p className="mt-3 text-ink-soft">{t("doneText")}</p>
        <Link href="/account/sign-in" className="link-u mt-6 text-forest">
          {t("back")}
        </Link>
      </Done>
    );
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5" aria-busy={pending}>
      <input type="hidden" name="locale" value={locale} />
      <Field name="email" label={t("email")} state={state} type="email" autoComplete="email" inputMode="email" required />
      <FormMessage state={state} />
      <Submit pending={pending} className="w-full">
        {t("submit")}
      </Submit>
      <Link href="/account/sign-in" className="link-u w-fit text-sm text-forest">
        {t("back")}
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ action, token }: { action: FormAction; token: string }) {
  const t = useTranslations("account.reset");
  const { state, formAction, pending, formRef } = useAccountForm(action);

  if (state.status === "ok") {
    return (
      <Done title={t("doneTitle")}>
        <p className="mt-3 text-ink-soft">{t("doneText")}</p>
        <Link href="/account/sign-in" className="btn mt-6">
          {t("signIn")}
        </Link>
      </Done>
    );
  }

  if (state.status === "error" && state.code === "invalid_token") return <InvalidResetLink />;

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5" aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      <Field name="password" label={t("password")} state={state} type="password" autoComplete="new-password" minLength={8} required />
      <Field name="confirmation" label={t("confirmation")} state={state} type="password" autoComplete="new-password" required />
      <FormMessage state={state} />
      <Submit pending={pending} className="w-full">
        {t("submit")}
      </Submit>
    </form>
  );
}

export function InvalidResetLink() {
  const t = useTranslations("account.reset");
  return (
    <div role="alert" className="grid gap-3">
      <h2 className="h-md text-forest">{t("invalidTitle")}</h2>
      <p className="text-ink-soft">{t("invalidText")}</p>
      <Link href="/account/forgot-password" className="btn mt-3 w-fit">
        {t("requestNew")}
      </Link>
    </div>
  );
}
