/** @file Games tab content: guest profile (avatar, nickname, team), the list of open matches to join and the "new match" screen with numbered steps. */
import { useState } from "react";
import { GIcon } from "./GameIcons";
import { MODE_BLURB, MODE_LABEL, TEAMS } from "./data";
import { createGame, joinGame, setNickname, setTeam, useGames } from "./store";
import type { GameMode, LobbyGame, TeamId } from "./types";
import "./games.css";

const MINUTES = [5, 10, 15];

/** Lobby: who you are, matches you can join with one click, and a path to create your own. */
export default function GamesPanel() {
  const { profile, lobby } = useGames();
  const [creating, setCreating] = useState(false);
  if (creating) return <CreateScreen team={profile.team} onBack={() => setCreating(false)} />;
  return (
    <div className="games">
      <ProfileCard />
      <div className="games__head">
        <h2 className="games__title">Partidas abiertas</h2>
        <button type="button" className="cims-btn cims-btn--primary cims-btn--small" onClick={() => setCreating(true)}>+ Crear</button>
      </div>
      <ul className="games__list">
        {lobby.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
      </ul>
      <p className="games__note">
        <GIcon name="pin" size={16} />
        <span>Prototipo con jugadores simulados. Dentro de la partida, <b>Simular GPS</b> te deja moverte con un clic en el mapa.</span>
      </p>
    </div>
  );
}

function ProfileCard() {
  const { profile } = useGames();
  const [name, setName] = useState(profile.nickname);
  const commit = () => { const clean = name.trim(); if (clean.length >= 2) setNickname(clean); else setName(profile.nickname); };
  return (
    <section className="games__profile" aria-label="Tu perfil de invitado" style={{ ["--team" as string]: TEAMS[profile.team].color }}>
      <span className="games__avatar" aria-hidden="true">{profile.nickname.slice(0, 2).toUpperCase()}</span>
      <div className="games__who">
        <label className="games__eyebrow" htmlFor="games-nick">Jugando como</label>
        <span className="games__nickwrap">
          <input id="games-nick" className="games__nick" value={name} maxLength={20} spellCheck={false}
            onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
          <GIcon name="edit" size={14} />
        </span>
      </div>
      <TeamPicker value={profile.team} onChange={setTeam} compact />
    </section>
  );
}

function GameCard({ game: g, index }: { game: LobbyGame; index: number }) {
  const full = g.players >= g.capacity;
  return (
    <li className="game-card" style={{ ["--i" as string]: index }}>
      <span className="game-card__badge" aria-hidden="true"><GIcon name={g.mode} size={22} /></span>
      <div className="game-card__body">
        <strong className="game-card__name">{g.name}{g.mine && <span className="game-card__tag">Tuya</span>}</strong>
        <span className="game-card__meta">{MODE_LABEL[g.mode]}<i aria-hidden="true">·</i><GIcon name="clock" size={13} />{g.minutes} min</span>
        <span className="game-card__players" aria-label={`${g.players} de ${g.capacity} jugadores`}>
          <span className="game-card__pips" aria-hidden="true">
            {Array.from({ length: g.capacity }, (_, n) => <i key={n} data-on={n < g.players} />)}
          </span>
          {g.players}/{g.capacity}
        </span>
      </div>
      <button type="button" className="cims-btn cims-btn--primary cims-btn--small" disabled={full} onClick={() => joinGame(g.id)}>{full ? "Llena" : "Unirse"}</button>
    </li>
  );
}

function TeamPicker({ value, onChange, compact = false }: { value: TeamId; onChange: (t: TeamId) => void; compact?: boolean }) {
  return (
    <div className="games__teams" data-compact={compact} role="radiogroup" aria-label="Equipo">
      {(Object.keys(TEAMS) as TeamId[]).map((t) => (
        <button key={t} type="button" role="radio" aria-checked={value === t} aria-label={TEAMS[t].label} className="games__team"
          style={{ ["--team" as string]: TEAMS[t].color }} onClick={() => onChange(t)}>
          <i aria-hidden="true" />{compact ? "" : TEAMS[t].label}
        </button>
      ))}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="games__step">
      <legend><span className="games__num" aria-hidden="true">{n}</span>{title}</legend>
      {children}
    </fieldset>
  );
}

function CreateScreen({ team, onBack }: { team: TeamId; onBack: () => void }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<GameMode>("zones");
  const [minutes, setMinutes] = useState(10);
  const [mine, setMine] = useState<TeamId>(team);
  return (
    <form className="games" onSubmit={(e) => { e.preventDefault(); createGame({ name, mode, minutes, team: mine }); }}>
      <button type="button" className="games__back" onClick={onBack}><GIcon name="back" size={18} />Partidas</button>
      <h2 className="games__title games__title--big">Nueva partida</h2>

      <Step n={1} title="Nombre">
        <input className="games__input" value={name} maxLength={40} placeholder="Ej. Duelo en Tech Green" aria-label="Nombre de la partida" onChange={(e) => setName(e.target.value)} />
      </Step>
      <Step n={2} title="Modo de juego">
        <div className="games__tiles">
          {(Object.keys(MODE_LABEL) as GameMode[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} className="games__tile" onClick={() => setMode(m)}>
              <GIcon name={m} size={24} />
              <strong>{MODE_LABEL[m]}</strong>
              <span>{MODE_BLURB[m]}</span>
            </button>
          ))}
        </div>
      </Step>
      <Step n={3} title="Duración">
        <div className="games__segment" role="radiogroup">
          {MINUTES.map((m) => <button key={m} type="button" role="radio" aria-checked={minutes === m} className="games__seg" onClick={() => setMinutes(m)}>{m} min</button>)}
        </div>
      </Step>
      <Step n={4} title="Tu equipo">
        <TeamPicker value={mine} onChange={setMine} />
      </Step>
      <button type="submit" className="cims-btn cims-btn--primary cims-btn--block games__cta">Crear y jugar</button>
    </form>
  );
}
