/** @file Floating HUD of a running match: clock, tug-of-war score bar, objective pips, contextual capture button, activity feed, GPS-simulation switch and exit; a result card when the match ends. */
import { GIcon } from "./GameIcons";
import { MODE_LABEL, TEAMS } from "./data";
import { capturableZone, captureZone, leaveGame, rematch, setSimulate, useGames } from "./store";
import type { TeamId } from "./types";
import "./games.css";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const style = (t: TeamId) => ({ ["--team" as string]: TEAMS[t].color });

/** Compact card over the map while a match runs. Renders nothing outside one. */
export default function GameHud() {
  const s = useGames();
  const g = s.game;
  if (!g) return null;
  const mine = s.profile.team;
  const { red, blue } = g.scores;
  const total = red + blue;
  const redShare = total === 0 ? 50 : Math.min(92, Math.max(8, (red / total) * 100));
  const lead: TeamId | null = red === blue ? null : red > blue ? "red" : "blue";
  const near = capturableZone(s);
  const low = !g.finished && g.secondsLeft <= 30;

  return (
    <aside className="game-hud" aria-label="Partida en curso" data-finished={g.finished}>
      <header className="game-hud__top">
        <span className="game-hud__badge" aria-hidden="true"><GIcon name={g.mode} size={20} /></span>
        <div className="game-hud__title">
          <strong>{g.name}</strong>
          <span>{MODE_LABEL[g.mode]}</span>
        </div>
        <span className="game-hud__clock" data-low={low} role="timer" aria-label="Tiempo restante">{clock(g.secondsLeft)}</span>
      </header>

      <div className="game-hud__scores">
        <div className="game-hud__side" style={style("red")}><i />{TEAMS.red.label.replace("Equipo ", "")}{mine === "red" && <em>tú</em>}<b>{red}</b></div>
        <div className="game-hud__side game-hud__side--end" style={style("blue")}><b>{blue}</b>{mine === "blue" && <em>tú</em>}{TEAMS.blue.label.replace("Equipo ", "")}<i /></div>
      </div>
      <div className="game-hud__bar" aria-hidden="true">
        <span style={{ width: `${redShare}%`, background: TEAMS.red.color }} />
        <span style={{ width: `${100 - redShare}%`, background: TEAMS.blue.color }} />
      </div>

      {g.finished ? (
        <section className="game-hud__result" role="status" style={lead ? style(lead) : undefined}>
          <span className="game-hud__trophy"><GIcon name="trophy" size={26} /></span>
          <strong>{lead ? `Gana el ${TEAMS[lead].label}` : "Empate"}</strong>
          <span>{lead === mine ? "¡Buen trabajo, equipo!" : lead ? "Quedan revanchas." : "Igualados hasta el final."} Tus puntos: <b>{g.playerPoints}</b></span>
          <div className="game-hud__actions">
            <button type="button" className="cims-btn cims-btn--primary cims-btn--small" onClick={rematch}><GIcon name="replay" size={16} />Revancha</button>
            <button type="button" className="cims-btn cims-btn--small" onClick={leaveGame}>Salir</button>
          </div>
        </section>
      ) : (
        <>
          {g.mode === "zones" ? (
            <div className="game-hud__pips" aria-label="Zonas">
              {g.zones.map((z, i) => <span key={z.id} title={z.name} data-owner={z.owner ?? "none"}>{i + 1}</span>)}
            </div>
          ) : (
            <div className="game-hud__pips" aria-label={`${g.drops.filter((d) => d.claimedBy).length} de ${g.drops.length} drops`}>
              {g.drops.map((d) => <span key={d.id} data-owner={d.team ?? "none"}>{d.claimedBy ? <GIcon name="check" size={14} /> : "+"}</span>)}
            </div>
          )}

          {near ? (
            <button type="button" className="game-hud__capture" onClick={captureZone}>
              <GIcon name="zones" size={18} /><span>Capturar Zona<small>{near.name}</small></span>
            </button>
          ) : (
            <p className="game-hud__hint">
              {g.mode === "zones" ? "Entra en un círculo para capturarlo. Cada zona tuya suma 1 punto por segundo." : "Entra en el radio de un drop antes que los demás: +100."}
            </p>
          )}

          <ul className="game-hud__feed" aria-live="polite">
            {g.feed.map((f) => <li key={f.id} style={f.team ? style(f.team) : undefined}><i />{f.text}</li>)}
          </ul>
        </>
      )}

      <footer className="game-hud__foot">
        <label className="game-hud__switch">
          <input type="checkbox" role="switch" checked={s.simulate} onChange={(e) => setSimulate(e.target.checked)} />
          <span className="game-hud__track" aria-hidden="true" />
          <span className="game-hud__switchtext">Simular GPS<small>{s.simulate ? "Clic en el mapa para moverte" : "Usando tu ubicación real"}</small></span>
        </label>
        {!g.finished && <button type="button" className="cims-btn cims-btn--small game-hud__exit" onClick={leaveGame}><GIcon name="exit" size={15} />Salir</button>}
        {s.gpsMessage && <span className="game-hud__warn" role="status">{s.gpsMessage}</span>}
      </footer>
    </aside>
  );
}
