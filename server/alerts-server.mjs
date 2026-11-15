/** @file Real-time campus alerts backend (no dependencies): GTPD alarms, citizen police tips, one live stream for everyone. */
import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = process.env.CIMS_DATA_DIR ?? new URL("./data", import.meta.url).pathname;
// The access code GTPD types in the police view. Without it nobody can launch or end alarms.
const POLICE_KEY = process.env.CIMS_POLICE_KEY ?? "";
const MAX_BODY = 1_000_000; // bytes; a tip photo is a ~100 KB JPEG data URL
const MAX_PHOTO = 600_000; // characters of data URL
const ENDED_VISIBLE_MS = 15 * 60_000; // citizens still see "all clear" for this long
const TIP_LIMIT = { max: 5, windowMs: 10 * 60_000 }; // per IP
const FILE = join(DATA_DIR, "alerts.json");

mkdirSync(DATA_DIR, { recursive: true });
/** @type {{ alerts: any[], tips: any[] }} */
let state = { alerts: [], tips: [] };
if (existsSync(FILE)) {
  try { state = { alerts: [], tips: [], ...JSON.parse(readFileSync(FILE, "utf8")) }; } catch { /* start empty */ }
}

function save() {
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, FILE);
}

/** What a client may see: citizens get live alarms (plus a recent all-clear); police also get history and tips. */
function snapshotFor(police) {
  const now = Date.now();
  const alerts = state.alerts.filter((a) => police
    ? now - Date.parse(a.createdAt) < 24 * 3600_000
    : a.status === "active" || (a.endedAt && now - Date.parse(a.endedAt) < ENDED_VISIBLE_MS));
  return { alerts, tips: police ? state.tips.slice(-200) : [], police };
}

const isPolice = (req) => {
  const given = Buffer.from(String(req.headers["x-police-key"] ?? ""));
  const wanted = Buffer.from(POLICE_KEY);
  return POLICE_KEY !== "" && given.length === wanted.length && timingSafeEqual(given, wanted);
};

/** @type {Set<{res: import("node:http").ServerResponse, police: boolean}>} */
const clients = new Set();
function broadcast() {
  for (const c of clients) c.res.write(`event: snapshot\ndata: ${JSON.stringify(snapshotFor(c.police))}\n\n`);
}
setInterval(() => { for (const c of clients) c.res.write(": ping\n\n"); }, 25_000).unref();
// Ended alerts leave the citizen snapshot by time, so push a refresh once a minute.
setInterval(broadcast, 60_000).unref();

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < TIP_LIMIT.windowMs);
  if (recent.length >= TIP_LIMIT.max) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const KINDS = ["armed-person", "shelter-in-place", "evacuate", "fire", "hazard", "other"];
const TIP_CATEGORIES = ["suspicious-person", "theft", "harassment", "fire-smoke", "medical", "other"];
const TIP_STATUSES = ["new", "acknowledged", "resolved"];

const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const lngLat = (v) => Array.isArray(v) && v.length === 2 && Number.isFinite(v[0]) && Number.isFinite(v[1])
  && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90 ? [v[0], v[1]] : null;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "Body too large");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { throw new HttpError(400, "Invalid JSON"); }
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function requirePolice(req) {
  if (POLICE_KEY === "") throw new HttpError(503, "Police access is not configured on this server");
  if (!isPolice(req)) throw new HttpError(401, "Wrong access code");
}

async function route(req, res) {
  const url = new URL(req.url ?? "/", "http://x");
  const path = url.pathname.replace(/^\/api/, "");
  const method = req.method ?? "GET";

  if (method === "GET" && path === "/health") return send(res, 200, { ok: true, policeConfigured: POLICE_KEY !== "" });

  if (method === "GET" && path === "/stream") {
    const police = isPolice(req);
    if (req.headers["x-police-key"] && !police) throw new HttpError(401, "Wrong access code");
    res.writeHead(200, {
      "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no",
    });
    const client = { res, police };
    clients.add(client);
    req.on("close", () => clients.delete(client));
    res.write(`retry: 3000\nevent: snapshot\ndata: ${JSON.stringify(snapshotFor(police))}\n\n`);
    return undefined;
  }

  if (method === "POST" && path === "/alerts") {
    requirePolice(req);
    const body = await readJson(req);
    const center = lngLat(body.center);
    const radiusM = Number(body.radiusM);
    if (!KINDS.includes(body.kind)) throw new HttpError(400, "Unknown alert kind");
    if (!center) throw new HttpError(400, "Draw the affected area on the map first");
    if (!(radiusM >= 10 && radiusM <= 5000)) throw new HttpError(400, "Radius must be between 10 m and 5 km");
    const title = text(body.title, 80);
    if (!title) throw new HttpError(400, "Title is required");
    const alert = {
      id: randomUUID(), kind: body.kind, title, message: text(body.message, 500), center, radiusM: Math.round(radiusM),
      test: body.test === true, status: "active", createdAt: new Date().toISOString(), endedAt: null,
    };
    state.alerts.push(alert);
    save(); broadcast();
    return send(res, 201, alert);
  }

  const end = path.match(/^\/alerts\/([\w-]+)\/end$/);
  if (method === "POST" && end) {
    requirePolice(req);
    const alert = state.alerts.find((a) => a.id === end[1]);
    if (!alert) throw new HttpError(404, "No such alert");
    if (alert.status === "active") { alert.status = "ended"; alert.endedAt = new Date().toISOString(); save(); broadcast(); }
    return send(res, 200, alert);
  }

  if (method === "POST" && path === "/tips") {
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
    if (rateLimited(ip)) throw new HttpError(429, "Too many reports from this device. If it is urgent, call 911.");
    const body = await readJson(req);
    const point = lngLat(body.point);
    if (!point) throw new HttpError(400, "A location is required");
    if (!TIP_CATEGORIES.includes(body.category)) throw new HttpError(400, "Unknown category");
    const photo = typeof body.photoDataUrl === "string" && body.photoDataUrl.startsWith("data:image/jpeg;base64,")
      && body.photoDataUrl.length <= MAX_PHOTO ? body.photoDataUrl : null;
    const tip = {
      id: randomUUID(), category: body.category, description: text(body.description, 800), photoDataUrl: photo, point,
      accuracyM: Number.isFinite(body.accuracyM) ? Math.round(body.accuracyM) : null,
      buildingName: text(body.buildingName, 120) || null, status: "new", createdAt: new Date().toISOString(),
    };
    state.tips.push(tip);
    state.tips = state.tips.slice(-500);
    save(); broadcast();
    return send(res, 201, { id: tip.id, status: tip.status, createdAt: tip.createdAt });
  }

  const tipId = path.match(/^\/tips\/([\w-]+)$/);
  if (tipId && method === "GET") {
    const tip = state.tips.find((t) => t.id === tipId[1]);
    if (!tip) throw new HttpError(404, "No such report");
    return send(res, 200, { id: tip.id, status: tip.status, createdAt: tip.createdAt });
  }
  if (tipId && method === "PATCH") {
    requirePolice(req);
    const body = await readJson(req);
    const tip = state.tips.find((t) => t.id === tipId[1]);
    if (!tip) throw new HttpError(404, "No such report");
    if (!TIP_STATUSES.includes(body.status)) throw new HttpError(400, "Unknown status");
    tip.status = body.status;
    save(); broadcast();
    return send(res, 200, tip);
  }

  throw new HttpError(404, "Not found");
}

createServer((req, res) => {
  route(req, res).catch((error) => {
    if (res.headersSent) { res.end(); return; }
    send(res, error instanceof HttpError ? error.status : 500, { error: error instanceof HttpError ? error.message : "Server error" });
  });
}).listen(PORT, () => console.log(`cims alerts server on :${PORT} (police access ${POLICE_KEY ? "configured" : "NOT configured"})`));
