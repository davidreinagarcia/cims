/** @file Door sticker generator for maintenance: pick a building, see every entrance with its link and QR, copy/test the link, download SVG or PNG, or print a sheet of stickers. */
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { doorUrl, indoorBuildings } from "../../indoor/registry";
import type { IndoorBuilding, IndoorEntrance } from "../../indoor/types";
import { qrPng, qrSvg } from "../../lib/qr";

/** Address printed on stickers: always production, because a sticker must outlive any preview. */
const PRODUCTION = "https://cims.queenalexandria.online";

function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** One printed sticker: QR, where it is, and a readable line for people who cannot scan. */
function Sticker({ building, door, link }: { building: IndoorBuilding; door: IndoorEntrance; link: string }) {
  return (
    <figure className="sticker">
      <div className="sticker__qr" dangerouslySetInnerHTML={{ __html: qrSvg(link, 240) }} />
      <figcaption>
        <strong>{building.title}</strong>
        <span>{door.name} · Level {door.level}</span>
        <span className="sticker__line">Scan to find your room</span>
        <span className="sticker__url">cims.queenalexandria.online</span>
      </figcaption>
    </figure>
  );
}

/** Link and QR generator for the entrance stickers, one list per building. */
export default function DoorStickers() {
  const buildings = useMemo(() => indoorBuildings().filter((b) => b.graph?.entrances.length), []);
  const [slug, setSlug] = useState(buildings[0]?.slug ?? "");
  const [testSite, setTestSite] = useState(false);
  const [picked, setPicked] = useState<Set<string> | null>(null); // null = all doors
  const [note, setNote] = useState<string | null>(null);
  const building = buildings.find((b) => b.slug === slug) ?? buildings[0];
  if (!building) return <p className="cims-empty">No building with indoor entrances yet.</p>;

  const origin = testSite ? window.location.origin : PRODUCTION;
  const doors = building.graph!.entrances;
  const chosen = doors.filter((d) => !picked || picked.has(d.id));
  const link = (d: IndoorEntrance) => doorUrl(origin, building, d.id);
  const toggle = (id: string) => {
    const next = new Set(picked ?? doors.map((d) => d.id));
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };
  const flash = (m: string) => { setNote(m); window.setTimeout(() => setNote(null), 2500); };
  const copy = async (d: IndoorEntrance) => {
    try { await navigator.clipboard.writeText(link(d)); flash(`Copied the link for ${d.name}`); } catch { flash("Your browser blocked copying; select the link by hand."); }
  };
  const file = (d: IndoorEntrance, ext: string) => `cims-${building.slug}-${d.id}.${ext}`;

  return (
    <div className="stickers">
      <div className="stickers__tools">
        <label className="maint__status"><span>Building</span>
          <select value={building.slug} onChange={(e) => { setSlug(e.target.value); setPicked(null); }}>
            {buildings.map((b) => <option key={b.slug} value={b.slug}>{b.title} ({b.graph!.entrances.length} doors)</option>)}
          </select>
        </label>
        <label className="maint__check"><input type="checkbox" checked={testSite} onChange={(e) => setTestSite(e.target.checked)} /> Test with this site's address ({window.location.host}) instead of the production one</label>
        <div className="stickers__bulk">
          <button type="button" className="cims-btn" onClick={() => setPicked(null)}>Select all</button>
          <button type="button" className="cims-btn" onClick={() => setPicked(new Set())}>Select none</button>
          <button type="button" className="cims-btn cims-btn--primary" disabled={!chosen.length} onClick={() => window.print()}>Print {chosen.length} sticker{chosen.length === 1 ? "" : "s"}</button>
        </div>
        {note && <p className="stickers__note" role="status">{note}</p>}
        {testSite && <p className="police__error" role="status">These QR codes point to this site, not production. Do not print them for the doors.</p>}
      </div>

      <ul className="stickers__list">
        {doors.map((d) => (
          <li key={d.id} className="stickers__item">
            <label className="stickers__pick"><input type="checkbox" checked={!picked || picked.has(d.id)} onChange={() => toggle(d.id)} aria-label={`Include ${d.name}`} /></label>
            <div className="stickers__qr" dangerouslySetInnerHTML={{ __html: qrSvg(link(d), 120) }} />
            <div className="stickers__info">
              <h3 className="stickers__name">{d.name}</h3>
              <p className="cims-muted">Level {d.level}{d.note ? ` · ${d.note}` : ""}</p>
              <input className="stickers__link" readOnly value={link(d)} onFocus={(e) => e.currentTarget.select()} aria-label={`Link for ${d.name}`} />
              <div className="maint__actions">
                <button type="button" className="cims-btn" onClick={() => copy(d)}>Copy link</button>
                <a className="cims-btn" href={link(d)} target="_blank" rel="noopener noreferrer">Test it</a>
                <button type="button" className="cims-btn" onClick={() => save(new Blob([qrSvg(link(d), 1024)], { type: "image/svg+xml" }), file(d, "svg"))}>SVG</button>
                <button type="button" className="cims-btn" onClick={() => void qrPng(link(d)).then((b) => save(b, file(d, "png"))).catch(() => flash("Could not make the PNG."))}>PNG</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="cims-muted stickers__help">Positions come from schematic plans and are approximate: after sticking one, scan it with a phone and check that it opens the right door.</p>

      {createPortal(
        <div id="sticker-print" aria-hidden="true">{chosen.map((d) => <Sticker key={d.id} building={building} door={d} link={link(d)} />)}</div>,
        document.body,
      )}
    </div>
  );
}
