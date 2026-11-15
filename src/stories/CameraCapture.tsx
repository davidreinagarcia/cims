/** @file Full-screen live camera for stories: photo or up-to-15s video from getUserMedia (zoom, flash, tap to focus), with the GPS fix taken at the moment of capture. There is deliberately no file picker, so nothing can come from the gallery. */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CAMPUS } from "../config";
import { GeolocationError, getCurrentPosition } from "../lib/geolocation";
import { useGpsFix } from "../lib/useGpsFix";
import LocationGate, { useLocationPermission } from "./LocationGate";
import type { Capture, StoryKind } from "./types";

const MAX_VIDEO_MS = 15_000;
/** Fixes worse than this are too vague to place a story on the map. */
const MAX_ACCURACY_M = 200;
const PAD = 0.004; // ~400 m of slack around the campus box for GPS drift

/** Is this point on (or right next to) campus? Stories can only be posted from there. `?storiesAnywhere=1` lifts it for demos and testing. */
export function onCampus(lat: number, lng: number): boolean {
  if (new URLSearchParams(window.location.search).has("storiesAnywhere")) return true;
  const [[w, s], [e, n]] = CAMPUS.bounds;
  return lng >= w - PAD && lng <= e + PAD && lat >= s - PAD && lat <= n + PAD;
}

function cameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access was denied. Allow the camera for this site in your browser settings.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (!navigator.mediaDevices?.getUserMedia) return "This browser can't open the camera here (it needs a secure https page).";
  return "The camera couldn't be started. Close other apps using it and try again.";
}

function pickMime(): string | undefined {
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
}

/** Zoom/torch support the camera reports (absent on iOS Safari and most desktops). */
type Caps = MediaTrackCapabilities & { zoom?: { min: number; max: number }; torch?: boolean };
const advanced = (c: Record<string, unknown>) => ({ advanced: [c] }) as unknown as MediaTrackConstraints;

/** Full-screen camera view, like the phone's own app. Calls `onCapture` with the media plus where it was taken; the caller decides what to do with it. */
export default function CameraCapture({ onCapture, onCancel }: { onCapture: (capture: Capture) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>();
  const [mode, setMode] = useState<StoryKind>("photo");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(0); // ms elapsed, 0 = not recording
  const [attempt, setAttempt] = useState(0); // bump to reopen the camera after an error
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [torchAvail, setTorchAvail] = useState(false);
  const [torch, setTorch] = useState(false);
  const [focusAt, setFocusAt] = useState<{ x: number; y: number; k: number } | null>(null);
  const gps = useGpsFix();
  const permission = useLocationPermission();
  const requestGps = gps.request;
  useEffect(() => { if (permission === "granted") requestGps(); }, [permission, requestGps]); // already allowed: start locating right away
  const offCampus = gps.status === "ok" && !!gps.fix && !onCampus(gps.fix.lat, gps.fix.lng);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const tap = useRef<{ x: number; y: number; t: number } | null>(null);

  const stop = useCallback(() => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    let alive = true;
    setReady(false);
    stop();
    if (!navigator.mediaDevices?.getUserMedia) { setError(cameraError(null)); return; }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        const caps = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as Caps;
        setZoomRange(caps.zoom && caps.zoom.max > caps.zoom.min ? caps.zoom : null);
        setZoom(caps.zoom?.min ?? 1);
        setTorchAvail(!!caps.torch);
        setTorch(false);
        if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => {}); }
        setError(null);
        setReady(true);
      })
      .catch((err) => alive && setError(cameraError(err)));
    return () => { alive = false; stop(); };
  }, [facing, attempt, stop]);

  const applyZoom = (z: number) => {
    if (!zoomRange) return;
    const v = Math.min(zoomRange.max, Math.max(zoomRange.min, z));
    setZoom(v);
    void stream.current?.getVideoTracks()[0]?.applyConstraints(advanced({ zoom: v })).catch(() => {});
  };
  const toggleTorch = () => {
    const next = !torch;
    setTorch(next);
    void stream.current?.getVideoTracks()[0]?.applyConstraints(advanced({ torch: next })).catch(() => setTorch(false));
  };
  const focusTap = (x: number, y: number, box: DOMRect) => {
    setFocusAt({ x, y, k: Date.now() });
    void stream.current?.getVideoTracks()[0]?.applyConstraints(advanced({ focusMode: "single-shot", pointsOfInterest: [{ x: (x - box.left) / box.width, y: (y - box.top) / box.height }] })).catch(() => {});
  };
  const dist = () => { const [a, b] = [...pointers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { pinch.current = { d: dist(), z: zoom }; tap.current = null; }
    else tap.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) applyZoom(pinch.current.z * (dist() / pinch.current.d));
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const t = tap.current;
    if (t && Date.now() - t.t < 300 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 10) focusTap(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
    tap.current = null;
  };
  const zoomPresets = zoomRange ? [1, 2, 3, 5].filter((z) => z >= zoomRange.min && z <= zoomRange.max) : [];

  /** GPS fix at the instant of capture; a story without a trustworthy location is refused. */
  const locate = async () => {
    const fix = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 });
    if (fix.accuracy > MAX_ACCURACY_M) throw new Error("Your GPS signal is too weak to place a story. Move somewhere with a clearer sky and try again.");
    if (!onCampus(fix.lat, fix.lng)) throw new Error("Stories can only be posted from Georgia Tech's campus.");
    return fix;
  };
  const fail = (err: unknown) => setError(err instanceof GeolocationError || err instanceof Error ? err.message : "Something went wrong. Try again.");

  const takePhoto = async () => {
    const el = video.current;
    if (!el || !ready || busy || !el.videoWidth) return;
    setBusy(true);
    try {
      const capturedAt = Date.now();
      const canvas = document.createElement("canvas");
      canvas.width = el.videoWidth;
      canvas.height = el.videoHeight;
      canvas.getContext("2d")!.drawImage(el, 0, 0);
      const [fix, blob] = await Promise.all([
        locate(),
        new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't capture the photo."))), "image/jpeg", 0.85)),
      ]);
      stop();
      onCapture({ blob, kind: "photo", capturedAt, ...fix });
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const startVideo = async () => {
    if (!stream.current || !ready || busy || recording) return;
    setBusy(true);
    try {
      const fix = await locate(); // fail before filming, not after
      let withAudio = stream.current;
      try { // microphone is optional: silent clip if it is denied
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        withAudio = new MediaStream([...stream.current.getVideoTracks(), ...mic.getAudioTracks()]);
      } catch { /* silent */ }
      const mime = pickMime();
      const rec = new MediaRecorder(withAudio, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      const startedAt = Date.now();
      rec.onstop = () => {
        window.clearInterval(timer.current);
        setRecording(0);
        withAudio.getAudioTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "video/webm" });
        stop();
        if (blob.size) onCapture({ blob, kind: "video", capturedAt: startedAt, ...fix });
        else setError("The clip came out empty. Try again.");
      };
      recorder.current = rec;
      rec.start(250);
      setRecording(1);
      timer.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setRecording(elapsed);
        if (elapsed >= MAX_VIDEO_MS && rec.state === "recording") rec.stop();
      }, 100);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const finishVideo = () => { if (recorder.current?.state === "recording") recorder.current.stop(); };

  const shutterOff = !ready || busy || gps.status !== "ok" || offCampus;
  const chip = gps.status === "ok" && gps.fix
    ? offCampus ? { tone: "bad", text: "Outside campus" }
      : { tone: gps.fix.accuracy > MAX_ACCURACY_M ? "warn" : "ok", text: gps.fix.accuracy > MAX_ACCURACY_M ? "Weak GPS" : `Location ±${Math.round(gps.fix.accuracy)} m` }
    : { tone: gps.status === "locating" ? "warn" : "bad", text: gps.status === "locating" ? "Locating…" : "No location" };

  return createPortal(
    <div className="story-camera">
      <video ref={video} className="story-camera__video" playsInline muted autoPlay data-mirrored={facing === "user"} />
      <div className="story-camera__surface" style={{ position: "absolute", inset: 0 }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      {focusAt && <span key={focusAt.k} className="story-camera__focus" style={{ left: focusAt.x, top: focusAt.y }} />}
      {error && (
        <div className="story-camera__error" role="alert">
          <p>{error}</p>
          <button type="button" className="cims-btn" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>Try again</button>
        </div>
      )}
      {!error && <LocationGate gps={gps} permission={permission} />}
      <div className="story-camera__top">
        <button type="button" className="story-camera__round" aria-label="Close camera" onClick={() => { stop(); onCancel(); }}>✕</button>
        <span className="story-camera__chip" data-tone={chip.tone} role="status">{chip.text}</span>
        <span className="story-camera__spacer" />
        {torchAvail && <button type="button" className="story-camera__round" aria-label="Flash" aria-pressed={torch} onClick={toggleTorch}>⚡</button>}
      </div>
      <div className="story-camera__bottom">
        {zoomPresets.length > 1 && (
          <div className="story-camera__zoom" role="group" aria-label="Zoom">
            {zoomPresets.map((z) => <button key={z} type="button" aria-pressed={Math.abs(zoom - z) < 0.25} onClick={() => applyZoom(z)}>{z}×</button>)}
          </div>
        )}
        <div className="story-camera__modes" role="group" aria-label="Capture mode">
          {(["photo", "video"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} disabled={!!recording} onClick={() => setMode(m)}>{m === "photo" ? "Photo" : "Video"}</button>
          ))}
        </div>
        <div className="story-camera__row">
          <span />
          {mode === "photo" ? (
            <button type="button" className="story-camera__shutter" aria-label="Take photo" disabled={shutterOff} onClick={() => void takePhoto()} />
          ) : recording ? (
            <button type="button" className="story-camera__shutter story-camera__shutter--rec" aria-label="Stop recording" onClick={finishVideo}>
              <span>{Math.ceil((MAX_VIDEO_MS - recording) / 1000)}</span>
            </button>
          ) : (
            <button type="button" className="story-camera__shutter story-camera__shutter--video" aria-label="Start recording" disabled={shutterOff} onClick={() => void startVideo()} />
          )}
          <button type="button" className="story-camera__round" aria-label="Switch camera" disabled={!!recording} onClick={() => setFacing(facing === "user" ? "environment" : "user")}>⟲</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
