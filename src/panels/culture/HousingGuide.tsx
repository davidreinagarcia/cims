/** @file West vs East guide: a friendly, student-voice dialog for people deciding where to live. Only shows rows that have a source. */
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
        <h2 className="housing-guide__title">West vs East</h2>
        <p className="housing-guide__intro">{guide.intro}</p>
        <div className="housing-guide__cols" aria-hidden="true"><span>West</span><span>East</span></div>
        {guide.rows.map((r) => (
          <section key={r.topic} className="housing-guide__row">
            <h3>{r.topic}</h3>
            <div className="housing-guide__cells">
              <p>{r.west ?? "—"}</p>
              <p>{r.east ?? "—"}</p>
            </div>
            <a href={r.source_url} target="_blank" rel="noopener">source</a>
          </section>
        ))}
        <p className="housing-guide__draft">Still gathering the rest from real students. Know something? Tell the CIMS team.</p>
        <p className="housing-guide__links">
          {guide.official_links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener">{l.label}</a>)}
        </p>
      </div>
    </div>
  );
}
