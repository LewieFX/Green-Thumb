import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchPlants, getCategories, CATEGORY_EMOJI, type Plant } from '@/lib/plantData';

interface PlantPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (plantId: string) => void;
}

export default function PlantPickerModal({ visible, onClose, onSelect }: PlantPickerModalProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');

  const categories = useMemo(() => getCategories(), []);

  const results = useMemo(
    () => searchPlants(search, category || undefined),
    [search, category]
  );

  function handleClose() {
    setSearch('');
    setCategory('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-green-600 text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="font-semibold text-gray-800">Add Plant</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Search */}
        <View className="px-4 pt-3 pb-2">
          <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-100">
            <Text className="text-gray-400 mr-2">🔍</Text>
            <TextInput
              className="flex-1 text-base text-gray-800"
              placeholder="Search plants..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text className="text-gray-400 text-xl">×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2" contentContainerClassName="gap-2">
          <TouchableOpacity
            onPress={() => setCategory('')}
            className={`rounded-full px-3 py-1.5 ${!category ? 'bg-green-600' : 'bg-gray-100'}`}
          >
            <Text className={`text-sm font-medium ${!category ? 'text-white' : 'text-gray-600'}`}>All</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c === category ? '' : c)}
              className={`rounded-full px-3 py-1.5 ${category === c ? 'bg-green-600' : 'bg-gray-100'}`}
            >
              <Text className={`text-sm font-medium ${category === c ? 'text-white' : 'text-gray-600'}`}>
                {CATEGORY_EMOJI[c]} {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-6">
          <Text className="text-xs text-gray-400 mb-2">{results.length} plants</Text>
          {results.map((plant) => (
            <PlantPickerRow key={plant.id} plant={plant} onSelect={() => onSelect(plant.id)} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PlantPickerRow({ plant, onSelect }: { plant: Plant; onSelect: () => void }) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      className="flex-row items-center py-3 border-b border-gray-50"
    >
      <Text className="text-3xl mr-3 w-10 text-center">{plant.emoji}</Text>
      <View className="flex-1">
        <Text className="font-medium text-gray-800">{plant.name}</Text>
        <Text className="text-xs text-gray-400 italic">{plant.family}</Text>
        <View className="flex-row gap-3 mt-0.5">
          {plant.waterDays > 0 && (
            <Text className="text-xs text-blue-500">💧 {plant.waterDays}d</Text>
          )}
          {plant.harvestWeeks[0] > 0 && plant.harvestWeeks[0] < 999 && (
            <Text className="text-xs text-green-500">
              🌾 {plant.harvestWeeks[0]}–{plant.harvestWeeks[1]}wk
            </Text>
          )}
          {plant.nitrogen === 'fixer' && (
            <Text className="text-xs text-emerald-600">✅ N fixer</Text>
          )}
        </View>
      </View>
      <Text className="text-green-600 font-semibold text-xl ml-2">+</Text>
    </TouchableOpacity>
  );
}
