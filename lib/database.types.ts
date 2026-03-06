import type { Plant } from './plantData';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      gardens: {
        Row: Garden;
        Insert: Omit<Garden, 'id' | 'created_at'>;
        Update: Partial<Omit<Garden, 'id'>>;
      };
      beds: {
        Row: Bed;
        Insert: Omit<Bed, 'id' | 'created_at'>;
        Update: Partial<Omit<Bed, 'id'>>;
      };
      plantings: {
        Row: Planting;
        Insert: Omit<Planting, 'id' | 'created_at'>;
        Update: Partial<Omit<Planting, 'id'>>;
      };
      reminders: {
        Row: Reminder;
        Insert: Omit<Reminder, 'id'>;
        Update: Partial<Omit<Reminder, 'id'>>;
      };
      planting_logs: {
        Row: PlantingLog;
        Insert: Omit<PlantingLog, 'id'>;
        Update: Partial<Omit<PlantingLog, 'id'>>;
      };
    };
  };
}

export interface Garden {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  postcode: string | null;
  climate_zone: string | null;
}

export interface Bed {
  id: string;
  created_at: string;
  garden_id: string;
  name: string;
  shape: 'rectangle' | 'circle';
  width_m: number | null;
  length_m: number | null;
  position_x: number | null;
  position_y: number | null;
  soil_type: string | null;
  notes: string | null;
}

export interface Planting {
  id: string;
  created_at: string;
  bed_id: string;
  /** References plants.json id, e.g. 'tomato', 'basil' */
  plant_id: string;
  planted_date: string | null;
  expected_harvest_date: string | null;
  quantity: number;
  status: 'active' | 'harvested' | 'removed';
  notes: string | null;
  /** Populated client-side from lib/plants.json */
  plant?: Plant;
}

export interface Reminder {
  id: string;
  planting_id: string;
  type: 'watering' | 'fertilising' | 'harvest' | 'pruning' | 'custom';
  due_date: string;
  completed_at: string | null;
  notes: string | null;
  /** Populated client-side */
  planting?: Planting;
}

export interface PlantingLog {
  id: string;
  planting_id: string | null;
  bed_id: string | null;
  plant_id: string | null;
  event_type: 'planted' | 'watered' | 'fertilised' | 'harvested' | 'removed' | 'other';
  event_date: string;
  notes: string | null;
}
