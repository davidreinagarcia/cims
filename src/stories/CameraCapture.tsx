/** @file Live camera for stories: photo or up-to-15s video straight from getUserMedia, with the GPS fix taken at the moment of capture. There is deliberately no file picker, so nothing can come from the gallery. */
import { useCallback, useEffect, useRef, useState } from "react";
import { CAMPUS } from "../config";
import { GeolocationError, getCurrentPosition } from "../lib/geolocation";
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

/** Full-height camera view. Calls `onCapture` with the media plus where it was taken; the caller decides what to do with it. */
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
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => {}); }
        setError(null);
        setReady(true);
      })
      .catch((err) => alive && setError(cameraError(err)));
    return () => { alive = false; stop(); };
  }, [facing, attempt, stop]);

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

  return (
    <div className="story-camera">
      <video ref={video} className="story-camera__video" playsInline muted autoPlay data-mirrored={facing === "user"} />
      {error && (
        <div className="story-camera__error" role="alert">
          <p>{error}</p>
          <button type="button" className="cims-btn" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>Try again</button>
        </div>
      )}
      <div className="story-camera__top">
        <button type="button" className="story-camera__chip" onClick={() => { stop(); onCancel(); }}>Cancel</button>
        <span className="story-camera__chip story-camera__chip--live">Live only · no uploads</span>
      </div>
      <div className="story-camera__bottom">
        <div className="story-camera__modes" role="group" aria-label="Capture mode">
          {(["photo", "video"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} disabled={!!recording} onClick={() => setMode(m)}>{m === "photo" ? "Photo" : "Video"}</button>
          ))}
        </div>
        <div className="story-camera__row">
          <span />
          {mode === "photo" ? (
            <button type="button" className="story-camera__shutter" aria-label="Take photo" disabled={!ready || busy} onClick={() => void takePhoto()} />
          ) : recording ? (
            <button type="button" className="story-camera__shutter story-camera__shutter--rec" aria-label="Stop recording" onClick={finishVideo}>
              <span>{Math.ceil((MAX_VIDEO_MS - recording) / 1000)}</span>
            </button>
          ) : (
            <button type="button" className="story-camera__shutter story-camera__shutter--video" aria-label="Start recording" disabled={!ready || busy} onClick={() => void startVideo()} />
          )}
          <button type="button" className="story-camera__flip" aria-label="Switch camera" disabled={!!recording} onClick={() => setFacing(facing === "user" ? "environment" : "user")}>⟲</button>
        </div>
      </div>
    </div>
  );
}
