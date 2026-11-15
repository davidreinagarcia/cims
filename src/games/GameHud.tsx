/** @file Floating HUD of a running match: team scores, clock, contextual capture button, activity feed, click-to-move toggle and exit. */
import { MODE_LABEL, TEAMS } from "./data";
import { captureZone, capturableZone, leaveGame, setSimulate, useGames } from "./store";
import type { TeamId } from "./types";
import "./games.css";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Compact card over the map while a match runs. Renders nothing outside one. */
export default function GameHud() {
  const s = useGames();
  const g = s.game;
  if (!g) return null;
  const near = capturableZone(s);
  const lead: TeamId | null = g.scores.red === g.scores.blue ? null : g.scores.red > g.scores.blue ? "red" : "blue";
  const mine = s.profile.team;
  const claimed = g.drops.filter((d) => d.claimedBy).length;
  return (
    <aside className="game-hud" aria-label="Partida en curso">
      <header className="game-hud__top">
        <div>
          <strong className="game-hud__name">{g.name}</strong>
          <span className="game-hud__mode">{MODE_LABEL[g.mode]}{g.mode === "drops" ? ` · ${claimed}/${g.drops.length} drops` : ""}</span>
        </div>
        <span className="game-hud__clock" role="timer" aria-label="Tiempo restante">{clock(g.secondsLeft)}</span>
      </header>

      <div className="game-hud__scores">
        {(["red", "blue"] as TeamId[]).map((t) => (
          <div key={t} className="game-hud__score" data-lead={lead === t} style={{ ["--team" as string]: TEAMS[t].color }}>
            <span>{TEAMS[t].label}{mine === t ? " (tú)" : ""}</span>
            <strong>{g.scores[t]}</strong>
          </div>
        ))}
      </div>

      {g.finished ? (
        <p className="game-hud__result" role="status">
          {lead ? `Gana el ${TEAMS[lead].label}${lead === mine ? ": ¡ganasteis!" : ""}` : "Empate"} · tus puntos: {g.playerPoints}
        </p>
      ) : near ? (
        <button type="button" className="cims-btn cims-btn--primary cims-btn--block" onClick={captureZone}>Capturar Zona: {near.name}</button>
      ) : g.mode === "zones" ? (
        <p className="game-hud__hint">Acércate a una zona (25 m) para capturarla. Cada zona tuya suma 1 punto por segundo.</p>
      ) : (
        <p className="game-hud__hint">Entra en el radio de un drop antes que los demás: +100 puntos.</p>
      )}

      <ul className="game-hud__feed" aria-live="polite">{g.feed.map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}</ul>

      <footer className="game-hud__foot">
        <label className="game-hud__toggle">
          <input type="checkbox" checked={s.simulate} onChange={(e) => setSimulate(e.target.checked)} />
          <span>Simular GPS: clic en el mapa para moverte</span>
        </label>
        {s.gpsMessage && <span className="game-hud__warn" role="status">{s.gpsMessage}</span>}
        <button type="button" className="cims-btn cims-btn--small" onClick={leaveGame}>Salir de la partida</button>
      </footer>
    </aside>
  );
}
