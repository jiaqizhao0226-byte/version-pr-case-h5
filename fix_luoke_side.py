import json

with open('/tmp/version-pr-case-h5/cases/luoke-s2.json', 'r') as f:
    data = json.load(f)

for item in data['data']['timeline']:
    if '公告被逐句批驳' in item['event']:
        item['side'] = 'player'

with open('/tmp/version-pr-case-h5/cases/luoke-s2.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
