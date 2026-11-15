/** @file The culture reader: a notebook-paper card with the "big sib" welcome letter, then one sourced note at a time with Previous / Next so someone off campus can walk the traditions as a tour. */
import { useEffect, useRef } from "react";
import { setCulture, setGuide, setNote, setReader, useCulture } from "../../culture/store";
import { CULTURE_NOTES, doodleFor } from "../../culture/notes";

/** Shown while the culture layer is on; mount once in the shell. */
export default function CultureReader() {
  const { on, note, reader } = useCulture();
  const card = useRef<HTMLElement>(null);
  useEffect(() => { card.current?.scrollTo({ top: 0 }); }, [note]);
  if (!on) return null;
  if (!reader) {
    return <button type="button" className="culture-reader__reopen" onClick={() => setNote(note)}>📝 My notes</button>;
  }
  const index = CULTURE_NOTES.findIndex((n) => n.id === note);
  const current = index >= 0 ? CULTURE_NOTES[index] : undefined;
  const go = (i: number) => setNote(CULTURE_NOTES[(i + CULTURE_NOTES.length) % CULTURE_NOTES.length].id);

  return (
    <article ref={card} className="culture-reader" aria-label={current ? `Note: ${current.title}` : "Welcome letter"} aria-live="polite">
      <button type="button" className="culture-reader__close" aria-label="Hide notes" onClick={() => setReader(false)}>×</button>
      {!current ? <>
        <div className="culture-reader__head">
          <img src={doodleFor("big-sib")} alt="" />
          <h2>Hey, welcome to Tech!</h2>
        </div>
        <p className="culture-reader__hand">
          I left you some notes around campus with the stuff nobody explains on the tour: the traditions, the songs, the legends.
          You don't have to be here to get it. Tap any note on the map, or let me walk you through them one by one.
        </p>
        <p className="culture-reader__hand">Every note links to where I got it, so you know it's real.</p>
        <p className="culture-reader__sign">— your big sib</p>
        <div className="culture-reader__nav">
          <button type="button" className="cims-btn cims-btn--primary culture-reader__wide" onClick={() => go(0)}>Start the tour ({CULTURE_NOTES.length} notes) →</button>
          <button type="button" className="cims-btn culture-reader__wide" onClick={() => setGuide(true)}>West vs East: where to live?</button>
          <button type="button" className="cims-btn culture-reader__wide" onClick={() => setCulture(false)}>Back to the regular map</button>
        </div>
      </> : <>
        <p className="culture-reader__count">Note {index + 1} of {CULTURE_NOTES.length}</p>
        <div className="culture-reader__head">
          <img src={doodleFor(current.id)} alt="" />
          <div>
            <h2>{current.title}</h2>
            {current.tag && <span className="culture-reader__tag">{current.tag}</span>}
          </div>
        </div>
        {current.when && <p className="culture-reader__row"><b>When</b>{current.when}</p>}
        {(current.where || current.anywhere) && <p className="culture-reader__row"><b>Where</b>{current.where ?? "Not one spot, it's everywhere"}</p>}
        <p className="culture-reader__text">{current.text}</p>
        {!!current.facts?.length && <ul className="culture-reader__facts">{current.facts.map((f) => <li key={f}>{f}</li>)}</ul>}
        {current.tip && <p className="culture-reader__tip">psst: {current.tip}</p>}
        <p className="culture-reader__src">Source: <a href={current.source_url} target="_blank" rel="noopener noreferrer">{new URL(current.source_url).hostname}</a></p>
        <div className="culture-reader__nav">
          <button type="button" className="cims-btn" onClick={() => go(index - 1)}>← Previous</button>
          <button type="button" className="cims-btn cims-btn--primary" onClick={() => go(index + 1)}>Next →</button>
          <button type="button" className="cims-btn culture-reader__wide" onClick={() => setNote(null)}>Back to the letter</button>
        </div>
      </>}
    </article>
  );
}
