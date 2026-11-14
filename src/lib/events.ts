/** @file Pure event windows and short labels in the America/New_York campus timezone. */
import type { EventInfo } from "../types";

const zone = "America/New_York";
const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const calendar = new Intl.DateTimeFormat("en-US", {
  timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
const weekday = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" });
const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true });

function localParts(date: Date): number[] {
  const parts = calendar.formatToParts(date);
  return ["year", "month", "day", "hour", "minute", "second"].map((key) => Number(parts.find((p) => p.type === key)!.value));
}

// Find matching instants on both sides of a DST change. Skip nonexistent spring times;
// use the first occurrence of an ambiguous autumn time.
function campusInstant(date: Date, clock: string): Date | null {
  const [hour, minute] = clock.split(":").map(Number);
  const wall = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute);
  const matches = [-1, 0, 1].map((day) => {
    const probe = wall + day * 86400000;
    const [y, m, d, h, min, sec] = localParts(new Date(probe));
    const offset = Date.UTC(y, m - 1, d, h, min, sec) - probe;
    return new Date(wall - offset);
  }).filter((instant) => {
    const [y, m, d, h, min] = localParts(instant);
    return Date.UTC(y, m - 1, d, h, min) === wall;
  });
  return matches.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}

/** Return the current or next weekly campus occurrence, or an unexpired one-off window. */
export function nextWindow(event: EventInfo | undefined, now: Date): { start: Date; end: Date } | null {
  if (!event || !Number.isFinite(now.getTime())) return null;
  if (!event.weekly) {
    const start = new Date(event.starts_at ?? "");
    const end = new Date(event.ends_at ?? "");
    return start < end && end > now ? { start, end } : null;
  }
  const { day, start: from, end: to } = event.weekly;
  if (!days.includes(day) || ![from, to].every((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v)) || from >= to) return null;
  const [y, m, d] = localParts(now);
  const today = new Date(Date.UTC(y, m - 1, d));
  const delta = (days.indexOf(day) - today.getUTCDay() + 7) % 7;
  for (let offset = delta; offset <= delta + 14; offset += 7) {
    const date = new Date(today.getTime() + offset * 86400000);
    const start = campusInstant(date, from);
    const end = campusInstant(date, to);
    if (start && end && start < end && end > now) return { start, end };
  }
  return null;
}

/** Format an event window as short English text in campus time. */
export function formatWindow(window: { start: Date; end: Date }): string {
  const startDay = weekday.format(window.start);
  const endDay = weekday.format(window.end);
  return `${startDay} ${time.format(window.start).toLowerCase()} to ${endDay !== startDay ? `${endDay} ` : ""}${time.format(window.end).toLowerCase()}`;
}
