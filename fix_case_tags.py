import json

with open('/tmp/version-pr-case-h5/data/cases.json', 'r') as f:
    cases = json.load(f)

# Define the new unified tag framework
tag_mapping = {
    "luoke-s2": ["核心资产剥夺", "产品硬伤", "信任危机", "性别争议"],
    "sanjiaozhou-jail": ["教玩家玩游戏", "玩法契约破坏", "冷处理傲慢"],
    "shijiezhiwai-money": ["底层契约撕毁", "逼氪背刺", "发疯反噬", "商业化暴雷"],
    "lianyu-mechanic": ["核心资产剥夺", "商业欺诈", "律师函维权"],
    "lianyu-scale": ["价值观冲突", "破圈反噬", "软色情争议", "性别对立"],
    "fengzhigu-refund": ["核心资产剥夺", "数值造假", "法律风险", "全额退款"],
    "benghuai-rabbit": ["情感背叛/OOC", "区域区别对待", "公关装死"],
    "yuanshen-longwang": ["核心资产剥夺", "变相削弱", "光速滑跪", "天价补偿"],
    "yuanshen-1year": ["预期管理失败", "福利太抠", "全球差评轰炸"],
    "mingchao-1.0": ["产品硬伤", "价值观冲突", "天价补偿", "滑跪标杆"],
    "apex-bp": ["底层契约撕毁", "战令经济学", "强制法币氪金", "差评轰炸"],
    "diablo4-p11": ["教玩家玩游戏", "无差别削弱", "剥夺爽感", "直播道歉"],
    "oncehuman-season": ["底层契约撕毁", "资产清零焦虑", "光速改底座"],
    "yanyun-female": ["价值观冲突", "性别对立", "男凝争议", "违背初心"],
    "yanyun-jiujian": ["教玩家玩游戏", "职业削弱", "按闹分配", "光速滑跪"],
    "dnf-mobile-dragon": ["平民与硬核分歧", "粗暴执法封号", "暗改难度"]
}

for c in cases:
    if c['id'] in tag_mapping:
        c['tags'] = tag_mapping[c['id']]

with open('/tmp/version-pr-case-h5/data/cases.json', 'w', encoding='utf-8') as f:
    json.dump(cases, f, ensure_ascii=False, indent=2)

