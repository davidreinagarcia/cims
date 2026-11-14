/** @file Mock ReportsService backed by localStorage, with labeled sample reports. Prototype only: nothing leaves the browser. */
import { routeFor, type IssueCategory, type Team } from "./issue-routing";
import { places } from "./places";
import type { IssueReport, NewIssueReport, ReportLocation, ReportStatus, ReportsService } from "./reports";

type StoredReport = Omit<IssueReport, "viewerPlusOned">;

const REPORTS_KEY = "cims.reports.v1";
const VOTES_KEY = "cims.reports.votes.v1";
const NEAR_METERS = 25;
const ACTIVE: ReportStatus[] = ["open", "routed", "in_progress"];

/** Reads JSON from localStorage; falls back when storage is blocked or the value is corrupt. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Writes JSON to localStorage; returns false when storage is blocked or full. */
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const norm = (value: string | null) => (value ?? "").trim().toLowerCase();

/** Distance in meters between two [lng, lat] points (haversine). */
function metersBetween(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Same place: same building + floor + room indoors, or within 25 m for outdoor pins. */
function samePlace(a: ReportLocation, b: ReportLocation): boolean {
  if (a.buildingId || b.buildingId) {
    return a.buildingId === b.buildingId && norm(a.floor) === norm(b.floor) && norm(a.room) === norm(b.room);
  }
  return !!a.point && !!b.point && metersBetween(a.point, b.point) <= NEAR_METERS;
}

/**
 * SAMPLE reports so the demo isn't empty. They are not real issues: every one has `sample: true`
 * and the UI labels it "Sample". Building-level only, so no room numbers are invented.
 */
function sampleReports(): StoredReport[] {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const make = (
    n: number, buildingId: string, category: IssueCategory, description: string,
    plusOnes: number, statuses: ReportStatus[],
  ): StoredReport => {
    const createdAt = hoursAgo(30 - n * 4);
    return {
      id: `SAMPLE-${n}`,
      category,
      team: routeFor(category).team,
      location: {
        buildingId,
        buildingName: places.features.find((f) => f.properties.id === buildingId)?.properties.name ?? buildingId,
        floor: null, room: null, point: null,
      },
      equipment: null,
      description,
      photoDataUrl: null,
      status: statuses[statuses.length - 1],
      history: statuses.map((status, i) => ({ status, at: i === 0 ? createdAt : hoursAgo(30 - n * 4 - i * 2) })),
      plusOnes,
      createdAt,
      sample: true,
    };
  };
  return [
    make(1, "clough", "classroom-tech", "Sample report: display does not turn on.", 4, ["open"]),
    make(2, "clough", "hvac-temperature", "Sample report: room is too cold.", 1, ["open", "routed"]),
    make(3, "library", "network-wifi", "Sample report: Wi-Fi keeps dropping.", 2, ["open", "routed"]),
    make(4, "student-center", "plumbing-restroom", "Sample report: faucet is leaking.", 3, ["open", "routed", "in_progress"]),
    make(5, "library", "electrical-lighting", "Sample report: light is flickering.", 0, ["open"]),
  ];
}

/** Creates the localStorage-backed mock. Falls back to memory when storage is unavailable. */
export function createLocalReportsService(): ReportsService {
  let memory: StoredReport[] | null = null;
  let memoryVotes: string[] | null = null;

  const load = (): StoredReport[] => {
    if (memory) return memory;
    const stored = read<StoredReport[] | null>(REPORTS_KEY, null);
    if (stored) return stored;
    const seeded = sampleReports();
    if (!write(REPORTS_KEY, seeded)) memory = seeded;
    return seeded;
  };
  const save = (reports: StoredReport[]) => {
    if (memory || !write(REPORTS_KEY, reports)) memory = reports;
  };
  const votes = (): string[] => memoryVotes ?? read<string[]>(VOTES_KEY, []);
  const addVote = (id: string) => {
    const next = [...votes(), id];
    if (memoryVotes || !write(VOTES_KEY, next)) memoryVotes = next;
  };
  const view = (report: StoredReport): IssueReport => ({ ...report, viewerPlusOned: votes().includes(report.id) });
  const update = (id: string, change: (report: StoredReport) => StoredReport): IssueReport => {
    const reports = load();
    const index = reports.findIndex((r) => r.id === id);
    if (index < 0) throw new Error(`Report ${id} not found`);
    const next = change(reports[index]);
    save(reports.map((r, i) => (i === index ? next : r)));
    return view(next);
  };

  return {
    async create(input: NewIssueReport) {
      const now = new Date().toISOString();
      const report: StoredReport = {
        id: `R-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        category: input.category,
        team: routeFor(input.category).team,
        location: input.location,
        equipment: input.equipment?.trim() || null,
        description: input.description?.trim() || null,
        photoDataUrl: input.photoDataUrl ?? null,
        status: "open",
        history: [{ status: "open", at: now }],
        plusOnes: 0,
        createdAt: now,
        sample: false,
      };
      save([...load(), report]);
      addVote(report.id); // the reporter can't also "Me too" their own report
      return view(report);
    },
    async get(id: string) {
      const report = load().find((r) => r.id === id);
      return report ? view(report) : null;
    },
    async listNear(location: ReportLocation, category: IssueCategory) {
      return load()
        .filter((r) => r.category === category && ACTIVE.includes(r.status) && samePlace(r.location, location))
        .sort((a, b) => b.plusOnes - a.plusOnes)
        .map(view);
    },
    async plusOne(id: string) {
      if (votes().includes(id)) return update(id, (r) => r);
      const report = update(id, (r) => ({ ...r, plusOnes: r.plusOnes + 1 }));
      addVote(id);
      return { ...report, viewerPlusOned: true };
    },
    async setStatus(id: string, status: ReportStatus) {
      return update(id, (r) =>
        r.status === status
          ? r
          : { ...r, status, history: [...r.history, { status, at: new Date().toISOString() }] },
      );
    },
    async listByTeam(team: Team) {
      return load().filter((r) => r.team === team).map(view);
    },
  };
}
