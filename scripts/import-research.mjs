/** @file Merge Tato's Gemini research into curated draft POIs without replacing curated facts. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESEARCH = 'docs/data/research/';
const FILL = ['hours', 'hours_note', 'buzzcard', 'url', 'menu_url', 'dining_dollars', 'meal_swipes', 'floor_or_room'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Read a repository JSON document. */
async function readJson(path) {
  return JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));
}

/** Write only changed bytes, using stable indentation and a trailing newline. */
async function writeChanged(path, content) {
  let previous;
  try { previous = await readFile(resolve(ROOT, path), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous !== content) await writeFile(resolve(ROOT, path), content);
}

/** Fold punctuation, accents and explanatory parentheticals for exact name comparisons. */
function normalized(value = '') {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/\([^)]*\)/g, '').replace(/&/g, ' and ').replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\b(?:headquarters|hq)\b/g, '').replace(/\s+/g, ' ').trim();
}

/** Return normalized full names and aliases; never use fuzzy substring matching for POIs. */
function names(p) {
  const values = [p.name, ...(p.aliases ?? [])].filter(Boolean).map(normalized).filter(Boolean);
  // Explicit same-facility names in the two research sets; do not merge generic pool records.
  const equivalents = [
    ['coach herb mcauley aquatic center competition pool', 'coach herb mcauley aquatic center'],
    ['vernon d and helen d crawford leisure pool', 'vernon d and helen d crawford pool'],
  ];
  for (const group of equivalents) if (values.some(v => group.includes(v))) values.push(...group);
  return new Set(values);
}

/** Test two name sets for an exact normalized intersection. */
function overlaps(a, b) {
  return [...a].some(value => b.has(value));
}

// These building equivalences are grounded in the input names/aliases, not inferred coordinates.
const BUILDING_VARIANTS = [
  ['dorothy m crosland tower', 'dorothy crosland tower', 'dorothy murray crosland tower', 'crosland tower'],
  ['clough commons', 'clough undergraduate learning commons', 'g wayne clough undergraduate learning commons', 'culc', 'clough'],
  ['john lewis student center', 'stamps student center', 'student center'],
  ['charles a smithgall jr student services building', 'flag building', 'smithgall student services building'],
  ['joseph brown whitehead building', 'joseph b whitehead student health center'],
  ['tech square parking deck', 'technology square parking deck'],
  ['dalney parking deck', 'dalney street parking deck'],
  ['molecular science and engineering building', 'glen p robinson jr building'],
  ['lyman hall', 'lyman hall building'],
  ['coda building', 'coda'],
];

/** Resolve common building variants while keeping different buildings distinct. */
function buildingKey(value) {
  const key = normalized(value).replace(/^[we]\d+\s+/, '').replace(/\s+ebb$/, '');
  return BUILDING_VARIANTS.find(group => group.includes(key))?.[0] ?? key;
}

/** Find one unambiguous footprint from its id, name or aliases. */
function footprint(value, buildings) {
  if (!value) return undefined;
  const exact = buildings.find(f => f.properties.id === value);
  if (exact) return exact;
  const key = buildingKey(value);
  const matches = buildings.filter(f => [...names(f.properties)].some(n => buildingKey(n) === key));
  return matches.length === 1 ? matches[0] : undefined;
}

/** Accept HTTPS provenance from Georgia Tech and the official operators present in this input. */
function official(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password
      && (u.hostname === 'gatech.edu' || u.hostname.endsWith('.gatech.edu')
        || ['codatechsquare.com', 'www.codatechsquare.com', 'bmemakerspaces.com', 'www.bmemakerspaces.com'].includes(u.hostname));
  } catch { return false; }
}

/** Treat false and closed-day schedules as existing values, never as missing data. */
function empty(value) {
  return value == null || (typeof value === 'string' && !value.trim())
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'object' && Object.keys(value).length === 0);
}

/** Accept only schedules the data contract can represent without inventing minutes. */
function validHours(hours) {
  return hours && !Array.isArray(hours) && typeof hours === 'object'
    && Object.entries(hours).every(([day, intervals]) => DAYS.includes(day) && Array.isArray(intervals)
      && intervals.every(pair => Array.isArray(pair) && pair.length === 2
        && pair.every(t => typeof t === 'string' && TIME.test(t)) && pair[0] < pair[1]));
}

/** Compare JSON facts independently of object property order. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}

/** Compute the area-weighted polygon centroid, subtracting holes and combining multipolygons. */
function centroid(geometry) {
  const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates]
    : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
  let weight = 0, x = 0, y = 0;
  // Translate near zero to avoid cancellation with large longitude/latitude products.
  const origin = polygons[0]?.[0]?.[0];
  if (!origin) return undefined;
  for (const polygon of polygons) for (const [ringIndex, ring] of polygon.entries()) {
    let crossSum = 0, ringX = 0, ringY = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = [ring[i][0] - origin[0], ring[i][1] - origin[1]];
      const b = [ring[i + 1][0] - origin[0], ring[i + 1][1] - origin[1]];
      const cross = a[0] * b[1] - b[0] * a[1];
      crossSum += cross; ringX += (a[0] + b[0]) * cross; ringY += (a[1] + b[1]) * cross;
    }
    if (!crossSum) continue;
    const area = Math.abs(crossSum) * (ringIndex === 0 ? 1 : -1);
    weight += area; x += area * ringX / (3 * crossSum); y += area * ringY / (3 * crossSum);
  }
  return weight > 0 ? [x / weight + origin[0], y / weight + origin[1]].map(n => Number(n.toFixed(7))) : undefined;
}

/** Enforce the inclusive campus bounds from docs/data/README.md. */
function inBounds(coords) {
  return coords?.length === 2 && coords.every(Number.isFinite)
    && coords[0] >= -84.42 && coords[0] <= -84.375 && coords[1] >= 33.76 && coords[1] <= 33.79;
}

/** Test actual footprint containment when curated points lack building metadata. */
function contains(geometry, point) {
  if (!point) return false;
  const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates]
    : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
  const ringContains = ring => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  return polygons.some(p => ringContains(p[0]) && !p.slice(1).some(ringContains));
}

/** Escape report cells without allowing input text to create Markdown rows. */
function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
}

/** Import conservatively; preserve an audit ledger so repeated runs retain the original fill report. */
async function main() {
  const research = await readJson(`${RESEARCH}tato-gemini-2026-11-14.json`);
  const osm = await readJson(`${RESEARCH}david-osm-coordinates.json`);
  const buildings = (await readJson('src/data/buildings.geojson')).features;
  const catalogText = await readFile(resolve(ROOT, 'src/lib/layerCatalog.ts'), 'utf8');
  const body = catalogText.match(/\bLAYER_CATALOG\b[^=]*=\s*\[([\s\S]*?)\n\s*\];/)?.[1];
  if (!body) throw new Error('Cannot parse LAYER_CATALOG');
  const catalog = new Map([...body.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?\bsubtypes:\s*\[([\s\S]*?)\]\s*,?\s*\}/g)]
    .map(([, id, subtypes]) => [id, [...subtypes.matchAll(/\bid:\s*"([^"]+)"/g)].map(m => m[1])]));
  const files = ['src/data/places.json', ...(await readdir(resolve(ROOT, 'src/data/pois')))
    .filter(f => f.endsWith('.json')).sort().map(f => `src/data/pois/${f}`)];
  const documents = new Map(await Promise.all(files.map(async f => [f, await readJson(f)])));
  const existing = [...documents.values()].flatMap(d => d.features);
  const ids = new Set(existing.map(f => f.properties.id));
  const auditPath = `${RESEARCH}import-audit-2026-11-14.json`;
  let previous = { added: [], matched: [] };
  try { previous = await readJson(auditPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const added = [], matched = [], skipped = [], issues = [];
  const amenities = research.features.filter(f => f.properties.category === 'extra');
  // The parent collection metadata is retained; the candidate features themselves are untouched.
  await writeChanged(`${RESEARCH}amenities-candidates.json`, `${JSON.stringify({ ...research, features: amenities }, null, 2)}\n`);
  const previouslyAdded = new Map(previous.added.map(a => [a.research_id, a]));
  const importedIds = new Set(previous.added.map(a => a.id));

  for (const feature of research.features) {
    const p = feature.properties;
    if (p.category === 'extra') continue;
    const skip = reason => skipped.push({ id: p.id, name: p.name, reason });
    if (p.category === 'transport' && /(?:stinger|bus).*stop|stop.*(?:stinger|bus)/i.test(`${p.subtype} ${p.name}`)) {
      skip('Parada Stinger/bus: cubierta por la capa de tránsito en vivo'); continue;
    }
    if (!catalog.has(p.category) || !['food', 'support', 'printing', 'makerspace', 'exercise', 'health', 'transport'].includes(p.category)) {
      skip('Categoría no utilizable por los POI del catálogo'); continue;
    }
    if (p.category === 'transport' && !['parking-deck', 'bike-repair', 'bike-room', 'fix-it-station', 'marta-station'].includes(p.subtype)) {
      skip('Transporte: no es una instalación fija admitida'); continue;
    }
    const oldAddition = previouslyAdded.get(p.id);
    if (oldAddition && existing.some(f => f.properties.id === oldAddition.id)) {
      added.push(oldAddition);
      if (oldAddition.hours_issue) issues.push(oldAddition.hours_issue);
      continue;
    }
    const building = footprint(p.building, buildings);
    const candidates = existing.filter(f => !importedIds.has(f.properties.id) && f.properties.kind !== 'event'
      && (overlaps(names(p), names(f.properties))
        || [...names(f.properties)].some(n => [...names(p)].some(r => n.startsWith(`${r} at `)))));
    const compatible = candidates.filter(f => {
      if (!overlaps(names(p), names(f.properties))) return false;
      const q = f.properties;
      const seedBuilding = existing.find(s => s.properties.id === q.building_id);
      const curatedBuilding = footprint(q.building, buildings) ?? footprint(q.building_id, buildings)
        ?? footprint(seedBuilding?.properties.name, buildings);
      if (building && curatedBuilding) return building.properties.id === curatedBuilding.properties.id;
      if (building) return p.id === q.id || contains(building.geometry, f.geometry?.coordinates);
      // Missing research building cannot establish same-place identity; identical ids are explicit identity.
      return p.id === q.id;
    });
    if (compatible.length > 1) { skip('Coincidencia ambigua entre POI existentes'); continue; }
    const target = compatible[0];
    const hoursIssue = !empty(p.hours) && !validHours(p.hours)
      ? { id: p.id, reason: 'Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59', research_hours: p.hours } : undefined;
    const values = { ...p };
    if (hoursIssue) {
      delete values.hours;
      values.hours_note = [p.hours_note, `Research hours (not imported into hours; contract rejects these intervals): ${JSON.stringify(p.hours)}`].filter(Boolean).join(' ');
      issues.push(hoursIssue);
    }
    if (target) {
      const q = target.properties;
      const oldMatch = previous.matched.find(m => m.research_id === p.id && m.id === q.id);
      const fields = new Set(oldMatch?.fields ?? []);
      const conflict = !empty(q.hours) && !empty(p.hours) && !fields.has('hours')
        && JSON.stringify(canonical(q.hours)) !== JSON.stringify(canonical(p.hours))
        ? { existing_hours: q.hours, research_hours: p.hours } : undefined;
      if (official(p.source_url)) for (const key of FILL) {
        if (empty(q[key]) && !empty(values[key])) { q[key] = structuredClone(values[key]); fields.add(key); }
      }
      matched.push({ research_id: p.id, id: q.id, name: q.name, source_url: p.source_url,
        fields: FILL.filter(k => fields.has(k)), ...(conflict ? { conflict } : {}) });
      continue;
    }
    // Similar names in different/unknown buildings require a human, never a guessed duplicate.
    if (candidates.length) { skip('Nombre existente, pero edificio distinto o no confirmado; conservar el POI curado'); continue; }
    if (!official(p.source_url)) { skip('source_url no es una página HTTPS oficial reconocida'); continue; }
    const precise = osm.filter(o => o.status === 'confirmed' && ['exact', 'precise'].includes(o.coord_precision)
      && o.osm_type && o.osm_id && overlaps(names(p), names({ name: o.item, aliases: [o.osm_name].filter(Boolean) })));
    let coordinates, coord_source, coord_precision;
    if (precise.length === 1) {
      const o = precise[0]; coordinates = [o.lon, o.lat];
      coord_source = `OSM ${o.osm_type} ${o.osm_id} (David research)`; coord_precision = o.coord_precision;
    } else if (building) {
      coordinates = centroid(building.geometry);
      coord_source = `building centroid: ${building.properties.id}`; coord_precision = 'building';
    }
    if (!coordinates) { skip('Sin coordenada OSM confirmada/precisa ni huella de edificio inequívoca'); continue; }
    if (!inBounds(coordinates)) { skip('Coordenadas fuera de los límites del campus'); continue; }
    const base = KEBAB.test(p.id) ? p.id : normalized(p.name).replace(/ /g, '-') || 'research-poi';
    let id = base, suffix = 2;
    while (ids.has(id)) id = `${base}-${suffix++}`;
    ids.add(id);
    const properties = { id, name: p.name, category: p.category, status: 'draft' };
    if (catalog.get(p.category).includes(p.subtype)) properties.subtype = p.subtype;
    for (const key of ['aliases', 'description', 'address', 'building', ...FILL, 'source_url', 'source_updated', 'confidence']) {
      if (!empty(values[key])) properties[key] = structuredClone(values[key]);
    }
    const placeBuilding = existing.filter(f => names(f.properties).has(normalized(p.building)));
    if (building) properties.building_id = building.properties.id;
    else if (placeBuilding.length === 1) properties.building_id = placeBuilding[0].properties.id;
    Object.assign(properties, { coord_source, coord_precision });
    const file = `src/data/pois/${p.category}.json`;
    if (!documents.has(file)) documents.set(file, { type: 'FeatureCollection', features: [] });
    documents.get(file).features.push({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties });
    const entry = { research_id: p.id, id, name: p.name, category: p.category, coord_source, coord_precision,
      ...(hoursIssue ? { hours_issue: hoursIssue } : {}) };
    added.push(entry);
  }
  for (const [file, doc] of documents) await writeChanged(file, `${JSON.stringify(doc, null, 2)}\n`);
  await writeChanged(auditPath, `${JSON.stringify({ added, matched }, null, 2)}\n`);
  const categories = ['food', 'support', 'printing', 'makerspace', 'exercise', 'health', 'transport'];
  const counts = Object.fromEntries(categories.map(c => [c, added.filter(a => a.category === c).length]));
  const amenitiesCounts = {};
  for (const f of amenities) amenitiesCounts[f.properties.subtype] = (amenitiesCounts[f.properties.subtype] ?? 0) + 1;
  const filled = matched.reduce((n, m) => n + m.fields.length, 0);
  const skippedCounts = {};
  for (const item of skipped) skippedCounts[item.reason] = (skippedCounts[item.reason] ?? 0) + 1;
  const lines = ['<!-- summary: Importación conservadora de la investigación de Tato del 2026-11-14 y revisión humana pendiente. -->',
    '# Importación de investigación — 2026-11-14', '',
    `Entrada: ${research.features.length} registros. Coincidencias: ${matched.length}; con campos completados: ${matched.filter(m => m.fields.length).length}; campos completados: ${filled}.`, '',
    `Añadidos: ${added.length}. Omitidos: ${skipped.length}. Amenities separados sin modificar: ${amenities.length}.`, '',
    'Los POI curados conservan ids, coordenadas, estado, source_url y todos sus valores existentes. Las coincidencias exigen nombre/alias y edificio compatible (metadatos o contención en su huella); un id idéntico establece identidad explícita. No se fusionan impresoras de pisos distintos con un registro genérico del edificio.', '',
    'Transport está en LAYER_CATALOG y el validador admite sus POI. Solo se consideran instalaciones fijas; las paradas Stinger/bus se omiten.', '',
    'Los horarios con 24:00 se conservan literalmente en hours_note, sin redondear a 23:59 ni crear intervalos inventados. Los conflictos conservan el horario curado. Los subtipos solo se escriben si el catálogo los enumera.', '',
    'El archivo import-audit-2026-11-14.json conserva las altas y campos completados originales para que una segunda ejecución mantenga este reporte sin duplicar registros. No eliminarlo si se desea conservar esa auditoría.', '',
    '## Altas por categoría', '', '| Categoría | Añadidos |', '| --- | ---: |',
    ...categories.map(c => `| ${c} | ${counts[c]} |`), '',
    '## Registros añadidos', '', '| ID | Nombre | Categoría | Método de coordenadas | Precisión |', '| --- | --- | --- | --- | --- |',
    ...added.map(a => `| ${cell(a.id)} | ${cell(a.name)} | ${a.category} | ${cell(a.coord_source)} | ${a.coord_precision} |`), '',
    '## Coincidencias y campos completados', '', '| Investigación | POI conservado | Campos completados | Fuente de los campos |', '| --- | --- | --- | --- |',
    ...matched.map(m => `| ${cell(m.research_id)} | ${cell(m.id)} | ${m.fields.join(', ') || 'ninguno'} | ${cell(m.source_url)} |`), '',
    '## Amenities por subtipo', '', ...Object.entries(amenitiesCounts).sort().map(([s, n]) => `- ${s}: ${n}`), '',
    '## Omisiones por motivo', '', ...Object.entries(skippedCounts).map(([reason, count]) => `- ${count}: ${reason}.`), '',
    '## Revisión humana: omitidos', '', ...skipped.map(s => `- ${s.id}: ${s.reason}.`), '',
    '## Revisión humana: precisión de edificio', '',
    ...added.filter(a => a.coord_precision === 'building').map(a => `- ${a.id}: ${a.coord_source}; ubicar el local/sala/entrada antes de verificar.`), '',
    '## Revisión humana: conflictos de horarios', '',
    ...matched.filter(m => m.conflict).map(m => `- ${m.id}: se conserva ${JSON.stringify(m.conflict.existing_hours)}; investigación ${JSON.stringify(m.conflict.research_hours)}.`), '',
    '## Revisión humana: horarios incompatibles con el contrato', '',
    ...issues.map(i => `- ${i.id}: ${i.reason}. Original: ${JSON.stringify(i.research_hours)}.`), ''];
  await writeChanged(`${RESEARCH}import-report-2026-11-14.md`, `${lines.join('\n')}`);
  console.log(JSON.stringify({ matched: matched.length, filled_records: matched.filter(m => m.fields.length).length,
    filled_fields: filled, added: counts, skipped: skipped.length, amenities: amenities.length, hours_issues: issues.length }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
