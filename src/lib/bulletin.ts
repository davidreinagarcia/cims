/** @file Pure bulletin posts, campus-time labels, filters, counts and deep links. */
import { formatWindow, nextWindow } from "./events";
import { LAYER_CATALOG } from "./layerCatalog";
import { places, showDrafts } from "./places";
import type { PlaceCollection, PlaceFeature } from "./places";
import { searchPlaces } from "./search";
import events from "../data/pois/events.json";
import orgs from "../data/pois/orgs.json";

/** The five supported bulletin filters; unknown source subtypes become community posts. */
export type PostType = "club" | "campus-org" | "community" | "admin" | "lost-found";

/** A dated bulletin entry with known source facts and a selectable map location. */
export interface BulletinPost {
  id: string;
  title: string;
  org?: string;
  type: PostType;
  description?: string;
  start?: Date;
  end?: Date;
  when: string;
  soon: boolean;
  placeId?: string;
  placeName?: string;
  isDemo: boolean;
  url?: string;
  sourceUrl?: string;
}

const orgTypes = LAYER_CATALOG.find((layer) => layer.id === "orgs")!.subtypes;

/** Bulletin filters in display order, sharing organization labels with the layer catalog. */
export const POST_TYPES: { id: PostType; label: string }[] = [
  { id: "club", label: "Clubs" },
  { id: "campus-org", label: "Campus orgs" },
  { id: "community", label: "Community" },
  { id: "lost-found", label: "Lost & Found" },
  { id: "admin", label: "Admin" },
].map(({ id, label }) => ({ id: id as PostType, label: orgTypes.find((item) => item.id === id)?.label ?? label }));

const campusDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric",
});
const shortDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", month: "short", day: "numeric",
});

function dayNumber(date: Date): number {
  const parts = campusDate.formatToParts(date);
  const get = (key: string) => Number(parts.find((part) => part.type === key)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000;
}

function whenLabel(window: { start: Date; end: Date }, now: Date): string {
  const difference = dayNumber(window.start) - dayNumber(now);
  const day = difference === 0 ? "Today" : difference === 1 ? "Tomorrow" : shortDate.format(window.start);
  // Keep the shared helper's campus-time clock formatting and cross-day weekday labels.
  const clock = formatWindow(window).replace(/^\w+ /, "").replace(" to ", "–")
    .replace(/\b(am|pm)\b/g, (period) => period.toUpperCase());
  return `${day}, ${clock}`;
}

function postType(value: string | null | undefined): PostType | "all" {
  return POST_TYPES.find((item) => item.id === value)?.id ?? "all";
}

/** Return ongoing and upcoming dated events or org posts, with ongoing entries first. */
export function bulletinPosts(now: Date): BulletinPost[] {
  if (!Number.isFinite(now.getTime())) return [];
  // places removes expired events at module load; retain original records so now is authoritative.
  const originals = [events, orgs] as unknown as PlaceCollection[];
  const features = [...new Map([...places.features, ...originals.flatMap((collection) => collection.features)]
    .map((feature) => [feature.properties.id, feature])).values()]
    .filter((feature) => feature.properties.status !== "draft" || showDrafts);
  const byId = new Map(features.map((feature) => [feature.properties.id, feature.properties]));
  return features.flatMap(({ properties: p }): BulletinPost[] => {
    if (p.kind !== "event" && p.kind !== "org") return [];
    const window = nextWindow(p.event, now);
    if (!window) return [];
    const venue = p.building_id ? byId.get(p.building_id) : undefined;
    const organizer = p.event?.org_id ? byId.get(p.event.org_id) : undefined;
    const type = postType(p.subtype);
    return [{
      id: p.id,
      title: p.name,
      org: p.event?.organizer ?? organizer?.name ?? (p.kind === "org" ? p.name : undefined),
      type: type === "all" ? "community" : type,
      description: p.description,
      start: window.start,
      end: window.end,
      when: whenLabel(window, now),
      soon: window.start.getTime() <= now.getTime() + 86_400_000,
      placeId: venue?.id ?? p.id,
      placeName: venue?.name,
      isDemo: p.status === "demo",
      url: p.url,
      sourceUrl: p.source_url,
    }];
  }).sort((a, b) => {
    const ongoingA = a.start! <= now && a.end! > now;
    const ongoingB = b.start! <= now && b.end! > now;
    return Number(ongoingB) - Number(ongoingA) || a.start!.getTime() - b.start!.getTime();
  });
}

/** Filter posts by type and the shared case/accent-insensitive search, retaining post order. */
export function filterPosts(posts: readonly BulletinPost[], type: PostType | "all", query?: string): BulletinPost[] {
  const candidates = posts.filter((post) => type === "all" || post.type === type);
  const text = query?.trim();
  if (!text) return candidates;
  // searchPlaces owns normalization but ignores one-character queries. A trailing sentinel
  // makes single-character aliases searchable without copying its private folding function.
  const singleCharacter = (text.match(/[^\p{M}]/gu) ?? []).length === 1;
  const items: PlaceFeature[] = candidates.map((post, index) => {
    const fields = [post.title, post.org, post.description, post.placeName].filter((field): field is string => field !== undefined);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [] },
      properties: {
        id: String(index), name: "", category: "other", status: "seed",
        aliases: singleCharacter ? fields.flatMap((field) => Array.from(field, (char) => `${char}\0`)) : fields,
      },
    };
  });
  const matches = new Set(searchPlaces(singleCharacter ? `${text}\0` : text, items)
    .filter((result) => result.matches.some((match) => match.field === "alias"))
    .map((result) => Number(result.place.properties.id)));
  return candidates.filter((_, index) => matches.has(index));
}

/** Count every post type and the unfiltered total, including categories with no posts. */
export function countByType(posts: readonly BulletinPost[]): Record<PostType | "all", number> {
  const counts: Record<PostType | "all", number> = { all: posts.length, club: 0, "campus-org": 0, community: 0, "lost-found": 0, admin: 0 };
  for (const post of posts) counts[post.type]++;
  return counts;
}

/** Build a bulletin deep link, omitting the type parameter for the all filter. */
export function bulletinUrl(type: PostType | "all" = "all"): string {
  const params = new URLSearchParams({ view: "bulletin" });
  if (postType(type) !== "all") params.set("type", type);
  return `?${params.toString()}`;
}

/** Read bulletin visibility and a validated type filter from a query string. */
export function readBulletinParams(search: string): { open: boolean; type: PostType | "all" } {
  const params = new URLSearchParams(search);
  return { open: params.get("view") === "bulletin", type: postType(params.get("type")) };
}
