import json

meta_dict = {
    "luoke-s2": {"game": "洛克王国：世界", "company": "腾讯魔方工作室群", "market": "国内厂商×国内市场", "time": "2026-05", "lifecycle": "上线后首个大赛季 / S2赛季“狂欢怪谈”", "type": "暗改/版本质量事故/情感体验破坏/社区信任危机"},
    "sanjiaozhou-jail": {"game": "三角洲行动", "company": "腾讯琳琅天上工作室群", "market": "国内厂商×国内市场", "time": "2025-10", "lifecycle": "公测开服早期 / 国庆活动版本", "type": "涌现玩法干预/经济系统调控/平衡调整/规则剧烈变更"},
    "shijiezhiwai-money": {"game": "世界之外", "company": "网易游戏", "market": "国内厂商×国内市场", "time": "2025-07", "lifecycle": "公测半年后 / “召唤之王”版本", "type": "付费/商业化利益受损"},
    "lianyu-mechanic": {"game": "恋与深空", "company": "叠纸游戏", "market": "国内厂商×国内市场", "time": "2025-07", "lifecycle": "公测第一年稳定运营期", "type": "宣发实装契约+付费资产受损"},
    "lianyu-scale": {"game": "恋与深空", "company": "叠纸游戏", "market": "国内厂商×国内市场", "time": "2025-12", "lifecycle": "公测第一年稳定运营期", "type": "文化/身份节奏主导"},
    "fengzhigu-refund": {"game": "枫之谷：放置冒险记", "company": "Nexon", "market": "海外厂商×亚太/韩国市场", "time": "2026-01", "lifecycle": "公测初期（上线约2个月）", "type": "实质产品/数值问题+付费利益受损"},
    "benghuai-rabbit": {"game": "崩坏3", "company": "米哈游", "market": "国内厂商×全球市场", "time": "2021-03", "lifecycle": "成熟稳定期（四周年后）", "type": "文化/身份节奏主导"},
    "yuanshen-longwang": {"game": "原神", "company": "米哈游", "market": "国内厂商×全球市场", "time": "2024-07", "lifecycle": "稳定运营后期 (近四年)", "type": "实装后机制变更导致角色资产受损"},
    "yuanshen-1year": {"game": "原神", "company": "米哈游", "market": "国内厂商×全球市场", "time": "2021-09", "lifecycle": "爆款上升期（一周年庆）", "type": "运营福利预期落差"},
    "mingchao-1.0": {"game": "鸣潮", "company": "库洛游戏", "market": "国内厂商×全球市场", "time": "2024-05", "lifecycle": "公测初期 (1.0版本)", "type": "实质产品/版本质量问题"},
    "apex-bp": {"game": "Apex Legends", "company": "EA / Respawn", "market": "海外厂商×全球市场", "time": "2024-07", "lifecycle": "成熟衰退期 (第22赛季前)", "type": "付费/战令经济规则受损"},
    "diablo4-p11": {"game": "暗黑破坏神4", "company": "暴雪娱乐", "market": "海外厂商×全球市场", "time": "2023-07", "lifecycle": "上线初期 (S1第一赛季前)", "type": "实质玩法削弱/节奏变慢"},
    "oncehuman-season": {"game": "七日世界", "company": "网易 Starry Studio", "market": "国内厂商×全球市场", "time": "2024-07", "lifecycle": "公测开服期", "type": "规则解释/资产继承焦虑 & 付费权益受损"},
    "yanyun-female": {"game": "燕云十六声", "company": "网易游戏", "market": "国内厂商×国内市场", "time": "2025-12", "lifecycle": "上线半年后 (周年庆期间)", "type": "文化/身份节奏主导"},
    "yanyun-jiujian": {"game": "燕云十六声", "company": "网易游戏", "market": "国内厂商×国内市场", "time": "2025-02", "lifecycle": "公测初期 (新版本职业调整)", "type": "实质玩法削弱/平衡调整"},
    "dnf-mobile-dragon": {"game": "地下城与勇士：起源", "company": "腾讯游戏 / Nexon", "market": "国内厂商×国内市场", "time": "2025-08", "lifecycle": "稳定运营期", "type": "实质玩法削弱/平衡调整 & 测试运营公平问题"}
}

with open('/tmp/version-pr-case-h5/data/cases.json', 'r') as f:
    cases = json.load(f)

for c in cases:
    c_id = c.get('id')
    if c_id in meta_dict:
        meta = meta_dict[c_id]
        c['game'] = meta['game']
        c['company'] = meta['company']
        c['market'] = meta['market']
        c['time'] = meta['time']
        c['lifecycle'] = meta['lifecycle']
        c['type'] = meta['type']

with open('/tmp/version-pr-case-h5/data/cases.json', 'w', encoding='utf-8') as f:
    json.dump(cases, f, ensure_ascii=False, indent=2)

