/** @file Games state without a provider: a small external store (guest profile, lobby, running match) plus the 1 Hz engine that moves bots, scores zones and ends matches. Everything is client-side. */
import { useSyncExternalStore } from "react";
import { haversineMeters } from "../lib/geolocation";
import { BOT_NAMES, DROP_COUNT, DROP_POINTS, PLAY_AREA, RADIUS_M, SEED_LOBBY, START, ZONE_POINTS_PER_SECOND, zoneTemplates } from "./data";
import type { ActiveGame, Bot, Drop, GameMode, LngLat, LobbyGame, Profile, TeamId } from "./types";

/** Everything the UI and the map layer read. */
export interface GamesState {
  profile: Profile;
  lobby: LobbyGame[];
  game: ActiveGame | null;
  /** Where the player is: the click-to-move point in simulated mode, the device GPS otherwise. */
  player: LngLat;
  simulate: boolean;
  /** Why real GPS could not be used, shown in the HUD. */
  gpsMessage: string | null;
}

const PROFILE_KEY = "cims.games.profile.v1";
const BOT_SPEED_M = 14; // meters per second: brisk, so a 5-minute match is lively
const FEED_MAX = 4;

function loadProfile(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<Profile> | null;
    if (raw && typeof raw.nickname === "string" && (raw.team === "red" || raw.team === "blue")) return { nickname: raw.nickname, team: raw.team };
  } catch { /* corrupt or blocked storage: make a new guest */ }
  const profile: Profile = { nickname: `Estudiante_${10 + Math.floor(Math.random() * 90)}`, team: Math.random() < 0.5 ? "red" : "blue" };
  saveProfile(profile);
  return profile;
}
function saveProfile(profile: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* private mode: keep it in memory */ }
}

let state: GamesState = { profile: loadProfile(), lobby: SEED_LOBBY.map((g) => ({ ...g })), game: null, player: START, simulate: true, gpsMessage: null };
const listeners = new Set<() => void>();
let timer: number | undefined;
let watchId: number | undefined;
let joinedLobbyId: string | null = null;

function set(patch: Partial<GamesState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
function setGame(patch: Partial<ActiveGame>) {
  if (state.game) set({ game: { ...state.game, ...patch } });
}

/** Subscribe to any change (for the map layer). Returns the unsubscribe function. */
export function subscribeGames(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
/** Current snapshot. */
export function getGamesState(): GamesState {
  return state;
}
/** React hook over the games store. */
export function useGames(): GamesState {
  return useSyncExternalStore(subscribeGames, getGamesState);
}

/** Moves a point `meters` toward `to` (or lands on it). */
function stepToward(from: LngLat, to: LngLat, meters: number): LngLat {
  const d = haversineMeters(from, to);
  if (d <= meters) return { lng: to.lng, lat: to.lat };
  const k = meters / d;
  return { lng: from.lng + (to.lng - from.lng) * k, lat: from.lat + (to.lat - from.lat) * k };
}
function randomPoint(): LngLat {
  return { lng: PLAY_AREA.west + Math.random() * (PLAY_AREA.east - PLAY_AREA.west), lat: PLAY_AREA.south + Math.random() * (PLAY_AREA.north - PLAY_AREA.south) };
}
function pushFeed(feed: string[], line: string): string[] {
  return [line, ...feed].slice(0, FEED_MAX);
}

/** Changes the guest nickname (trimmed, 2 to 20 characters; ignored otherwise). */
export function setNickname(nickname: string) {
  const clean = nickname.trim().slice(0, 20);
  if (clean.length < 2) return;
  const profile = { ...state.profile, nickname: clean };
  saveProfile(profile);
  set({ profile });
}
/** Picks the team used for the next match. */
export function setTeam(team: TeamId) {
  const profile = { ...state.profile, team };
  saveProfile(profile);
  set({ profile });
}

function makeBots(count: number): Bot[] {
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) => ({
    id: `bot-${i}`, nickname: names[i], team: i % 2 === 0 ? "red" : "blue", ...randomPoint(), target: null, points: 0,
  }));
}

function startGame(meta: { id: string; name: string; mode: GameMode; minutes: number; capacity: number; listedPlayers: number }) {
  stopEngine();
  const drops: Drop[] = meta.mode === "drops"
    ? Array.from({ length: DROP_COUNT }, (_, i) => ({ id: `drop-${i}`, ...randomPoint(), claimedBy: null, team: null }))
    : [];
  const bots = makeBots(Math.min(4, Math.max(2, meta.listedPlayers - 1)));
  set({
    player: START,
    game: {
      id: meta.id, name: meta.name, mode: meta.mode, capacity: meta.capacity, listedPlayers: meta.listedPlayers,
      secondsLeft: meta.minutes * 60, finished: false,
      zones: meta.mode === "zones" ? zoneTemplates().slice(0, 8) : [], drops, bots,
      scores: { red: 0, blue: 0 }, playerPoints: 0, feed: [`Empieza ${meta.name}`],
    },
  });
  timer = window.setInterval(tick, 1000);
  if (!state.simulate) startWatch();
}

/** Joins a lobby match (a clean simulated session with 2 to 4 bots). Returns false when it is full. */
export function joinGame(id: string): boolean {
  const g = state.lobby.find((l) => l.id === id);
  if (!g || g.players >= g.capacity) return false;
  leaveGame();
  joinedLobbyId = id;
  set({ lobby: state.lobby.map((l) => (l.id === id ? { ...l, players: l.players + 1 } : l)) });
  startGame({ id: g.id, name: g.name, mode: g.mode, minutes: g.minutes, capacity: g.capacity, listedPlayers: g.players + 1 });
  return true;
}

/** Creates a match, lists it in the lobby and jumps straight into it. */
export function createGame(opts: { name: string; mode: GameMode; minutes: number; team: TeamId }) {
  leaveGame();
  setTeam(opts.team);
  const game: LobbyGame = { id: `mine-${Date.now()}`, name: opts.name.trim() || "Partida sin nombre", mode: opts.mode, minutes: opts.minutes, players: 1, capacity: 8, mine: true };
  joinedLobbyId = game.id;
  set({ lobby: [game, ...state.lobby] });
  startGame({ ...game, listedPlayers: 4 }); // a fresh room fills up with bots so it is not empty
}

/** Leaves the running match and removes every game layer from the map. Safe to call when nothing runs. */
export function leaveGame() {
  stopEngine();
  if (joinedLobbyId) {
    const id = joinedLobbyId;
    joinedLobbyId = null;
    set({ lobby: state.lobby.map((l) => (l.id === id ? { ...l, players: Math.max(1, l.players - 1) } : l)) });
  }
  if (state.game) set({ game: null });
}

function stopEngine() {
  window.clearInterval(timer);
  timer = undefined;
  stopWatch();
}

/** Turns click-to-move on or off; off asks the browser for the real GPS (falls back to click-to-move if refused). */
export function setSimulate(on: boolean) {
  set({ simulate: on, gpsMessage: null });
  if (on) stopWatch();
  else if (state.game) startWatch();
}
function startWatch() {
  stopWatch();
  if (!("geolocation" in navigator)) { set({ simulate: true, gpsMessage: "Este navegador no ofrece GPS." }); return; }
  watchId = navigator.geolocation.watchPosition(
    (p) => { set({ player: { lng: p.coords.longitude, lat: p.coords.latitude } }); checkDrops(); },
    () => { stopWatch(); set({ simulate: true, gpsMessage: "GPS no disponible: usa clic para moverte." }); },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
  );
}
function stopWatch() {
  if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
  watchId = undefined;
}

/** Click-to-move: puts the player at a point (only in simulated mode). */
export function teleport(point: LngLat) {
  if (!state.game || state.game.finished || !state.simulate) return;
  set({ player: point });
  checkDrops();
}

/** The zone the player stands in that their team does not hold yet (the "Capturar Zona" target), or null. */
export function capturableZone(s: GamesState = state) {
  const g = s.game;
  if (!g || g.finished || g.mode !== "zones") return null;
  return g.zones.find((z) => z.owner !== s.profile.team && haversineMeters(s.player, z) <= RADIUS_M) ?? null;
}

/** Captures the zone under the player for their team. */
export function captureZone() {
  const g = state.game;
  const zone = capturableZone();
  if (!g || !zone) return;
  setGame({
    zones: g.zones.map((z) => (z.id === zone.id ? { ...z, owner: state.profile.team } : z)),
    playerPoints: g.playerPoints + 50,
    feed: pushFeed(g.feed, `Capturaste ${zone.name}`),
  });
}

/** Claims every unclaimed drop the player is standing in. */
function checkDrops() {
  const g = state.game;
  if (!g || g.finished || g.mode !== "drops") return;
  const hit = g.drops.filter((d) => !d.claimedBy && haversineMeters(state.player, d) <= RADIUS_M);
  if (!hit.length) return;
  const ids = new Set(hit.map((d) => d.id));
  const team = state.profile.team;
  const drops = g.drops.map((d) => (ids.has(d.id) ? { ...d, claimedBy: state.profile.nickname, team } : d));
  setGame({
    drops, playerPoints: g.playerPoints + DROP_POINTS * hit.length,
    scores: { ...g.scores, [team]: g.scores[team] + DROP_POINTS * hit.length },
    feed: pushFeed(g.feed, `Reclamaste un drop (+${DROP_POINTS * hit.length})`),
    finished: drops.every((d) => d.claimedBy),
  });
  if (state.game?.finished) stopEngine();
}

/** One second of the match: clock, zone income, bot movement and bot captures. */
function tick() {
  const g = state.game;
  if (!g || g.finished) return;
  let { zones, drops, scores, feed } = g;

  if (g.mode === "zones") {
    const owned = (t: TeamId) => zones.filter((z) => z.owner === t).length * ZONE_POINTS_PER_SECOND;
    scores = { red: scores.red + owned("red"), blue: scores.blue + owned("blue") };
  }

  const bots = g.bots.map((bot) => {
    let b = bot;
    if (!b.target) b = { ...b, target: pickTarget(b, zones, drops) };
    const target = b.target;
    if (!target) return b;
    b = { ...b, ...stepToward(b, target, BOT_SPEED_M) };
    if (haversineMeters(b, target) > 1) return b;
    // Arrived: try to take what is here, then choose a new place next second.
    if (g.mode === "zones") {
      const zone = zones.find((z) => haversineMeters(b, z) <= RADIUS_M && z.owner !== b.team);
      if (zone && Math.random() < 0.6) {
        zones = zones.map((z) => (z.id === zone.id ? { ...z, owner: b.team } : z));
        feed = pushFeed(feed, `${b.nickname} capturó ${zone.name}`);
        b = { ...b, points: b.points + 50 };
      }
    } else {
      const drop = drops.find((d) => !d.claimedBy && haversineMeters(b, d) <= RADIUS_M);
      if (drop) {
        drops = drops.map((d) => (d.id === drop.id ? { ...d, claimedBy: b.nickname, team: b.team } : d));
        scores = { ...scores, [b.team]: scores[b.team] + DROP_POINTS };
        feed = pushFeed(feed, `${b.nickname} reclamó un drop`);
        b = { ...b, points: b.points + DROP_POINTS };
      }
    }
    return { ...b, target: null };
  });

  const secondsLeft = g.secondsLeft - 1;
  const finished = secondsLeft <= 0 || (g.mode === "drops" && drops.every((d) => d.claimedBy));
  set({ game: { ...g, zones, drops, bots, scores, feed, secondsLeft: Math.max(0, secondsLeft), finished } });
  if (finished) stopEngine();
  else checkDrops();
}

/** Where a bot heads next: an enemy or neutral zone, the nearest few drops, or just a wander. */
function pickTarget(bot: Bot, zones: ActiveGame["zones"], drops: Drop[]): LngLat | null {
  if (zones.length) {
    const open = zones.filter((z) => z.owner !== bot.team);
    if (open.length && Math.random() < 0.85) return open[Math.floor(Math.random() * open.length)];
    return randomPoint();
  }
  const free = drops.filter((d) => !d.claimedBy).sort((a, b) => haversineMeters(bot, a) - haversineMeters(bot, b));
  if (!free.length) return null;
  return free[Math.floor(Math.random() * Math.min(2, free.length))];
}
