/** @file Step 1 of the report flow: location, category grid with "Routes to" tag, optional equipment, description and photo. */
import { useRef, useState, type FormEvent } from "react";
import { SAFETY_CATEGORY, hasVerifiedRouting, issueRoutes, routeFor, type IssueCategory } from "../../lib/issue-routing";
import { places } from "../../lib/places";
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

const PHOTO_MAX_PX = 800;

/** Shrinks a photo to a small JPEG data URL so the prototype can keep it in localStorage. */
async function photoToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
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

  const route = category ? routeFor(category) : null;
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
    if (manual && !place) return fail("Pick the building where the problem is.");
    if (!category) return fail("Pick a category.");
    const where: ReportLocation = location ?? {
      buildingId: place!.properties.id,
      buildingName: place!.properties.name,
      floor: floor.trim() || null,
      room: room.trim() || null,
      point: null,
    };
    onContinue({ category, location: where, equipment, description, photoDataUrl: photo });
  }

  return (
    <form className="cims-report__form" onSubmit={onSubmit} noValidate>
      {category === SAFETY_CATEGORY && (
        <div className="cims-report__emergency" role="alert">
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
            <label className="cims-report__label">
              <span>Building <span className="cims-muted">(required)</span></span>
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
