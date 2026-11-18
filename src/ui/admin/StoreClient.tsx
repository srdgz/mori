"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { CreateCouponResult, SaveSettingsResult } from "@/core/application/admin/store";
import type { DayHours, TimeOfDay, Weekday } from "@/core/domain/fulfilment/opening-hours";
import type { EditableSettings } from "@/core/domain/fulfilment/store-settings";

type CouponInput = {
  code: string;
  kind: "percent" | "amount";
  value: number;
  minSubtotalCents: number;
  firstOrderOnly: boolean;
  maxUses: number | null;
  perCustomerLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

const toCents = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);
const optionalInt = (value: string) => (value.trim() === "" ? null : Number(value));
const dateTime = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : null);

function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string | null }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      {error && <span className="field-err">{error}</span>}
    </label>
  );
}

export function CouponForm({ create }: { create: (input: CouponInput) => Promise<CreateCouponResult> }) {
  const t = useTranslations("admin.coupons");
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    kind: "percent" as "percent" | "amount",
    value: "10",
    min: "0",
    maxUses: "",
    perCustomer: "1",
    first: false,
    starts: "",
    ends: "",
  });
  const [fields, setFields] = useState<readonly string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const value = form.kind === "percent" ? Number(form.value) : toCents(form.value);
    startTransition(async () => {
      const result = await create({
        code: form.code,
        kind: form.kind,
        value: Number.isFinite(value) ? value : 0,
        minSubtotalCents: Math.max(0, toCents(form.min) || 0),
        firstOrderOnly: form.first,
        maxUses: optionalInt(form.maxUses),
        perCustomerLimit: optionalInt(form.perCustomer),
        startsAt: dateTime(form.starts),
        endsAt: dateTime(form.ends),
      });
      if (result.ok) {
        setFields([]);
        setMessage(t("created"));
        setForm((current) => ({ ...current, code: "" }));
        router.refresh();
        return;
      }
      setFields(result.fields);
      setMessage(result.error === "code_taken" ? t("errors.taken") : result.error === "forbidden" ? t("errors.forbidden") : "");
    });
  }

  const error = (field: string, text: string) => (fields.includes(field) ? text : null);

  return (
    <form className="account-card grid gap-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("code")} error={error("code", t("errors.code"))}>
          <input
            value={form.code}
            maxLength={20}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            aria-invalid={fields.includes("code") || undefined}
          />
        </Field>
        <Field label={t("kind")}>
          <select value={form.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="percent">{t("percent")}</option>
            <option value="amount">{t("amount")}</option>
          </select>
        </Field>
        <Field label={t("value")} hint={t("valueHint")} error={error("value", t("errors.value"))}>
          <input
            inputMode="decimal"
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            aria-invalid={fields.includes("value") || undefined}
          />
        </Field>
        <Field label={t("minSubtotal")}>
          <input inputMode="decimal" value={form.min} onChange={(e) => set("min", e.target.value)} />
        </Field>
        <Field label={t("maxUses")} hint={t("maxUsesHint")} error={error("maxUses", t("errors.value"))}>
          <input type="number" min={1} value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
        </Field>
        <Field label={t("perCustomer")} hint={t("maxUsesHint")} error={error("perCustomerLimit", t("errors.value"))}>
          <input type="number" min={1} value={form.perCustomer} onChange={(e) => set("perCustomer", e.target.value)} />
        </Field>
        <Field label={t("startsAt")}>
          <input type="date" value={form.starts} onChange={(e) => set("starts", e.target.value)} />
        </Field>
        <Field label={t("endsAt")} error={error("dates", t("errors.dates"))}>
          <input type="date" value={form.ends} onChange={(e) => set("ends", e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-[.92rem] text-forest">
        <input type="checkbox" className="size-5 accent-forest" checked={form.first} onChange={(e) => set("first", e.target.checked)} />
        <span>{t("firstOrderOnly")}</span>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" aria-busy={pending || undefined} data-pending={pending || undefined}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? t("creating") : t("create")}
        </button>
        <p role="status" className="text-sm text-ink-soft empty:hidden">
          {message}
        </p>
      </div>
    </form>
  );
}

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function SettingsForm({
  initial,
  save,
}: {
  initial: EditableSettings;
  save: (settings: EditableSettings) => Promise<SaveSettingsResult>;
}) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [money, setMoney] = useState({
    min: (initial.delivery.minimumCents / 100).toFixed(2),
    fee: (initial.delivery.feeCents / 100).toFixed(2),
    free: (initial.delivery.freeFromCents / 100).toFixed(2),
  });
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const weekdays = t.raw("weekdays") as string[];
  const delivery = (key: keyof EditableSettings["delivery"], value: number | boolean) =>
    setSettings((current) => ({ ...current, delivery: { ...current.delivery, [key]: value } }));
  const setDay = (weekday: Weekday, day: DayHours) =>
    setSettings((current) => ({ ...current, schedule: { ...current.schedule, [weekday]: day } }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const next: EditableSettings = {
      ...settings,
      delivery: {
        ...settings.delivery,
        minimumCents: toCents(money.min),
        feeCents: toCents(money.fee),
        freeFromCents: toCents(money.free),
      },
    };
    startTransition(async () => {
      const result = await save(next);
      setMessage(result.ok ? t("saved") : result.error === "forbidden" ? t("forbidden") : t("invalid"));
      if (result.ok) router.refresh();
    });
  }

  const number = (label: string, value: number, onChange: (n: number) => void) => (
    <Field label={label}>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );

  return (
    <form className="grid gap-6" onSubmit={onSubmit} noValidate>
      <fieldset className="account-card grid gap-4">
        <legend className="font-semibold text-forest">{t("orders")}</legend>
        <label className="flex items-start gap-3 text-[.92rem] text-forest">
          <input
            type="checkbox"
            className="mt-0.5 size-5 accent-forest"
            checked={settings.ordersPaused}
            onChange={(e) => setSettings({ ...settings, ordersPaused: e.target.checked })}
          />
          <span>
            {t("paused")}
            <span className="block text-sm text-ink-soft">{t("pausedHint")}</span>
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {number(t("prepMinutes"), settings.prepMinutes, (n) => setSettings({ ...settings, prepMinutes: n }))}
          {number(t("slotCapacity"), settings.slotCapacity, (n) => setSettings({ ...settings, slotCapacity: n }))}
          {number(t("daysAhead"), settings.daysAhead, (n) => setSettings({ ...settings, daysAhead: n }))}
        </div>
      </fieldset>

      <fieldset className="account-card grid gap-3">
        <legend className="font-semibold text-forest">{t("hours")}</legend>
        {WEEK.map((weekday) => {
          const day = settings.schedule[weekday];
          return (
            <div key={weekday} className="flex flex-wrap items-center gap-4">
              <span className="w-28 font-semibold text-forest">{weekdays[weekday]}</span>
              <label className="flex items-center gap-2 text-sm text-forest">
                <input
                  type="checkbox"
                  className="size-5 accent-forest"
                  checked={day === null}
                  onChange={(e) => setDay(weekday, e.target.checked ? null : { opens: "08:00", closes: "20:00" })}
                />
                {t("closed")}
              </label>
              {day && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-ink-soft">{t("opens")}</span>
                    <input
                      type="time"
                      className="time-input"
                      value={day.opens}
                      onChange={(e) => setDay(weekday, { ...day, opens: e.target.value as TimeOfDay })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-ink-soft">{t("closes")}</span>
                    <input
                      type="time"
                      className="time-input"
                      value={day.closes}
                      onChange={(e) => setDay(weekday, { ...day, closes: e.target.value as TimeOfDay })}
                    />
                  </label>
                </>
              )}
            </div>
          );
        })}
      </fieldset>

      <fieldset className="account-card grid gap-4">
        <legend className="font-semibold text-forest">{t("delivery")}</legend>
        <label className="flex items-center gap-3 text-[.92rem] text-forest">
          <input
            type="checkbox"
            className="size-5 accent-forest"
            checked={settings.delivery.enabled}
            onChange={(e) => delivery("enabled", e.target.checked)}
          />
          <span>{t("deliveryEnabled")}</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("deliveryMin")}>
            <input inputMode="decimal" value={money.min} onChange={(e) => setMoney({ ...money, min: e.target.value })} />
          </Field>
          <Field label={t("deliveryFee")}>
            <input inputMode="decimal" value={money.fee} onChange={(e) => setMoney({ ...money, fee: e.target.value })} />
          </Field>
          <Field label={t("deliveryFreeFrom")}>
            <input inputMode="decimal" value={money.free} onChange={(e) => setMoney({ ...money, free: e.target.value })} />
          </Field>
          {number(t("lastOrder"), settings.delivery.lastOrderMinutes, (n) => delivery("lastOrderMinutes", n))}
          {number(t("etaMin"), settings.delivery.etaMin, (n) => delivery("etaMin", n))}
          {number(t("etaMax"), settings.delivery.etaMax, (n) => delivery("etaMax", n))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" aria-busy={pending || undefined} data-pending={pending || undefined}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? t("saving") : t("save")}
        </button>
        <p role="status" className="text-sm text-ink-soft empty:hidden">
          {message}
        </p>
      </div>
    </form>
  );
}

export function ListEditor({
  items,
  kind,
  edit,
}: {
  items: readonly string[];
  kind: "closures" | "zones";
  edit: (change: "add" | "remove", value: string) => Promise<boolean>;
}) {
  const t = useTranslations("admin.settings");
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const format = (item: string) =>
    kind === "closures"
      ? new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "full", timeZone: "UTC" }).format(
          new Date(`${item}T12:00:00Z`),
        )
      : item;
  const run = (change: "add" | "remove", item: string) =>
    startTransition(async () => {
      if (await edit(change, item)) {
        if (change === "add") setValue("");
        router.refresh();
      }
    });

  return (
    <section className="account-card grid content-start gap-4" aria-labelledby={`${kind}-h`} aria-busy={pending || undefined}>
      <h2 id={`${kind}-h`} className="font-semibold text-forest">
        {t(kind)}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("closuresEmpty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="tag gap-2">
              {format(item)}
              <button
                type="button"
                className="admin-chip-remove"
                aria-label={kind === "closures" ? t("removeClosure", { day: format(item) }) : t("removeZone", { code: item })}
                onClick={() => run("remove", item)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (value) run("add", value);
        }}
      >
        <Field label={kind === "closures" ? t("addClosure") : t("zoneLabel")}>
          {kind === "closures" ? (
            <input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
          ) : (
            <input inputMode="numeric" maxLength={5} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />
          )}
        </Field>
        <button type="submit" className="btn btn--ghost btn--small">
          {kind === "closures" ? t("addClosure") : t("addZone")}
        </button>
      </form>
    </section>
  );
}
