/** @file Desktop floating card under the search pill: hosts the existing panels, scrolls inside, collapses to the side, closes. */
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./icons";

/** Card with a close button and a ‹ collapse tab on its right edge. Renders nothing visible when its panel renders nothing. */
export default function FloatingCard({ title, contentKey, onClose, children }: {
  title: string;
  /** Changes when the content changes, so a collapsed card reopens for new content. */
  contentKey: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(false), [contentKey]);
  return (
    <section className="shell-card" data-collapsed={collapsed} aria-label={title}>
      <div className="shell-card__surface" hidden={collapsed}>
        <header className="shell-card__head">
          <span className="cims-caps">{title}</span>
          <button type="button" className="shell-iconbtn" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="shell-card__body">{children}</div>
      </div>
      <button type="button" className="shell-card__collapse" aria-expanded={!collapsed}
        aria-label={collapsed ? `Show ${title.toLowerCase()}` : `Hide ${title.toLowerCase()}`} onClick={() => setCollapsed(!collapsed)}>
        <Icon name={collapsed ? "right" : "left"} size={16} />
      </button>
    </section>
  );
}
