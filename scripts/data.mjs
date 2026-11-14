/** @file Validate curated GeoJSON, record verification and generate the verification checklist. */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const STATUSES = ['seed', 'draft', 'verified'];

/** Return whether a value is a non-array object. */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Return whether a value is a nonempty string. */
function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Accept only absolute HTTPS URLs with a hostname. */
function isHttps(value) {
  try {
    return isText(value) && new URL(value).protocol === 'https:' && Boolean(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Validate a real calendar date written as YYYY-MM-DD. */
function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

/** Read category and subtype ids directly from the TypeScript catalog text. */
async function readCatalog() {
  const text = await readFile(resolve(ROOT, 'src/lib/layerCatalog.ts'), 'utf8');
  const body = text.match(/\bLAYER_CATALOG\b[^=]*=\s*\[([\s\S]*?)\n\s*\];/)?.[1];
  if (!body) throw new Error('Cannot parse LAYER_CATALOG in src/lib/layerCatalog.ts');
  const catalog = new Map(['landmark', 'academic', 'housing', 'other'].map(id => [id, []]));
  const entries = [...body.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?\bsubtypes:\s*\[([\s\S]*?)\]\s*,?\s*\}/g)];
  if (!entries.length) throw new Error('LAYER_CATALOG has no readable entries');
  for (const [, id, subtypes] of entries) {
    catalog.set(id, [...subtypes.matchAll(/\bid:\s*"([^"]+)"/g)].map(match => match[1]));
  }
  return catalog;
}

/** Load places.json and every JSON file immediately inside pois, in stable order. */
async function readData(dataDir) {
  let poiFiles = [];
  try {
    poiFiles = (await readdir(resolve(dataDir, 'pois'), { withFileTypes: true }))
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(entry => resolve(dataDir, 'pois', entry.name));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const files = [resolve(dataDir, 'places.json'), ...poiFiles.sort()];
  const documents = [];
  for (const file of files) {
    try {
      documents.push({ file, data: JSON.parse(await readFile(file, 'utf8')) });
    } catch (error) {
      documents.push({ file, error: error.message });
    }
  }
  return documents;
}

/** Validate all collections and features, collecting contextual errors and warnings. */
function validate(documents, catalog) {
  const errors = [];
  const warnings = [];
  const ids = new Map();
  let count = 0;
  for (const { file, data, error } of documents) {
    const label = relative(ROOT, file);
    if (error || !isObject(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      errors.push(`${label} [collection]: ${error || 'must be a GeoJSON FeatureCollection with a features array'}`);
      continue;
    }
    for (const [index, feature] of data.features.entries()) {
      count++;
      const p = isObject(feature?.properties) ? feature.properties : {};
      const context = `${label} [${isText(p.id) ? p.id : `feature #${index + 1}`}]`;
      const fail = rule => errors.push(`${context}: ${rule}`);
      if (!isObject(feature) || feature.type !== 'Feature' || !isObject(feature.properties)) {
        fail('must be a GeoJSON Feature with a properties object');
      }
      for (const key of ['id', 'name', 'category', 'status']) {
        if (!isText(p[key])) fail(`${key} is required and must be a nonempty string`);
      }
      if (isText(p.id)) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)) fail('id must be kebab-case');
        if (ids.has(p.id)) fail(`id must be unique across all files; also in ${ids.get(p.id)}`);
        else ids.set(p.id, label);
      }
      if (isText(p.category) && !catalog.has(p.category)) fail('category must be a LAYER_CATALOG id or landmark, academic, housing, other');
      if (p.subtype !== undefined) {
        if (!isText(p.subtype)) fail('subtype must be a nonempty string');
        else if (catalog.get(p.category)?.length && !catalog.get(p.category).includes(p.subtype)) {
          fail(`subtype must be one of: ${catalog.get(p.category).join(', ')}`);
        }
      }
      const geometry = feature?.geometry;
      const coords = geometry?.coordinates;
      if (geometry?.type !== 'Point' || !Array.isArray(coords) || coords.length !== 2
        || !coords.every(Number.isFinite) || coords[0] < -84.42 || coords[0] > -84.375
        || coords[1] < 33.76 || coords[1] > 33.79) {
        fail('geometry must be Point [lng, lat] inside campus bounds: lng -84.42..-84.375, lat 33.76..33.79');
      }
      if (isText(p.status) && !STATUSES.includes(p.status)) fail('status must be seed, draft or verified');
      if (['draft', 'verified'].includes(p.status) && !isText(p.source_url)) fail(`${p.status} requires source_url`);
      for (const key of ['source_url', 'url']) {
        if (p[key] !== undefined && !isHttps(p[key])) fail(`${key} must be an absolute https URL`);
      }
      if (p.status === 'verified') {
        if (!isDate(p.verified_at)) fail('verified requires verified_at as a valid YYYY-MM-DD date');
        if (!isText(p.verified_by)) fail('verified requires a nonempty verified_by');
      }
      if (p.status === 'draft' && (p.verified_at !== undefined || p.verified_by !== undefined)) {
        fail('draft must not have verified_at or verified_by');
      }
      if (p.verified_at !== undefined && !isDate(p.verified_at)) fail('verified_at must be a valid YYYY-MM-DD date');
      for (const key of ['description', 'address', 'building_id', 'verified_by']) {
        if (p[key] !== undefined && !isText(p[key])) fail(`${key} must be a nonempty string`);
      }
      if (p.aliases !== undefined && (!Array.isArray(p.aliases) || !p.aliases.every(isText))) fail('aliases must be an array of nonempty strings');
      if (p.buzzcard !== undefined && (!isObject(p.buzzcard) || typeof p.buzzcard.required !== 'boolean'
        || (p.buzzcard.note !== undefined && !isText(p.buzzcard.note)))) fail('buzzcard must contain required (boolean) and optional note (string)');
      if (p.hours !== undefined) {
        if (!isObject(p.hours)) fail('hours must be an object');
        else for (const [day, intervals] of Object.entries(p.hours)) {
          if (!DAYS.includes(day)) fail(`hours.${day}: unknown weekday (use mon..sun)`);
          if (!Array.isArray(intervals)) fail(`hours.${day} must be an array of time pairs`);
          else for (const pair of intervals) {
            if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(time => typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) {
              fail(`hours.${day}: each interval must be a pair of valid HH:MM times`);
            } else if (pair[0] >= pair[1]) fail(`hours.${day}: open must be before close`);
          }
        }
      }
      if (!isText(p.description)) warnings.push(`${context}: no description`);
      if (isDate(p.verified_at) && Date.now() - Date.parse(p.verified_at) > 180 * 86400000) warnings.push(`${context}: verified_at is older than 180 days`);
    }
  }
  return { errors, warnings, count };
}

/** Parse the command and its named options without silently accepting typos. */
function parseArgs(args) {
  const [command, ...rest] = args;
  if (!['check', 'verify', 'list'].includes(command)) throw new Error('Usage: data.mjs check [--data-dir DIR] | verify <id> --by <name> [--source URL] [--date YYYY-MM-DD] | list');
  const options = {};
  let id;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      if (!['--data-dir', ...(command === 'verify' ? ['--by', '--source', '--date'] : [])].includes(arg)) throw new Error(`Unknown option: ${arg}`);
      if (options[arg] !== undefined || !isText(rest[i + 1]) || rest[i + 1].startsWith('--')) throw new Error(`Provide one value for ${arg}`);
      options[arg] = rest[++i];
    } else if (command === 'verify' && id === undefined) id = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return { command, id, options };
}

/** Promote exactly one seed or draft, checking the resulting record before writing. */
async function verify(documents, catalog, id, options) {
  if (!isText(id) || !isText(options['--by'])) throw new Error('verify requires <id> and --by <name>');
  for (const document of documents) {
    if (document.error || document.data?.type !== 'FeatureCollection' || !Array.isArray(document.data.features)) throw new Error(`${document.file}: cannot search invalid collection`);
  }
  const matches = documents.flatMap(document => document.data.features
    .filter(feature => feature?.properties?.id === id).map(feature => ({ document, feature })));
  if (matches.length !== 1) throw new Error(`${id}: expected exactly one matching feature; found ${matches.length}`);
  const { document, feature } = matches[0];
  const previous = feature.properties;
  if (!['seed', 'draft'].includes(previous.status)) throw new Error(`${id}: status must be draft or seed to verify (found ${previous.status})`);
  if (!previous.source_url && !options['--source']) throw new Error(`${id}: --source is required when the feature has no source_url`);
  const next = { ...previous, status: 'verified', source_url: options['--source'] ?? previous.source_url,
    verified_at: options['--date'] ?? new Date().toISOString().slice(0, 10), verified_by: options['--by'] };
  feature.properties = next;
  const result = validate([{ file: document.file, data: { type: 'FeatureCollection', features: [feature] } }], catalog);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  await writeFile(document.file, `${JSON.stringify(document.data, null, 2)}\n`);
  console.log(`${relative(ROOT, document.file)} [${id}]: status ${previous.status} -> verified; source_url=${next.source_url}; verified_at=${next.verified_at}; verified_by=${next.verified_by}`);
}

/** Escape data values for safe display in a Markdown checklist. */
function markdown(value) {
  return String(value).replace(/[\\`*_\[\]<>]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

/** Generate a sorted, reproducible checklist of explicitly seed or draft records. */
async function list(documents) {
  const groups = new Map();
  for (const { file, data, error } of documents) {
    if (error || data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error(`${file}: cannot list invalid collection`);
    for (const feature of data.features) {
      const p = feature?.properties;
      if (!['seed', 'draft'].includes(p?.status)) continue;
      if (!isText(p.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id) || !isText(p.name) || !isText(p.category)
        || feature.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)
        || feature.geometry.coordinates.length !== 2 || !feature.geometry.coordinates.every(Number.isFinite)) throw new Error(`${file} [${p.id}]: checklist requires id, name, category and Point coordinates`);
      if (!groups.has(p.category)) groups.set(p.category, []);
      groups.get(p.category).push(feature);
    }
  }
  const lines = ['<!-- summary: Auto-generated checklist of data still to verify. Do not edit by hand. -->',
    '# Data still to verify', '',
    '1. Run `npm run data:list` to regenerate this checklist.',
    '2. Open the source for each entry, or find an authoritative source when it says NO SOURCE.',
    '3. Check the address, hours, BuzzCard requirements and coordinates; update the JSON from evidence.',
    '4. Run the listed verification command (add `--source https://…` if needed), then `npm run data:check` and regenerate the list.', ''];
  let count = 0;
  for (const category of [...groups.keys()].sort()) {
    lines.push(`## ${markdown(category)}`, '');
    const features = groups.get(category).sort((a, b) => a.properties.id < b.properties.id ? -1 : a.properties.id > b.properties.id ? 1 : 0);
    for (const { properties: p, geometry: { coordinates: [lng, lat] } } of features) {
      const source = isHttps(p.source_url) ? `[source](<${new URL(p.source_url).href.replace(/[<>]/g, encodeURIComponent)}>)` : 'NO SOURCE';
      lines.push(`- [ ] **${markdown(p.name)}** (\`${p.id}\`, ${markdown(category)}${p.subtype ? `/${markdown(p.subtype)}` : ''}) · ${source} · check address, hours, buzzcard, [coordinates](https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}) · \`npm run data:verify -- ${p.id} --by david\``);
      count++;
    }
    lines.push('');
  }
  if (!count) lines.push('No features currently have status draft or seed.', '');
  const target = resolve(ROOT, 'docs/data/UNVERIFIED.md');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${lines.join('\n').trimEnd()}\n`);
  console.log(`Wrote docs/data/UNVERIFIED.md (${count} entries).`);
}

/** Dispatch the requested data operation and report user-facing failures. */
async function main() {
  const { command, id, options } = parseArgs(process.argv.slice(2));
  const documents = await readData(resolve(ROOT, options['--data-dir'] ?? 'src/data'));
  if (command === 'list') return list(documents);
  const catalog = await readCatalog();
  if (command === 'verify') return verify(documents, catalog, id, options);
  const { errors, warnings, count } = validate(documents, catalog);
  for (const warning of warnings) console.warn(`WARNING ${warning}`);
  for (const error of errors) console.error(`ERROR ${error}`);
  console.log(`Checked ${count} features in ${documents.length} files: ${errors.length} errors, ${warnings.length} warnings.`);
  if (errors.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 1;
});
