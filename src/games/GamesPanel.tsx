/** @file Games tab content: guest profile (nickname + team), the list of open matches to join and the "create match" form. */
import { useState } from "react";
import { MODE_LABEL, TEAMS } from "./data";
import { createGame, joinGame, setNickname, setTeam, useGames } from "./store";
import type { GameMode, TeamId } from "./types";
import "./games.css";

const MINUTES = [5, 10, 15];

/** Lobby: shows who you are, lets you join a listed match with one click or create your own. */
export default function GamesPanel() {
  const { profile, lobby } = useGames();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(profile.nickname);
  return (
    <div className="games">
      <section className="games__profile" aria-label="Tu perfil de invitado">
        <label className="games__label" htmlFor="games-nick">Apodo</label>
        <input id="games-nick" className="games__input" value={name} maxLength={20}
          onChange={(e) => setName(e.target.value)} onBlur={() => { setNickname(name); setName((n) => n.trim().length >= 2 ? n.trim() : profile.nickname); }} />
        <TeamPicker value={profile.team} onChange={setTeam} />
      </section>

      <div className="games__head">
        <h2 className="games__title">Partidas abiertas</h2>
        <button type="button" className="cims-btn cims-btn--small" aria-expanded={creating} onClick={() => setCreating(!creating)}>
          {creating ? "Cancelar" : "Crear partida"}
        </button>
      </div>

      {creating && <CreateForm team={profile.team} />}

      <ul className="games__list">
        {lobby.map((g) => (
          <li key={g.id} className="games__item">
            <div className="games__itemtext">
              <strong>{g.name}{g.mine ? " (tuya)" : ""}</strong>
              <span>{MODE_LABEL[g.mode]} · {g.minutes} min · {g.players}/{g.capacity} jugadores</span>
            </div>
            <button type="button" className="cims-btn cims-btn--primary cims-btn--small" disabled={g.players >= g.capacity} onClick={() => joinGame(g.id)}>
              {g.players >= g.capacity ? "Llena" : "Unirse"}
            </button>
          </li>
        ))}
      </ul>
      <p className="games__note">Prototipo: los demás jugadores son simulados. En la partida, activa «Clic para moverte» para probar sin salir de casa.</p>
    </div>
  );
}

function TeamPicker({ value, onChange }: { value: TeamId; onChange: (t: TeamId) => void }) {
  return (
    <div className="games__teams" role="radiogroup" aria-label="Equipo">
      {(Object.keys(TEAMS) as TeamId[]).map((t) => (
        <button key={t} type="button" role="radio" aria-checked={value === t} className="games__team" style={{ ["--team" as string]: TEAMS[t].color }} onClick={() => onChange(t)}>
          {TEAMS[t].label}
        </button>
      ))}
    </div>
  );
}

function CreateForm({ team }: { team: TeamId }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<GameMode>("zones");
  const [minutes, setMinutes] = useState(10);
  const [mine, setMine] = useState<TeamId>(team);
  return (
    <form className="games__form" onSubmit={(e) => { e.preventDefault(); createGame({ name, mode, minutes, team: mine }); }}>
      <label className="games__label" htmlFor="games-name">Nombre de la partida</label>
      <input id="games-name" className="games__input" value={name} maxLength={40} placeholder="Ej. Duelo en Tech Green" onChange={(e) => setName(e.target.value)} />
      <span className="games__label">Modo de juego</span>
      <Segment value={mode} onChange={setMode} options={[["zones", MODE_LABEL.zones], ["drops", MODE_LABEL.drops]]} />
      <span className="games__label">Duración</span>
      <Segment value={minutes} onChange={setMinutes} options={MINUTES.map((m) => [m, `${m} min`] as [number, string])} />
      <span className="games__label">Tu equipo</span>
      <TeamPicker value={mine} onChange={setMine} />
      <button type="submit" className="cims-btn cims-btn--primary cims-btn--block">Crear y jugar</button>
    </form>
  );
}

function Segment<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="games__segment" role="radiogroup">
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className="games__seg" onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}
