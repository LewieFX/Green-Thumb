import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { useGardenStore } from '@/store/gardenStore';
import type { Bed, Planting } from '@/lib/database.types';
import PlantPickerModal from '@/components/plants/PlantPickerModal';

const BED_COLORS = [
  '#bbf7d0', '#bfdbfe', '#fde68a', '#fbcfe8', '#ddd6fe', '#fed7aa',
];

function BedShape({ bed, scale = 40 }: { bed: Bed; scale?: number }) {
  const w = Math.max((bed.width_m ?? 1) * scale, 30);
  const h = Math.max((bed.length_m ?? 1) * scale, 30);
  const color = BED_COLORS[Math.abs(bed.id.charCodeAt(0) + bed.id.charCodeAt(1)) % BED_COLORS.length];

  if (bed.shape === 'circle') {
    const r = Math.max(w, h) / 2;
    return (
      <Svg width={r * 2} height={r * 2}>
        <Circle cx={r} cy={r} r={r - 2} fill={color} stroke="#86efac" strokeWidth={2} />
        <SvgText
          x={r}
          y={r + 4}
          textAnchor="middle"
          fill="#166534"
          fontSize={10}
          fontWeight="600"
        >
          {bed.name.slice(0, 8)}
        </SvgText>
      </Svg>
    );
  }

  return (
    <Svg width={w} height={h}>
      <Rect x={1} y={1} width={w - 2} height={h - 2} rx={6} fill={color} stroke="#86efac" strokeWidth={2} />
      <SvgText
        x={w / 2}
        y={h / 2 + 4}
        textAnchor="middle"
        fill="#166534"
        fontSize={10}
        fontWeight="600"
      >
        {bed.name.slice(0, 8)}
      </SvgText>
    </Svg>
  );
}

interface BedFormData {
  name: string;
  shape: 'rectangle' | 'circle';
  width_m: string;
  length_m: string;
  soil_type: string;
  notes: string;
}

const defaultForm: BedFormData = {
  name: '',
  shape: 'rectangle',
  width_m: '2',
  length_m: '1',
  soil_type: '',
  notes: '',
};

export default function DesignerScreen() {
  const { garden, beds, plantings, addBed, updateBed, deleteBed, addPlanting, removePlanting } =
    useGardenStore();
  const [showBedModal, setShowBedModal] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [form, setForm] = useState<BedFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  function openAddBed() {
    setEditingBed(null);
    setForm(defaultForm);
    setShowBedModal(true);
  }

  function openEditBed(bed: Bed) {
    setEditingBed(bed);
    setForm({
      name: bed.name,
      shape: bed.shape as 'rectangle' | 'circle',
      width_m: String(bed.width_m ?? 2),
      length_m: String(bed.length_m ?? 1),
      soil_type: bed.soil_type ?? '',
      notes: bed.notes ?? '',
    });
    setShowBedModal(true);
  }

  async function saveBed() {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Please give your bed a name.');
      return;
    }
    if (!garden) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      shape: form.shape,
      width_m: parseFloat(form.width_m) || 1,
      length_m: parseFloat(form.length_m) || 1,
      soil_type: form.soil_type || null,
      notes: form.notes || null,
    };

    if (editingBed) {
      await updateBed(editingBed.id, payload);
    } else {
      await addBed({ ...payload, garden_id: garden.id, position_x: 0, position_y: 0 });
    }
    setSaving(false);
    setShowBedModal(false);
  }

  async function confirmDeleteBed(bed: Bed) {
    Alert.alert(
      'Delete Bed',
      `Delete "${bed.name}"? All plantings in this bed will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBed(bed.id);
            if (selectedBed?.id === bed.id) setSelectedBed(null);
          },
        },
      ]
    );
  }

  const selectedBedPlantings = selectedBed
    ? plantings.filter((p) => p.bed_id === selectedBed.id && p.status === 'active')
    : [];

  const handlePlantSelected = useCallback(
    async (plantId: string) => {
      if (!selectedBed) return;
      setShowPlantPicker(false);
      const today = new Date().toISOString().split('T')[0];
      await addPlanting({
        bed_id: selectedBed.id,
        plant_id: plantId,
        planted_date: today,
        quantity: 1,
        status: 'active',
        expected_harvest_date: null,
        notes: null,
      });
    },
    [selectedBed, addPlanting]
  );

  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <View className="flex-row justify-between items-center px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-green-900">Garden Designer</Text>
        <TouchableOpacity
          className="bg-green-600 rounded-full px-4 py-2 flex-row items-center"
          onPress={openAddBed}
        >
          <Text className="text-white font-semibold">+ Add Bed</Text>
        </TouchableOpacity>
      </View>

      {!garden ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl mb-3">🌻</Text>
          <Text className="text-gray-500 text-center">Set up your garden first from the Home tab</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-8">
          {beds.length === 0 ? (
            <View className="items-center justify-center px-6 mt-16">
              <Text className="text-5xl mb-4">🪴</Text>
              <Text className="text-xl font-semibold text-gray-700 mb-2">No beds yet</Text>
              <Text className="text-gray-400 text-center mb-6">
                Add your first garden bed to start planning
              </Text>
              <TouchableOpacity
                className="bg-green-600 rounded-xl px-6 py-3"
                onPress={openAddBed}
              >
                <Text className="text-white font-semibold">Add First Bed</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Visual bed grid */}
              <View className="px-4 mb-4">
                <Text className="text-sm font-medium text-gray-500 mb-2">Garden Layout</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row flex-wrap gap-3 p-3 bg-soil-100 rounded-2xl border border-soil-200 min-w-full">
                    {beds.map((bed) => (
                      <TouchableOpacity
                        key={bed.id}
                        onPress={() => setSelectedBed(bed.id === selectedBed?.id ? null : bed)}
                        className={`rounded-xl overflow-hidden border-2 ${
                          selectedBed?.id === bed.id ? 'border-green-600' : 'border-transparent'
                        }`}
                      >
                        <BedShape bed={bed} scale={38} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Bed list */}
              <View className="px-4">
                <Text className="text-sm font-medium text-gray-500 mb-2">All Beds</Text>
                {beds.map((bed) => {
                  const bp = plantings.filter((p) => p.bed_id === bed.id && p.status === 'active');
                  const isSelected = selectedBed?.id === bed.id;
                  return (
                    <TouchableOpacity
                      key={bed.id}
                      onPress={() => setSelectedBed(isSelected ? null : bed)}
                      className={`bg-white rounded-2xl mb-2 shadow-sm overflow-hidden ${
                        isSelected ? 'border-2 border-green-500' : ''
                      }`}
                    >
                      <View className="p-4">
                        <View className="flex-row justify-between items-center">
                          <View className="flex-row items-center flex-1">
                            <Text className="font-semibold text-gray-800 text-base">{bed.name}</Text>
                            <View className="bg-green-50 rounded-full px-2 py-0.5 ml-2">
                              <Text className="text-xs text-green-600 font-medium">
                                {bed.shape === 'circle' ? '⬤' : '▬'} {bed.width_m ?? '?'}m × {bed.length_m ?? '?'}m
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => openEditBed(bed)}
                              className="bg-gray-100 rounded-lg px-3 py-1.5"
                            >
                              <Text className="text-xs text-gray-600">Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => confirmDeleteBed(bed)}
                              className="bg-red-50 rounded-lg px-3 py-1.5"
                            >
                              <Text className="text-xs text-red-500">Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {bed.soil_type && (
                          <Text className="text-xs text-gray-400 mt-1">Soil: {bed.soil_type}</Text>
                        )}

                        {/* Plants in this bed */}
                        {bp.length > 0 && (
                          <View className="flex-row flex-wrap mt-2 gap-1">
                            {bp.map((p) => (
                              <TouchableOpacity
                                key={p.id}
                                onPress={() => {
                                  Alert.alert(
                                    p.plant?.name ?? 'Plant',
                                    `Planted: ${p.planted_date ?? 'Unknown'}\nQuantity: ${p.quantity}`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: 'Remove Plant',
                                        style: 'destructive',
                                        onPress: () => removePlanting(p.id),
                                      },
                                    ]
                                  );
                                }}
                                className="bg-green-100 rounded-full px-3 py-1"
                              >
                                <Text className="text-xs text-green-700 font-medium">
                                  {p.plant?.name ?? 'Plant'} ×{p.quantity}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Add plant button (expanded) */}
                      {isSelected && (
                        <TouchableOpacity
                          className="bg-green-600 py-3 items-center"
                          onPress={() => setShowPlantPicker(true)}
                        >
                          <Text className="text-white font-semibold text-sm">
                            + Add Plant to {bed.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Add/Edit Bed Modal */}
      <Modal visible={showBedModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowBedModal(false)}>
              <Text className="text-green-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="font-semibold text-gray-800">
              {editingBed ? 'Edit Bed' : 'New Garden Bed'}
            </Text>
            <TouchableOpacity onPress={saveBed} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#16a34a" />
              ) : (
                <Text className="text-green-600 font-semibold text-base">Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            <Text className="text-sm font-medium text-gray-700 mb-1">Bed Name *</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-4 bg-gray-50"
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Veggie Patch #1"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Shape</Text>
            <View className="flex-row mb-4 gap-3">
              {(['rectangle', 'circle'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setForm((f) => ({ ...f, shape: s }))}
                  className={`flex-1 border-2 rounded-xl py-3 items-center ${
                    form.shape === s
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <Text className="text-lg">{s === 'rectangle' ? '▬' : '⬤'}</Text>
                  <Text
                    className={`text-sm font-medium mt-1 capitalize ${
                      form.shape === s ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  {form.shape === 'circle' ? 'Diameter (m)' : 'Width (m)'}
                </Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-gray-50"
                  value={form.width_m}
                  onChangeText={(v) => setForm((f) => ({ ...f, width_m: v }))}
                  keyboardType="decimal-pad"
                  placeholder="2"
                />
              </View>
              {form.shape === 'rectangle' && (
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Length (m)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-gray-50"
                    value={form.length_m}
                    onChangeText={(v) => setForm((f) => ({ ...f, length_m: v }))}
                    keyboardType="decimal-pad"
                    placeholder="1"
                  />
                </View>
              )}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">Soil Type (optional)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-4 bg-gray-50"
              value={form.soil_type}
              onChangeText={(v) => setForm((f) => ({ ...f, soil_type: v }))}
              placeholder="e.g. Sandy loam, Clay, Raised bed mix"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Notes (optional)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-4 bg-gray-50"
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Any notes about this bed..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Plant Picker Modal */}
      <PlantPickerModal
        visible={showPlantPicker}
        onClose={() => setShowPlantPicker(false)}
        onSelect={handlePlantSelected}
      />
    </SafeAreaView>
  );
}
