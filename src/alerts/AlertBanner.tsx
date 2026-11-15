/** @file Big top-of-page banner for live GTPD alarms (and the later all-clear), with a close button and a "Show on map" action. */
import { useEffect, useRef } from "react";
import { alertKindLabel, focusAlert } from "../lib/alerts";
import type { Banner } from "./useAlertBanners";
import "./alerts.css";

/** Props for the banner stack. */
export interface AlertBannerProps {
  banners: Banner[];
  onDismiss: (key: string) => void;
}

/** Stack of banners pinned to the top of the app; publishes its height as `--alert-h` so the shell makes room. */
export default function AlertBanner({ banners, onDismiss }: AlertBannerProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = root.current?.closest<HTMLElement>(".app");
    if (!app) return undefined;
    if (!root.current || banners.length === 0) { app.style.removeProperty("--alert-h"); return undefined; }
    const el = root.current;
    const observer = new ResizeObserver(() => app.style.setProperty("--alert-h", `${el.offsetHeight}px`));
    observer.observe(el);
    return () => { observer.disconnect(); app.style.removeProperty("--alert-h"); };
  }, [banners.length]);

  if (banners.length === 0) return null;
  return (
    <div className="alert-stack" ref={root}>
      {banners.map(({ key, alert, clear }) => (
        <section key={key} className={`alert-banner${clear ? " alert-banner--clear" : ""}${alert.test && !clear ? " alert-banner--test" : ""}`}
          role={clear ? "status" : "alert"} aria-label={clear ? "All clear" : "Police alert"}>
          <span className="alert-banner__icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {clear ? <path d="M5 12.5 10 17.5 19 7" /> : <><path d="M12 3 21.5 20h-19Z" /><path d="M12 9.5v5M12 16.8v.4" /></>}
            </svg>
          </span>
          <div className="alert-banner__text">
            <p className="alert-banner__kicker cims-caps">
              {clear ? "All clear" : `${alert.test ? "Test: " : ""}GTPD alert · ${alertKindLabel(alert.kind)}`}
            </p>
            <p className="alert-banner__title">{clear ? `${alert.title}: the alert has ended` : alert.title}</p>
            {!clear && alert.message && <p className="alert-banner__message">{alert.message}</p>}
          </div>
          <div className="alert-banner__actions">
            {!clear && <button type="button" className="alert-banner__btn" onClick={() => focusAlert(alert)}>Show on map</button>}
            <button type="button" className="alert-banner__close" aria-label={`Close ${clear ? "all clear notice" : "alert"}: ${alert.title}`} onClick={() => onDismiss(key)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
