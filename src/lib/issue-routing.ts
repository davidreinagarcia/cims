/** @file Issue categories and their routing (category → team + official contact), from src/data/issue-routing.json when present. */
/// <reference types="vite/client" />

/** Team a report is routed to (simulated in the MVP). */
export type Team = "Facilities" | "IT" | "Emergency";

/** The ten report categories from PRD US-10.1. */
export type IssueCategory =
  | "classroom-tech"
  | "network-wifi"
  | "electrical-lighting"
  | "plumbing-restroom"
  | "hvac-temperature"
  | "furniture"
  | "accessibility"
  | "cleanliness"
  | "safety-hazard"
  | "other";

/** Where a category goes: team plus the official contact, null until verified data exists. */
export interface IssueRoute {
  category: IssueCategory;
  label: string;
  hint?: string;
  team: Team;
  reportingUrl: string | null;
  phone: string | null;
  /** True when the team is unknown: the report goes to every team and the first one to claim it keeps it. */
  broadcast?: boolean;
}

/** All teams, in the order the staff view lists them. */
export const TEAMS: Team[] = ["Facilities", "IT", "Emergency"];

/** Category that must show the emergency banner before the form. */
export const SAFETY_CATEGORY: IssueCategory = "safety-hazard";

/**
 * Local fixture: labels come from the PRD; teams are MVP defaults (not an official GT taxonomy).
 * TODO(T-31): official URLs and phone numbers come ONLY from src/data/issue-routing.json
 * (verified records). Until that file lands they stay null. Never fill them in by hand here.
 */
const FIXTURE: IssueRoute[] = [
  { category: "classroom-tech", label: "Classroom tech", hint: "Projector, display, mic", team: "IT", reportingUrl: null, phone: null },
  { category: "network-wifi", label: "Network / Wi-Fi", team: "IT", reportingUrl: null, phone: null },
  { category: "electrical-lighting", label: "Electrical / lighting", team: "Facilities", reportingUrl: null, phone: null },
  { category: "plumbing-restroom", label: "Plumbing / restroom", team: "Facilities", reportingUrl: null, phone: null },
  { category: "hvac-temperature", label: "HVAC / temperature", team: "Facilities", reportingUrl: null, phone: null },
  { category: "furniture", label: "Furniture", team: "Facilities", reportingUrl: null, phone: null },
  { category: "accessibility", label: "Accessibility", hint: "Elevator, door, ramp", team: "Facilities", reportingUrl: null, phone: null },
  { category: "cleanliness", label: "Cleanliness", team: "Facilities", reportingUrl: null, phone: null },
  { category: "safety-hazard", label: "Safety hazard", team: "Emergency", reportingUrl: null, phone: null },
  { category: "other", label: "Other", hint: "Not sure who handles it? Every team sees it until one claims it", team: "Facilities", reportingUrl: null, phone: null, broadcast: true },
];

/** Shape of one entry in src/data/issue-routing.json (T-31). */
interface RoutingRecord {
  team?: string;
  reporting_url?: string;
  phone?: string;
}

// The glob matches nothing until T-31 merges, so the build works with or without the data file.
const dataFiles = import.meta.glob<{ categories?: Record<string, RoutingRecord> }>(
  "../data/issue-routing.json",
  { eager: true, import: "default" },
);
const verified = Object.values(dataFiles)[0]?.categories ?? {};

/** Whether verified routing data (T-31) was found at build time. */
export const hasVerifiedRouting = Object.keys(verified).length > 0;

/** The ten categories with their routing, in display order. */
export const issueRoutes: IssueRoute[] = FIXTURE.map((route) => {
  const record = verified[route.category];
  if (!record) return route;
  const team = TEAMS.find((t) => t === record.team) ?? route.team;
  return { ...route, team, reportingUrl: record.reporting_url ?? null, phone: record.phone ?? null };
});

/** Routing for one category. */
export function routeFor(category: IssueCategory): IssueRoute {
  return issueRoutes.find((route) => route.category === category) ?? issueRoutes[issueRoutes.length - 1];
}
