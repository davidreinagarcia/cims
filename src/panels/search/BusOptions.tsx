/** @file Bus mode of Directions: which GT buses get you to the destination, best first, with when to leave, the wait, the ride and the walks. */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatMinutes, planBusTrips, type BusOption } from "../../lib/busPlanner";
import { highlightRoutes } from "../../lib/transitHighlight";
import { useGpsFix } from "../../lib/useGpsFix";
import { useLiveBuses, useTransitNetwork } from "../../lib/useTransit";
import { TRACKER_URL } from "../../map/transitLive";
import { useLayerFilters } from "../../state/layerFilters";

const clock = (secondsFromNow: number) => new Date(Date.now() + secondsFromNow * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** The headline action for an option: when to start walking, in words. */
function leaveText(option: BusOption): string {
  if (option.leaveIn == null) return `No ${option.route.name} bus running now`;
  return option.leaveIn < 60 ? "Leave now" : `Leave in ${formatMinutes(option.leaveIn)}`;
}

/** Lists bus options from `origin` (or the user's GPS position when null) to `destination`. */
export default function BusOptions({ origin, destination }: { origin: [number, number] | null; destination: [number, number] }) {
  const { network, failed: loadError } = useTransitNetwork();
  const [selected, setSelected] = useState<number | null>(null);
  const gps = useGpsFix(!origin);
  const live = useLiveBuses(network);
  const { isOn, toggleCategory } = useLayerFilters();

  const start: [number, number] | null = origin ?? (gps.fix ? [gps.fix.lng, gps.fix.lat] : null);
  const plan = useMemo(() => (network && start ? planBusTrips(network, start, destination, live.buses) : null),
    // Coordinates, not the array: a fresh [lng, lat] each render must not replan.
    [network, start?.[0], start?.[1], destination[0], destination[1], live.buses]);

  const routeIds = plan?.options.map((o) => o.route.id).join(",") ?? "";
  useEffect(() => {
    if (selected != null && !routeIds.split(",").includes(String(selected))) setSelected(null);
    highlightRoutes(selected != null ? [selected] : routeIds ? routeIds.split(",").map(Number) : null);
  }, [routeIds, selected]);
  useEffect(() => () => highlightRoutes(null), []);

  if (loadError) return <p className="cims-muted" role="status">Bus routes couldn't load. Check your connection and try again.</p>;
  if (!origin && gps.status !== "ok") {
    return <div className="bus-options__notice" role="status">
      {gps.status === "error" ? <>
        <p>{gps.message}</p>
        <button type="button" className="cims-btn cims-btn--small" onClick={gps.request}>Use my location</button>
      </> : <p className="cims-muted">Finding your location...</p>}
    </div>;
  }
  if (!plan) return <p className="cims-muted" role="status">Loading bus routes...</p>;

  const best = plan.options[0];
  const anyLive = plan.options.some((o) => o.live);
  const walkWins = !best || (best.total ?? Infinity) >= plan.walkTime;
  return <div className="bus-options">
    <p className={`bus-options__walk${walkWins ? " bus-options__walk--best" : ""}`}>
      {!walkWins ? <>Walking takes {formatMinutes(plan.walkTime)}</>
        : plan.options.length && !anyLive && live.updatedAt ? <><strong>No buses on these routes right now</strong> · walking takes {formatMinutes(plan.walkTime)}</>
        : <><strong>Walking is your best bet</strong> · {formatMinutes(plan.walkTime)}</>}
    </p>
    {!plan.options.length
      ? <p className="cims-muted">No bus route stops near both places. It's close enough to walk.</p>
      : <ul className="bus-options__list" aria-label="Bus options">
        {plan.options.map((o) => (
          <li key={o.route.id}>
            <button type="button" className={`bus-option${o.live ? "" : " bus-option--idle"}`} aria-pressed={selected === o.route.id}
              style={{ "--route-color": o.route.color ?? "var(--cat-transport)" } as CSSProperties}
              onClick={() => setSelected(selected === o.route.id ? null : o.route.id)}>
              <span className="bus-option__top">
                <span className="bus-option__route">{o.route.name}</span>
                {o.total != null ? <span className="bus-option__total">{formatMinutes(o.total)}<small>arrive {clock(o.total)}</small></span>
                  : <span className="bus-option__total">{formatMinutes(o.tripTime)}<small>trip once a bus comes</small></span>}
              </span>
              <span className="bus-option__leave">{leaveText(o)}</span>
              <ol className="bus-option__steps">
                <li><span aria-hidden="true">🚶</span> Walk {formatMinutes(o.walkToStop)} to <strong>{o.board.name}</strong></li>
                <li><span aria-hidden="true">🚌</span> {o.wait != null ? <>Bus in ≈{formatMinutes(o.wait)} · </> : null}ride {formatMinutes(o.rideTime)}</li>
                <li><span aria-hidden="true">🚶</span> Get off at <strong>{o.alight.name}</strong>, walk {formatMinutes(o.walkFromStop)}</li>
              </ol>
              {!o.live && o.route.hours && <span className="bus-option__hours">Service: {o.route.hours}</span>}
            </button>
          </li>
        ))}
      </ul>}
    <p className="cims-muted bus-options__source">
      {live.failed ? "Live buses are unavailable right now, so only routes and ride times are shown." :
        live.updatedAt ? "Bus times are estimated from live bus positions, updated every 10 s." : "Checking live buses..."}{" "}
      <a href={TRACKER_URL} target="_blank" rel="noopener noreferrer">Official tracker</a>
    </p>
    {!isOn("transport") && <button type="button" className="cims-btn cims-btn--small" onClick={() => toggleCategory("transport")}>Show bus routes on the map</button>}
  </div>;
}
