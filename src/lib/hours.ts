/** @file Pure opening status and weekday lookup in the campus timezone. */
import type { Hours } from "../types";

const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Returns the hours-contract weekday for an instant in America/New_York. */
export function campusDay(now: Date): typeof days[number] {
  return clock.formatToParts(now).find((part) => part.type === "weekday")!.value.toLowerCase() as typeof days[number];
}

function minutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

// A close time of "00:00" means midnight at the end of the day (the data tool asks for "24:00", but be lenient).
const endMinutes = (time: string): number => (time === "00:00" ? 1440 : minutes(time));

/** Computes campus-local opening status without guessing when today's hours are missing. */
export function openStatus(hours: Hours | undefined, now: Date): { state: "open" | "closed" | "unknown"; label: string } {
  const day = campusDay(now);
  const ranges = hours?.[day];
  if (!ranges) return { state: "unknown", label: "Unknown" };
  const parts = clock.formatToParts(now);
  const current = Number(parts.find((part) => part.type === "hour")!.value) * 60
    + Number(parts.find((part) => part.type === "minute")!.value);
  const sorted = [...ranges].sort((a, b) => minutes(a[0]) - minutes(b[0]));
  const active = sorted.find(([start, end]) => minutes(start) <= current && current < endMinutes(end));
  if (active) return { state: "open", label: `OPEN NOW, closes ${endMinutes(active[1]) === 1440 ? "at midnight" : active[1]}` };
  const next = sorted.find(([start]) => minutes(start) > current);
  if (next) return { state: "closed", label: `CLOSED, opens at ${next[0]}` };
  const index = days.indexOf(day);
  for (let offset = 1; offset <= 7; offset++) {
    const nextIndex = (index + offset) % 7;
    const nextRanges = hours?.[days[nextIndex]];
    // An unspecified day could open sooner, so do not promise a later opening.
    if (!nextRanges) break;
    const first = [...nextRanges].sort((a, b) => minutes(a[0]) - minutes(b[0]))[0];
    if (first) return {
      state: "closed",
      label: offset === 1 ? `CLOSED, opens at ${first[0]} tomorrow`
        : offset === 7 ? `CLOSED, opens at ${first[0]} next ${dayNames[nextIndex]}`
        : `CLOSED, opens at ${first[0]} on ${dayNames[nextIndex]}`,
    };
  }
  return { state: "closed", label: "CLOSED" };
}
