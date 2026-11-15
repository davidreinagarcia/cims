/** @file Indoor schematic contracts matching the curated JSON, without inferred room facts. */
/** A space shape in the schematic coordinate system. */
export type IndoorShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "polygon"; points: string };

/** The supported schematic space categories. */
export type IndoorSpaceType = "lab" | "study" | "office" | "auditorium" | "core" | "circulation" | "service";

/** One named space with its source and optional contextual note. */
export interface IndoorSpace {
  id: string;
  name: string;
  type: IndoorSpaceType;
  shape: IndoorShape;
  source: string;
  note?: string;
}

/** A level either has vector geometry or an explicit unavailable note. */
export type IndoorLevel = { id: string; label: string; name: string; note?: string } & (
  | { available: false }
  | { available: true; viewBox: [number, number, number, number]; outline: string; spaces: IndoorSpace[] }
);

/** Building indoor data, including provenance and an honest no-plan status. */
export interface IndoorBuilding {
  description: string;
  building_id: string;
  title: string;
  status: "schematic" | "no-plan";
  credit: string;
  source_url: string;
  levels: IndoorLevel[];
}
