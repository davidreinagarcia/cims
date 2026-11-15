/** @file Full-screen Campus Bulletin: cork board with masonry note cards, type filters with counts, search and deep link. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { POST_TYPES, bulletinPosts, databaseBulletinPosts, countByType, filterPosts, type BulletinPost, type BulletinRow, type PostType } from "../../lib/bulletin";
import { supabaseEnabled, supabaseSelect } from "../../lib/supabase";
import { Icon } from "../../shell/icons";
import { useAuth } from "../../state/auth";
import { useSelection } from "../../state/selection";
import AddPostForm from "./AddPostForm";
import { useBulletinInterest } from "./useBulletinInterest";
import "./board.css";

// Look is decided by position in the list (index % length), never by what the post says.
const FILLS = ["var(--white)", "var(--room-classroom)", "var(--room-study)", "var(--room-lab)", "var(--paper)", "var(--room-restroom)"];
const TILTS = [-1.2, 0.9, -0.4, 1.5, -1.5, 0.5, 1.1];
const PINS = ["var(--navy)", "var(--cat-issues)", "var(--gold-ink)", "var(--cat-orgs)"];
const FOCUSABLE = "button:not([disabled]), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";
const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
const typeLabel = (type: PostType) => POST_TYPES.find((item) => item.id === type)!.label;

function CorkTexture() {
  return (
    <svg className="board__texture" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="board-cork" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="m3 8 4 1m18 5 2-3m19 7 5 2M9 37l3-2m19 14 4 1m18-13 3-2M20 59l3-2M60 6l2 2" />
          <path d="M0 32h64M32 0v64" className="board__texture-grid" />
          <circle cx="17" cy="22" r="0.8" /><circle cx="43" cy="58" r="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#board-cork)" />
    </svg>
  );
}

function Pin({ color }: { color: string }) {
  return (
    <svg className="board-card__pin" width="22" height="28" viewBox="0 0 22 28" aria-hidden="true" focusable="false">
      <path d="M11 13v13" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="11" cy="9" r="8" fill={color} stroke="var(--ink)" strokeWidth="1" />
      <circle cx="8.2" cy="6.4" r="2.2" fill="var(--white)" opacity="0.55" />
    </svg>
  );
}

function NoteCard({ post, index, interested, interestCount, onInterest, onShow }: {
  post: BulletinPost; index: number; interested: boolean; onInterest: () => void; onShow: (placeId: string) => void;
  interestCount?: number | null;
}) {
  const style = { "--fill": FILLS[index % FILLS.length], "--tilt": `${TILTS[index % TILTS.length]}deg` } as CSSProperties;
  return (
    <li className="board-card" style={style}>
      <article aria-labelledby={`post-${post.id}`}>
        <Pin color={PINS[index % PINS.length]} />
        {(post.soon || post.isDemo) && (
          <div className="board-card__tags">
            {post.soon && <span className="board-card__stamp">Soon</span>}
            {post.isDemo && <span className="cims-tag cims-tag--alert" title="Fictional demo data, not a real post">DEMO</span>}
          </div>
        )}
        <p className="board-card__kicker cims-caps">{typeLabel(post.type)}{post.org && <> · {post.org}</>}</p>
        <h3 id={`post-${post.id}`} className="board-card__title">{post.title}</h3>
        <p className="board-card__when">{post.when}</p>
        {post.placeName && <p className="board-card__place">{post.placeName}</p>}
        {post.description && <p className="board-card__desc">{post.description}</p>}
        <div className="board-card__actions">
          {post.placeId && (
            <button type="button" className="board-card__map" onClick={() => onShow(post.placeId!)}>
              <Icon name="explore" size={18} /> Show on map
            </button>
          )}
          <button type="button" className="board-card__interest" aria-pressed={interested}
            aria-label={`Interested in ${post.title}`} onClick={onInterest}>Interested</button>
        </div>
        {interestCount !== undefined && <p className="board-card__count">{interestCount === null ? "Interest count unavailable" : `${interestCount} interested`}</p>}
      </article>
    </li>
  );
}

/** Modal cork board with local fallback and optional Supabase posts and interest counts. */
export default function BulletinBoard({ type, onType, onClose }: {
  type: PostType | "all"; onType: (type: PostType | "all") => void; onClose: () => void;
}) {
  const { select } = useSelection();
  const { session, requireAuth, dialogOpen } = useAuth();
  const enabled = supabaseEnabled();
  const root = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => new Date());
  const { interests, toggle: toggleInterest, counts: interestCounts, notice: interestNotice } = useBulletinInterest(session?.accountId);
  const [remotePosts, setRemotePosts] = useState<BulletinRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [onlyInterests, setOnlyInterests] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const element = root.current;
    element?.showModal();
    element?.querySelector<HTMLElement>(".board__back")?.focus();
    return () => { element?.close(); };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const refresh = async () => {
      const rows = await supabaseSelect<BulletinRow>("bulletin_posts", {
        select: "id,type,title,org,body,place_id,starts_at,ends_at", hidden: "eq.false", order: "starts_at.asc.nullslast,created_at.desc",
      });
      if (active && rows) setRemotePosts(rows);
    };
    void refresh();
    window.addEventListener("online", refresh);
    return () => { active = false; window.removeEventListener("online", refresh); };
  }, [enabled, now]);

  const posts = useMemo(() => {
    const local = bulletinPosts(now);
    if (!enabled) return local;
    return [...local, ...databaseBulletinPosts(remotePosts, now)].sort((a, b) => {
      const ongoingA = Boolean(a.start && a.end && a.start <= now && a.end > now);
      const ongoingB = Boolean(b.start && b.end && b.start <= now && b.end > now);
      return Number(ongoingB) - Number(ongoingA) || (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity);
    });
  }, [now, enabled, remotePosts]);
  const matching = useMemo(() => filterPosts(posts, "all", query), [posts, query]);
  const saved = matching.filter((post) => interests.has(post.id));
  const counts = countByType(onlyInterests ? saved : matching);
  const shown = filterPosts(onlyInterests ? saved : matching, type);
  const chips: { id: PostType | "all"; label: string }[] = [{ id: "all", label: "All" }, ...POST_TYPES];

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (dialogOpen) return;
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const items = Array.from(root.current!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === root.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };

  const emptyText = onlyInterests
    ? "No interested posts match these filters. Mark a post as Interested to save it on this device."
    : query.trim()
    ? `No ${type === "all" ? "" : `${typeLabel(type)} `}posts match “${query.trim()}”`
    : type === "all" ? "No posts yet" : `No ${typeLabel(type)} posts yet`;

  return (
    <dialog ref={root} className="board" role="dialog" aria-modal="true" aria-labelledby="board-title" tabIndex={-1}
      onKeyDown={onKeyDown} onCancel={(event) => { event.preventDefault(); if (!dialogOpen) onClose(); }}>
      <header className="board__bar">
        <h2 id="board-title" className="board__title">Campus Bulletin</h2>
        <label className="board__search cims-field">
          <span className="board__search-icon"><Icon name="search" size={20} /></span>
          <input type="search" value={query} placeholder="Search posts" aria-label="Search posts"
            onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="button" className="board__btn board__back" onClick={onClose}>
          <Icon name="left" size={18} /> Back to map
        </button>
        <button type="button" className="board__btn board__btn--gold board__add"
          onClick={() => requireAuth(() => enabled ? setAdding(true) : setNotice("Posting is coming soon. The board is read-only for now."))}>
          <span>Add post</span>{!enabled && <small>Coming soon</small>}
        </button>
      </header>
      <div className="board__sub">
        <p role="status">Showing {shown.length} {shown.length === 1 ? "post" : "posts"} · {today.format(now)} · Campus time (ET)</p>
        {(notice || interestNotice) && <p className="board__notice" role="status">{notice || interestNotice}</p>}
      </div>
      <div className="board__surface">
        <CorkTexture />
        {enabled && adding && session && <AddPostForm accountId={session.accountId}
          onCancel={() => { setAdding(false); root.current?.querySelector<HTMLElement>(".board__add")?.focus(); }}
          onAdded={(row) => {
            setRemotePosts((posts) => [row, ...posts.filter((post) => post.id !== row.id)]);
            setAdding(false); setNotice("Post added."); setOnlyInterests(false); setQuery(""); onType("all");
            root.current?.querySelector<HTMLElement>(".board__add")?.focus();
          }} />}
        <div className="board__chips" role="group" aria-label="Filter posts by type">
          {chips.map((chip) => (
            <button key={chip.id} type="button" className="board__chip" aria-pressed={type === chip.id} onClick={() => onType(chip.id)}>
              {chip.label} <span className="board__count">{counts[chip.id]}</span>
            </button>
          ))}
          <button type="button" className="board__chip board__interests" aria-pressed={onlyInterests}
            onClick={() => setOnlyInterests(!onlyInterests)}>My interests <span className="board__count">{saved.length}</span></button>
        </div>
        {shown.length === 0
          ? <p className="board__empty" role="status">{emptyText}</p>
          : (
            <ul className="board__grid" aria-label="Posts">
              {shown.map((post, index) => (
                <NoteCard key={post.id} post={post} index={index} interested={interests.has(post.id)}
                  interestCount={enabled ? interestCounts ? interestCounts[post.id] ?? 0 : null : undefined}
                  onInterest={() => toggleInterest(post.id)}
                  onShow={(placeId) => { select({ kind: "place", id: placeId }); onClose(); }} />
              ))}
            </ul>
          )}
      </div>
    </dialog>
  );
}
