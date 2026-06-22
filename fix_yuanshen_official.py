import json

with open('/tmp/version-pr-case-h5/cases/yuanshen-longwang.json', 'r') as f:
    data = json.load(f)

# Update official action
data['data']['analysis']['official_action'] = {
    "judgement": "极其罕见的“光速滑跪+天价补偿”，打破了米哈游以往“冷处理/不认错”的刻板印象，展现了官方对流水底盘和核心资产极高的敏感度。",
    "stages": [
        {
            "action": "4.8版本公告“修复”高速旋转异常 (7月17日)",
            "content": "以修复Bug的名义，限制了那维莱特的旋转速度和判定范围。",
            "result": "❌ 引发全网暴动 / 商业欺诈指控",
            "critique": "最大的失误在于“时机”和“对象”。该机制已随角色售卖长达10个月并复刻，玩家早已将其视为角色的核心商业价值。在临近新国家版本时强行削弱老卡，直接触碰了二次元玩家“角色强度保值”的底线，引发了12315维权潮。"
        },
        {
            "action": "连夜发布《道歉说明》并回退修改 (7月18日凌晨)",
            "content": "承认“无论本意是什么，都伤害了大家的信任”，宣布完全回退修复，并全服补偿1600原石（10连抽）。",
            "result": "✅ 瞬间扭转风向，玩家失忆",
            "critique": "操作极其果断，其成功在于：\n1. **黄金时间止损**：在舆论还停留在情绪发泄、尚未演变成实质性大面积弃坑和流水暴跌前（24小时内），果断切断了负面循环。\n2. **超额的利益对冲**：打破常规的“100-300原石”补偿，直接给出了极具视觉冲击力的“10连抽”。这不仅弥补了感情伤害，甚至让玩家产生了“赚到了”的心理，导致社区风向瞬间从维权变成“感谢龙王爆金币”。"
        }
    ]
}

with open('/tmp/version-pr-case-h5/cases/yuanshen-longwang.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
