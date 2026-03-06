/**
 * OpenFarm → plants.json importer
 *
 * OpenFarm is a free, CC-licensed crop database: https://openfarm.cc
 * API docs: https://github.com/openfarmcc/OpenFarm/blob/master/docs/api_docs.md
 *
 * Usage:
 *   node scripts/fetch-openfarm.js
 *
 * This fetches pages of crops from the OpenFarm API and converts them
 * to the plants.json format, then merges them into lib/plants.json.
 *
 * Run from: green-thumb/
 */

const fs = require('fs');
const path = require('path');

const PLANTS_PATH = path.join(__dirname, '../lib/plants.json');
const OPENFARM_API = 'https://openfarm.cc/api/v1/crops';

// Map OpenFarm sun_requirements to our sunHours scale
function mapSunHours(sunReq) {
  const map = {
    'Full Sun': 8,
    'Partial Sun/Shade': 4,
    'Full Shade': 1,
  };
  return map[sunReq] ?? 6;
}

// Map OpenFarm category to our category names
function mapCategory(tags) {
  if (!tags) return 'Vegetables';
  const t = tags.join(' ').toLowerCase();
  if (t.includes('herb')) return 'Herbs';
  if (t.includes('fruit') || t.includes('tree')) return 'Fruit Trees';
  if (t.includes('berry') || t.includes('berr')) return 'Berries';
  if (t.includes('flower') || t.includes('annual')) return 'Flowers';
  return 'Vegetables';
}

function openFarmCropToPlant(crop) {
  const a = crop.attributes;
  if (!a || !a.name) return null;

  const id = a.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return {
    id,
    name: a.name,
    emoji: '🌱',
    family: '',
    type: 'General',
    category: mapCategory(a.tags_array),
    waterDays: a.optimal_temperature ? 3 : 3, // OpenFarm doesn't give watering frequency
    harvestWeeks: [
      Math.round((a.days_to_maturity_min ?? 60) / 7),
      Math.round((a.days_to_maturity_max ?? 90) / 7),
    ],
    nitrogen: 'moderate_feeder',
    sunHours: mapSunHours(a.sun_requirements),
    companions: (a.companions ?? []).map((c) => c.name ?? c).filter(Boolean),
    avoid: [],
    zones: [],
    fertWeeks: 4,
    description: a.description ?? '',
    notes: a.growing_degree_days ? `Growing degree days: ${a.growing_degree_days}` : '',
    spacingCm: Math.round((a.row_spacing_min ?? 30) * 2.54), // OpenFarm uses inches
    heightCm: Math.round((a.height_max ?? 50) * 2.54),
    spreadCm: Math.round((a.row_spacing_max ?? 30) * 2.54),
    sowMonths: [],
    harvestMonths: [],
    perennial: false,
    source: 'openfarm',
  };
}

async function fetchPage(page) {
  const url = `${OPENFARM_API}?page=${page}&filter[search]=`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  return res.json();
}

async function main() {
  console.log('Loading existing plants.json...');
  const existing = JSON.parse(fs.readFileSync(PLANTS_PATH, 'utf8'));
  const existingIds = new Set(existing.map((p) => p.id));

  console.log(`Existing plants: ${existing.length}`);
  console.log('Fetching from OpenFarm API...\n');

  const newPlants = [];
  let page = 1;
  let total = null;

  while (true) {
    try {
      console.log(`Fetching page ${page}...`);
      const data = await fetchPage(page);
      if (!data.data?.length) break;

      total = total ?? data.meta?.total_count;

      for (const crop of data.data) {
        const plant = openFarmCropToPlant(crop);
        if (!plant) continue;
        if (existingIds.has(plant.id)) {
          console.log(`  Skip (exists): ${plant.name}`);
          continue;
        }
        newPlants.push(plant);
        existingIds.add(plant.id);
        console.log(`  + ${plant.name}`);
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 300));
      page++;

      // Stop after 10 pages for a demo run (remove limit for full import)
      if (page > 10) {
        console.log('\nStopped after 10 pages. Remove the limit in the script for a full import.');
        break;
      }
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
      break;
    }
  }

  if (newPlants.length === 0) {
    console.log('\nNo new plants to add.');
    return;
  }

  const merged = [...existing, ...newPlants];
  fs.writeFileSync(PLANTS_PATH, JSON.stringify(merged, null, 2));
  console.log(`\nDone! Added ${newPlants.length} new plants. Total: ${merged.length}`);
  console.log('\nNOTE: OpenFarm data lacks watering frequency, sow months, and AU-specific info.');
  console.log('Review and enrich the new entries in lib/plants.json before shipping.');
}

main().catch(console.error);
