/** @file Small notice shown while the browser is offline: the app keeps working from its saved copy. */
import { useEffect, useState } from "react";
import "./OfflineBanner.css";

/** Listens to online and offline events and renders a status chip only while offline. */
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  if (online) return null;
  return (
    <div className="offline-banner cims-status" role="status">
      Offline: showing saved data. Map tiles you have not viewed may be missing.
    </div>
  );
}
