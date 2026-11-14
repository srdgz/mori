"use client";

import { MONDAY_FIRST, type WeeklySchedule } from "@/core/domain/fulfilment/opening-hours";
import { useLocalMoment } from "./OpenNow";

type Props = { schedule: WeeklySchedule; timeZone: string; dayNames: readonly string[]; closedLabel: string };

export function WeekHours({ schedule, timeZone, dayNames, closedLabel }: Props) {
  const moment = useLocalMoment(timeZone);
  return (
    <ul className="week">
      {MONDAY_FIRST.map((weekday, i) => {
        const hours = schedule[weekday];
        const today = moment?.weekday === weekday;
        return (
          <li key={weekday} className={today ? "is-today" : undefined} aria-current={today ? "date" : undefined}>
            <span>{dayNames[i]}</span>
            <span>{hours ? `${hours.opens} – ${hours.closes}` : closedLabel}</span>
          </li>
        );
      })}
    </ul>
  );
}
