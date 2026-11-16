"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import {
  CONTACT_FIELDS,
  validateField,
  type ContactError,
  type ContactField,
  type ContactMessageInput,
} from "@/core/domain/contact/contact-message";
import type { SubmitContactResult } from "@/core/application/contact/submit-contact-message";
import { cx } from "@/ui/primitives/cx";
import { Icon } from "@/ui/primitives/Icon";

export type ContactFormCopy = {
  formH: string;
  required: string;
  topic: string;
  topics: string[];
  name: string;
  email: string;
  message: string;
  messageHint: string;
  consent: string;
  send: string;
  demo: string;
  doneH: string;
  doneP: string;
  again: string;
  msgRequired: string;
  msgEmail: string;
  msgShort: string;
  msgConsent: string;
  msgSummary: string;
  msgSending: string;
  msgFailed: string;
};

type Props = {
  copy: ContactFormCopy;
  action: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>;
};

type Errors = Partial<Record<ContactField, ContactError>>;

export type ContactFormState = SubmitContactResult | { status: "idle" };

function read(form: HTMLFormElement): ContactMessageInput {
  const data = new FormData(form);
  return {
    topic: String(data.get("topic") ?? ""),
    name: String(data.get("name") ?? ""),
    email: String(data.get("email") ?? ""),
    message: String(data.get("message") ?? ""),
    consent: data.get("consent") === "on",
  };
}

export function ContactForm({ copy, action }: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const doneTitleRef = useRef<HTMLHeadingElement>(null);

  const [, formAction, pending] = useActionState(
    async (previous: ContactFormState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "sent") {
        setStatus("");
        setDone(true);
      } else if (result.status === "invalid") {
        setErrors(result.errors);
        setStatus(copy.msgSummary.replace("{count}", String(Object.keys(result.errors).length)));
      } else if (result.status === "failed") {
        setStatus(copy.msgFailed);
      }
      return result;
    },
    { status: "idle" },
  );

  useEffect(() => {
    if (done) doneTitleRef.current?.focus();
  }, [done]);

  const messageFor = (error: ContactError | undefined) =>
    error === "required"
      ? copy.msgRequired
      : error === "email"
        ? copy.msgEmail
        : error === "short"
          ? copy.msgShort
          : error === "consent"
            ? copy.msgConsent
            : "";

  const checkField = (field: ContactField) => {
    const form = formRef.current;
    if (!form) return;
    const error = validateField(field, read(form));
    setErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const onBlur = (field: ContactField) => (e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
    if (e.currentTarget.value) checkField(field);
  };

  const onChange = (field: ContactField) => () => {
    if (errors[field]) checkField(field);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const input = read(e.currentTarget);
    const found: Errors = {};
    for (const field of CONTACT_FIELDS) {
      const error = validateField(field, input);
      if (error) found[field] = error;
    }
    if (Object.keys(found).length > 0) {
      e.preventDefault();
      setErrors(found);
      setStatus(copy.msgSummary.replace("{count}", String(Object.keys(found).length)));
      const first = CONTACT_FIELDS.find((field) => found[field]);
      if (first) e.currentTarget.querySelector<HTMLElement>(`#${first}`)?.focus();
      return;
    }
    setErrors({});
    setStatus(copy.msgSending);
  };

  const reset = () => {
    formRef.current?.reset();
    setErrors({});
    setDone(false);
    formRef.current?.querySelector<HTMLInputElement>("#name")?.focus();
  };

  const fieldProps = (field: ContactField) => ({
    id: field,
    name: field,
    required: true,
    "aria-required": true as const,
    "aria-invalid": errors[field] ? (true as const) : (false as const),
    onBlur: onBlur(field),
    onChange: onChange(field),
  });

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="form-h"
      aria-busy={pending}
      className={cx(
        "form relative overflow-hidden rounded-[calc(var(--radius-card)+6px)] bg-cream p-[clamp(24px,4vw,52px)]",
        pending && "is-sending",
        done && "is-done",
      )}
      data-anim="fade"
    >
      <h2 id="form-h" className="h-md text-forest">
        {copy.formH}
      </h2>
      <p className="mt-2 mb-7 text-sm text-ink-soft">{copy.required}</p>

      <div className="grid gap-5.5 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="field-label mb-2.5">{copy.topic}</legend>
          <div className="flex flex-wrap gap-2">
            {copy.topics.map((topic, i) => (
              <label key={topic} className="topic cursor-pointer">
                <input type="radio" name="topic" value={topic} defaultChecked={i === 0} className="peer sr-only" />
                <span>{topic}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="name" className="field-label">
            {copy.name} <span aria-hidden="true">*</span>
          </label>
          <input {...fieldProps("name")} type="text" autoComplete="name" aria-describedby="name-error" />
          <p id="name-error" className="field-err" aria-live="polite">
            {messageFor(errors.name)}
          </p>
        </div>
        <div className="field">
          <label htmlFor="email" className="field-label">
            {copy.email} <span aria-hidden="true">*</span>
          </label>
          <input {...fieldProps("email")} type="email" autoComplete="email" inputMode="email" aria-describedby="email-error" />
          <p id="email-error" className="field-err" aria-live="polite">
            {messageFor(errors.email)}
          </p>
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="message" className="field-label">
            {copy.message} <span aria-hidden="true">*</span>
          </label>
          <textarea {...fieldProps("message")} rows={6} aria-describedby="message-hint message-error" />
          <p id="message-hint" className="text-xs text-ink-soft">
            {copy.messageHint}
          </p>
          <p id="message-error" className="field-err" aria-live="polite">
            {messageFor(errors.message)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-start gap-3 text-[.92rem] text-ink-soft">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              aria-required
              aria-invalid={!!errors.consent}
              aria-describedby="consent-error"
              onChange={() => checkField("consent")}
              className="mt-0.5 size-5 flex-none accent-forest"
            />
            <label htmlFor="consent">
              {copy.consent} <span aria-hidden="true">*</span>
            </label>
          </div>
          <p id="consent-error" className="field-err mt-1" aria-live="polite">
            {messageFor(errors.consent)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
          <small className="max-w-[34ch] text-ink-soft">{copy.demo}</small>
          <button type="submit" className="btn">
            {copy.send}
            <Icon name="arrow" />
          </button>
        </div>
        <p className="sr-only" role="status">
          {status}
        </p>
      </div>

      <div
        className="form__done on-dark absolute inset-0 grid place-content-center justify-items-center gap-4 bg-forest p-8 text-center text-cream"
        hidden={!done}
      >
        <Icon name="check" size={72} className="text-matcha" />
        <h3 ref={doneTitleRef} className="h-md outline-none" tabIndex={-1}>
          {copy.doneH}
        </h3>
        <p className="max-w-[36ch] text-sage">{copy.doneP}</p>
        <button type="button" className="btn btn--ghost mt-2" onClick={reset}>
          {copy.again}
        </button>
      </div>
    </form>
  );
}
