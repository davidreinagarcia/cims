/** @file PreferredRoomsService on Supabase (one row per heart, private to the browser's account); local mock only if the backend is unreachable. */
import type { NewPreferredRoom, PreferredRoom, PreferredRoomsService } from "./preferredRooms";
import { accountId, rest, withFallback } from "./supabase";

interface Row { account_id: string; room: string; building_id: string; room_label: string; created_at: string }
const toRoom = (r: Row): PreferredRoom => ({ room: r.room, buildingId: r.building_id, roomLabel: r.room_label, accountId: r.account_id, createdAt: r.created_at });

/** Favorites stored in Supabase; the `accountId` argument is ignored in favor of auth.uid(). */
export function createSupabasePreferredRoomsService(fallback: PreferredRoomsService): PreferredRoomsService {
  return {
    list: (uid) => withFallback(async () =>
      (await rest<Row[]>(`preferred_rooms?select=*&order=created_at.desc`)).map(toRoom), () => fallback.list(uid)),
    add: (input: NewPreferredRoom, uid) => withFallback(async () => {
      const rows = await rest<Row[]>("preferred_rooms?on_conflict=account_id,room&select=*", {
        method: "POST", prefer: "resolution=merge-duplicates,return=representation",
        body: { room: input.room, building_id: input.buildingId, room_label: input.roomLabel },
      });
      return toRoom(rows[0]);
    }, () => fallback.add(input, uid)),
    remove: (room, uid) => withFallback(async () => {
      await rest(`preferred_rooms?room=eq.${encodeURIComponent(room)}&account_id=eq.${await accountId()}`, { method: "DELETE", prefer: "return=minimal" });
    }, () => fallback.remove(room, uid)),
  };
}
