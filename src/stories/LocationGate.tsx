/** @file Location step of the story camera: asks for GPS from a real tap (so the browser shows its permission prompt), and when it is blocked explains the exact fix for this phone. */
import { useEffect, useState } from "react";
import type { GpsState } from "../lib/useGpsFix";

/** What the browser says about location permission; "unknown" where the Permissions API can't tell (older Safari). */
export type LocationPermission = "granted" | "prompt" | "denied" | "unknown";

/** Live location permission. Updates by itself when the person flips the switch in the browser settings and comes back. */
export function useLocationPermission(): LocationPermission {
  const [state, setState] = useState<LocationPermission>("unknown");
  useEffect(() => {
    let status: PermissionStatus | undefined;
    let alive = true;
    const read = () => { if (alive && status) setState(status.state as LocationPermission); };
    navigator.permissions?.query({ name: "geolocation" }).then((s) => { if (!alive) return; status = s; read(); s.onchange = read; }).catch(() => {});
    return () => { alive = false; if (status) status.onchange = null; };
  }, []);
  return state;
}

const UA = typeof navigator === "undefined" ? "" : navigator.userAgent;
const IOS = /iPhone|iPad|iPod/.test(UA);
/** In-app browsers (Telegram, Instagram, ...) often have no location at all; the page must be opened in Safari/Chrome. */
const IN_APP = /FBAN|FBAV|Instagram|Snapchat|TikTok|MicroMessenger|Line\/|Twitter|; wv\)/.test(UA) || (IOS && !/Safari/.test(UA));

function BlockedSteps() {
  return IOS ? (
    <ol>
      <li>Tap <b>aA</b> in the address bar, then <b>Website Settings</b> and set <b>Location</b> to <b>Allow</b>.</li>
      <li>If it is still blocked: iPhone <b>Settings › Privacy &amp; Security › Location Services</b> must be on, with <b>Safari Websites</b> set to <b>While Using</b>.</li>
    </ol>
  ) : (
    <ol>
      <li>Tap the <b>lock</b> (or tune) icon next to the address bar, then <b>Permissions</b> and set <b>Location</b> to <b>Allow</b>.</li>
      <li>If it is still blocked: Android <b>Settings › Location</b> must be on, and Chrome allowed under <b>App permissions</b>.</li>
    </ol>
  );
}

/** Card over the camera until a GPS fix exists. Renders nothing once the fix is in. */
export default function LocationGate({ gps, permission }: { gps: GpsState; permission: LocationPermission }) {
  if (gps.status === "ok") return null;
  if (gps.status === "locating") {
    return <div className="story-gate" role="status"><h3>Finding your location…</h3><p>Stories are pinned to the spot where you take them.</p></div>;
  }
  const blocked = gps.reason === "denied" || permission === "denied";
  if (gps.reason === "unsupported" || (IN_APP && gps.status === "error")) {
    return (
      <div className="story-gate" role="alert">
        <h3>This browser can't share your location</h3>
        <p>{IN_APP ? "You're probably inside another app's built-in browser. Open this page in " : "Open this page in "}{IOS ? "Safari" : "Chrome"} and try again.</p>
      </div>
    );
  }
  if (blocked) {
    return (
      <div className="story-gate" role="alert">
        <h3>Location is blocked for this site</h3>
        <p>Browsers only ask once, so it has to be switched on by hand:</p>
        <BlockedSteps />
        <button type="button" className="cims-btn cims-btn--primary" onClick={gps.request}>I've allowed it, check again</button>
      </div>
    );
  }
  if (gps.status === "error") {
    return (
      <div className="story-gate" role="alert">
        <h3>Couldn't find you yet</h3>
        <p>{gps.message} Make sure Location / GPS is switched on in your phone.</p>
        <button type="button" className="cims-btn cims-btn--primary" onClick={gps.request}>Try again</button>
      </div>
    );
  }
  return (
    <div className="story-gate">
      <h3>Share your location to post</h3>
      <p>A story is placed on the map where you shoot it, and only works from campus. Your browser will ask you to confirm.</p>
      <button type="button" className="cims-btn cims-btn--primary" onClick={gps.request}>Allow location</button>
    </div>
  );
}
