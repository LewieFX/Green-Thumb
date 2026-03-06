import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useGardenStore } from '@/store/gardenStore';
import type { Reminder } from '@/lib/database.types';

const REMINDER_CONFIG: Record<
  string,
  { emoji: string; color: string; bg: string; label: string }
> = {
  watering: { emoji: '💧', color: 'text-blue-700', bg: 'bg-blue-50', label: 'Watering' },
  fertilising: { emoji: '🌿', color: 'text-yellow-700', bg: 'bg-yellow-50', label: 'Fertilise' },
  harvest: { emoji: '🌾', color: 'text-green-700', bg: 'bg-green-50', label: 'Harvest' },
  pruning: { emoji: '✂️', color: 'text-purple-700', bg: 'bg-purple-50', label: 'Prune' },
  custom: { emoji: '📌', color: 'text-gray-700', bg: 'bg-gray-50', label: 'Task' },
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date();
}

function ReminderCard({
  reminder,
  onComplete,
  onSnooze,
}: {
  reminder: Reminder;
  onComplete: () => void;
  onSnooze: () => void;
}) {
  const config = REMINDER_CONFIG[reminder.type] ?? REMINDER_CONFIG.custom;
  const overdue = isOverdue(reminder.due_date);
  const plant = (reminder.planting as any)?.plant;
  const bed = (reminder.planting as any)?.bed;

  return (
    <View
      className={`rounded-2xl mb-2 overflow-hidden shadow-sm ${overdue ? 'border border-red-200' : ''}`}
    >
      <View className={`px-4 py-3 ${config.bg}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-3">{config.emoji}</Text>
            <View className="flex-1">
              <Text className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
                {config.label}
              </Text>
              <Text className="font-semibold text-gray-800 text-base">
                {plant?.common_name ?? 'Plant'}
              </Text>
              {bed && <Text className="text-xs text-gray-500">{bed.name}</Text>}
            </View>
            <View className={`ml-2 ${overdue ? 'bg-red-100 px-2 py-1 rounded-lg' : ''}`}>
              <Text className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                {overdue ? '⚠️ ' : ''}{formatDate(reminder.due_date)}
              </Text>
            </View>
          </View>
        </View>
        {reminder.notes && (
          <Text className="text-xs text-gray-500 mt-1 ml-9">{reminder.notes}</Text>
        )}
      </View>
      <View className="flex-row bg-white border-t border-gray-50">
        <TouchableOpacity className="flex-1 py-2.5 items-center" onPress={onSnooze}>
          <Text className="text-sm text-gray-500">Snooze 1 day</Text>
        </TouchableOpacity>
        <View className="w-px bg-gray-100" />
        <TouchableOpacity className="flex-1 py-2.5 items-center" onPress={onComplete}>
          <Text className="text-sm text-green-600 font-semibold">Mark Done ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const { garden, beds, plantings, reminders, fetchUpcomingReminders, completeReminder } =
    useGardenStore();
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'all'>('upcoming');

  useEffect(() => {
    if (garden) {
      fetchUpcomingReminders();
      loadAllReminders();
    }
  }, [garden]);

  async function loadAllReminders() {
    setLoading(true);
    const { data } = await supabase
      .from('reminders')
      .select('*, planting:plantings(*)')
      .is('completed_at', null)
      .order('due_date')
      .limit(50);

    const { beds } = useGardenStore.getState();
    const bedMap = Object.fromEntries(beds.map((b) => [b.id, b]));
    const { getPlantById } = await import('@/lib/plantData');
    const hydrated = ((data as Reminder[]) ?? []).map((r) => {
      const planting = r.planting as any;
      return {
        ...r,
        planting: planting
          ? { ...planting, plant: getPlantById(planting.plant_id), bed: bedMap[planting.bed_id] }
          : undefined,
      };
    });
    setAllReminders(hydrated);
    setLoading(false);
  }

  async function snoozeReminder(reminder: Reminder) {
    const newDate = new Date(reminder.due_date);
    newDate.setDate(newDate.getDate() + 1);
    await supabase
      .from('reminders')
      .update({ due_date: newDate.toISOString() })
      .eq('id', reminder.id);
    loadAllReminders();
    fetchUpcomingReminders();
  }

  async function handleComplete(reminder: Reminder) {
    await completeReminder(reminder.id);
    setAllReminders((prev) => prev.filter((r) => r.id !== reminder.id));
  }

  const displayedReminders = tab === 'upcoming' ? reminders : allReminders;

  const grouped = displayedReminders.reduce<Record<string, Reminder[]>>((acc, r) => {
    const key = formatDate(r.due_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const overdueCount = allReminders.filter((r) => isOverdue(r.due_date)).length;

  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-green-900 mb-1">Schedule</Text>
        {overdueCount > 0 && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-3 flex-row items-center">
            <Text className="text-red-600 text-sm font-medium">
              ⚠️ {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Tabs */}
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'upcoming' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab('upcoming')}
          >
            <Text className={`font-medium text-sm ${tab === 'upcoming' ? 'text-green-700' : 'text-gray-500'}`}>
              Next 7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'all' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTab('all')}
          >
            <Text className={`font-medium text-sm ${tab === 'all' ? 'text-green-700' : 'text-gray-500'}`}>
              All Upcoming
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : displayedReminders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🎉</Text>
          <Text className="text-xl font-semibold text-gray-700 mb-2">All caught up!</Text>
          <Text className="text-gray-400 text-center">
            No upcoming tasks. Reminders are automatically created when you add plants to beds.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerClassName="pb-8">
          {Object.entries(grouped).map(([date, items]) => (
            <View key={date} className="mb-4">
              <Text className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                {date}
              </Text>
              {items.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onComplete={() => handleComplete(reminder)}
                  onSnooze={() => snoozeReminder(reminder)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Empty state if no garden */}
      {!garden && !loading && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl mb-3">🌻</Text>
          <Text className="text-gray-500 text-center">
            Set up your garden on the Home tab to start tracking tasks
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
