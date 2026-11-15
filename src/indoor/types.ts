/** @file Indoor schematic contracts matching the curated JSON, without inferred room facts. */
/** A space shape in the schematic coordinate system. */
export type IndoorShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "polygon"; points: string };

/** The supported schematic space categories. */
export type IndoorSpaceType = "lab" | "study" | "office" | "auditorium" | "core" | "circulation" | "service" | "classroom" | "utility" | "outdoor" | "void";

/** One named space with its source and optional contextual note. */
export interface IndoorSpace {
  id: string;
  name: string;
  type: IndoorSpaceType;
  shape: IndoorShape;
  source: string;
  note?: string;
  door?: string;
  /** Published room number, when this space is a numbered room. */
  room?: string;
  capacity?: number | null;
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
  /** Short name used in door sticker links, e.g. ?in=culc&door=e1-s. */
  slug?: string;
  title: string;
  status: "schematic" | "no-plan" | "rooms-only";
  credit: string;
  source_url: string;
  levels: IndoorLevel[];
  rooms?: RoomFact[];
  graph?: IndoorGraph;
}

/** A walkable point in plan units on one level. */
export interface IndoorNode { id: string; level: string; x: number; y: number; label?: string }

/** A named vertical connection with explicit accessibility. */
export interface IndoorConnector {
  id: string;
  name: string;
  kind: "elevator" | "stairs";
  stepFree: boolean;
  nodes: Record<string, string>;
}

/** An approximate building entrance connected to the walking graph. */
export interface IndoorEntrance { id: string; name: string; level: string; node: string; note?: string }

/** Undirected walking edges and vertical connections for one building. */
export interface IndoorGraph {
  nodes: IndoorNode[];
  edges: [string, string][];
  connectors: IndoorConnector[];
  entrances: IndoorEntrance[];
}

/** Published room facts without geometry, inferred levels or routing nodes. */
export interface RoomFact {
  id: string;
  room: string;
  name: string;
  type: string;
  level: "1" | "2" | "3" | "4" | "5" | null;
  capacity: number | null;
  source_url: string;
  source_note: string;
}
