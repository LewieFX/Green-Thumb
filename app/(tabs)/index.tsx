import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/plants" />;
}

// ─── Original dashboard preserved below (re-enable when needed) ───────────────

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useGardenStore } from '@/store/gardenStore';
import type { Garden } from '@/lib/database.types';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, emoji, color }: {
  label: string;
  value: string | number;
  emoji: string;
  color: string;
}) {
  return (
    <View className={`rounded-2xl p-4 flex-1 mx-1 items-center ${color}`}>
      <Text className="text-2xl">{emoji}</Text>
      <Text className="text-2xl font-bold text-gray-800 mt-1">{value}</Text>
      <Text className="text-xs text-gray-500 mt-0.5 text-center">{label}</Text>
    </View>
  );
}

const REMINDER_CONFIG: Record<string, { emoji: string; bg: string; text: string }> = {
  watering:   { emoji: '💧', bg: 'bg-blue-50',   text: 'text-blue-700' },
  fertilising:{ emoji: '🌿', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  harvest:    { emoji: '🌾', bg: 'bg-green-50',  text: 'text-green-700' },
  pruning:    { emoji: '✂️', bg: 'bg-purple-50', text: 'text-purple-700' },
  custom:     { emoji: '📌', bg: 'bg-gray-50',   text: 'text-gray-700' },
};

// ─── Garden Setup Screen ──────────────────────────────────────────────────────

function GardenSetup({ onCreated }: { onCreated: (garden: Garden) => void }) {
  const [gardenName, setGardenName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [saving, setSaving] = useState(false);

  async function createGarden() {
    if (!gardenName.trim()) {
      Alert.alert('Name required', 'Give your garden a name to continue.');
      return;
    }
    setSaving(true);
    try {
      // Get session user — re-try anonymous sign-in if needed
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data } = await supabase.auth.signInAnonymously();
        user = data.user;
      }
      if (!user) {
        Alert.alert('Error', 'Could not create a session. Check your Supabase URL and anon key in .env.local, and make sure Anonymous sign-ins are enabled in your Supabase dashboard.');
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from('gardens')
        .insert({ user_id: user.id, name: gardenName.trim(), postcode: postcode.trim() || null })
        .select()
        .single();

      if (error || !data) {
        console.error('Create garden error:', error);
        Alert.alert('Error', error?.message ?? 'Could not save garden. Check Supabase connection and schema.');
        setSaving(false);
        return;
      }
      onCreated(data as Garden);
    } catch (e: any) {
      console.error('Unexpected error:', e);
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    }
    setSaving(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-green-700">
      {/* Top illustration area */}
      <View className="items-center pt-10 pb-8">
        <Text style={{ fontSize: 80 }}>🌱</Text>
        <Text className="text-white text-3xl font-bold mt-4">Green Thumb</Text>
        <Text className="text-green-200 text-base mt-1">Your smart garden companion</Text>
      </View>

      {/* Form card */}
      <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Set up your garden</Text>
        <Text className="text-gray-400 mb-6">Takes 10 seconds. You can change this later.</Text>

        <Text className="text-sm font-semibold text-gray-700 mb-2">Garden name</Text>
        <TextInput
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 mb-4"
          value={gardenName}
          onChangeText={setGardenName}
          placeholder="e.g. Backyard Veg Patch"
          placeholderTextColor="#9ca3af"
          autoFocus
          returnKeyType="next"
        />

        <Text className="text-sm font-semibold text-gray-700 mb-2">Postcode <Text className="font-normal text-gray-400">(optional)</Text></Text>
        <TextInput
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 mb-1"
          value={postcode}
          onChangeText={setPostcode}
          placeholder="e.g. 3000"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={createGarden}
        />
        <Text className="text-xs text-gray-400 mb-8">
          Used for climate zone and seasonal planting suggestions
        </Text>

        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${saving ? 'bg-green-400' : 'bg-green-600'}`}
          onPress={createGarden}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Let's start growing →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardScreen() {
  const router = useRouter();
  const { garden, beds, plantings, reminders, loading, fetchGarden, setGarden, completeReminder } =
    useGardenStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) fetchGarden(user.id);
    });
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-green-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!garden) {
    return <GardenSetup onCreated={(g) => { setGarden(g); fetchGarden(g.user_id); }} />;
  }

  const activePlantings = plantings.filter((p) => p.status === 'active');
  const todayReminders = reminders.filter((r) =>
    new Date(r.due_date).toDateString() === new Date().toDateString()
  );
  const overdueReminders = reminders.filter((r) => new Date(r.due_date) < new Date());

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-green-700 px-5 pt-3 pb-6">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-green-200 text-sm font-medium">Good {getTimeOfDay()}</Text>
          <View className="bg-green-600 rounded-full px-3 py-1">
            <Text className="text-green-100 text-xs font-semibold">BETA</Text>
          </View>
        </View>
        <Text className="text-white text-2xl font-bold">{garden.name}</Text>
        {garden.postcode && (
          <Text className="text-green-200 text-sm mt-0.5">📍 {garden.postcode}</Text>
        )}
      </View>

      {/* Stats strip — overlaps header */}
      <View className="flex-row px-4 -mt-4 mb-4">
        <StatCard label="Beds" value={beds.length} emoji="🛖" color="bg-white shadow-sm" />
        <StatCard label="Growing" value={activePlantings.length} emoji="🌿" color="bg-white shadow-sm" />
        <StatCard label="Due today" value={todayReminders.length} emoji="✅" color={todayReminders.length > 0 ? "bg-orange-50 shadow-sm" : "bg-white shadow-sm"} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-10" showsVerticalScrollIndicator={false}>

        {/* Overdue banner */}
        {overdueReminders.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/schedule')}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex-row items-center"
          >
            <Text className="text-2xl mr-3">⚠️</Text>
            <View className="flex-1">
              <Text className="font-semibold text-red-700">
                {overdueReminders.length} overdue task{overdueReminders.length > 1 ? 's' : ''}
              </Text>
              <Text className="text-red-500 text-xs mt-0.5">Tap to view schedule</Text>
            </View>
            <Text className="text-red-400 text-lg">›</Text>
          </TouchableOpacity>
        )}

        {/* Today's tasks */}
        <View className="mb-5">
          <Text className="text-base font-bold text-gray-800 mb-3">Today's Tasks</Text>
          {reminders.length === 0 ? (
            <View className="bg-white rounded-2xl p-5 items-center border border-gray-100">
              <Text className="text-3xl mb-2">🎉</Text>
              <Text className="font-semibold text-gray-700">All caught up!</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">No tasks due this week</Text>
            </View>
          ) : (
            reminders.slice(0, 5).map((reminder) => {
              const cfg = REMINDER_CONFIG[reminder.type] ?? REMINDER_CONFIG.custom;
              return (
                <View
                  key={reminder.id}
                  className={`rounded-2xl p-4 mb-2 flex-row items-center ${cfg.bg}`}
                >
                  <Text className="text-2xl mr-3">{cfg.emoji}</Text>
                  <View className="flex-1">
                    <Text className={`font-semibold text-sm ${cfg.text}`}>
                      {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)}
                    </Text>
                    <Text className="text-gray-700 font-medium">
                      {reminder.planting?.plant?.name ?? 'Plant'}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {(reminder.planting as any)?.bed?.name ?? ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => completeReminder(reminder.id)}
                    className="bg-white rounded-xl px-3 py-2 ml-2 shadow-sm"
                  >
                    <Text className="text-green-600 text-sm font-semibold">Done</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Garden Beds */}
        <View className="mb-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-gray-800">Garden Beds</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/designer')}>
              <Text className="text-green-600 text-sm font-medium">Manage →</Text>
            </TouchableOpacity>
          </View>

          {beds.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/designer')}
              className="bg-white rounded-2xl p-5 items-center border-2 border-dashed border-gray-200"
            >
              <Text className="text-3xl mb-2">🪴</Text>
              <Text className="font-semibold text-gray-600">Add your first bed</Text>
              <Text className="text-gray-400 text-sm mt-1">Tap to open the Garden Designer</Text>
            </TouchableOpacity>
          ) : (
            beds.map((bed) => {
              const bedPlantings = activePlantings.filter((p) => p.bed_id === bed.id);
              return (
                <View key={bed.id} className="bg-white rounded-2xl p-4 mb-2 border border-gray-100">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-semibold text-gray-800">{bed.name}</Text>
                    {bed.width_m && bed.length_m && (
                      <Text className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {bed.width_m}m × {bed.length_m}m
                      </Text>
                    )}
                  </View>
                  {bedPlantings.length === 0 ? (
                    <Text className="text-sm text-gray-400">No plants yet</Text>
                  ) : (
                    <View className="flex-row flex-wrap gap-1">
                      {bedPlantings.map((p) => (
                        <View key={p.id} className="bg-green-100 rounded-full px-3 py-1 flex-row items-center">
                          <Text className="text-xs mr-1">{p.plant?.emoji ?? '🌱'}</Text>
                          <Text className="text-xs text-green-800 font-medium">{p.plant?.name ?? 'Plant'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Quick actions */}
        <Text className="text-base font-bold text-gray-800 mb-3">Quick Actions</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/plants')}
            className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100"
          >
            <Text className="text-3xl mb-1">🌿</Text>
            <Text className="text-sm font-semibold text-gray-700">Browse Plants</Text>
            <Text className="text-xs text-gray-400 mt-0.5">141 species</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/schedule')}
            className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100"
          >
            <Text className="text-3xl mb-1">📅</Text>
            <Text className="text-sm font-semibold text-gray-700">Full Schedule</Text>
            <Text className="text-xs text-gray-400 mt-0.5">All upcoming tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/designer')}
            className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100"
          >
            <Text className="text-3xl mb-1">✏️</Text>
            <Text className="text-sm font-semibold text-gray-700">Designer</Text>
            <Text className="text-xs text-gray-400 mt-0.5">Edit beds</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
