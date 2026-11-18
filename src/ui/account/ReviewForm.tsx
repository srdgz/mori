"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import type { ReviewableItem, SubmitReviewResult } from "@/core/application/catalog/reviews";
import { REVIEW_MAX_LENGTH } from "@/core/domain/catalog/review";
import { STAR } from "@/ui/shop/Stars";
import { cx } from "@/ui/primitives/cx";

type Action = (input: { productId: string; rating: number; body: string | null }) => Promise<SubmitReviewResult>;

export function ReviewForm({ item, action }: { item: ReviewableItem; action: Action }) {
  const t = useTranslations("account.reviews");
  const id = useId();
  const [rating, setRating] = useState(item.mine?.rating ?? 0);
  const [body, setBody] = useState(item.mine?.body ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setMessage({ ok: false, text: t("errors.rating") });
      return;
    }
    startTransition(async () => {
      const result = await action({ productId: item.productId, rating, body: body.trim() || null });
      if (result.status === "saved") setMessage({ ok: true, text: t("saved") });
      else if (result.status === "invalid") setMessage({ ok: false, text: t(result.errors.body ? "errors.body" : "errors.rating") });
      else setMessage({ ok: false, text: t("errors.forbidden") });
    });
  }

  return (
    <form className="review-form" onSubmit={submit} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="font-semibold text-forest">
        {t("question", { name: item.productName })}
      </h3>
      <fieldset className="review-stars">
        <legend className="sr-only">{t("ratingLegend", { name: item.productName })}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={cx("review-stars__star", n <= rating && "is-on")}>
            <input type="radio" name={`${id}-rating`} value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d={STAR} />
            </svg>
            <span className="sr-only">{t("stars", { count: n })}</span>
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span className="field-label">
          {t("body")} <span className="font-normal tracking-normal normal-case">({t("optional")})</span>
        </span>
        <textarea rows={3} maxLength={REVIEW_MAX_LENGTH} value={body} onChange={(e) => setBody(e.target.value)} />
        <span className="text-xs text-ink-soft">{t("left", { count: REVIEW_MAX_LENGTH - body.length })}</span>
      </label>
      {item.mine?.isHidden && <p className="text-sm text-ink-soft">{t("hidden")}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn--small" disabled={pending} aria-busy={pending}>
          {item.mine ? t("update") : t("submit")}
        </button>
        <p role="status" className={cx("review-form__status", message && !message.ok && "is-error")}>
          {message?.text}
        </p>
      </div>
    </form>
  );
}
