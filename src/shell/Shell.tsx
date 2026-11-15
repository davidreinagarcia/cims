/** @file Map-first app shell (docs/design/APP-SHELL.md): full-bleed map with rail or tab bar, search pill, chips, a card or sheet for panels, and full-screen Bulletin/BuzzPrint views. */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import MapView from "../components/MapView";
import OfflineBanner from "../components/OfflineBanner";
import AlertBanner from "../alerts/AlertBanner";
import { useAlertBanners } from "../alerts/useAlertBanners";
import BuildingView from "../indoor/BuildingView";
import { useBookingRequestSeq } from "../indoor/handoff";
import AccountChip from "../panels/account/AccountChip";
import SignInDialog from "../panels/account/SignInDialog";
import BuildingCard from "../panels/building-card/BuildingCard";
import BuildingPreview from "../panels/building-card/BuildingPreview";
import PlaceCard from "../panels/building-card/PlaceCard";
import BulletinBoard from "../panels/bulletin/BulletinBoard";
import PoliceView from "../panels/police/PoliceView";
import ReportPanel from "../panels/report";
import RoomFinderPanel from "../panels/rooms/RoomFinderPanel";
import PortfolioPage from "../portfolio/PortfolioPage";
import StoriesPanel from "../stories/StoriesPanel";
import { useStories } from "../stories/store";
import { bulletinUrl, readBulletinParams, type PostType } from "../lib/bulletin";
import { useAuth } from "../state/auth";
import { useSelection, type Selection, type SelectionKind } from "../state/selection";
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
const PANELS: ShellPanel[] = ["explore", "rooms", "report", "bulletin", "stories", "route", "buzzprint"];
const KINDS: SelectionKind[] = ["building", "place", "room", "report"];

function useIsMobile(): boolean {
  return useSyncExternalStore((onChange) => {
    const query = window.matchMedia(MOBILE);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, () => window.matchMedia(MOBILE).matches);
}

/** Read a shareable shell panel; bulletin and buzzprint are full-screen views with their own open flag, not a `panel` value. */
function initialPanel(): ShellPanel {
  const panel = new URLSearchParams(window.location.search).get("panel") as ShellPanel | null;
  return panel && panel !== "bulletin" && panel !== "buzzprint" && PANELS.includes(panel) ? panel : "explore";
}

function initialBulletin() {
  const bulletin = readBulletinParams(window.location.search);
  return { ...bulletin, open: bulletin.open || new URLSearchParams(window.location.search).get("panel") === "bulletin" };
}

function writeBulletinUrl(type: PostType | "all" | null, push = false) {
  const params = new URLSearchParams(window.location.search);
  params.delete("view");
  params.delete("type");
  if (params.get("panel") === "bulletin") params.delete("panel");
  if (type !== null) new URLSearchParams(bulletinUrl(type)).forEach((value, key) => params.set(key, value));
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  if (push) window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

function ComingSoon({ what, hint }: { what: string; hint?: string }) {
  return (
    <div className="shell-soon cims-empty" role="status">
      <strong>{what}: coming soon</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

/** Lays out map surfaces and the full-screen bulletin, including URL navigation and return focus. */
export default function Shell() {
  const mobile = useIsMobile();
  const { selection, select } = useSelection();
  const { dialogOpen } = useAuth();
  const [panel, setPanel] = useState<ShellPanel>(initialPanel);
  const [routeTo, setRouteTo] = useState<Selection | null>(null);
  const [bulletin, setBulletin] = useState(initialBulletin);
  const bulletinOpener = useRef<HTMLElement | null>(null);
  const bulletinWasOpen = useRef(false);
  // BuzzPrint (T-71) is a full-screen view like the bulletin, with its own open flag outside `panel`.
  const [buzzprintOpen, setBuzzprintOpen] = useState(false);
  const buzzprintOpener = useRef<HTMLElement | null>(null);
  const buzzprintWasOpen = useRef(false);
  const [hasQuery, setHasQuery] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>("half");
  const { banners, dismiss } = useAlertBanners();
  // The GTPD console is a full-screen view, deep-linkable with ?view=police.
  const [policeOpen, setPoliceOpen] = useState(() => new URLSearchParams(window.location.search).get("view") === "police");
  const setPolice = (open: boolean) => {
    const params = new URLSearchParams(window.location.search);
    if (open) params.set("view", "police"); else params.delete("view");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    setPoliceOpen(open);
  };

  useEffect(() => {
    // Canonicalize the old panel link once; history navigation never writes over the destination.
    if (initialBulletin().open && !readBulletinParams(window.location.search).open) writeBulletinUrl(initialBulletin().type);
    const onPopState = () => setBulletin(initialBulletin());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (bulletinWasOpen.current && !bulletin.open) {
      const opener = bulletinOpener.current;
      const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('[data-nav="bulletin"]');
      target?.focus();
    }
    bulletinWasOpen.current = bulletin.open;
  }, [bulletin.open]);

  const closeBulletin = () => {
    writeBulletinUrl(null);
    setBulletin((current) => ({ ...current, open: false }));
    setPanel("explore");
  };

  useEffect(() => {
    if (buzzprintWasOpen.current && !buzzprintOpen) {
      const opener = buzzprintOpener.current;
      const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('[data-nav="buzzprint"]');
      target?.focus();
    }
    buzzprintWasOpen.current = buzzprintOpen;
  }, [buzzprintOpen]);

  const closeBuzzprint = () => setBuzzprintOpen(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("select");
    const [kind, ...rest] = raw?.split(":") ?? [];
    if (KINDS.includes(kind as SelectionKind) && rest.length) select({ kind: kind as SelectionKind, id: rest.join(":") });
  }, []); // once, on load

  // Clicking the story heat map opens the stories under it; phones show them tall.
  const { viewer } = useStories();
  useEffect(() => { if (viewer) setPanel("stories"); }, [viewer]);
  useEffect(() => { if (panel === "stories" && mobile) setSnap("full"); }, [panel, mobile]);

  // Picking something on the map (or from the bulletin) always shows it; a "report" selection
  // (a place/building card's "Report an issue") opens the report panel prefilled with it instead.
  useEffect(() => { if (selection) setPanel(selection.kind === "report" ? "report" : "explore"); }, [selection]);
  // "Book this room" on the indoor room card: leave the building and open the reservations panel on it.
  const booking = useBookingRequestSeq();
  useEffect(() => { if (booking) { select(null); setPanel("rooms"); } }, [booking]); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePanel = (next: ShellPanel) => {
    if (next === "bulletin") {
      bulletinOpener.current = document.querySelector<HTMLElement>('[data-nav="bulletin"]');
      writeBulletinUrl("all", true);
      setBulletin({ open: true, type: "all" });
      setPanel("explore");
      select(null);
      return;
    }
    if (next === "buzzprint") {
      buzzprintOpener.current = document.querySelector<HTMLElement>('[data-nav="buzzprint"]');
      setBuzzprintOpen(true);
      setPanel("explore");
      select(null);
      return;
    }
    if (next !== "explore" && next === panel) setPanel("explore"); // pressing the open item again closes it
    else {
      if (next === "route") setRouteTo(selection);
      setPanel(next);
      if (next !== "explore") select(null);
    }
  };
  const closeContent = () => { if (panel === "explore") select(null); else setPanel("explore"); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || dialogOpen || bulletin.open || buzzprintOpen) return;
      if (document.querySelector(".building-view")) return; // the indoor screen handles its own Esc
      if (panel !== "explore" || selection) { event.preventDefault(); closeContent(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let content: { title: string; key: string; body: ReactNode } | null = null;
  if (panel === "rooms") content = { title: "Rooms", key: "rooms", body: <RoomFinderPanel /> };
  else if (panel === "report") {
    // Keyed by the selected place/building (when there is one) so the flow resets for a new "Report an issue".
    const reportKey = selection?.kind === "report" ? `report:${selection.id}` : "report";
    content = { title: "Report", key: reportKey, body: <ReportPanel key={reportKey} onClose={() => setPanel("explore")} /> };
  }
  else if (panel === "stories") content = { title: "Stories", key: "stories", body: <StoriesPanel onShowMap={() => setPanel("explore")} /> };
  else if (panel === "route") content = { title: "Route", key: "route", body: <RoutePanel initialSelection={routeTo} onClose={closeContent} /> };
  else if (selection && selection.kind !== "report") content = {
    title: selection.kind === "building" ? "Building" : "Place",
    key: `${selection.kind}:${selection.id}`,
    body: <><PlaceCard /><BuildingPreview /><BuildingCard /></>,
  };
  const showResults = hasQuery && !selection && panel === "explore";

  // Focus follows the content. When the focused control unmounts (a card's "Show on map", its close button, Esc
  // from inside it), focus moves to the new card/sheet, or back to whatever opened the content once it closes.
  // Focus that is still somewhere (map canvas, search field, nav item) is never stolen.
  const contentKey = content?.key ?? null;
  const shownKey = useRef<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const before = shownKey.current;
    shownKey.current = contentKey;
    if (before === contentKey) return;
    const active = document.activeElement;
    const lost = !(active instanceof HTMLElement) || active === document.body;
    if (!lost && contentKey && !before) opener.current = active;
    if (!lost) return;
    if (!contentKey) {
      const back = opener.current?.isConnected ? opener.current
        : document.querySelector<HTMLElement>('.shell-navitem[aria-pressed="true"], .shell-search input');
      back?.focus();
    } else if (before) {
      // Replaced while focus was inside it; content shown from nothing with focus nowhere is a page load: leave it.
      document.querySelector<HTMLElement>(".shell-card, .shell-sheet")?.focus();
    }
  }, [contentKey]);

  const pill = (
    <SearchPill showResults={showResults}
      onQuery={(q) => {
        setHasQuery(q);
        if (!q) return;
        // A new query replaces whatever was showing, so its suggestions are visible (and Enter acts on what is seen).
        if (panel !== "explore") setPanel("explore");
        if (selection) select(null);
      }}
      onRoute={mobile ? undefined : () => choosePanel("route")}
      trailing={mobile ? <AccountChip /> : undefined} />
  );

  return (
    <div className="app cims" data-layout={mobile ? "mobile" : "desktop"} data-alert={banners.length > 0 ? "true" : undefined}>
      <AlertBanner banners={banners} onDismiss={dismiss} />
      <SignInDialog />
      {!mobile && <Rail panel={bulletin.open ? "bulletin" : buzzprintOpen ? "buzzprint" : panel} onPanel={choosePanel} onPolice={() => setPolice(true)} />}
      <div className="stage">
        <MapView />
        <BuildingView />
        <LayersPopover />
        {mobile && (
          <>
            <button type="button" className="shell-fab shell-fab--police" aria-label="GTPD alert console" onClick={() => setPolice(true)}>
              <Icon name="shield" />
            </button>
            <button type="button" className="shell-fab" aria-label="Route: directions between two places" onClick={() => choosePanel("route")}>
              <Icon name="route" />
            </button>
          </>
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
      {mobile && <MobileTabBar panel={bulletin.open ? "bulletin" : buzzprintOpen ? "buzzprint" : panel} onPanel={choosePanel} />}
      <OfflineBanner />
      {policeOpen && <PoliceView onClose={() => setPolice(false)} />}
      {bulletin.open && <BulletinBoard type={bulletin.type} onClose={closeBulletin}
        onType={(type) => { writeBulletinUrl(type); setBulletin({ open: true, type }); }} />}
      {buzzprintOpen && <PortfolioPage onClose={closeBuzzprint} />}
    </div>
  );
}
