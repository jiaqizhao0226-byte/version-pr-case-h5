import json
import os

cases_dir = '/tmp/version-pr-case-h5/cases'

official_keywords = ['官方', '主策', '公告', '补偿', '滑跪', '回应', '更新', 'EA', '暴雪', 'Respawn', 'Nexon']

for file in os.listdir(cases_dir):
    if file.endswith('.json'):
        path = os.path.join(cases_dir, file)
        with open(path, 'r') as f:
            data = json.load(f)
            
        if 'data' in data and 'timeline' in data['data']:
            for item in data['data']['timeline']:
                event_text = item.get('event', '') + item.get('description', '')
                is_official = any(k in event_text for k in official_keywords)
                # Specifically tag if it's primarily a player action
                if '玩家' in event_text and not any(k in item.get('event', '') for k in official_keywords):
                    item['side'] = 'player'
                elif is_official:
                    item['side'] = 'official'
                else:
                    item['side'] = 'player' # Default to player if unsure
                    
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

