/** @file Report-an-issue contracts (types + ReportsService) and the one place that picks the backend adapter. */
import type { IssueCategory, Team } from "./issue-routing";
import { createLocalReportsService } from "./reports.mock";
import { createSupabaseReportsService } from "./reports.supabase";

export type { IssueCategory, Team } from "./issue-routing";

/** Lifecycle of a report (PRD US-10.3). */
export type ReportStatus = "open" | "routed" | "in_progress" | "resolved" | "duplicate";

/** Where the problem is: a building (› floor › room) or an outdoor map pin. */
export interface ReportLocation {
  buildingId: string | null;
  buildingName: string | null;
  floor: string | null;
  room: string | null;
  /** Outdoor pin as [lng, lat]; null when the report is tied to a building. */
  point: [number, number] | null;
}

/** One status change with its timestamp (ISO 8601). */
export interface StatusEvent {
  status: ReportStatus;
  at: string;
}

/** A reported issue as the UI sees it. */
export interface IssueReport {
  id: string;
  category: IssueCategory;
  team: Team;
  location: ReportLocation;
  equipment: string | null;
  description: string | null;
  photoDataUrl: string | null;
  status: ReportStatus;
  history: StatusEvent[];
  plusOnes: number;
  /** True while nobody has claimed it: every team sees it until one does. */
  openToAll: boolean;
  /** True when this client already added its +1 (or filed the report). */
  viewerPlusOned: boolean;
  createdAt: string;
  /** True for demo records seeded by the mock adapter; the UI must label them "Sample". */
  sample: boolean;
}

/** What the form submits; the service assigns id, team, status and timestamps. */
export interface NewIssueReport {
  category: IssueCategory;
  location: ReportLocation;
  equipment?: string | null;
  description?: string | null;
  photoDataUrl?: string | null;
}

/** Backend contract for reports. Implemented by the localStorage mock today (ADR-0005 still open). */
export interface ReportsService {
  /** Files a new report with status "open". */
  create(input: NewIssueReport): Promise<IssueReport>;
  /** One report by id, or null if this backend doesn't have it. */
  get(id: string): Promise<IssueReport | null>;
  /** Active reports for the same room (or within 25 m of an outdoor pin) and the same category. */
  listNear(location: ReportLocation, category: IssueCategory): Promise<IssueReport[]>;
  /** Adds this client's "Me too"; a second call from the same client changes nothing. */
  plusOne(id: string): Promise<IssueReport>;
  /** Staff action: moves a report to another status and records the timestamp. */
  setStatus(id: string, status: ReportStatus): Promise<IssueReport>;
  /** Every report routed to one team plus the unclaimed ones open to all teams (staff queue). */
  listByTeam(team: Team): Promise<IssueReport[]>;
  /** Staff action: this team takes an unclaimed report; it disappears from the other teams' queues. */
  claim(id: string, team: Team): Promise<IssueReport>;
}

/** The happy-path statuses in order, for the status timeline. */
export const STATUS_FLOW: ReportStatus[] = ["open", "routed", "in_progress", "resolved"];

/** Human label for each status. */
export const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  routed: "Routed",
  in_progress: "In progress",
  resolved: "Resolved",
  duplicate: "Closed: duplicate",
};

/** Whether a report still counts as unresolved (shown in "Already reported?"). */
export function isActive(status: ReportStatus): boolean {
  return status === "open" || status === "routed" || status === "in_progress";
}

/** The reports backend used by the app: Supabase, with the local mock as offline fallback (ADR-0005). */
export const reportsService: ReportsService = createSupabaseReportsService(createLocalReportsService());
