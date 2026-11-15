/** @file Small inline "survey sketch" of a building (T-60): ink linework, gold hatch, white roof -- a schematic icon, never an accurate floor plan or facade. */

/** Window bands per building id, just enough variation that Kendeda and CULC read as different buildings. Not drawn from any real facade survey. */
const WINDOW_BANDS: Record<string, number[]> = {
  "kendeda-building-for-innovative-sustainable-design": [3, 3, 2],
  "g-wayne-clough-undergraduate-learning-commons": [4, 4, 4, 4],
};

/** Renders a flat, ink-outlined elevation sketch with a gold hatch fill and a row of square windows per level band. Purely decorative (aria-hidden). */
export default function BuildingGlyph({ buildingId }: { buildingId: string }) {
  const bands = WINDOW_BANDS[buildingId] ?? [3, 3];
  const patternId = `reserve-hatch-${buildingId}`;
  const left = 18, right = 142, top = 30, bottom = 102;
  const bandHeight = (bottom - top) / bands.length;

  return (
    <svg className="reserve-glyph" viewBox="0 0 160 120" role="img" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="var(--paper-2)" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--gold-ink)" strokeWidth="1" />
        </pattern>
      </defs>
      {/* ground line */}
      <line x1="10" y1={bottom + 6} x2="150" y2={bottom + 6} stroke="var(--ink)" strokeWidth="1" />
      {/* roof cap */}
      <rect x={left - 6} y={top - 10} width={right - left + 12} height="10" fill="var(--white)" stroke="var(--ink)" strokeWidth="1.5" />
      {/* walls */}
      <rect x={left} y={top} width={right - left} height={bottom - top} fill={`url(#${patternId})`} stroke="var(--ink)" strokeWidth="1.5" />
      {/* window bands */}
      {bands.map((count, band) => {
        const y = top + band * bandHeight + bandHeight / 2 - 6;
        const gap = (right - left) / (count + 1);
        return Array.from({ length: count }, (_, i) => (
          <rect key={`${band}-${i}`} x={left + gap * (i + 1) - 6} y={y} width="12" height="12" fill="var(--white)" stroke="var(--ink)" />
        ));
      })}
      {/* door */}
      <rect x={(left + right) / 2 - 10} y={bottom - 20} width="20" height="20" fill="var(--white)" stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  );
}
