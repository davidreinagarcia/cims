/** @file Mock PreferredRoomsService backed by localStorage. Prototype only: favorites don't sync across devices. */
import { readLocal, writeLocal } from "./localStore";
import type { NewPreferredRoom, PreferredRoom, PreferredRoomsService } from "./preferredRooms";

const KEY = "cims.preferredRooms.v1";

/** Creates the localStorage-backed mock. Falls back to memory when storage is unavailable. */
export function createLocalPreferredRoomsService(): PreferredRoomsService {
  let memory: PreferredRoom[] | null = null;
  const load = (): PreferredRoom[] => memory ?? readLocal<PreferredRoom[]>(KEY, []);
  const save = (favorites: PreferredRoom[]) => {
    if (memory || !writeLocal(KEY, favorites)) memory = favorites;
  };

  return {
    async list(accountId: string) {
      return load()
        .filter((f) => f.accountId === accountId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },

    async add(input: NewPreferredRoom, accountId: string) {
      const existing = load().find((f) => f.room === input.room && f.accountId === accountId);
      if (existing) return existing;
      const favorite: PreferredRoom = { ...input, accountId, createdAt: new Date().toISOString() };
      save([...load(), favorite]);
      return favorite;
    },

    async remove(room: string, accountId: string) {
      save(load().filter((f) => !(f.room === room && f.accountId === accountId)));
    },
  };
}
