"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { localMoment, openStatus, type LocalMoment, type WeeklySchedule } from "@/core/domain/fulfilment/opening-hours";

type Props = { schedule: WeeklySchedule; timeZone: string; tone?: "dark" | "light" };

export function useLocalMoment(timeZone: string): LocalMoment | null {
  const [moment, setMoment] = useState<LocalMoment | null>(null);
  useEffect(() => {
    const tick = () => setMoment(localMoment(new Date(), timeZone));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);
  return moment;
}

export function OpenNow({ schedule, timeZone, tone = "dark" }: Props) {
  const t = useTranslations("common");
  const moment = useLocalMoment(timeZone);
  if (!moment) return null;

  const status = openStatus(schedule, moment);
  const label =
    status.state === "open"
      ? t("openUntil", { time: status.closesAt })
      : status.state === "opens-later-today"
        ? t("closedOpensAt", { time: status.opensAt })
        : t("closedTomorrow");

  const classes = [
    "open-now mt-5 inline-flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium",
    tone === "light" && "is-light",
    status.state !== "open" && "is-closed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={classes}>
      <span className="dot size-2 rounded-full bg-current" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}
