/** @file Small signed-in bulletin composer that keeps its draft when the backend is unavailable. */
import { useRef, useState, type FormEvent } from "react";
import { POST_TYPES, type BulletinRow } from "../../lib/bulletin";
import { places } from "../../lib/places";
import { supabaseInsert, supabaseSelect } from "../../lib/supabase";

/** Compose a post for the current demo session and return the inserted row to the board. */
export default function AddPostForm({ accountId, onAdded, onCancel }: {
  accountId: string; onAdded: (row: BulletinRow) => void; onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const postId = useRef(crypto.randomUUID());
  const venues = places.features.filter((feature) => feature.properties.kind !== "event")
    .map((feature) => feature.properties).sort((a, b) => a.name.localeCompare(b.name));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();
    const start = new Date(String(data.get("starts_at")));
    const end = new Date(String(data.get("ends_at")));
    if (!title || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end <= new Date()) {
      setError("Add a title and valid times, with the end after the start and in the future.");
      return;
    }
    setBusy(true);
    setError("");
    let rows = await supabaseInsert<BulletinRow>("bulletin_posts", {
      id: postId.current, account_id: accountId, type: String(data.get("type")), title, body,
      place_id: String(data.get("place_id")), starts_at: start.toISOString(), ends_at: end.toISOString(),
    });
    // A timed-out response may already have committed. Reuse the draft id on retry.
    if (rows?.length === 0) rows = await supabaseSelect<BulletinRow>("bulletin_posts", { id: `eq.${postId.current}` });
    setBusy(false);
    if (rows?.[0]) onAdded(rows[0]);
    else setError("Could not confirm the post. Your draft is still here; check your connection and try again.");
  };

  return (
    <form className="board-form" aria-labelledby="board-form-title" onSubmit={submit}>
      <h3 id="board-form-title">Add post</h3>
      <p>Posting as a demo account. No real authentication.</p>
      <fieldset disabled={busy}>
        <label>Type<select name="type" defaultValue="community">{POST_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
        <label>Title<input autoFocus name="title" required maxLength={160} /></label>
        <p className="board-form__zone">Enter times in your device timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Cards display campus time (ET).</p>
        <label>Starts<input name="starts_at" type="datetime-local" required /></label>
        <label>Ends<input name="ends_at" type="datetime-local" required /></label>
        <label>Place<select name="place_id" required defaultValue="">
          <option value="" disabled>Choose a place</option>
          {venues.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select></label>
        <label>Description<textarea name="body" maxLength={4000} rows={3} /></label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="board-form__actions">
        <button type="submit" className="cims-btn cims-btn--primary" disabled={busy}>{busy ? "Posting…" : "Post"}</button>
        <button type="button" className="cims-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
