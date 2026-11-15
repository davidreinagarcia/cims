/** @file Minimal Supabase Realtime client (Phoenix websocket, no SDK): calls back whenever a table changes, so dashboards refetch at once; polls as a safety net. */
import { SUPABASE_REALTIME, session } from "./supabase";

/** Watches one public table; `onChange` fires on every insert/update/delete you may see (RLS applies) and at most every `pollMs` regardless. Returns the stopper. */
export function watchTable(table: string, onChange: () => void, pollMs = 20_000): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let retry = 1000;
  let beat: number | undefined;
  let ref = 0;
  const poll = window.setInterval(onChange, pollMs);

  const connect = async () => {
    if (stopped) return;
    try {
      const s = await session();
      const url = SUPABASE_REALTIME.url.replace(/^http/, "ws");
      ws = new WebSocket(`${url}/realtime/v1/websocket?apikey=${SUPABASE_REALTIME.anon}&vsn=1.0.0`);
    } catch { schedule(); return; }
    const socket = ws;
    const send = (topic: string, event: string, payload: unknown) =>
      socket.readyState === 1 && socket.send(JSON.stringify({ topic, event, payload, ref: String(++ref) }));
    socket.onopen = async () => {
      retry = 1000;
      const token = (await session()).access_token;
      send(`realtime:cims-${table}`, "phx_join", {
        config: { postgres_changes: [{ event: "*", schema: "public", table }], broadcast: { self: false }, presence: { key: "" } },
        access_token: token,
      });
      beat = window.setInterval(() => send("phoenix", "heartbeat", {}), 25_000);
    };
    socket.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.event === "postgres_changes" || (m.event === "phx_reply" && m.payload?.status === "ok" && m.topic?.startsWith("realtime:"))) onChange();
      } catch { /* ignore */ }
    };
    socket.onclose = () => { window.clearInterval(beat); schedule(); };
    socket.onerror = () => socket.close();
  };
  const schedule = () => {
    if (stopped) return;
    window.setTimeout(connect, retry);
    retry = Math.min(retry * 2, 15_000);
  };
  void connect();

  return () => { stopped = true; window.clearInterval(poll); window.clearInterval(beat); ws?.close(); };
}
