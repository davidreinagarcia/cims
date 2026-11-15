/** @file Step 1 of the report flow: location, category grid with "Routes to" tag, optional equipment, description and photo. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SAFETY_CATEGORY, hasVerifiedRouting, issueRoutes, routeFor, type IssueCategory } from "../../lib/issue-routing";
import { nearestPlace } from "../../lib/nearestPlace";
import { photoToDataUrl } from "../../lib/photo";
import { places } from "../../lib/places";
import { useGpsFix } from "../../lib/useGpsFix";
import type { NewIssueReport, ReportLocation } from "../../lib/reports";
import { locationParts } from "./location";

/** Props for the details step. */
export interface ReportFormProps {
  /** Prefilled location; null shows the manual building picker. */
  location: ReportLocation | null;
  /** Previous answers when the user comes back from step 2. */
  draft: NewIssueReport | null;
  busy: boolean;
  onContinue: (input: NewIssueReport) => void;
}

/** The details form (PRD US-10.1). Safety hazard shows the emergency banner before everything else. */
export default function ReportForm({ location, draft, busy, onContinue }: ReportFormProps) {
  const manual = !location;
  const [buildingId, setBuildingId] = useState(draft?.location.buildingId ?? "");
  const [floor, setFloor] = useState(draft?.location.floor ?? "");
  const [room, setRoom] = useState(draft?.location.room ?? "");
  const [category, setCategory] = useState<IssueCategory | null>(draft?.category ?? null);
  const [equipment, setEquipment] = useState(draft?.equipment ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [photo, setPhoto] = useState<string | null>(draft?.photoDataUrl ?? null);
  const [problem, setProblem] = useState<string | null>(null);
  const problemRef = useRef<HTMLParagraphElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const bannerRef = useRef<HTMLDivElement>(null);

  // GPS: fills the building from where the person is standing, or keeps an outdoor pin when no building is close.
  const gps = useGpsFix();
  const [pin, setPin] = useState<{ point: [number, number]; accuracyM: number } | null>(null);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  useEffect(() => {
    if (!gps.fix) return;
    const point: [number, number] = [gps.fix.lng, gps.fix.lat];
    setPin({ point, accuracyM: Math.round(gps.fix.accuracy) });
    const near = nearestPlace(point);
    if (near) { setBuildingId(near.id); setGpsNote(`Nearest building: ${near.name} (about ${near.distanceM} m).`); }
    else { setBuildingId(""); setGpsNote("No campus building is close, so this will be reported as an outdoor spot."); }
  }, [gps.fix]);

  const route = category ? routeFor(category) : null;
  const isSafety = category === SAFETY_CATEGORY;
  useEffect(() => {
    // The banner sits above the form; bring it into view so it's seen before anything else is filled in.
    if (isSafety) bannerRef.current?.scrollIntoView({ block: "start" });
  }, [isSafety]);
  const safety = routeFor(SAFETY_CATEGORY);

  const fail = (message: string) => {
    setProblem(message);
    requestAnimationFrame(() => problemRef.current?.focus());
  };

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await photoToDataUrl(file));
      setProblem(null);
    } catch {
      setPhoto(null);
      fail("That file couldn't be read as an image. The report can still be sent without a photo.");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const place = places.features.find((f) => f.properties.id === buildingId);
    if (manual && !place && !pin) return fail("Pick the building where the problem is, or use your location.");
    if (!category) return fail("Pick a category.");
    const where: ReportLocation = location ?? {
      buildingId: place?.properties.id ?? null,
      buildingName: place?.properties.name ?? null,
      floor: place ? floor.trim() || null : null,
      room: place ? room.trim() || null : null,
      point: pin?.point ?? null,
    };
    onContinue({ category, location: where, equipment, description, photoDataUrl: photo });
  }

  return (
    <form className="cims-report__form" onSubmit={onSubmit} noValidate>
      {isSafety && (
        <div className="cims-report__emergency" role="alert" ref={bannerRef}>
          <p className="cims-caps cims-report__emergency-title">
            <span aria-hidden="true">⚠ </span>Emergency? Don't use this form
          </p>
          <p>
            If anyone is in immediate danger, <a href="tel:911">call 911</a> now. This prototype is not monitored.
          </p>
          {/* Official campus contact comes only from verified routing data (T-31); never hard-code it here. */}
          {safety.phone && (
            <p>
              Georgia Tech Police: <a href={`tel:${safety.phone.replace(/[^\d+]/g, "")}`}>{safety.phone}</a>
            </p>
          )}
          {safety.reportingUrl && (
            <p>
              <a href={safety.reportingUrl} target="_blank" rel="noreferrer">Official emergency information</a>
            </p>
          )}
        </div>
      )}

      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">Where</h2>
        {location ? (
          <p className="cims-breadcrumb cims-report__where">
            {locationParts(location).map((part) => <span key={part}>{part}</span>)}
          </p>
        ) : (
          <div className="cims-report__fields">
            <div className="cims-report__gps">
              <button type="button" className="cims-btn cims-btn--block" onClick={gps.request} disabled={gps.status === "locating"}>
                {gps.status === "locating" ? "Finding you…" : pin ? "Update my location" : "Use my location"}
              </button>
              <p className="cims-muted" role="status" aria-live="polite">
                {gps.status === "error" ? gps.message : pin ? `GPS fix attached (±${pin.accuracyM} m). ${gpsNote ?? ""}` : "Attaches your GPS position so staff can find the spot."}
              </p>
            </div>
            <label className="cims-report__label">
              <span>Building <span className="cims-muted">{pin ? "(optional with GPS)" : "(required)"}</span></span>
              <select className="cims-report__control" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                <option value="">Pick a building…</option>
                {places.features.map((f) => (
                  <option key={f.properties.id} value={f.properties.id}>{f.properties.name}</option>
                ))}
              </select>
            </label>
            <div className="cims-report__pair">
              <label className="cims-report__label">
                <span>Floor <span className="cims-muted">(optional)</span></span>
                <input className="cims-report__control" value={floor} onChange={(e) => setFloor(e.target.value)} maxLength={12} />
              </label>
              <label className="cims-report__label">
                <span>Room <span className="cims-muted">(optional)</span></span>
                <input className="cims-report__control" value={room} onChange={(e) => setRoom(e.target.value)} maxLength={24} />
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="cims-section">
        <fieldset className="cims-report__fieldset">
          <legend className="cims-section__title cims-caps">What's wrong</legend>
          <div className="cims-report__grid">
            {issueRoutes.map((item) => (
              <label key={item.category} className="cims-report__tile">
                <input
                  type="radio"
                  name="category"
                  value={item.category}
                  checked={category === item.category}
                  onChange={() => { setCategory(item.category); setProblem(null); }}
                />
                <span className="cims-report__tile-body">
                  <span className="cims-report__tile-mark" aria-hidden="true">{category === item.category ? "✓" : ""}</span>
                  <span className="cims-report__tile-text">
                    {item.label}
                    {item.hint && <small>{item.hint}</small>}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="cims-report__route" aria-live="polite">
          {route ? (
            <>
              <span className="cims-tag">Routes to: {route.team}</span>{" "}
              <span className="cims-muted">Simulated in this prototype.</span>
              {route.reportingUrl ? (
                <>
                  {" "}
                  <a href={route.reportingUrl} target="_blank" rel="noreferrer">Official {route.team} page</a>
                </>
              ) : (
                !hasVerifiedRouting && <span className="cims-muted"> Official link pending.</span>
              )}
            </>
          ) : (
            <span className="cims-muted">Pick a category to see which team handles it.</span>
          )}
        </p>
      </section>

      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">Details <span className="cims-muted">(optional)</span></h2>
        <div className="cims-report__fields">
          <label className="cims-report__label">
            <span>Equipment</span>
            <input
              className="cims-report__control"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. Projector, front left"
              maxLength={80}
            />
          </label>
          <label className="cims-report__label">
            <span>Description</span>
            <textarea
              className="cims-report__control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </label>
          <div className="cims-report__label">
            <label htmlFor="cims-report-photo">Photo</label>
            <input
              id="cims-report-photo"
              ref={fileRef}
              className="cims-report__file"
              type="file"
              accept="image/*"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            {photo && (
              <div className="cims-report__photo">
                <img src={photo} alt="Photo attached to this report" />
                <button
                  type="button"
                  className="cims-btn"
                  onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="cims-report__footer">
        {problem && (
          <p className="cims-report__error" role="alert" tabIndex={-1} ref={problemRef}>
            <strong>Missing:</strong> {problem}
          </p>
        )}
        <button type="submit" className="cims-btn cims-btn--primary cims-btn--block" disabled={busy}>
          {busy ? "Checking…" : "Continue"}
        </button>
      </div>
    </form>
  );
}
