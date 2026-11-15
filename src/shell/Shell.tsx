/** @file Map-first app shell (docs/design/APP-SHELL.md): full-bleed map with rail or tab bar, search pill, chips, and a card or sheet for panels. */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import MapView from "../components/MapView";
import OfflineBanner from "../components/OfflineBanner";
import BuildingView from "../indoor/BuildingView";
import AccountChip from "../panels/account/AccountChip";
import SignInDialog from "../panels/account/SignInDialog";
import BuildingCard from "../panels/building-card/BuildingCard";
import BuildingPreview from "../panels/building-card/BuildingPreview";
import PlaceCard from "../panels/building-card/PlaceCard";
import BulletinPanel from "../panels/bulletin/BulletinPanel";
import StoriesPanel from "../stories/StoriesPanel";
import { useStories } from "../stories/store";
import { useAuth } from "../state/auth";
import { useSelection, type SelectionKind } from "../state/selection";
import BottomSheet, { type SheetSnap } from "./BottomSheet";
import ChipsBar from "./ChipsBar";
import FloatingCard from "./FloatingCard";
import { Icon, type ShellPanel } from "./icons";
import LayersPopover from "./LayersPopover";
import MobileTabBar from "./MobileTabBar";
import Rail from "./Rail";
import RoutePanel from "./RoutePanel";
import SearchPill from "./SearchPill";
import "./shell.css";

const MOBILE = "(max-width: 767.98px)";
const PANELS: ShellPanel[] = ["explore", "rooms", "report", "bulletin", "stories", "route"];
const KINDS: SelectionKind[] = ["building", "place", "room", "report"];

function useIsMobile(): boolean {
  return useSyncExternalStore((onChange) => {
    const query = window.matchMedia(MOBILE);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, () => window.matchMedia(MOBILE).matches);
}

/** `?panel=bulletin` opens a panel and `?select=place:<id>` selects something on load (shareable links, screenshots). */
function initialPanel(): ShellPanel {
  const panel = new URLSearchParams(window.location.search).get("panel") as ShellPanel | null;
  return panel && PANELS.includes(panel) ? panel : "explore";
}

function ComingSoon({ what, hint }: { what: string; hint?: string }) {
  return (
    <div className="shell-soon cims-empty" role="status">
      <strong>{what}: coming soon</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

/** Lays out the map and every floating surface; panels are mounted unchanged inside the card (desktop) or sheet (phones). */
export default function Shell() {
  const mobile = useIsMobile();
  const { selection, select } = useSelection();
  const { dialogOpen } = useAuth();
  const [panel, setPanel] = useState<ShellPanel>(initialPanel);
  const [hasQuery, setHasQuery] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>("half");

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("select");
    const [kind, ...rest] = raw?.split(":") ?? [];
    if (KINDS.includes(kind as SelectionKind) && rest.length) select({ kind: kind as SelectionKind, id: rest.join(":") });
  }, []); // once, on load

  // Clicking the story heat map opens the stories under it; phones show them tall.
  const { viewer } = useStories();
  useEffect(() => { if (viewer) setPanel("stories"); }, [viewer]);
  useEffect(() => { if (panel === "stories" && mobile) setSnap("full"); }, [panel, mobile]);

  // Picking something on the map (or from the bulletin) always shows it.
  useEffect(() => { if (selection) setPanel("explore"); }, [selection]);

  const choosePanel = (next: ShellPanel) => {
    if (next !== "explore" && next === panel) setPanel("explore"); // pressing the open item again closes it
    else { setPanel(next); if (next !== "explore") select(null); }
  };
  const closeContent = () => { if (panel === "explore") select(null); else setPanel("explore"); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || dialogOpen) return;
      if (document.querySelector(".building-view")) return; // the indoor screen handles its own Esc
      if (panel !== "explore" || selection) { event.preventDefault(); closeContent(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let content: { title: string; key: string; body: ReactNode } | null = null;
  if (panel === "bulletin") content = { title: "Bulletin", key: "bulletin", body: <BulletinPanel onShowMap={() => setPanel("explore")} /> };
  else if (panel === "rooms") content = { title: "Rooms", key: "rooms", body: <ComingSoon what="Room finder" hint="You can already search a room number in the search bar." /> };
  else if (panel === "report") content = { title: "Report", key: "report", body: <ComingSoon what="Report an issue" /> };
  else if (panel === "stories") content = { title: "Stories", key: "stories", body: <StoriesPanel onShowMap={() => setPanel("explore")} /> };
  else if (panel === "route") content = { title: "Route", key: "route", body: <RoutePanel onClose={() => setPanel("explore")} /> };
  else if (selection) content = {
    title: selection.kind === "building" ? "Building" : "Place",
    key: `${selection.kind}:${selection.id}`,
    body: <><PlaceCard /><BuildingPreview /><BuildingCard /></>,
  };
  const showResults = hasQuery && !selection && panel === "explore";

  const pill = (
    <SearchPill showResults={showResults}
      onQuery={(q) => { setHasQuery(q); if (q && panel !== "explore") setPanel("explore"); }}
      onRoute={mobile ? undefined : () => choosePanel("route")}
      trailing={mobile ? <AccountChip /> : undefined} />
  );

  return (
    <div className="app cims" data-layout={mobile ? "mobile" : "desktop"}>
      <SignInDialog />
      {!mobile && <Rail panel={panel} onPanel={choosePanel} />}
      <div className="stage">
        <MapView />
        <BuildingView />
        <LayersPopover />
        {mobile && (
          <button type="button" className="shell-fab" aria-label="Route: directions between two places" onClick={() => choosePanel("route")}>
            <Icon name="route" />
          </button>
        )}
      </div>
      <div className="shell-left">
        {pill}
        {!mobile && content && (
          <FloatingCard title={content.title} contentKey={content.key} onClose={closeContent}>{content.body}</FloatingCard>
        )}
      </div>
      <div className="shell-topbar">
        <ChipsBar />
        {!mobile && <div className="shell-account"><AccountChip /></div>}
      </div>
      {mobile && content && (
        <BottomSheet title={content.title} contentKey={content.key} snap={snap} onSnap={setSnap} onClose={closeContent}>{content.body}</BottomSheet>
      )}
      {mobile && <MobileTabBar panel={panel} onPanel={choosePanel} />}
      <OfflineBanner />
    </div>
  );
}
