/** @file React hook: a team's reports, refetched the moment one is filed or changed (Supabase Realtime), plus per-crew grouping for the maintenance dashboard. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { IssueCategory, Team } from "./issue-routing";
import { reportsService, type IssueReport } from "./reports";
import { watchTable } from "./realtime";

/** Maintenance crews (sub-teams of Facilities) and the report categories each one handles. */
export const CREWS: { id: string; label: string; categories: IssueCategory[] }[] = [
  { id: "electrical", label: "Electrical", categories: ["electrical-lighting"] },
  { id: "plumbing", label: "Plumbing", categories: ["plumbing-restroom"] },
  { id: "hvac", label: "HVAC", categories: ["hvac-temperature"] },
  { id: "custodial", label: "Custodial", categories: ["cleanliness"] },
  { id: "general", label: "Furniture & access", categories: ["furniture", "accessibility", "other"] },
];

/** The crew a category belongs to (falls back to the general crew). */
export function crewOf(category: IssueCategory): string {
  return (CREWS.find((c) => c.categories.includes(category)) ?? CREWS[CREWS.length - 1]).id;
}

/** Live list of a team's reports; `fresh` holds ids that arrived after the first load (for highlighting). */
export function useLiveReports(team: Team): { reports: IssueReport[] | null; fresh: Set<string>; error: string | null; reload: () => void } {
  const [reports, setReports] = useState<IssueReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef<Set<string> | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await reportsService.listByTeam(team);
      if (known.current) {
        const added = list.filter((r) => !known.current!.has(r.id)).map((r) => r.id);
        if (added.length) setFresh((f) => new Set([...f, ...added]));
      }
      known.current = new Set(list.map((r) => r.id));
      setReports(list);
      setError(null);
    } catch { setError("Couldn't load the queue."); }
  }, [team]);

  useEffect(() => {
    known.current = null; setReports(null); setFresh(new Set());
    void reload();
    return watchTable("reports", () => void reload());
  }, [team, reload]);

  return { reports, fresh, error, reload: () => void reload() };
}
