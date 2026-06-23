import json

with open('/tmp/version-pr-case-h5/cases/luoke-s2.json', 'r') as f:
    data = json.load(f)

mindsets = data['data']['analysis']['player_mindset']

# Find and update the gender issue mindset
for i, m in enumerate(mindsets):
    if '女性玩家的“代表性”' in m or '性别议题叠加' in m:
        mindsets[i] = "**性别议题叠加下的双向撕扯与话语权争夺**：争议中很大一部分来自于“女洛克专属战败动作被和谐/修改”。这不仅被部分女性玩家视为“官方不尊重女性角色、剥夺女性特权”；与此同时，部分男性玩家则认为官方此举是在刻意迎合女性群体、“打女拳”，对策划这种疑似偏袒的修改感到极度反感与失望。这种双向的情绪投射，让原本的体验改动迅速上升为极其惨烈的社区性别对立战。"
        break

data['data']['analysis']['player_mindset'] = mindsets

with open('/tmp/version-pr-case-h5/cases/luoke-s2.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
