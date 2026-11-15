/** @file West vs East guide: a friendly, student-voice dialog for people deciding where to live. Every row says who said it and links its source. */
import { useEffect, useRef } from "react";
import guide from "../../data/housing-guide.json";
import { setGuide, useCulture } from "../../culture/store";
import "./housing-guide.css";

/** The West vs East dialog. Mount once in the shell; opens from the layers panel or the map's "West campus?" notes. */
export default function HousingGuide() {
  const open = useCulture().guide;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) root.current?.querySelector<HTMLElement>("button")?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="housing-guide__scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) setGuide(false); }}>
      <div ref={root} className="housing-guide" role="dialog" aria-modal="true" aria-label="West vs East campus"
        onKeyDown={(e) => { if (e.key === "Escape") setGuide(false); }}>
        <button type="button" className="housing-guide__close" aria-label="Close" onClick={() => setGuide(false)}>×</button>
        <h2 className="housing-guide__title">West vs East 🏠</h2>
        <p className="housing-guide__intro">{guide.intro}</p>

        <div className="housing-guide__verdict">
          <div><b>Pick East if…</b><p>{guide.verdict.east}</p></div>
          <div><b>Pick West if…</b><p>{guide.verdict.west}</p></div>
          <small>{guide.verdict.label}</small>
        </div>

        <div className="housing-guide__cols" aria-hidden="true"><span>West</span><span>East</span></div>
        {guide.rows.map((r) => (
          <section key={r.topic} className="housing-guide__row">
            <h3>{r.topic} <span className={`housing-guide__badge housing-guide__badge--${r.kind}`}>{r.kind === "official" ? "official" : "student take"}</span></h3>
            {"both" in r && r.both
              ? <p className="housing-guide__both">{r.both}</p>
              : <div className="housing-guide__cells"><p>{r.west ?? "—"}</p><p>{r.east ?? "—"}</p></div>}
            <p className="housing-guide__by">{r.by} · <a href={r.source_url} target="_blank" rel="noopener">source</a></p>
          </section>
        ))}

        <section className="housing-guide__row">
          <h3>Which halls are where <span className="housing-guide__badge housing-guide__badge--student">student take</span></h3>
          <div className="housing-guide__cells">
            <p>{guide.halls.west.join(", ")}</p>
            <p>{guide.halls.east.join(", ")}</p>
          </div>
          <p className="housing-guide__by">{guide.halls.by} · <a href={guide.halls.source_url} target="_blank" rel="noopener">source</a></p>
        </section>

        <p className="housing-guide__draft">{guide.caveat}</p>
        <p className="housing-guide__links">
          {guide.official_links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener">{l.label}</a>)}
        </p>
      </div>
    </div>
  );
}
