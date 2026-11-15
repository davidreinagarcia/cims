/** @file User-written bulletin posts (orgs and people): Supabase table with a localStorage fallback, plus a tiny live store the board and the map layer both read. */
import type { Session } from "../auth/types";
import { loadedBuildings } from "./buildings";
import { readLocal, writeLocal } from "./localStore";
import { rest, withFallback } from "./supabase";

/** Who wrote a post: a registered organization account or a person (student account). */
export type Audience = "org" | "person";

/** A registered place a post is tied to: a building footprint or a room inside an indoor building ("buildingId:spaceId"). */
export interface PostLocation { kind: "building" | "room"; id: string; name: string; buildingId: string }

/** One saved post. Times are instants; the poster is a downscaled JPEG data URL. */
export interface UserPost {
  id: string; accountId: string; audience: Audience; authorName: string; title: string; description?: string;
  startsAt: Date; endsAt: Date; location: PostLocation; poster?: string; createdAt: Date;
}

/** What the composer hands over; the server (or the local fallback) decides the audience from the account role. */
export interface UserPostInput {
  title: string; description?: string; startsAt: Date; endsAt: Date; location: PostLocation; poster?: string;
}

interface Row {
  id: string; account_id: string; audience: Audience; author_name: string; title: string; description: string | null;
  starts_at: string; ends_at: string; location_kind: "building" | "room"; location_id: string;
  location_name: string; building_id: string; poster_data: string | null; created_at: string;
}

const KEY = "cims.bulletin.posts.v1";
const fromRow = (r: Row): UserPost => ({
  id: r.id, accountId: r.account_id, audience: r.audience, authorName: r.author_name, title: r.title, description: r.description ?? undefined,
  startsAt: new Date(r.starts_at), endsAt: new Date(r.ends_at), poster: r.poster_data ?? undefined, createdAt: new Date(r.created_at),
  location: { kind: r.location_kind, id: r.location_id, name: r.location_name, buildingId: r.building_id },
});

/** Audience an account role posts under, or null when that role may not post (staff, moderators). */
export function audienceFor(role: Session["role"]): Audience | null {
  return role === "officer" ? "org" : role === "student" ? "person" : null;
}

let posts: UserPost[] = [];
const listeners = new Set<() => void>();
const publish = (next: UserPost[]) => { posts = next; listeners.forEach((l) => l()); };

/** Subscribe to changes of the loaded posts; returns the unsubscribe function. */
export function subscribeUserPosts(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Current snapshot of the loaded posts (stable between changes). */
export function getUserPosts(): UserPost[] { return posts; }

/** Loads posts that have not ended yet and publishes them; failures keep what is already loaded. */
export async function refreshUserPosts(): Promise<void> {
  const cutoff = new Date().toISOString();
  const next = await withFallback(
    async () => (await rest<Row[]>(`bulletin_posts?select=*&ends_at=gt.${encodeURIComponent(cutoff)}&order=starts_at.asc`)).map(fromRow),
    async () => readLocal<(Omit<UserPost, "startsAt" | "endsAt" | "createdAt"> & { startsAt: string; endsAt: string; createdAt: string })[]>(KEY, [])
      .map((p) => ({ ...p, startsAt: new Date(p.startsAt), endsAt: new Date(p.endsAt), createdAt: new Date(p.createdAt) }))
      .filter((p) => p.endsAt.getTime() > Date.now()),
  ).catch(() => posts);
  publish(next);
}

/** Saves a post for the signed-in account and adds it to the live store. Rule rejections (wrong role, too fast) reach the caller. */
export async function createUserPost(session: Session, input: UserPostInput): Promise<UserPost> {
  const audience = audienceFor(session.role);
  if (!audience) throw new Error("Only student and organization accounts can post.");
  const created = await withFallback(async () => {
    const [row] = await rest<Row[]>("bulletin_posts", { method: "POST", prefer: "return=representation", body: {
      author_name: session.displayName, title: input.title, description: input.description || null,
      starts_at: input.startsAt.toISOString(), ends_at: input.endsAt.toISOString(),
      location_kind: input.location.kind, location_id: input.location.id, location_name: input.location.name,
      building_id: input.location.buildingId, poster_data: input.poster ?? null,
    } });
    return fromRow(row);
  }, async () => {
    const post: UserPost = { id: `LOCAL-${crypto.randomUUID().slice(0, 8)}`, accountId: session.accountId, audience, authorName: session.displayName,
      title: input.title, description: input.description || undefined, startsAt: input.startsAt, endsAt: input.endsAt,
      location: input.location, poster: input.poster, createdAt: new Date() };
    writeLocal(KEY, [...readLocal<unknown[]>(KEY, []), post]);
    return post;
  });
  publish([...posts, created]);
  return created;
}

/** Whether this account may delete a post: its author, or a moderator (the server enforces the same rule). */
export function canDeletePost(session: Session | null, post: Pick<UserPost, "accountId">): boolean {
  return !!session && (session.role === "moderator" || session.accountId === post.accountId);
}

/** Deletes a post and drops it from the live store. Rule rejections reach the caller. */
export async function deleteUserPost(id: string): Promise<void> {
  await withFallback(
    async () => { await rest(`bulletin_posts?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" }); },
    async () => { writeLocal(KEY, readLocal<{ id: string }[]>(KEY, []).filter((p) => p.id !== id)); },
  );
  publish(posts.filter((p) => p.id !== id));
}

/** Map anchors for the loaded posts: one orgs-layer point per post at its building's centre (none until footprints load). */
export function userPostFeatures(): GeoJSON.Feature<GeoJSON.Point, { id: string; name: string; category: "orgs"; subtype: string; building_id: string; status: "seed"; kind: "event" }>[] {
  const index = loadedBuildings();
  if (!index) return [];
  return posts.flatMap((post) => {
    const building = index.byId.get(post.location.buildingId);
    if (!building || post.endsAt.getTime() <= Date.now()) return [];
    return [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: building.center },
      properties: { id: post.id, name: post.title, category: "orgs" as const, subtype: post.audience === "org" ? "campus-org" : "community",
        building_id: building.id, status: "seed" as const, kind: "event" as const } }];
  });
}
