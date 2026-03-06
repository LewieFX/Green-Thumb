import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  searchPlants,
  getCategories,
  getVarieties,
  getParentPlant,
  CATEGORY_EMOJI,
  NITROGEN_LABEL,
  GROWTH_HABIT_LABEL,
  MONTH_ABBR,
  type Plant,
} from '@/lib/plantData';

// ─── Plant image map (auto-generated) ────────────────────────────────────────
// Add images to assets/images/{plant_id}.png — they auto-appear on next start.
// Optional hero: assets/images/{plant_id}_hero.png

import { PLANT_IMAGES } from '@/lib/plantImageMap';

const SUN_IMG   = require('../../assets/images/sun.png');
const WATER_IMG = require('../../assets/images/waterdrop.png');

const CATEGORY_ICONS: Record<string, any> = {
  Vegetables:    require('../../assets/images/vegetables icon.png'),
  Herbs:         require('../../assets/images/herb icon.png'),
  'Fruit Trees': require('../../assets/images/fruit icon.png'),
  Berries:       require('../../assets/images/berry icon.png'),
  Flowers:       require('../../assets/images/flower icon.png'),
};

// ─── Font ─────────────────────────────────────────────────────────────────────

const FONT = 'Delius_400Regular';

// ─── Brand palette ────────────────────────────────────────────────────────────

const BRAND = {
  bg:               '#fffbf1',
  highlight:        '#72bf83',
  highlightDark:    '#4a9e5c',
  text:             '#111111',
  textMuted:        '#666666',
  textLight:        '#999999',
  cardBg:           '#ffffff',
  border:           '#ede9df',
  chipBg:           '#f0ede6',
  chipBorder:       '#e0ddd5',
  chipText:         '#444444',
};

// ─── Category theme ───────────────────────────────────────────────────────────

const CATEGORY_THEME: Record<string, { bg: string; text: string }> = {
  Vegetables:    { bg: '#d4edda', text: '#1a5e2a' },
  Herbs:         { bg: '#c8f0e0', text: '#0d5c3a' },
  'Fruit Trees': { bg: '#fde8cc', text: '#7a3500' },
  Berries:       { bg: '#f5d0e8', text: '#7a1a4e' },
  Flowers:       { bg: '#e8d5f5', text: '#4a1a7a' },
  Natives:       { bg: '#f5e6c8', text: '#6b3d00' },
  Perennials:    { bg: '#d5e0f5', text: '#1a2e7a' },
  'Edible Flowers': { bg: '#ffd6d6', text: '#7a1a1a' },
  Cottage:       { bg: '#f0e0d0', text: '#5a3010' },
};

function catTheme(category: string) {
  return CATEGORY_THEME[category] ?? { bg: '#e8f0e8', text: '#1a4a1a' };
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

// ─── Month Calendar ───────────────────────────────────────────────────────────

const CAL_ROWS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]];

function MonthCalendar({ sowMonths, harvestMonths }: { sowMonths: number[]; harvestMonths: number[] }) {
  return (
    <View style={{ gap: 5 }}>
      {CAL_ROWS.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 5 }}>
          {row.map((month) => {
            const isSow     = sowMonths?.includes(month);
            const isHarvest = harvestMonths?.includes(month);
            const both      = isSow && isHarvest;
            const bg        = both ? '#f59e0b' : isSow ? BRAND.highlight : isHarvest ? '#f97316' : '#f0ede6';
            const textColor = (isSow || isHarvest) ? '#fff' : BRAND.textLight;
            return (
              <View key={month} style={[styles.calCell, { backgroundColor: bg }]}>
                <Text style={[styles.calCellText, { color: textColor }]}>{MONTH_ABBR[month - 1]}</Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        {[
          { color: BRAND.highlight, label: 'Sow' },
          { color: '#f97316', label: 'Harvest' },
          { color: '#f59e0b', label: 'Both' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ fontSize: 11, color: BRAND.textLight }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Companion chips ──────────────────────────────────────────────────────────

function CompanionChips({ items, good }: { items: string[]; good: boolean }) {
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map((c) => (
        <View key={c} style={[styles.pill, { backgroundColor: good ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[styles.pillText, { color: good ? '#15803d' : '#dc2626' }]}>
            {good ? '✓' : '✗'} {c}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

// ─── Variety Card ─────────────────────────────────────────────────────────────

function VarietyCard({ plant, onPress }: { plant: Plant; onPress: () => void }) {
  const t = catTheme(plant.category);
  const habit = plant.growthHabit ? GROWTH_HABIT_LABEL[plant.growthHabit] : null;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.varietyCard}>
      <View style={[styles.varietyEmoji, { backgroundColor: t.bg }]}>
        <Text style={{ fontSize: 22 }}>{plant.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.varietyName}>{plant.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
          {habit && <Pill label={`${habit.emoji} ${habit.label}`} bg={t.bg} color={t.text} />}
          {plant.growthType && <Pill label={plant.growthType} bg="#dbeafe" color="#1d4ed8" />}
          {plant.trellisRequired && <Pill label="🪜 trellis" bg="#ede9fe" color="#6d28d9" />}
          {plant.flavour && <Pill label={plant.flavour.split('—')[0].trim()} bg="#fef3c7" color="#92400e" />}
        </View>
        {plant.bestUse ? (
          <Text style={styles.varietyBestUse} numberOfLines={1}>{plant.bestUse}</Text>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Stat Row (almanac style) ─────────────────────────────────────────────────

function StatRow({ img, icon, label, value }: { img?: any; icon?: string; label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowIcon}>
        {img
          ? <Image source={img} style={{ width: 15, height: 15 }} resizeMode="contain" />
          : <Text style={{ fontSize: 13 }}>{icon}</Text>
        }
      </View>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

// ─── Plant Detail Modal ───────────────────────────────────────────────────────

function PlantDetailModal({
  plant,
  onClose,
  onSelectPlant,
}: {
  plant: Plant | null;
  onClose: () => void;
  onSelectPlant: (p: Plant) => void;
}) {
  if (!plant) return null;

  const nitrogen = NITROGEN_LABEL[plant.nitrogen];
  const habit = plant.growthHabit ? GROWTH_HABIT_LABEL[plant.growthHabit] : null;
  const varieties = getVarieties(plant.id);
  const parent = getParentPlant(plant);
  const img = PLANT_IMAGES[plant.id];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bg }}>
          {/* Floating close */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          {/* Breadcrumb */}
          {parent && (
            <TouchableOpacity onPress={() => onSelectPlant(parent)} style={styles.breadcrumbBtn}>
              <Text style={styles.breadcrumb}>‹ {parent.name}</Text>
            </TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.modalBody}>

          {/* ── Title ── */}
          <View style={styles.titleSection}>
            <Text style={styles.heroName}>{plant.name}</Text>
            {plant.family ? (
              <Text style={styles.heroFamily}>{plant.family} · {plant.type}</Text>
            ) : null}
            <View style={styles.heroBadges}>
              <View style={[styles.pill, { backgroundColor: BRAND.highlight, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                {CATEGORY_ICONS[plant.category]
                  ? <Image source={CATEGORY_ICONS[plant.category]} style={{ width: 12, height: 12 }} resizeMode="contain" />
                  : <Text style={{ fontSize: 11 }}>{CATEGORY_EMOJI[plant.category] ?? ''}</Text>
                }
                <Text style={[styles.pillText, { color: '#fff' }]}>{plant.category}</Text>
              </View>
              {plant.perennial && <Pill label="♻️ Perennial" bg={BRAND.chipBg} color={BRAND.text} />}
              {habit && <Pill label={`${habit.emoji} ${habit.label}`} bg={BRAND.chipBg} color={BRAND.text} />}
              {plant.growthType && <Pill label={plant.growthType} bg={BRAND.chipBg} color={BRAND.text} />}
              {plant.trellisRequired && <Pill label="🪜 Support" bg={BRAND.chipBg} color={BRAND.text} />}
              {plant.pots === 'contain' && <Pill label="🪴 Pot to contain" bg="#fff3cd" color="#856404" />}
              {plant.pots === 'suitable' && <Pill label="🪴 Pot friendly" bg="#d1f0d8" color="#1a5e2a" />}
            </View>
          </View>

          <View style={styles.dividerLine} />

          {/* ── Three-column body ── */}
          <View style={styles.twoCol}>

            {/* IMAGE column */}
            <View style={styles.imageCol}>
              {img ? (
                <Image source={img.hero ?? img.card} style={styles.colImage} resizeMode="cover" />
              ) : (
                <View style={[styles.colImageEmoji, { backgroundColor: catTheme(plant.category).bg }]}>
                  <Text style={{ fontSize: 32 }}>{plant.emoji}</Text>
                </View>
              )}
            </View>

            <View style={styles.colDivider} />

            {/* LEFT — Growing Guide */}
            <View style={styles.col}>
              <SectionHeader label="Growing Guide" />

              {plant.sunHours > 0 && <StatRow img={SUN_IMG} label="Sunlight" value={`${plant.sunHours}h / day`} />}
              {plant.waterDays > 0 && <StatRow img={WATER_IMG} label="Water" value={`Every ${plant.waterDays} days`} />}
              {plant.harvestWeeks[0] > 0 && plant.harvestWeeks[0] < 500 && (
                <StatRow icon="🌾" label="Harvest" value={`${plant.harvestWeeks[0]}–${plant.harvestWeeks[1]} wks`} />
              )}
              {plant.fertWeeks > 0 && <StatRow icon="🧪" label="Fertilise" value={`Every ${plant.fertWeeks} wks`} />}
              {plant.spacingCm > 0 && <StatRow icon="📐" label="Spacing" value={`${plant.spacingCm} cm`} />}
              {plant.heightCm > 0 && <StatRow icon="📏" label="Height" value={`${plant.heightCm} cm`} />}

              {nitrogen && (
                <View style={[styles.nitrogenRow, { borderLeftColor: nitrogen.color }]}>
                  <Text style={[styles.nitrogenTitle, { color: nitrogen.color }]}>{nitrogen.emoji} {nitrogen.label}</Text>
                  <Text style={styles.nitrogenDesc}>
                    {plant.nitrogen === 'fixer'
                      ? 'Adds nitrogen to soil.'
                      : plant.nitrogen === 'heavy_feeder'
                      ? 'Depletes nitrogen quickly.'
                      : 'Moderate nitrogen use.'}
                  </Text>
                </View>
              )}

              {plant.zones?.length ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.colSubhead}>Climate Zones</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {plant.zones.map((z) => (
                      <Pill key={z} label={`Zone ${z}`} bg="#dbeafe" color="#1d4ed8" />
                    ))}
                  </View>
                </View>
              ) : null}

              {(plant.yearsToFirstFruit || plant.chillHours || plant.pollination || plant.matureHeightM) ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.colSubhead}>Tree / Shrub</Text>
                  {plant.yearsToFirstFruit ? <StatRow icon="🍎" label="First fruit" value={`${plant.yearsToFirstFruit}+ yrs`} /> : null}
                  {plant.matureHeightM ? <StatRow icon="🌳" label="Mature height" value={`${plant.matureHeightM}m`} /> : null}
                  {plant.chillHours ? <StatRow icon="❄️" label="Chill hours" value={`${plant.chillHours}h`} /> : null}
                  {plant.pollination ? <StatRow icon="🐝" label="Pollination" value={plant.pollination} /> : null}
                </View>
              ) : null}
            </View>

            <View style={styles.colDivider} />

            {/* RIGHT — Planting Guide */}
            <View style={styles.col}>
              <SectionHeader label="Planting Guide" />

              {plant.plantingGuide ? (
                <Text style={[styles.colDescription, { marginBottom: plant.description ? 12 : 0 }]}>{plant.plantingGuide}</Text>
              ) : null}

              {plant.description ? (
                <View>
                  <Text style={styles.colSubhead}>About</Text>
                  <Text style={styles.colDescription}>{plant.description}</Text>
                </View>
              ) : null}

              {plant.notes ? (
                <View style={{ marginTop: plant.description ? 12 : 0 }}>
                  <Text style={styles.colSubhead}>Care Tips</Text>
                  <Text style={styles.colDescription}>{plant.notes}</Text>
                </View>
              ) : null}

              {(plant.companions?.length || plant.avoid?.length) ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.colSubhead}>Companion Planting</Text>
                  {plant.companions?.length ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.companionSubhead}>Grows well with</Text>
                      <CompanionChips items={plant.companions} good />
                    </View>
                  ) : null}
                  {plant.avoid?.length ? (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.companionSubhead}>Avoid</Text>
                      <CompanionChips items={plant.avoid} good={false} />
                    </View>
                  ) : null}
                </View>
              ) : null}

              {(plant.flavour || plant.bestUse || plant.fruitColour || plant.fruitSize) ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.colSubhead}>Characteristics</Text>
                  {plant.flavour && <Text style={styles.colDescription}>Flavour — {plant.flavour}</Text>}
                  {plant.bestUse && <Text style={styles.colDescription}>Best use — {plant.bestUse}</Text>}
                  {plant.fruitColour && <Text style={styles.colDescription}>Colour — {plant.fruitColour}</Text>}
                  {plant.fruitSize && <Text style={styles.colDescription}>Size — {plant.fruitSize}</Text>}
                </View>
              ) : null}

              {plant.tags?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 14 }}>
                  {plant.tags.map((tag) => (
                    <Pill key={tag} label={tag} bg={BRAND.chipBg} color={BRAND.textMuted} />
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Planting Calendar — full width ── */}
          {(plant.sowMonths?.length || plant.harvestMonths?.length) ? (
            <View style={styles.calendarSection}>
              <View style={styles.dividerLine} />
              <SectionHeader label="Planting Calendar" />
              <MonthCalendar sowMonths={plant.sowMonths ?? []} harvestMonths={plant.harvestMonths ?? []} />
            </View>
          ) : null}

          {/* ── Varieties ── */}
          {varieties.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.dividerLine} />
              <View style={[styles.varietiesHeader, { marginTop: 20 }]}>
                <Text style={styles.varietiesTitle}>Varieties</Text>
                <View style={[styles.varietiesCount, { backgroundColor: BRAND.highlight }]}>
                  <Text style={[styles.varietiesCountText, { color: '#fff' }]}>{varieties.length}</Text>
                </View>
              </View>
              {varieties.map((v) => (
                <VarietyCard key={v.id} plant={v} onPress={() => onSelectPlant(v)} />
              ))}
            </View>
          )}

            </View>
          </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Plant Card (single column) ───────────────────────────────────────────────

function PlantCard({
  plant,
  varietyCount,
  onPress,
}: {
  plant: Plant;
  varietyCount: number;
  onPress: () => void;
}) {
  const t = catTheme(plant.category);
  const img = PLANT_IMAGES[plant.id];
  const nitrogen = NITROGEN_LABEL[plant.nitrogen];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.plantCard}>
      {/* Left: image or emoji block */}
      {img ? (
        <Image source={img.card} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardEmojiBlock, { backgroundColor: t.bg }]}>
          <Text style={styles.cardEmoji}>{plant.emoji}</Text>
        </View>
      )}

      {/* Right: content */}
      <View style={styles.cardContent}>
        {/* Top row: name + category tag */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[styles.plantName, { flex: 1 }]} numberOfLines={2}>{plant.name}</Text>
          <View style={[styles.categoryTag, { backgroundColor: t.bg, flexShrink: 0 }]}>
            <Text style={[styles.categoryTagText, { color: t.text }]}>{plant.category}</Text>
          </View>
        </View>

        {/* Description snippet */}
        {plant.description ? (
          <Text style={styles.cardDescription} numberOfLines={3}>{plant.description}</Text>
        ) : null}

        {/* Quick stats */}
        <View style={styles.quickStats}>
          {plant.sunHours > 0 && (
            <View style={styles.quickStatRow}>
              <Image source={SUN_IMG} style={styles.quickStatImg} resizeMode="contain" />
              <Text style={styles.quickStat}>{plant.sunHours}h</Text>
            </View>
          )}
          {plant.waterDays > 0 && (
            <View style={styles.quickStatRow}>
              <Image source={WATER_IMG} style={styles.quickStatImg} resizeMode="contain" />
              <Text style={styles.quickStat}>{plant.waterDays}d</Text>
            </View>
          )}
          {plant.harvestWeeks[0] > 0 && plant.harvestWeeks[0] < 200 && (
            <Text style={styles.quickStat}>🌾 {plant.harvestWeeks[0]}wk</Text>
          )}
          {nitrogen && (
            <Text style={styles.quickStat}>{nitrogen.emoji}</Text>
          )}
        </View>

        {/* Badges */}
        {(varietyCount > 0 || plant.perennial || plant.trellisRequired || plant.pots) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {varietyCount > 0 && (
              <Pill label={`${varietyCount} varieties`} bg={BRAND.highlight} color="#fff" />
            )}
            {plant.perennial && (
              <Pill label="Perennial" bg={BRAND.chipBg} color={BRAND.textMuted} />
            )}
            {plant.trellisRequired && (
              <Pill label="🪜 Support" bg={BRAND.chipBg} color={BRAND.textMuted} />
            )}
            {plant.pots === 'contain' && (
              <Pill label="🪴 Pot to contain" bg="#fff3cd" color="#856404" />
            )}
            {plant.pots === 'suitable' && (
              <Pill label="🪴 Pot friendly" bg="#d1f0d8" color="#1a5e2a" />
            )}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ALL_CATEGORIES = ['All', ...getCategories()];

const HABIT_FILTERS = [
  { label: '🪴 Climber / Vine', value: 'climber' },
  { label: '⬆️ Upright',        value: 'upright' },
  { label: '↔️ Spreading',      value: 'spreading' },
  { label: '🌿 Bush',           value: 'bush' },
  { label: '🌀 Rosette',        value: 'rosette' },
];

const TYPE_FILTERS = [
  { label: 'Determinate',        value: 'determinate' },
  { label: 'Indeterminate',      value: 'indeterminate' },
  { label: '♻️ Perennial',      value: 'perennial' },
  { label: '✅ N Fixer',         value: 'fixer' },
  { label: '🪜 Support',         value: 'trellis' },
  { label: '🪴 Pot friendly',    value: 'pot_suitable' },
  { label: '🪴 Pot to contain',  value: 'pot_contain' },
];

export default function PlantsScreen() {
  const [search, setSearch]               = useState('');
  const [category, setCategory]           = useState('All');
  const [habitFilter, setHabitFilter]     = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [showVarieties, setShowVarieties] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const results = useMemo(() => {
    let plants = searchPlants(search, category === 'All' ? undefined : category);
    if (habitFilter === 'climber') plants = plants.filter((p) => p.growthHabit === 'climbing' || p.growthHabit === 'vine');
    else if (habitFilter) plants = plants.filter((p) => p.growthHabit === habitFilter);
    if (typeFilter === 'determinate')   plants = plants.filter((p) => p.growthType === 'determinate');
    else if (typeFilter === 'indeterminate') plants = plants.filter((p) => p.growthType === 'indeterminate');
    else if (typeFilter === 'perennial') plants = plants.filter((p) => p.perennial);
    else if (typeFilter === 'fixer')    plants = plants.filter((p) => p.nitrogen === 'fixer');
    else if (typeFilter === 'trellis')       plants = plants.filter((p) => p.trellisRequired);
    else if (typeFilter === 'pot_suitable') plants = plants.filter((p) => p.pots === 'suitable');
    else if (typeFilter === 'pot_contain')  plants = plants.filter((p) => p.pots === 'contain');
    if (!showVarieties) plants = plants.filter((p) => !p.isVariety);
    return plants;
  }, [search, category, habitFilter, typeFilter, showVarieties]);

  const varietyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of searchPlants('')) {
      if (p.parentId) map.set(p.parentId, (map.get(p.parentId) ?? 0) + 1);
    }
    return map;
  }, []);

  const activeFiltersCount = [category !== 'All', !!habitFilter, !!typeFilter, showVarieties].filter(Boolean).length;

  function clearFilters() {
    setCategory('All');
    setHabitFilter('');
    setTypeFilter('');
    setShowVarieties(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bg }}>

      {/* ── Header ── */}
      <View style={styles.screenHeader}>
        <Image
          source={require('../../assets/images/banner.png')}
          style={styles.bannerImage}
          resizeMode="contain"
        />
        <View style={styles.screenTitleRow}>
          <Text style={styles.screenSubtitle}>
            {results.length} plants{activeFiltersCount > 0 ? ` · ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active` : ''}
          </Text>
          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants, uses, flavour..."
            placeholderTextColor={BRAND.textLight}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
              <Text style={styles.searchClearText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {ALL_CATEGORIES.map((c) => {
            const active = category === c;
            const t = c === 'All' ? { bg: BRAND.highlight, text: '#fff' } : catTheme(c);
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                activeOpacity={0.75}
                style={[styles.catChip, active
                  ? { backgroundColor: t.bg, shadowColor: t.bg, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 }
                  : styles.catChipInactive
                ]}
              >
                {c !== 'All' && (
                  CATEGORY_ICONS[c]
                    ? <Image source={CATEGORY_ICONS[c]} style={styles.catChipIcon} resizeMode="contain" />
                    : <Text style={styles.catChipEmoji}>{CATEGORY_EMOJI[c] ?? ''}</Text>
                )}
                <Text style={[styles.catChipText, { color: active ? (c === 'All' ? '#fff' : t.text) : BRAND.textMuted }]}>
                  {c === 'All' ? 'All' : c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Habit + Type + Varieties chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          {HABIT_FILTERS.map((f) => (
            <FilterChip key={f.value} label={f.label} active={habitFilter === f.value}
              onPress={() => setHabitFilter(habitFilter === f.value ? '' : f.value)} />
          ))}
          <View style={styles.filterDivider} />
          {TYPE_FILTERS.map((f) => (
            <FilterChip key={f.value} label={f.label} active={typeFilter === f.value}
              onPress={() => setTypeFilter(typeFilter === f.value ? '' : f.value)} />
          ))}
          <View style={styles.filterDivider} />
          <FilterChip label="+ Varieties" active={showVarieties} onPress={() => setShowVarieties(!showVarieties)} />
        </ScrollView>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: BRAND.border }} />

      {/* ── Grid ── */}
      {results.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🌾</Text>
          <Text style={{ color: BRAND.text, fontWeight: '600', fontSize: 16, marginBottom: 4 }}>No plants found</Text>
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginBottom: 20 }}>Try adjusting your filters</Text>
          <TouchableOpacity onPress={clearFilters} style={[styles.filterChipActive, styles.filterChip, { paddingHorizontal: 20, paddingVertical: 10 }]}>
            <Text style={styles.filterChipTextActive}>Clear all filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: CARD_PADDING, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
          renderItem={({ item }) => (
            <PlantCard
              plant={item}
              varietyCount={varietyCounts.get(item.id) ?? 0}
              onPress={() => setSelectedPlant(item)}
            />
          )}
        />
      )}

      <PlantDetailModal
        plant={selectedPlant}
        onClose={() => setSelectedPlant(null)}
        onSelectPlant={(p) => setSelectedPlant(p)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  screenHeader: {
    backgroundColor: BRAND.bg,
    paddingTop: 8,
    paddingBottom: 10,
  },
  bannerImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1584 / 672,
    marginBottom: 8,
  },
  screenTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  screenSubtitle: {
    fontSize: 12,
    fontFamily: FONT,
    color: BRAND.textLight,
    marginTop: 2,
  },
  clearBtn: {
    backgroundColor: BRAND.highlight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontFamily: FONT,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f0e8',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 20,
    color: BRAND.textLight,
    marginRight: 8,
    lineHeight: 22,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT,
    color: BRAND.text,
  },
  searchClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BRAND.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  searchClearText: {
    fontSize: 14,
    color: BRAND.textMuted,
    lineHeight: 16,
  },

  // Category chips
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  catChipInactive: {
    backgroundColor: '#f0ece2',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  catChipEmoji: {
    fontSize: 14,
  },
  catChipIcon: {
    width: 16,
    height: 16,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: FONT,
    fontWeight: '600',
  },

  // Filter chips (habit/type row)
  filterChip: {
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  filterChipActive: {
    backgroundColor: BRAND.highlight,
  },
  filterChipInactive: {
    backgroundColor: '#f0ece2',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: FONT,
    fontWeight: '500',
  },
  filterChipTextActive:   { color: '#fff' },
  filterChipTextInactive: { color: BRAND.textMuted },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: BRAND.border,
    alignSelf: 'center',
    marginHorizontal: 2,
  },

  // List card (single column, horizontal layout)
  plantCard: {
    backgroundColor: 'transparent',
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardImage: {
    width: 140,
    height: 140,
    flexShrink: 0,
    borderRadius: 18,
  },
  cardEmojiBlock: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: 18,
  },
  cardEmoji: {
    fontSize: 60,
  },
  categoryTag: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  categoryTagText: {
    fontSize: 10,
    fontFamily: FONT,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  plantName: {
    fontSize: 18,
    fontFamily: FONT,
    fontWeight: '700',
    color: BRAND.text,
    lineHeight: 23,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: FONT,
    color: BRAND.textMuted,
    lineHeight: 19,
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickStat: {
    fontSize: 11,
    fontFamily: FONT,
    color: BRAND.textMuted,
  },
  quickStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  quickStatImg: {
    width: 13,
    height: 13,
  },
  chevron: {
    color: '#d1d5db',
    fontSize: 22,
    marginLeft: 8,
    alignSelf: 'center',
  },

  // Pills
  pill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 11,
    fontFamily: FONT,
    fontWeight: '500',
  },

  // Image column (left of three-column layout)
  imageCol: {
    width: 800,
    flexShrink: 0,
    alignSelf: 'center',
  },
  colImage: {
    width: '100%',
    flex: 1,
    borderRadius: 12,
    minHeight: 120,
  },
  colImageEmoji: {
    width: '100%',
    flex: 1,
    minHeight: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Close / breadcrumb
  closeBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  closeBtnText: {
    fontSize: 15,
    fontFamily: FONT,
    color: BRAND.text,
    fontWeight: '700',
    lineHeight: 18,
  },
  breadcrumbBtn: {
    position: 'absolute',
    top: 20,
    left: 60,
    zIndex: 10,
  },
  breadcrumb: {
    fontSize: 14,
    fontFamily: FONT,
    color: BRAND.text,
    fontWeight: '600',
  },

  // Modal body
  modalBody: {
    paddingHorizontal: 90,
    paddingTop: 94,
    paddingBottom: 90,
    borderRadius: 24,
  },

  // Title section
  titleSection: {
    marginBottom: 16,
  },
  heroName: {
    fontSize: 36,
    fontFamily: FONT,
    fontWeight: '800',
    color: BRAND.text,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  heroFamily: {
    fontSize: 14,
    fontFamily: FONT,
    color: BRAND.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },

  dividerLine: {
    height: 1,
    backgroundColor: BRAND.border,
    marginBottom: 18,
  },

  // Two-column layout
  twoCol: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 4,
  },
  col: {
    flex: 1,
  },
  colDivider: {
    width: 1,
    backgroundColor: BRAND.border,
    marginHorizontal: 16,
  },
  colSubhead: {
    fontSize: 13,
    fontFamily: FONT,
    fontWeight: '700',
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  colDescription: {
    fontSize: 12,
    fontFamily: FONT,
    color: BRAND.text,
    lineHeight: 18,
    marginBottom: 3,
  },

  // Stat rows (almanac list style)
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  statRowIcon: {
    width: 18,
    alignItems: 'center',
  },
  statRowLabel: {
    fontSize: 12,
    fontFamily: FONT,
    color: BRAND.textMuted,
    flex: 1,
  },
  statRowValue: {
    fontSize: 12,
    fontFamily: FONT,
    fontWeight: '600',
    color: BRAND.text,
  },

  // Calendar section
  calendarSection: {
    marginTop: 20,
    marginBottom: 4,
  },

  // Section header
  sectionHeader: {
    fontSize: 11,
    fontFamily: FONT,
    fontWeight: '700',
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Month calendar grid
  calCell: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellText: {
    fontSize: 11,
    fontFamily: FONT,
    fontWeight: '700',
  },

  // Nitrogen
  nitrogenRow: {
    marginTop: 12,
    borderLeftWidth: 2,
    paddingLeft: 8,
  },
  nitrogenTitle: {
    fontSize: 12,
    fontFamily: FONT,
    fontWeight: '700',
    marginBottom: 2,
  },
  nitrogenDesc: {
    fontSize: 11,
    fontFamily: FONT,
    color: BRAND.textMuted,
    lineHeight: 16,
  },

  // Companion planting
  companionSubhead: {
    fontSize: 12,
    fontFamily: FONT,
    color: BRAND.textLight,
    marginBottom: 8,
    fontWeight: '500',
  },

  // Care tips
  notesText: {
    fontSize: 14,
    fontFamily: FONT,
    color: BRAND.textMuted,
    lineHeight: 21,
  },

  // Characteristics
  charRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  charIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
    marginTop: 1,
  },
  charLabel: {
    fontSize: 11,
    fontFamily: FONT,
    color: BRAND.textLight,
    fontWeight: '500',
    marginBottom: 1,
  },
  charValue: {
    fontSize: 13,
    fontFamily: FONT,
    color: BRAND.text,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Varieties
  varietiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  varietiesTitle: {
    fontSize: 11,
    fontFamily: FONT,
    fontWeight: '700',
    color: BRAND.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  varietiesCount: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  varietiesCountText: {
    fontSize: 12,
    fontFamily: FONT,
    fontWeight: '700',
  },
  varietyCard: {
    backgroundColor: BRAND.cardBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  varietyEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  varietyName: {
    fontSize: 14,
    fontFamily: FONT,
    fontWeight: '600',
    color: BRAND.text,
  },
  varietyBestUse: {
    fontSize: 11,
    fontFamily: FONT,
    color: BRAND.textLight,
    marginTop: 4,
  },
});
