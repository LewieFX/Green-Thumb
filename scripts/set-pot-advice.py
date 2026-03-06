import json

with open('e:/Projects/Garden App - Green Thumb/green-thumb/lib/plants.json', encoding='utf-8') as f:
    plants = json.load(f)

# pots: 'contain'  = grow in pots to prevent it taking over (invasive spreaders)
#       'suitable' = grows well in pots, good for balconies/small spaces

pot_advice = {
    # --- CONTAIN (invasive / spreads aggressively) ---
    'mint':             'contain',
    'lemon_balm':       'contain',
    'vietnamese_mint':  'contain',
    'horseradish':      'contain',
    'comfrey':          'contain',
    'chamomile':        'contain',   # self-seeds prolifically
    'chamomile_roman':  'contain',   # spreads via runners
    'nasturtium':       'contain',   # self-seeds everywhere
    'borage':           'contain',   # self-seeds aggressively
    'sorrel':           'contain',   # spreads readily
    'lemongrass':       'contain',   # large clumps, hard to remove
    'walking_onion':    'contain',   # topsets spread everywhere
    'tarragon':         'contain',   # spreads via rhizomes
    'oregano':          'contain',   # spreads aggressively
    'sweet_violet':     'contain',   # self-seeds prolifically
    'forget_me_not':    'contain',   # self-seeds everywhere

    # --- SUITABLE (thrives in pots / container-friendly) ---
    # Herbs
    'basil':            'suitable',
    'thai_basil':       'suitable',
    'chives':           'suitable',
    'chive_flowers':    'suitable',
    'coriander':        'suitable',
    'dill':             'suitable',
    'parsley':          'suitable',
    'thyme':            'suitable',
    'rosemary':         'suitable',
    'sage':             'suitable',
    'marjoram':         'suitable',
    'chervil':          'suitable',
    'summer_savory':    'suitable',
    'perilla':          'suitable',
    'stevia':           'suitable',
    'fenugreek':        'suitable',
    'nigella':          'suitable',
    'lavender':         'suitable',
    'makrut_lime':      'suitable',
    'ginger':           'suitable',
    'turmeric':         'suitable',
    'galangal':         'suitable',
    'pandan':           'suitable',
    'bay_laurel':       'suitable',
    'curry_leaf':       'suitable',
    'lemon_verbena':    'suitable',
    # Vegetables
    'cherry_tomato':    'suitable',
    'lettuce':          'suitable',
    'rocket':           'suitable',
    'spinach':          'suitable',
    'spring_onion':     'suitable',
    'radish':           'suitable',
    'shallot':          'suitable',
    'bok_choy':         'suitable',
    'pak_choy':         'suitable',
    'mizuna':           'suitable',
    'tatsoi':           'suitable',
    'asian_greens_mix': 'suitable',
    'beetroot':         'suitable',
    'capsicum':         'suitable',
    'chilli':           'suitable',
    'garlic':           'suitable',
    'pea':              'suitable',
    'snow_pea':         'suitable',
    'sugar_snap_pea':   'suitable',
    'silverbeet':       'suitable',
    'rainbow_chard':    'suitable',
    'mustard_greens':   'suitable',
    # Berries & fruit
    'strawberry':       'suitable',
    'strawberry_alpine':'suitable',
    'blueberry':        'suitable',
    'cranberry':        'suitable',
    'cumquat':          'suitable',
    'lime':             'suitable',
    'lemon':            'suitable',
    'mandarin':         'suitable',
    'fig':              'suitable',
    'feijoa':           'suitable',
    'acerola':          'suitable',
    'chilean_guava':    'suitable',
    'cape_gooseberry':  'suitable',
    'goji_berry':       'suitable',
    'lingonberry':      'suitable',
    # Flowers
    'calendula':        'suitable',
    'marigold':         'suitable',
    'agapanthus':       'suitable',
    'cosmos':           'suitable',
    'zinnia':           'suitable',
    'dianthus':         'suitable',
    'pansy_edible':     'suitable',
    'pansies_edible':   'suitable',
    'viola':            'suitable',
    'alyssum':          'suitable',
    'sweet_william':    'suitable',
    'scabiosa':         'suitable',
    'snapdragon':       'suitable',
    'gypsophila':       'suitable',
    'echinacea':        'suitable',
    'bee_balm':         'suitable',
}

updated = 0
for plant in plants:
    advice = pot_advice.get(plant['id'])
    if advice:
        plant['pots'] = advice
        updated += 1

with open('e:/Projects/Garden App - Green Thumb/green-thumb/lib/plants.json', 'w', encoding='utf-8') as f:
    json.dump(plants, f, ensure_ascii=False, indent=2)

from collections import Counter
pot_counts = Counter(p.get('pots', 'none') for p in plants)
print(f'Updated: {updated} plants')
print('Breakdown:', dict(pot_counts))
print()
print('Contain (invasive):')
for p in plants:
    if p.get('pots') == 'contain':
        print(f'  {p["name"]}')
print()
print('Suitable for pots:')
for p in plants:
    if p.get('pots') == 'suitable':
        print(f'  {p["name"]}')
