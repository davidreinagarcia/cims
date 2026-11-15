/** @file BuzzPrint: full-screen personal portfolio of Bulletin posts marked "Interested", landing on a folder you open. */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { POST_TYPES } from "../lib/bulletin";
import { useAuth } from "../state/auth";
import { useSelection } from "../state/selection";
import { Icon } from "../shell/icons";
import { MAX_PHOTO_BYTES } from "./localAdapter";
import { addPortfolioPhoto, ensureLoaded, usePortfolio } from "./store";
import type { PortfolioEntry } from "./types";
import "./portfolio.css";

const FOCUSABLE = "button:not([disabled]), input, a[href], [tabindex]:not([tabindex='-1'])";
const dayLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric", year: "numeric" });
const timeLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
const typeLabel = (type: PortfolioEntry["postType"]) => POST_TYPES.find((item) => item.id === type)?.label ?? type;

function prefersReducedMotion(): boolean {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** A hand-drawn ink-line manila folder, in the survey-map idiom (hairlines + hatching, no shadows or gradients). */
function FolderArt() {
  return (
    <svg className="buzzprint-folder__art" viewBox="0 0 200 150" width="200" height="150" aria-hidden="true" focusable="false">
      <path d="M8 36 L8 26 L70 26 L84 40 L192 40 L192 134 L8 134 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M8 50 L192 50" stroke="var(--ink)" strokeWidth="2" />
      <path d="M22 62 L22 122 M34 62 L34 122 M46 62 L46 122 M58 62 L58 122" stroke="var(--gold-ink)" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

function dayKeyAndLabel(entry: PortfolioEntry): { key: string; label: string } {
  const label = dayLabel.format(new Date(entry.startAt ?? entry.savedAt));
  return { key: label, label };
}

function timeFor(entry: PortfolioEntry): string {
  if (entry.startAt === undefined) return entry.when;
  const start = timeLabel.format(new Date(entry.startAt));
  return entry.endAt === undefined ? start : `${start}–${timeLabel.format(new Date(entry.endAt))}`;
}

function EntryCard({ entry, accountId, onGuide }: { entry: PortfolioEntry; accountId: string; onGuide: (entry: PortfolioEntry) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const onFile = async (file: File) => {
    setBusy(true);
    setNotice("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl.length > MAX_PHOTO_BYTES) {
        setNotice("That photo is large. BuzzPrint stores photos in this browser's local storage, which has limited " +
          "space — it's showing now, but it (or an older one) may not be there after a reload.");
      }
      await addPortfolioPhoto(accountId, entry.id, { dataUrl, addedAt: Date.now() });
    } catch {
      setNotice("Could not read that photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="buzzprint-card">
      {entry.posterUrl && <img className="buzzprint-card__poster" src={entry.posterUrl} alt={`Poster for ${entry.postTitle}`} loading="lazy" />}
      <p className="buzzprint-card__what cims-caps">{typeLabel(entry.postType)}{entry.org && <> · {entry.org}</>}</p>
      <h4 className="buzzprint-card__title">{entry.postTitle}</h4>
      <p className="buzzprint-card__when">{timeFor(entry)}</p>
      {entry.placeName && <p className="buzzprint-card__where">{entry.placeName}</p>}
      {entry.placeId && (
        <button type="button" className="cims-btn cims-btn--small" onClick={() => onGuide(entry)}>
          {entry.placeKind === "room" ? "Guide me to the room" : "Show on map"}
        </button>
      )}
      {entry.photos.length > 0 && (
        <ul className="buzzprint-card__photos" aria-label="Your photos">
          {entry.photos.map((photo) => <li key={photo.id}><img src={photo.dataUrl} alt="" /></li>)}
        </ul>
      )}
      {notice && <p className="buzzprint-card__notice" role="status">{notice}</p>}
      <button type="button" className="cims-btn cims-btn--small" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Adding…" : "+ Add a photo"}
      </button>
      <input ref={input} type="file" accept="image/*" hidden aria-label={`Add a photo to ${entry.postTitle}`}
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void onFile(file); }} />
    </li>
  );
}

/** Full-page BuzzPrint view, opened the same way the Bulletin is: its own open flag outside the shell's panel switch. */
export default function PortfolioPage({ onClose }: { onClose: () => void }) {
  const { session, dialogOpen } = useAuth();
  const { select } = useSelection();
  const { entries, loaded } = usePortfolio();
  const [opened, setOpened] = useState(false);
  const [shrinking, setShrinking] = useState(false);
  const root = useRef<HTMLDialogElement>(null);

  useEffect(() => { void ensureLoaded(session?.accountId ?? null); }, [session?.accountId]);
  useEffect(() => {
    const element = root.current;
    element?.showModal();
    element?.focus();
    return () => { element?.close(); };
  }, []);

  const openFolder = () => {
    if (prefersReducedMotion()) { setOpened(true); return; }
    setShrinking(true);
  };

  const groups = useMemo(() => {
    const byDay = new Map<string, { label: string; items: PortfolioEntry[] }>();
    for (const entry of entries) {
      const { key, label } = dayKeyAndLabel(entry);
      const group = byDay.get(key) ?? { label, items: [] };
      group.items.push(entry);
      byDay.set(key, group);
    }
    return [...byDay.values()];
  }, [entries]);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (dialogOpen) return;
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const items = Array.from(root.current!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === root.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <dialog ref={root} className="buzzprint" role="dialog" aria-modal="true" aria-labelledby="buzzprint-title" tabIndex={-1}
      onKeyDown={onKeyDown} onCancel={(event) => { event.preventDefault(); if (!dialogOpen) onClose(); }}>
      <header className="buzzprint__bar">
        <h2 id="buzzprint-title" className="buzzprint__title">BuzzPrint</h2>
        <button type="button" className="buzzprint__back" onClick={onClose}>
          <Icon name="left" size={18} /> Back to map
        </button>
      </header>
      <div className="buzzprint__surface">
        {!opened ? (
          <button type="button" className={`buzzprint-folder${shrinking ? " buzzprint-folder--shrink" : ""}`}
            aria-label="Open your BuzzPrint portfolio" onClick={openFolder}
            onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === "transform") setOpened(true); }}>
            <FolderArt />
            <span className="buzzprint-folder__label cims-caps">Portfolio</span>
          </button>
        ) : !loaded ? (
          <p className="cims-empty" role="status">Loading your portfolio…</p>
        ) : entries.length === 0 ? (
          <p className="cims-empty" role="status">
            <strong>No activities saved yet</strong>
            <span>Mark a post "Interested" on the Campus Bulletin to start your BuzzPrint.</span>
          </p>
        ) : (
          <div className="buzzprint-list">
            {groups.map(({ label, items }) => (
              <section key={label} className="buzzprint-day">
                <h3 className="buzzprint-day__title cims-caps">{label}</h3>
                <ul className="buzzprint-day__cards">
                  {items.map((entry) => <EntryCard key={entry.id} entry={entry} accountId={entry.accountId}
                    onGuide={(item) => { select({ kind: item.placeKind ?? "place", id: item.placeId! }); onClose(); }} />)}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
