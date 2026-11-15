/** @file Citizen "Notify police" flow: GPS location, what's happening, optional photo, sent live to the GTPD console, then a live status page. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TIP_CATEGORIES, submitTip, tipStatus, type TipCategory, type TipStatus } from "../../lib/alerts";
import { nearestPlace } from "../../lib/nearestPlace";
import { photoToDataUrl } from "../../lib/photo";
import { places } from "../../lib/places";
import { useGpsFix } from "../../lib/useGpsFix";
import type { Navigate } from "./index";

const STATUS_TEXT: Record<TipStatus, string> = {
  new: "Sent. Waiting for GTPD to open it.",
  acknowledged: "GTPD has seen your report.",
  resolved: "GTPD marked this report as handled.",
};

/** Status page of one sent tip; polls so the citizen sees when GTPD acknowledges it. */
function TipStatusView({ id, onAnother }: { id: string; onAnother: () => void }) {
  const [status, setStatus] = useState<TipStatus | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const load = () => tipStatus(id).then((t) => live && setStatus(t ? t.status : null));
    void load();
    const timer = window.setInterval(load, 8000);
    return () => { live = false; window.clearInterval(timer); };
  }, [id]);
  if (status === undefined) return <p className="cims-empty" role="status">Loading…</p>;
  if (status === null) return <p className="cims-empty" role="status">We can't find that report on this device or server.</p>;
  return (
    <div className="cims-report__body">
      <p className="cims-tag cims-tag--alert">Sent to GTPD</p>
      <h2 className="cims-section__title cims-caps">{STATUS_TEXT[status]}</h2>
      <p className="cims-muted" role="status" aria-live="polite">This page updates by itself.</p>
      <p><strong>If anyone is in immediate danger, call <a href="tel:911">911</a>.</strong></p>
      <div className="cims-actions"><button type="button" className="cims-btn" onClick={onAnother}>Send another report</button></div>
    </div>
  );
}

/** The 1-step form plus its status page (?kind=police&tip=<id>). */
export default function PoliceReportFlow({ tipId, navigate }: { tipId: string | null; navigate: Navigate }) {
  const gps = useGpsFix(!tipId); // ask for the position as soon as the form opens
  const [category, setCategory] = useState<TipCategory | null>(null);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const problemRef = useRef<HTMLParagraphElement>(null);

  if (tipId) return <TipStatusView id={tipId} onAnother={() => navigate(new URLSearchParams({ panel: "report", kind: "police" }))} />;

  const manualPlace = places.features.find((f) => f.properties.id === manualId);
  const point: [number, number] | null = gps.fix ? [gps.fix.lng, gps.fix.lat] : manualPlace ? manualPlace.geometry.coordinates as [number, number] : null;
  const near = gps.fix && point ? nearestPlace(point) : null;
  const fail = (m: string) => { setProblem(m); requestAnimationFrame(() => problemRef.current?.focus()); };

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try { setPhoto(await photoToDataUrl(file)); setProblem(null); }
    catch { setPhoto(null); fail("That file couldn't be read as an image. You can still send the report without a photo."); }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!point) return fail("We need a location: allow GPS or pick the nearest building.");
    if (!category) return fail("Pick what is happening.");
    setBusy(true);
    try {
      const sent = await submitTip({
        category, description: description.trim(), photoDataUrl: photo, point,
        accuracyM: gps.fix ? Math.round(gps.fix.accuracy) : null,
        buildingName: near?.name ?? manualPlace?.properties.name ?? null,
      });
      navigate(new URLSearchParams({ panel: "report", kind: "police", tip: sent.id }));
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not send. Please try again, or call 911 if it's urgent.");
    } finally { setBusy(false); }
  }

  return (
    <form className="cims-report__form" onSubmit={onSubmit} noValidate>
      <div className="cims-report__emergency" role="note">
        <p className="cims-caps cims-report__emergency-title"><span aria-hidden="true">⚠ </span>Emergency? Call 911</p>
        <p>If anyone is in immediate danger, <a href="tel:911">call 911</a> first. This form tells GTPD what you see and where; it is not a 911 call.</p>
      </div>

      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">Where</h2>
        <div className="cims-report__fields">
          <div className="cims-report__gps">
            <button type="button" className="cims-btn cims-btn--block" onClick={gps.request} disabled={gps.status === "locating"}>
              {gps.status === "locating" ? "Finding you…" : gps.fix ? "Update my location" : "Use my location"}
            </button>
            <p className="cims-muted" role="status" aria-live="polite">
              {gps.status === "error" ? gps.message
                : gps.fix ? `Location attached (±${Math.round(gps.fix.accuracy)} m).${near ? ` Near ${near.name}.` : ""}`
                : gps.status === "locating" ? "Allow location when your browser asks." : "GPS lets police find the spot quickly."}
            </p>
          </div>
          {!gps.fix && (
            <label className="cims-report__label">
              <span>No GPS? Nearest building</span>
              <select className="cims-report__control" value={manualId} onChange={(e) => setManualId(e.target.value)}>
                <option value="">Pick a building…</option>
                {places.features.filter((f) => f.properties.kind !== "event").map((f) => <option key={f.properties.id} value={f.properties.id}>{f.properties.name}</option>)}
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="cims-section">
        <fieldset className="cims-report__fieldset">
          <legend className="cims-section__title cims-caps">What's happening</legend>
          <div className="cims-report__grid">
            {TIP_CATEGORIES.map((item) => (
              <label key={item.id} className="cims-report__tile">
                <input type="radio" name="tip-category" value={item.id} checked={category === item.id} onChange={() => { setCategory(item.id); setProblem(null); }} />
                <span className="cims-report__tile-body">
                  <span className="cims-report__tile-mark" aria-hidden="true">{category === item.id ? "✓" : ""}</span>
                  <span className="cims-report__tile-text">{item.label}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">Details <span className="cims-muted">(optional)</span></h2>
        <div className="cims-report__fields">
          <label className="cims-report__label">
            <span>Description</span>
            <textarea className="cims-report__control" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={800}
              placeholder="What you see, how many people, which way they went…" />
          </label>
          <div className="cims-report__label">
            <label htmlFor="cims-police-photo">Photo</label>
            <input id="cims-police-photo" ref={fileRef} className="cims-report__file" type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
            {photo && (
              <div className="cims-report__photo">
                <img src={photo} alt="Photo attached to this report" />
                <button type="button" className="cims-btn" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove photo</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="cims-report__footer">
        {problem && <p className="cims-report__error" role="alert" tabIndex={-1} ref={problemRef}><strong>Missing:</strong> {problem}</p>}
        <button type="submit" className="cims-btn cims-btn--primary cims-btn--block" disabled={busy}>{busy ? "Sending…" : "Send to GTPD"}</button>
      </div>
    </form>
  );
}
