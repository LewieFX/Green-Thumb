import plantsJson from './plants.json';
import enrichmentsJson from './plant-enrichments.json';

export interface Plant {
  id: string;
  name: string;
  emoji: string;
  family: string;
  type: string;
  category: string;
  waterDays: number;
  harvestWeeks: [number, number];
  nitrogen: 'fixer' | 'heavy_feeder' | 'moderate_feeder' | 'light_feeder';
  sunHours: number;
  companions: string[];
  avoid: string[];
  zones: string[];
  fertWeeks: number;
  description: string;
  notes: string;
  plantingGuide?: string;
  spacingCm: number;
  heightCm: number;
  spreadCm: number;
  sowMonths: number[];
  harvestMonths: number[];
  perennial: boolean;
  source: string;
  // Fruit tree / berry extras (optional)
  pruningMonths?: number[];
  chillHours?: number;
  pollination?: string;
  rootstocks?: string[];
  isTree?: boolean;
  isShrub?: boolean;
  matureHeightM?: number;
  matureSpreadM?: number;
  yearsToFirstFruit?: number;
  // Variety / enrichment fields (optional)
  parentId?: string;
  isVariety?: boolean;
  growthHabit?: 'bush' | 'climbing' | 'vine' | 'upright' | 'spreading' | 'rosette';
  growthType?: 'determinate' | 'indeterminate';
  tags?: string[];
  flavour?: string;
  fruitSize?: string;
  fruitColour?: string;
  bestUse?: string;
  trellisRequired?: boolean;
  daysToMaturity?: number;
  pots?: 'suitable' | 'contain';
}

type Enrichment = Partial<Plant> & { id: string };

// Build enrichment lookup map
const enrichmentMap = new Map<string, Enrichment>(
  (enrichmentsJson as Enrichment[]).map((e) => [e.id, e])
);

// Separate variety-only entries (not in plants.json) from enrichments to existing plants
const varietyOnlyIds = new Set(
  (enrichmentsJson as Enrichment[]).filter((e) => e.isVariety && e.name).map((e) => e.id)
);

// Base plants from JSON, merged with enrichments
const basePlants: Plant[] = (plantsJson as Plant[]).map((p) => {
  const enrichment = enrichmentMap.get(p.id);
  if (!enrichment) return p;
  return { ...p, ...enrichment } as Plant;
});

// Variety-only plants that are defined entirely in enrichments (not in plants.json)
const baseIds = new Set((plantsJson as Plant[]).map((p) => p.id));
const varietyPlants: Plant[] = (enrichmentsJson as Enrichment[])
  .filter((e) => e.isVariety && e.name && !baseIds.has(e.id))
  .map((e) => e as Plant);

const ALL_PLANTS: Plant[] = [...basePlants, ...varietyPlants];

export function getAllPlants(): Plant[] {
  return ALL_PLANTS;
}

export function getPlantById(id: string): Plant | undefined {
  return ALL_PLANTS.find((p) => p.id === id);
}

/** Get variety children of a parent plant */
export function getVarieties(parentId: string): Plant[] {
  return ALL_PLANTS.filter((p) => p.parentId === parentId);
}

/** Get the parent plant of a variety */
export function getParentPlant(plant: Plant): Plant | undefined {
  if (!plant.parentId) return undefined;
  return ALL_PLANTS.find((p) => p.id === plant.parentId);
}

/** Top-level plants only (no varieties) */
export function getTopLevelPlants(): Plant[] {
  return ALL_PLANTS.filter((p) => !p.isVariety);
}

export function searchPlants(query: string, category?: string): Plant[] {
  const q = query.toLowerCase().trim();
  return ALL_PLANTS.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.family?.toLowerCase().includes(q) ||
      p.type?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q)) ||
      p.bestUse?.toLowerCase().includes(q) ||
      p.flavour?.toLowerCase().includes(q)
    );
  });
}

export function getCategories(): string[] {
  return [...new Set(ALL_PLANTS.map((p) => p.category))].sort();
}

export function getPlantsByCategory(category: string): Plant[] {
  return ALL_PLANTS.filter((p) => p.category === category);
}

/** Plants recommended for sowing this month (month 1-12) */
export function getPlantsByMonth(month: number): Plant[] {
  return ALL_PLANTS.filter((p) => p.sowMonths?.includes(month));
}

/** Helper: convert harvestWeeks [min, max] to day range */
export function harvestDays(plant: Plant): { min: number; max: number } | null {
  if (!plant.harvestWeeks || plant.harvestWeeks[0] === 0) return null;
  return {
    min: plant.harvestWeeks[0] * 7,
    max: plant.harvestWeeks[1] * 7,
  };
}

/** Helper: fertilise frequency in days */
export function fertiliseDays(plant: Plant): number | null {
  if (!plant.fertWeeks) return null;
  return plant.fertWeeks * 7;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  Vegetables: '🥕',
  Herbs: '🌿',
  'Fruit Trees': '🍊',
  Berries: '🍓',
  Flowers: '🌸',
  Natives: '🦘',
  Perennials: '🌼',
  'Edible Flowers': '🌺',
  'Cottage': '🏡',
};

export const NITROGEN_LABEL: Record<string, { label: string; color: string; emoji: string }> = {
  fixer: { label: 'Nitrogen Fixer', color: '#16a34a', emoji: '✅' },
  heavy_feeder: { label: 'Heavy Feeder', color: '#dc2626', emoji: '📉' },
  moderate_feeder: { label: 'Moderate Feeder', color: '#d97706', emoji: '➡️' },
  light_feeder: { label: 'Light Feeder', color: '#65a30d', emoji: '🟡' },
};

export const GROWTH_HABIT_LABEL: Record<string, { label: string; emoji: string }> = {
  bush: { label: 'Bush', emoji: '🌿' },
  climbing: { label: 'Climber / Vine', emoji: '🪴' },
  vine: { label: 'Climber / Vine', emoji: '🪴' },
  upright: { label: 'Upright', emoji: '⬆️' },
  spreading: { label: 'Spreading', emoji: '↔️' },
  rosette: { label: 'Rosette', emoji: '🌀' },
};

export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
