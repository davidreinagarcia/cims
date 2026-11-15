/** @file Incoming citizen police tips for the GTPD console: location, GPS accuracy, description, photo, and acknowledge / resolve actions. */
import { useEffect, useState } from "react";
import { TIP_CATEGORIES, setTipStatus, type PoliceTip, type TipStatus } from "../../lib/alerts";

/** Props for the tips queue. */
export interface TipsQueueProps {
  tips: PoliceTip[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Starts an alarm circle centered on a tip. */
  onDrawHere: (tip: PoliceTip) => void;
}

/** "3 min ago" style label. */
function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86_400)} d ago`;
}

const ORDER: Record<TipStatus, number> = { new: 0, acknowledged: 1, resolved: 2 };

/** The queue, newest unhandled first. */
export default function TipsQueue({ tips, selectedId, onSelect, onDrawHere }: TipsQueueProps) {
  const [now, setNow] = useState(Date.now());
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);

  const sorted = [...tips].sort((a, b) => ORDER[a.status] - ORDER[b.status] || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const act = async (id: string, status: TipStatus) => {
    setError(null);
    try { await setTipStatus(id, status); } catch (e) { setError(e instanceof Error ? e.message : "Could not update."); }
  };

  if (sorted.length === 0) return <p className="cims-empty" role="status">No reports yet. New ones appear here the moment someone sends them.</p>;
  return (
    <>
      {error && <p className="police__error" role="alert">{error}</p>}
      <ul className="police__tips">
        {sorted.map((tip) => {
          const label = TIP_CATEGORIES.find((c) => c.id === tip.category)?.label ?? tip.category;
          return (
            <li key={tip.id} className={`police-tip police-tip--${tip.status}${tip.id === selectedId ? " is-selected" : ""}`}>
              <button type="button" className="police-tip__head" onClick={() => onSelect(tip.id)} aria-pressed={tip.id === selectedId}>
                <span className={`police-tip__dot police-tip__dot--${tip.status}`} aria-hidden="true" />
                <span className="police-tip__title">{label}</span>
                <span className="police-tip__time">{ago(tip.createdAt, now)}</span>
              </button>
              <p className="police-tip__where">
                {tip.buildingName ? `Near ${tip.buildingName} · ` : ""}
                {tip.point[1].toFixed(5)}, {tip.point[0].toFixed(5)}
                {tip.accuracyM != null ? ` (GPS ±${tip.accuracyM} m)` : " (placed by hand)"}
              </p>
              {tip.description && <p className="police-tip__text">{tip.description}</p>}
              {tip.photoDataUrl && (
                <button type="button" className="police-tip__photo" onClick={() => setPhoto(tip.photoDataUrl)} aria-label="Enlarge photo">
                  <img src={tip.photoDataUrl} alt="Photo attached to the report" />
                </button>
              )}
              <div className="police-tip__actions">
                <button type="button" className="cims-btn cims-btn--small" onClick={() => onDrawHere(tip)}>Alarm here</button>
                {tip.status === "new" && <button type="button" className="cims-btn cims-btn--small" onClick={() => act(tip.id, "acknowledged")}>Acknowledge</button>}
                {tip.status !== "resolved" && <button type="button" className="cims-btn cims-btn--small" onClick={() => act(tip.id, "resolved")}>Resolve</button>}
                {tip.status === "resolved" && <button type="button" className="cims-btn cims-btn--small" onClick={() => act(tip.id, "new")}>Reopen</button>}
              </div>
            </li>
          );
        })}
      </ul>
      {photo && (
        <div className="police__lightbox" role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setPhoto(null)}>
          <img src={photo} alt="Report photo, enlarged" />
          <button type="button" className="cims-btn" onClick={() => setPhoto(null)}>Close</button>
        </div>
      )}
    </>
  );
}
