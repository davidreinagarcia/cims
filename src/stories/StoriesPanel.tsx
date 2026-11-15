/** @file Stories tab: an Instagram-style viewer (tap through, auto-advance, "View on map"), plus the capture flow for signed-in accounts. */
import { useEffect, useMemo, useRef, useState } from "react";
import { loadBuildings } from "../lib/buildings";
import { useAuth } from "../state/auth";
import { Icon } from "../shell/icons";
import CameraCapture from "./CameraCapture";
import { closeViewer, ensureLoaded, focusOnMap, liveStories, postStory, setHeat, useStories } from "./store";
import type { Capture, Story } from "./types";
import "./stories.css";

const PHOTO_MS = 5000;

/** "now", "12m", "3h": how long ago, short like Instagram. */
export function ago(ms: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - ms) / 60_000));
  return m < 1 ? "now" : m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
}

/** Name of the building a story was taken in, when the point falls inside a known footprint. */
function usePlaceName(story: Story | undefined): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    setName(null);
    if (!story) return;
    let alive = true;
    void loadBuildings().then((b) => alive && setName(b.at(story.lng, story.lat)?.name ?? null)).catch(() => {});
    return () => { alive = false; };
  }, [story?.id]);
  return name;
}

function Viewer({ stories, onMap, onClose }: { stories: Story[]; onMap: (story: Story) => void; onClose?: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const story = stories[Math.min(index, stories.length - 1)];
  const place = usePlaceName(story);
  const first = stories[0]?.id;
  useEffect(() => { setIndex(0); }, [first, stories.length]);
  const next = () => setIndex((i) => (i + 1) % stories.length);
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  useEffect(() => setProgress(0), [story?.id]);
  useEffect(() => {
    if (!story || story.kind !== "photo" || paused) return;
    const start = Date.now() - progress * PHOTO_MS;
    const id = window.setInterval(() => {
      const p = (Date.now() - start) / PHOTO_MS;
      if (p >= 1) { window.clearInterval(id); next(); } else setProgress(p);
    }, 60);
    return () => window.clearInterval(id);
  }, [story?.id, paused]);
  const root = useRef<HTMLDivElement>(null);
  // Immersive (phone): drag down to close, like Instagram. The view follows the finger and fades.
  const drag = useRef<{ y: number; x: number; live: boolean } | null>(null);
  const move = (dy: number) => { const el = root.current; if (el) { el.style.transform = dy > 0 ? `translateY(${dy}px) scale(${1 - Math.min(dy, 400) / 2000})` : ""; el.style.opacity = String(1 - Math.min(dy, 300) / 600); } };
  const onTouchStart = (e: React.TouchEvent) => { if (onClose) drag.current = { y: e.touches[0].clientY, x: e.touches[0].clientX, live: false }; };
  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current; if (!d) return;
    const dy = e.touches[0].clientY - d.y; const dx = Math.abs(e.touches[0].clientX - d.x);
    if (!d.live && dy > 12 && dy > dx) { d.live = true; setPaused(true); }
    if (d.live) move(dy);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const d = drag.current; drag.current = null; if (!d?.live) return;
    setPaused(false);
    if (e.changedTouches[0].clientY - d.y > 110) onClose?.(); else { const el = root.current; if (el) { el.style.transform = ""; el.style.opacity = ""; } }
  };
  if (!story) return null;
  return (
    <div ref={root} className="story-view" data-immersive={onClose ? "true" : undefined} tabIndex={0} aria-label="Story viewer"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
      onKeyDown={(e) => { if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev(); }}>
      <div className="story-view__bars" aria-hidden="true">
        {stories.map((s, i) => (
          <span key={s.id}><i style={{ width: `${(i < index ? 1 : i === index ? progress : 0) * 100}%` }} /></span>
        ))}
      </div>
      {story.kind === "photo"
        ? <img key={story.id} className="story-view__media" src={story.mediaUrl} alt={story.caption ?? `Story by ${story.authorName}`} draggable={false} />
        : <video key={story.id} className="story-view__media" src={story.mediaUrl} autoPlay playsInline muted={muted}
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
            onEnded={next} ref={(v) => { if (v) { if (paused) v.pause(); else void v.play().catch(() => {}); } }} />}
      <div className="story-view__tap">
        <button type="button" aria-label="Previous story" onClick={prev} />
        <button type="button" aria-label="Hold to pause" className="story-view__hold"
          onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} onPointerCancel={() => setPaused(false)} />
        <button type="button" aria-label="Next story" onClick={next} />
      </div>
      <header className="story-view__head">
        <span className="cims-badge" aria-hidden="true">{story.authorName.charAt(0)}</span>
        <div>
          <strong>{story.authorName}</strong> <span>{ago(story.createdAt)}</span>
          {story.demo && <span className="cims-status story-view__demo">DEMO</span>}
          {place && <div className="story-view__place">{place}</div>}
        </div>
        {story.kind === "video" && <button type="button" className="story-view__sound" onClick={() => setMuted(!muted)} aria-pressed={!muted}>{muted ? "Sound off" : "Sound on"}</button>}
        {onClose && <button type="button" className="story-view__close" aria-label="Close stories, back to the map" onClick={onClose}><Icon name="close" size={20} /></button>}
      </header>
      <footer className="story-view__foot">
        {story.caption && <p>{story.caption}</p>}
        <button type="button" className="cims-btn cims-btn--primary story-view__map" onClick={() => onMap(story)}>{onClose && <Icon name="explore" size={20} />}{onClose ? " View on map" : "View on map"}</button>
      </footer>
    </div>
  );
}

function Review({ capture, onPost, onRetake }: { capture: Capture; onPost: (caption: string) => Promise<void>; onRetake: () => void }) {
  const url = useMemo(() => URL.createObjectURL(capture.blob), [capture]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="story-review">
      <div className="story-view story-view--review">
        {capture.kind === "photo"
          ? <img className="story-view__media" src={url} alt="Your story preview" />
          : <video className="story-view__media" src={url} autoPlay loop muted playsInline />}
      </div>
      <input className="story-review__caption" value={caption} maxLength={120} placeholder="Add a caption (optional)" onChange={(e) => setCaption(e.target.value)} aria-label="Caption" />
      <p className="story-review__note">Posted at your current location ({capture.accuracy < 1000 ? `±${Math.round(capture.accuracy)} m` : "approximate"}). Disappears after 24 h.</p>
      <div className="story-review__actions">
        <button type="button" className="cims-btn" disabled={busy} onClick={onRetake}>Retake</button>
        <button type="button" className="cims-btn cims-btn--primary" disabled={busy} onClick={() => { setBusy(true); void onPost(caption).finally(() => setBusy(false)); }}>
          {busy ? "Posting…" : "Post story"}
        </button>
      </div>
    </div>
  );
}

/** The Stories tab. `onShowMap` switches the shell back to the map (after "View on map"). With `onClose` (phones) it is a full-screen, Instagram-style page. */
export default function StoriesPanel({ onShowMap, onClose }: { onShowMap: () => void; onClose?: () => void }) {
  const { session, requireAuth } = useAuth();
  const { stories, loaded, viewer, heat } = useStories();
  const [mode, setMode] = useState<"view" | "camera" | "review">("view");
  const [capture, setCapture] = useState<Capture | null>(null);
  useEffect(() => { void ensureLoaded(); }, []);

  const live = useMemo(() => liveStories(stories), [stories, loaded]);
  const shown = useMemo(() => (viewer ? live.filter((s) => viewer.ids.includes(s.id)) : live), [live, viewer]);

  const startPosting = () => requireAuth(() => setMode("camera"));

  if (mode === "camera") return <CameraCapture onCancel={() => setMode("view")} onCapture={(c) => { setCapture(c); setMode("review"); }} />;
  if (mode === "review" && capture && session) {
    return <Review capture={capture} onRetake={() => setMode("camera")}
      onPost={async (caption) => { await postStory(session, capture, caption); setCapture(null); closeViewer(); setMode("view"); }} />;
  }
  const immersive = !!onClose;
  return (
    <div className={immersive ? "stories stories--immersive" : "stories"}>
      {viewer && (
        <div className="stories__subset">
          <span>Stories at this spot · {shown.length}</span>
          <button type="button" className="cims-btn" onClick={closeViewer}>Show all</button>
        </div>
      )}
      {!loaded ? <p className="cims-empty" role="status">Loading stories…</p>
        : shown.length === 0 ? <p className="cims-empty" role="status"><strong>No stories yet</strong><span>Be the first to post from campus.</span></p>
        : <Viewer stories={shown} onClose={onClose} onMap={(s) => { focusOnMap(s); onShowMap(); }} />}
      {immersive && shown.length === 0 && loaded && <button type="button" className="story-view__close story-view__close--float" aria-label="Close stories, back to the map" onClick={onClose}><Icon name="close" size={20} /></button>}
      <button type="button" className={immersive ? "stories__add" : "cims-btn cims-btn--block"} onClick={startPosting} aria-label={session ? "Add your story" : "Sign in to add a story"}>
        {immersive ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg> : session ? "＋ Add your story" : "Sign in to add a story"}
      </button>
      {!immersive && (
        <label className="stories__heat">
          <input type="checkbox" checked={heat} onChange={(e) => setHeat(e.target.checked)} /> Show story heat map on the map
        </label>
      )}
    </div>
  );
}
