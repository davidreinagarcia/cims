/** @file Full-screen Campus Bulletin: cork board with masonry note cards, type filters with counts, search and deep link. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { POST_TYPES, bulletinPosts, bulletinUrl, countByType, filterPosts, type BulletinPost, type PostType } from "../../lib/bulletin";
import { Icon } from "../../shell/icons";
import { useAuth } from "../../state/auth";
import { useSelection } from "../../state/selection";
import "./board.css";

// Look is decided by position in the list (index % length), never by what the post says.
const FILLS = ["var(--white)", "var(--room-classroom)", "var(--room-study)", "var(--room-lab)", "var(--paper)", "var(--room-restroom)"];
const TILTS = [-1.2, 0.9, -0.4, 1.5, -1.5, 0.5, 1.1];
const PINS = ["var(--navy)", "var(--cat-issues)", "var(--gold-ink)", "var(--cat-orgs)"];
const FOCUSABLE = "button:not([disabled]), input, a[href], [tabindex]:not([tabindex='-1'])";
const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
const typeLabel = (type: PostType) => POST_TYPES.find((item) => item.id === type)!.label;

/** Writes the open board and its filter into the address bar, keeping unrelated params (e.g. drafts=1). */
function syncUrl(type: PostType | "all" | null) {
  const params = new URLSearchParams(window.location.search);
  ["view", "type", "panel"].forEach((key) => params.delete(key));
  if (type) new URLSearchParams(bulletinUrl(type)).forEach((value, key) => params.set(key, value));
  const query = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
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

function NoteCard({ post, index, onShow }: { post: BulletinPost; index: number; onShow: (placeId: string) => void }) {
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
        {post.placeId && (
          <button type="button" className="board-card__map" onClick={() => onShow(post.placeId!)}>
            <Icon name="explore" size={18} /> Show on map
          </button>
        )}
      </article>
    </li>
  );
}

/** Full-screen modal cork board. Esc / Back to map call onClose; focus returns to the Bulletin nav button on unmount. */
export default function BulletinBoard({ initialType = "all", onClose }: { initialType?: PostType | "all"; onClose: () => void }) {
  const { select } = useSelection();
  const { requireAuth, dialogOpen } = useAuth();
  const root = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<PostType | "all">(initialType);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    root.current?.focus();
    return () => {
      syncUrl(null);
      document.querySelector<HTMLElement>('[data-nav="bulletin"]')?.focus();
    };
  }, []);
  useEffect(() => { syncUrl(type); }, [type]);

  const posts = useMemo(() => bulletinPosts(now), [now]);
  const matching = useMemo(() => filterPosts(posts, "all", query), [posts, query]);
  const counts = countByType(matching);
  const shown = filterPosts(matching, type);
  const chips: { id: PostType | "all"; label: string }[] = [{ id: "all", label: "All" }, ...POST_TYPES];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  const emptyText = query.trim()
    ? `No ${type === "all" ? "" : `${typeLabel(type)} `}posts match “${query.trim()}”`
    : type === "all" ? "No posts yet" : `No ${typeLabel(type)} posts yet`;

  return (
    <div ref={root} className="board" role="dialog" aria-modal="true" aria-labelledby="board-title" tabIndex={-1} onKeyDown={onKeyDown}>
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
          onClick={() => requireAuth(() => setNotice("Posting is coming soon. The board is read-only for now."))}>
          Add post
        </button>
      </header>
      <div className="board__sub">
        <p>Showing {shown.length} {shown.length === 1 ? "post" : "posts"} · {today.format(now)} · Campus time (ET)</p>
        {notice && <p className="board__notice" role="status">{notice}</p>}
      </div>
      <div className="board__surface">
        <div className="board__chips" role="group" aria-label="Filter posts by type">
          {chips.map((chip) => (
            <button key={chip.id} type="button" className="board__chip" aria-pressed={type === chip.id} onClick={() => setType(chip.id)}>
              {chip.label} <span className="board__count">{counts[chip.id]}</span>
            </button>
          ))}
        </div>
        {shown.length === 0
          ? <p className="board__empty" role="status">{emptyText}</p>
          : (
            <ul className="board__grid" aria-label="Posts">
              {shown.map((post, index) => (
                <NoteCard key={post.id} post={post} index={index} onShow={(placeId) => { select({ kind: "place", id: placeId }); onClose(); }} />
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}
