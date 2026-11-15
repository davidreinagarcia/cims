/** @file "Add post" dialog for the Bulletin: title, description, campus-time window, a required registered building or room (search menu, no free text) and an optional poster. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "../../auth/types";
import { audienceFor, createUserPost, type PostSection, type UserPost } from "../../lib/bulletinPosts";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../../lib/buildings";
import { campusDateTime } from "../../lib/events";
import { photoToDataUrl } from "../../lib/photo";
import { indoorRooms, resolveRoom } from "../../indoor/registry";
import type { CampusSearchResult } from "../../lib/search";
import PlaceField from "../search/PlaceField";
import "../search/search.css";
import "./composer.css";

/** Menu title of a pick: identical rooms on one level are numbered "1 of 2" (the model has no real room numbers there). */
function describePlace(result: CampusSearchResult): string {
  if (result.kind !== "room") return result.name;
  const room = resolveRoom(result.id);
  const twins = room ? indoorRooms().filter((item) => item.building.building_id === room.building.building_id
    && item.level?.id === room.level?.id && item.space.name === room.space.name) : [];
  const ordinal = twins.length > 1 ? ` (${twins.findIndex((item) => item.id === result.id) + 1} of ${twins.length})` : "";
  return `${result.name}${ordinal}`;
}

const onlyRegistered = (result: CampusSearchResult) => result.kind === "building" || result.kind === "room";

/** Modal form that creates a post for the signed-in account; reports the saved post, or closes without one. */
export default function PostComposer({ session, section = "general", onDone, onClose }: {
  session: Session; section?: PostSection; onDone: (post: UserPost) => void; onClose: () => void;
}) {
  const root = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [buildings, setBuildings] = useState<BuildingIndex | null>(loadedBuildings);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [place, setPlace] = useState<CampusSearchResult | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const audience = audienceFor(session.role);

  useEffect(() => { if (!buildings) void loadBuildings().then(setBuildings).catch(() => undefined); }, [buildings]);
  useEffect(() => { const el = root.current; el?.showModal(); return () => el?.close(); }, []);

  const pickPoster = async (picked: File | undefined) => {
    if (!picked) return;
    setError("");
    try { setPoster(await photoToDataUrl(picked, 1100)); } catch { setError("That file is not an image we can read."); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const startsAt = campusDateTime(day, from);
    const endsAt = campusDateTime(day, to);
    if (title.trim().length < 3) return setError("Give the post a name of at least 3 letters.");
    if (!startsAt || !endsAt || endsAt <= startsAt) return setError("Pick a date, a start time and a later end time (campus time, ET).");
    if (endsAt.getTime() <= Date.now()) return setError("That event is already over. Pick a time in the future.");
    if (!place) return setError("Choose where it happens from the suggestions: a building or a room.");
    const room = place.kind === "room" ? resolveRoom(place.id) : undefined;
    const buildingId = place.kind === "room" ? room?.building.building_id : place.id;
    if (!buildingId) return setError("We could not match that room to a building. Pick another place.");
    setBusy(true);
    try {
      const post = await createUserPost(session, {
        section, title: title.trim(), description: description.trim() || undefined, startsAt, endsAt, poster: poster ?? undefined,
        location: { kind: place.kind === "room" ? "room" : "building", id: place.id, name: place.name, buildingId },
      });
      onDone(post);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post right now.");
      setBusy(false);
    }
  };

  return (
    <dialog ref={root} className="composer" aria-labelledby="composer-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => { if (event.target === root.current) onClose(); }}>
      <form className="composer__form" onSubmit={submit} noValidate>
        <h3 id="composer-title" className="composer__title">New post</h3>
        <p className="composer__who">{section === "alumni" ? "Posting to Alumni: alumni visits to campus and alumni-oriented events." : audience === "org" ? "Posting as an organization: it appears under Orgs." : "Posting as a person: it appears under People."}</p>
        <label className="composer__field"><span className="cims-caps">Name</span>
          <span className="cims-field"><input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} autoFocus /></span></label>
        <label className="composer__field"><span className="cims-caps">Description</span>
          <span className="cims-field"><textarea rows={3} value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} /></span></label>
        <div className="composer__row">
          <label className="composer__field"><span className="cims-caps">Date</span>
            <span className="cims-field"><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></span></label>
          <label className="composer__field"><span className="cims-caps">Starts</span>
            <span className="cims-field"><input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></span></label>
          <label className="composer__field"><span className="cims-caps">Ends</span>
            <span className="cims-field"><input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></span></label>
        </div>
        <PlaceField label="Where (required)" placeholder="Search a building or room…" buildings={buildings}
          filter={onlyRegistered} describe={describePlace} picked={place}
          onPick={(r) => setPlace(r && r.kind === "room" ? { ...r, name: `${describePlace(r)}, ${r.meta}` } : r)} />
        <div className="composer__field">
          <span className="cims-caps">Poster (optional)</span>
          {poster && <img className="composer__poster" src={poster} alt="Poster preview" />}
          <div className="composer__row">
            <button type="button" className="cims-btn cims-btn--small" onClick={() => file.current?.click()}>{poster ? "Change poster" : "Attach poster"}</button>
            {poster && <button type="button" className="cims-btn cims-btn--small" onClick={() => setPoster(null)}>Remove</button>}
          </div>
          <input ref={file} type="file" accept="image/*" hidden aria-label="Poster image"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void pickPoster(f); }} />
        </div>
        {error && <p className="composer__error" role="alert">{error}</p>}
        <div className="composer__actions">
          <button type="button" className="cims-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="cims-btn cims-btn--primary" disabled={busy}>{busy ? "Posting…" : "Post"}</button>
        </div>
      </form>
    </dialog>
  );
}
