/** @file Which alarm banners this device should show right now: live alarms and recent all-clears the user has not dismissed. */
import { useCallback, useState } from "react";
import { useAlerts, type CampusAlert } from "../lib/alerts";
import { readLocal, writeLocal } from "../lib/localStore";

const DISMISSED_KEY = "cims.alerts.dismissed.v1";
const ALL_CLEAR_MS = 15 * 60_000;

/** One banner: a live alarm or the all-clear that followed it. */
export interface Banner { key: string; alert: CampusAlert; clear: boolean }

/** Banners to show (live first) and a `dismiss` that hides one on this device only. */
export function useAlertBanners(): { banners: Banner[]; dismiss: (key: string) => void } {
  const { alerts } = useAlerts();
  const [dismissed, setDismissed] = useState(() => new Set(readLocal<string[]>(DISMISSED_KEY, [])));
  const dismiss = useCallback((key: string) => {
    setDismissed((current) => {
      const next = new Set(current).add(key);
      writeLocal(DISMISSED_KEY, [...next].slice(-100));
      return next;
    });
  }, []);
  const now = Date.now();
  const banners: Banner[] = [
    ...alerts.filter((a) => a.status === "active").map((alert) => ({ key: alert.id, alert, clear: false })),
    ...alerts.filter((a) => a.status === "ended" && a.endedAt && now - Date.parse(a.endedAt) < ALL_CLEAR_MS)
      .map((alert) => ({ key: `clear:${alert.id}`, alert, clear: true })),
  ].filter((b) => !dismissed.has(b.key));
  return { banners, dismiss };
}
