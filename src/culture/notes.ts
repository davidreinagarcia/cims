/** @file The culture notes from src/data/culture.json, typed, in tour order, each with its hand-drawn doodle. */
import data from "../data/culture.json";

/** One sticky note: a sourced GT tradition pinned where it happens. */
export interface CultureNote {
  id: string; title: string; color: string; rotate: number; lng: number; lat: number; text: string; tip?: string; source_url: string;
  anywhere?: boolean; emoji?: string; tag?: string; when?: string; where?: string; facts?: string[];
}

/** Notes in tour order. */
export const CULTURE_NOTES = data.notes as CultureNote[];

/** The West / East labels that open the housing guide. */
export const CULTURE_AREAS = data.areas;

/** Hand-drawn doodle for a note (generated illustrations in public/culture/). */
export function doodleFor(id: string): string {
  return `/culture/${id}.webp`;
}
