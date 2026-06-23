import json

# Oh I see! The previous bug with "Unknown" metadata restoration accidentally reset ALL volumes to "S" and ALL damages to "A" (or whatever the default was)!
# Let's restore the ACTUAL damage and volume from the original mapping data.

meta_dict = {
    "luoke-s2": {"volume": "S", "damage": "A/S"},
    "sanjiaozhou-jail": {"volume": "S", "damage": "S"},
    "shijiezhiwai-money": {"volume": "S", "damage": "S"},
    "lianyu-mechanic": {"volume": "S", "damage": "S"},
    "lianyu-scale": {"volume": "S", "damage": "B"},
    "fengzhigu-refund": {"volume": "A", "damage": "S"},
    "benghuai-rabbit": {"volume": "S", "damage": "S"},
    "yuanshen-longwang": {"volume": "S", "damage": "A"},
    "yuanshen-1year": {"volume": "S", "damage": "A"},
    "mingchao-1.0": {"volume": "S", "damage": "A"},
    "apex-bp": {"volume": "S", "damage": "S"},
    "diablo4-p11": {"volume": "S", "damage": "S"},
    "oncehuman-season": {"volume": "A", "damage": "A"},
    "yanyun-female": {"volume": "S", "damage": "B"},
    "yanyun-jiujian": {"volume": "A", "damage": "B/A"},
    "dnf-mobile-dragon": {"volume": "A", "damage": "B/A"}
}

with open('/tmp/version-pr-case-h5/data/cases.json', 'r') as f:
    cases = json.load(f)

for c in cases:
    c_id = c.get('id')
    if c_id in meta_dict:
        c['volume'] = meta_dict[c_id]['volume']
        c['damage'] = meta_dict[c_id]['damage']

with open('/tmp/version-pr-case-h5/data/cases.json', 'w', encoding='utf-8') as f:
    json.dump(cases, f, ensure_ascii=False, indent=2)

