import { create } from 'zustand';
import type { Garden, Bed, Planting, Reminder } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { getPlantById, harvestDays, fertiliseDays } from '@/lib/plantData';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Build initial reminders for a new planting based on local plant data */
function buildReminders(
  plantingId: string,
  plantId: string,
  plantedDate: Date
): Array<{ planting_id: string; type: Reminder['type']; due_date: string; notes: string }> {
  const plant = getPlantById(plantId);
  if (!plant) return [];

  const reminders: Array<{ planting_id: string; type: Reminder['type']; due_date: string; notes: string }> = [];

  // Watering — first 4 occurrences
  if (plant.waterDays) {
    for (let i = 0; i < 4; i++) {
      reminders.push({
        planting_id: plantingId,
        type: 'watering',
        due_date: addDays(plantedDate, plant.waterDays * i).toISOString(),
        notes: `Water your ${plant.name}`,
      });
    }
  }

  // Fertilise — first 2 occurrences (skip nitrogen fixers)
  const fertDays = fertiliseDays(plant);
  if (fertDays && plant.nitrogen !== 'fixer') {
    for (let i = 1; i <= 2; i++) {
      reminders.push({
        planting_id: plantingId,
        type: 'fertilising',
        due_date: addDays(plantedDate, fertDays * i).toISOString(),
        notes: `Fertilise your ${plant.name}`,
      });
    }
  }

  // Harvest window reminder
  const harvest = harvestDays(plant);
  if (harvest) {
    reminders.push({
      planting_id: plantingId,
      type: 'harvest',
      due_date: addDays(plantedDate, harvest.min).toISOString(),
      notes: `${plant.name} should be ready to harvest (${plant.harvestWeeks[0]}–${plant.harvestWeeks[1]} weeks)`,
    });
  }

  // Pruning — fruit trees / perennials with pruning months
  if (plant.pruningMonths?.length) {
    const nextPruneMonth = plant.pruningMonths[0];
    const now = new Date();
    const pruneDate = new Date(now.getFullYear(), nextPruneMonth - 1, 15);
    if (pruneDate < now) pruneDate.setFullYear(now.getFullYear() + 1);
    reminders.push({
      planting_id: plantingId,
      type: 'pruning',
      due_date: pruneDate.toISOString(),
      notes: `Prune your ${plant.name}`,
    });
  }

  return reminders;
}

/** Merge local plant data into planting rows */
function hydratePlantings(plantings: Planting[]): Planting[] {
  return plantings.map((p) => ({
    ...p,
    plant: getPlantById(p.plant_id),
  }));
}

interface GardenState {
  garden: Garden | null;
  beds: Bed[];
  plantings: Planting[];
  reminders: Reminder[];
  loading: boolean;

  setGarden: (garden: Garden | null) => void;
  fetchGarden: (userId: string) => Promise<void>;
  fetchBeds: (gardenId: string) => Promise<void>;
  fetchPlantings: (bedIds: string[]) => Promise<void>;
  fetchUpcomingReminders: () => Promise<void>;

  addBed: (bed: Omit<Bed, 'id' | 'created_at'>) => Promise<Bed | null>;
  updateBed: (id: string, updates: Partial<Bed>) => Promise<void>;
  deleteBed: (id: string) => Promise<void>;

  addPlanting: (planting: Omit<Planting, 'id' | 'created_at' | 'plant'>) => Promise<Planting | null>;
  updatePlanting: (id: string, updates: Partial<Planting>) => Promise<void>;
  removePlanting: (id: string) => Promise<void>;

  completeReminder: (id: string) => Promise<void>;
}

export const useGardenStore = create<GardenState>((set, get) => ({
  garden: null,
  beds: [],
  plantings: [],
  reminders: [],
  loading: false,

  setGarden: (garden) => set({ garden }),

  fetchGarden: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('gardens')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();
    set({ garden: data ?? null, loading: false });
    if (data) {
      get().fetchBeds(data.id);
      get().fetchUpcomingReminders();
    }
  },

  fetchBeds: async (gardenId) => {
    const { data } = await supabase
      .from('beds')
      .select('*')
      .eq('garden_id', gardenId)
      .order('created_at');
    const beds = (data as Bed[]) ?? [];
    set({ beds });
    if (beds.length > 0) {
      get().fetchPlantings(beds.map((b) => b.id));
    }
  },

  fetchPlantings: async (bedIds) => {
    if (bedIds.length === 0) return;
    const { data } = await supabase
      .from('plantings')
      .select('*')
      .in('bed_id', bedIds)
      .eq('status', 'active');
    set({ plantings: hydratePlantings((data as Planting[]) ?? []) });
  },

  fetchUpcomingReminders: async () => {
    const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();
    const { data: reminderRows } = await supabase
      .from('reminders')
      .select('*, planting:plantings(*)')
      .is('completed_at', null)
      .lte('due_date', inOneWeek)
      .gte('due_date', today)
      .order('due_date');

    const { beds } = get();
    const bedMap = Object.fromEntries(beds.map((b) => [b.id, b]));

    const reminders = ((reminderRows as Reminder[]) ?? []).map((r) => {
      const planting = r.planting as Planting | undefined;
      return {
        ...r,
        planting: planting
          ? {
              ...planting,
              plant: getPlantById(planting.plant_id),
              bed: bedMap[planting.bed_id],
            }
          : undefined,
      };
    });
    set({ reminders });
  },

  addBed: async (bed) => {
    const { data, error } = await supabase.from('beds').insert(bed).select().single();
    if (error || !data) return null;
    set((state) => ({ beds: [...state.beds, data as Bed] }));
    return data as Bed;
  },

  updateBed: async (id, updates) => {
    await supabase.from('beds').update(updates).eq('id', id);
    set((state) => ({
      beds: state.beds.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  },

  deleteBed: async (id) => {
    await supabase.from('beds').delete().eq('id', id);
    set((state) => ({
      beds: state.beds.filter((b) => b.id !== id),
      plantings: state.plantings.filter((p) => p.bed_id !== id),
    }));
  },

  addPlanting: async (planting) => {
    const { data, error } = await supabase
      .from('plantings')
      .insert(planting)
      .select()
      .single();
    if (error || !data) return null;
    const hydrated: Planting = { ...(data as Planting), plant: getPlantById(data.plant_id) };
    set((state) => ({ plantings: [...state.plantings, hydrated] }));

    // Create reminders client-side from local plant data
    const plantedDate = planting.planted_date
      ? new Date(planting.planted_date)
      : new Date();
    const reminderInserts = buildReminders(data.id, planting.plant_id, plantedDate);
    if (reminderInserts.length > 0) {
      await supabase.from('reminders').insert(reminderInserts);
      get().fetchUpcomingReminders();
    }

    return hydrated;
  },

  updatePlanting: async (id, updates) => {
    await supabase.from('plantings').update(updates).eq('id', id);
    set((state) => ({
      plantings: state.plantings.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  removePlanting: async (id) => {
    await supabase.from('plantings').update({ status: 'removed' }).eq('id', id);
    set((state) => ({
      plantings: state.plantings.filter((p) => p.id !== id),
    }));
  },

  completeReminder: async (id) => {
    const now = new Date().toISOString();
    await supabase.from('reminders').update({ completed_at: now }).eq('id', id);
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },
}));
