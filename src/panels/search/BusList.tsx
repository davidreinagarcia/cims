/** @file Bus mode of Directions before a destination is picked: every GT route, running ones first with the next bus at your nearest stop, plus the Stingerette on-demand card. */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatMinutes, routeStatuses, type RouteStatus } from "../../lib/busPlanner";
import { highlightRoutes } from "../../lib/transitHighlight";
import { useGpsFix } from "../../lib/useGpsFix";
import { useLiveBuses, useTransitNetwork } from "../../lib/useTransit";
import { TRACKER_URL } from "../../map/transitLive";
import stingerette from "../../data/stingerette.json";

/** Minutes since midnight on campus (Atlanta time), whatever the device's own time zone. */
function campusMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** "Open now · until midnight" or "Opens at 4:30 pm" from the verified hours (holidays and home games aren't known here). */
function stingeretteStatus(): { open: boolean; text: string } {
  const now = campusMinutes();
  const open = now >= toMinutes(stingerette.opens) && now < toMinutes(stingerette.closes);
  return open ? { open, text: "Running now · until midnight" } : { open, text: "Not running now · starts at 4:30 pm" };
}

/** One route row: name, whether it's running, and the next bus at your nearest stop. */
function RouteRow({ status, pressed, onPress }: { status: RouteStatus; pressed: boolean; onPress: () => void }) {
  const { route, running, nearStop, walkToStop, nextBus } = status;
  return <li>
    <button type="button" className={`bus-option bus-row${running ? "" : " bus-option--idle"}`} aria-pressed={pressed} onClick={onPress}
      style={{ "--route-color": route.color ?? "var(--cat-transport)" } as CSSProperties}>
      <span className="bus-option__top">
        <span className="bus-option__route">{route.name}</span>
        {nextBus != null && <span className="bus-option__total">{formatMinutes(nextBus)}<small>next bus</small></span>}
      </span>
      {running
        ? <span className="bus-row__line">{running === 1 ? "1 bus running" : `${running} buses running`}
          {nearStop && <> · at <strong>{nearStop.name}</strong>{walkToStop != null && <>, {formatMinutes(walkToStop)} walk</>}</>}</span>
        : <span className="bus-row__line">Not running now</span>}
      {!running && route.hours && <span className="bus-option__hours">Service: {route.hours}</span>}
    </button>
  </li>;
}

/** Lists every route for the "which buses are around" view; `here` is the From place, else the GPS fix if allowed. */
export default function BusList({ here }: { here: [number, number] | null }) {
  const { network, failed } = useTransitNetwork();
  const live = useLiveBuses(network);
  const gps = useGpsFix(!here);
  const [selected, setSelected] = useState<number | null>(null);
  const at: [number, number] | null = here ?? (gps.fix ? [gps.fix.lng, gps.fix.lat] : null);
  const statuses = useMemo(() => (network ? routeStatuses(network, live.buses, at) : []),
    // Coordinates, not the array: a fresh [lng, lat] each render must not re-sort.
    [network, live.buses, at?.[0], at?.[1]]);
  useEffect(() => { highlightRoutes(selected != null ? [selected] : null); }, [selected]);
  useEffect(() => () => highlightRoutes(null), []);

  if (failed) return <p className="cims-muted" role="status">Bus routes couldn't load. Check your connection and try again.</p>;
  if (!network) return <p className="cims-muted" role="status">Loading bus routes...</p>;
  const running = statuses.filter((s) => s.running);
  const idle = statuses.filter((s) => !s.running);
  const ride = stingeretteStatus();
  const row = (s: RouteStatus) => <RouteRow key={s.route.id} status={s} pressed={selected === s.route.id}
    onPress={() => setSelected(selected === s.route.id ? null : s.route.id)} />;

  return <div className="bus-options">
    <p className="bus-options__walk">Pick where you're going above to see only the buses that take you there.</p>
    {!at && gps.status !== "locating" && <p className="cims-muted bus-options__source">
      Allow your location to see the next bus at your nearest stop.{" "}
      {gps.status !== "ok" && <button type="button" className="cims-btn cims-btn--small" onClick={gps.request}>Use my location</button>}
    </p>}
    <h3 className="bus-list__head cims-caps">Running now</h3>
    {running.length ? <ul className="bus-options__list" aria-label="Running routes">{running.map(row)}</ul>
      : <p className="cims-muted">{live.failed ? "Live buses are unavailable right now." : live.updatedAt ? "No Stinger buses are running right now." : "Checking live buses..."}</p>}
    <section className={`bus-ondemand${ride.open ? "" : " bus-ondemand--closed"}`} aria-label="Stingerette" style={{ "--route-color": "var(--gold)" } as CSSProperties}>
      <span className="bus-option__top"><span className="bus-option__route">Stingerette</span><span className="bus-ondemand__tag">On demand</span></span>
      <strong className="bus-ondemand__status">{ride.text}</strong>
      <span className="bus-row__line">{stingerette.summary}</span>
      <span className="bus-option__hours">{stingerette.hours_text}. {stingerette.exceptions} {stingerette.late_night}</span>
      <a className="cims-btn cims-btn--primary cims-btn--block" href={stingerette.request_url} target="_blank" rel="noopener noreferrer">Request a ride in TransLoc</a>
      <a className="bus-option__hours" href={stingerette.source_url} target="_blank" rel="noopener noreferrer">Details on pts.gatech.edu</a>
    </section>
    {idle.length > 0 && <>
      <h3 className="bus-list__head cims-caps">Not running now</h3>
      <ul className="bus-options__list" aria-label="Routes not running">{idle.map(row)}</ul>
    </>}
    <p className="cims-muted bus-options__source">Next-bus times are estimated from live bus positions, updated every 10 s.{" "}
      <a href={TRACKER_URL} target="_blank" rel="noopener noreferrer">Official tracker</a></p>
  </div>;
}
