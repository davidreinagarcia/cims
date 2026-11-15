/** @file ReportsService backed by Supabase (reports table, +1 votes, photos in Storage); falls back to the local mock if the backend is unreachable. */
import { routeFor, type IssueCategory, type Team } from "./issue-routing";
import type { IssueReport, NewIssueReport, ReportLocation, ReportStatus, ReportsService, StatusEvent } from "./reports";
import { metersBetween, samePlace } from "./reports.mock";
import { accountId, publicUrl, rest, upload, withFallback } from "./supabase";

interface Row {
  id: string; category: IssueCategory; team: Team;
  building_id: string | null; building_name: string | null; floor: string | null; room: string | null;
  lng: number | null; lat: number | null; equipment: string | null; description: string | null;
  photo_path: string | null; status: ReportStatus; history: StatusEvent[]; plus_ones: number;
  created_at: string; sample: boolean;
}

const ACTIVE = "(open,routed,in_progress)";
const NEAR_METERS = 25;

function toLocation(r: Row): ReportLocation {
  return {
    buildingId: r.building_id, buildingName: r.building_name, floor: r.floor, room: r.room,
    point: r.lng != null && r.lat != null ? [r.lng, r.lat] : null,
  };
}

async function mine(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const uid = await accountId();
  const votes = await rest<{ report_id: string }[]>(
    `report_votes?select=report_id&account_id=eq.${uid}&report_id=in.(${ids.map((i) => `"${i}"`).join(",")})`);
  return new Set(votes.map((v) => v.report_id));
}

async function toReports(rows: Row[]): Promise<IssueReport[]> {
  const voted = await mine(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id, category: r.category, team: r.team, location: toLocation(r),
    equipment: r.equipment, description: r.description,
    photoDataUrl: r.photo_path ? publicUrl("reports", r.photo_path) : null,
    status: r.status, history: r.history, plusOnes: r.plus_ones, viewerPlusOned: voted.has(r.id),
    createdAt: r.created_at, sample: r.sample,
  }));
}

/** Supabase-backed service; any network/backend failure is served by `fallback` so the demo never dies (ADR-0005). */
export function createSupabaseReportsService(fallback: ReportsService): ReportsService {
  const safe = withFallback;
  const one = async (id: string) => (await toReports(await rest<Row[]>(`reports?select=*&id=eq.${encodeURIComponent(id)}`)))[0] ?? null;

  return {
    create: (input: NewIssueReport) => safe(async () => {
      let photo_path: string | null = null;
      if (input.photoDataUrl) {
        const blob = await (await fetch(input.photoDataUrl)).blob();
        photo_path = await upload("reports", blob, blob.type === "image/png" ? "png" : "jpg");
      }
      const l = input.location;
      const rows = await rest<Row[]>("reports?select=*", {
        method: "POST", prefer: "return=representation",
        body: {
          category: input.category, team: routeFor(input.category).team,
          building_id: l.buildingId, building_name: l.buildingName, floor: l.floor, room: l.room,
          lng: l.point?.[0] ?? null, lat: l.point?.[1] ?? null,
          equipment: input.equipment?.trim() || null, description: input.description?.trim() || null, photo_path,
        },
      });
      return (await toReports(rows))[0];
    }, () => fallback.create(input)),

    get: (id) => safe(async () => (await one(id)) ?? fallback.get(id), () => fallback.get(id)),

    listNear: (location, category) => safe(async () => {
      const base = `reports?select=*&category=eq.${category}&status=in.${ACTIVE}&order=plus_ones.desc`;
      const rows = await rest<Row[]>(location.buildingId
        ? `${base}&building_id=eq.${encodeURIComponent(location.buildingId)}`
        : `${base}&building_id=is.null`);
      const near = rows.filter((r) => location.buildingId
        ? samePlace(toLocation(r), location)
        : !!location.point && r.lng != null && r.lat != null && metersBetween([r.lng, r.lat], location.point) <= NEAR_METERS);
      return toReports(near);
    }, () => fallback.listNear(location, category)),

    plusOne: (id) => safe(async () => {
      await rest("report_votes", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: { report_id: id } });
      const report = await one(id);
      if (!report) throw new Error("not found");
      return report;
    }, () => fallback.plusOne(id)),

    setStatus: (id, status) => safe(async () => {
      await rest("rpc/set_report_status", { method: "POST", body: { p_id: id, p_status: status } });
      const report = await one(id);
      if (!report) throw new Error("not found");
      return report;
    }, () => fallback.setStatus(id, status)),

    listByTeam: (team) => safe(async () =>
      toReports(await rest<Row[]>(`reports?select=*&team=eq.${team}&order=created_at.desc`)), () => fallback.listByTeam(team)),
  };
}
