/** @file Fictional seed stories clustered around the Greek housing area, so the heat map and viewer can be shown before anyone has posted. */
import { loadBuildings } from "../lib/buildings";
import type { Story } from "./types";

/** Where the fake activity is, and how much: real building ids, invented story counts. */
const HOTSPOTS: { buildingId: string; count: number; hue: number }[] = [
  { buildingId: "sigma-chi", count: 10, hue: 210 },
  { buildingId: "kappa-alpha", count: 7, hue: 28 },
  { buildingId: "beta-theta-pi", count: 5, hue: 150 },
  { buildingId: "phi-delta-theta", count: 4, hue: 280 },
  { buildingId: "alpha-tau-omega", count: 2, hue: 100 },
];
const CAPTIONS = ["Quiet corner on floor 2", "Line is out the door", "Free pizza inside", "Sunset from here", "Study group, come join", "Great light today", undefined, undefined];

/** Tiny deterministic generator so the demo looks the same on every load. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function gradient(hue: number, label: string): string {
  const c = document.createElement("canvas");
  c.width = 540;
  c.height = 960;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 540, 960);
  bg.addColorStop(0, `hsl(${hue} 55% 38%)`);
  bg.addColorStop(1, `hsl(${(hue + 40) % 360} 60% 18%)`);
  g.fillStyle = bg;
  g.fillRect(0, 0, 540, 960);
  g.fillStyle = "rgba(255,255,255,.14)";
  g.font = "700 64px sans-serif";
  g.textAlign = "center";
  g.fillText("DEMO", 270, 470);
  g.font = "28px sans-serif";
  g.fillText(label, 270, 520);
  return c.toDataURL("image/jpeg", 0.7);
}

/** Builds the fictional stories (created within the last ~20 h, so they never expire mid-session). Resolves empty if the buildings fail to load. */
export async function demoStories(now = Date.now()): Promise<Story[]> {
  let index;
  try { index = await loadBuildings(); } catch { return []; }
  const rand = rng(7);
  const out: Story[] = [];
  for (const spot of HOTSPOTS) {
    const b = index.byId.get(spot.buildingId);
    if (!b) continue;
    const label = b.name ?? "Georgia Tech";
    for (let i = 0; i < spot.count; i++) {
      const created = now - Math.round(rand() * 20 * 3600_000);
      out.push({
        id: `demo-${spot.buildingId}-${i}`,
        accountId: "demo",
        authorName: ["Maya", "Jordan", "Priya", "Sam", "Alex", "Noor"][Math.floor(rand() * 6)],
        kind: "photo",
        mediaUrl: gradient(spot.hue + Math.round(rand() * 30), label),
        createdAt: created,
        expiresAt: created + 24 * 3600_000,
        // ~±35 m of scatter around the building centre (1e-4 deg ~ 11 m).
        lng: b.center[0] + (rand() - 0.5) * 7e-4,
        lat: b.center[1] + (rand() - 0.5) * 6e-4,
        accuracy: 10,
        caption: CAPTIONS[Math.floor(rand() * CAPTIONS.length)],
        demo: true,
      });
    }
  }
  return out;
}
