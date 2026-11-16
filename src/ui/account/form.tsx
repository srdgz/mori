"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/ui/primitives/cx";
import { Icon } from "@/ui/primitives/Icon";
import { IDLE, type FormAction, type FormState } from "./form-state";

type LooseTranslator = { (key: string, values?: Record<string, string | number>): string; has(key: string): boolean };

export function useAccountForm(action: FormAction) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error" || !state.fields) return;
    const first = Object.keys(state.fields)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  return { state, formAction, pending, formRef };
}

export function useErrorText() {
  const t = useTranslations("account.errors") as unknown as LooseTranslator;
  return (field: string | null, code: string | undefined): string => {
    if (!code) return "";
    if (field && t.has(`fields.${field}.${code}`)) return t(`fields.${field}.${code}`);
    return t.has(code) ? t(code) : t("generic");
  };
}

type FieldProps = {
  name: string;
  label: string;
  state: FormState;
  hint?: string;
  optional?: string;
  defaultValue?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">;

function PasswordToggle({ target, visible, onToggle }: { target: string; visible: boolean; onToggle: () => void }) {
  const t = useTranslations("account.password");
  return (
    <button type="button" className="password-toggle" aria-controls={target} aria-pressed={visible} onClick={onToggle}>
      <Icon name={visible ? "eyeOff" : "eye"} size={18} />
      <span className="sr-only">{visible ? t("hide") : t("show")}</span>
    </button>
  );
}

export function Field({ name, label, state, hint, optional, defaultValue = "", className, type, ...input }: FieldProps) {
  const errorText = useErrorText();
  const [visible, setVisible] = useState(false);
  const error = errorText(name, state.fields?.[name]);
  const hintId = hint ? `${name}-hint` : undefined;
  const isPassword = type === "password";
  const control = (
    <input
      key={state.at ?? 0}
      id={name}
      name={name}
      type={isPassword && visible ? "text" : type}
      defaultValue={state.values?.[name] ?? defaultValue}
      aria-invalid={error ? true : undefined}
      aria-describedby={[hintId, `${name}-error`].filter(Boolean).join(" ")}
      {...input}
    />
  );
  return (
    <div className={cx("field", className)}>
      <label htmlFor={name} className="field-label">
        {label}
        {optional && <span className="font-normal tracking-normal normal-case"> ({optional})</span>}
      </label>
      {isPassword ? (
        <div className="password-field">
          {control}
          <PasswordToggle target={name} visible={visible} onToggle={() => setVisible((v) => !v)} />
        </div>
      ) : (
        control
      )}
      {hint && (
        <p id={hintId} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      <p id={`${name}-error`} className="field-err">
        {error}
      </p>
    </div>
  );
}

type CheckProps = { name: string; label: ReactNode; state: FormState; defaultChecked?: boolean; required?: boolean };

export function Check({ name, label, state, defaultChecked, required }: CheckProps) {
  const errorText = useErrorText();
  const error = errorText(name, state.fields?.[name]);
  return (
    <div>
      <div className="flex items-start gap-3 text-[.92rem] text-ink-soft">
        <input
          id={name}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${name}-error`}
          className="mt-0.5 size-5 flex-none accent-forest"
        />
        <label htmlFor={name}>{label}</label>
      </div>
      <p id={`${name}-error`} className="field-err mt-1">
        {error}
      </p>
    </div>
  );
}

export function FormMessage({ state, success }: { state: FormState; success?: string }) {
  const errorText = useErrorText();
  const t = useTranslations("account.errors") as unknown as LooseTranslator;
  const fieldCount = Object.keys(state.fields ?? {}).length;
  const text =
    state.status === "ok"
      ? success
      : state.status === "error"
        ? state.code
          ? errorText(null, state.code)
          : fieldCount > 0
            ? t("summary", { count: fieldCount })
            : ""
        : "";
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cx("form-note", state.status === "ok" && "is-ok", !text && "is-empty")}
    >
      {text}
    </p>
  );
}

export function Submit({ pending, children, className }: { pending: boolean; children: ReactNode; className?: string }) {
  return (
    <button type="submit" className={cx("btn", className)} aria-disabled={pending || undefined} data-pending={pending || undefined}>
      {children}
    </button>
  );
}
