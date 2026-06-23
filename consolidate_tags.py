import json

# Define the consolidated tag set
tag_consolidation = {
    "luoke-s2": ["核心资产剥夺/暗改", "体验硬伤/预期管理失败", "公关装死/傲慢", "性别与擦边议题"],
    "sanjiaozhou-jail": ["教玩家玩游戏 (削弱爽感)", "价值观/圈层冲突", "公关装死/傲慢"],
    "shijiezhiwai-money": ["商业契约撕毁/逼氪", "公关装死/傲慢"],
    "lianyu-mechanic": ["核心资产剥夺/暗改", "商业契约撕毁/逼氪", "破圈反噬/极端维权"],
    "lianyu-scale": ["价值观/圈层冲突", "性别与擦边议题", "破圈反噬/极端维权"],
    "fengzhigu-refund": ["核心资产剥夺/暗改", "破圈反噬/极端维权", "光速滑跪/天价补偿"],
    "benghuai-rabbit": ["情感背叛/OOC", "公关装死/傲慢"],
    "yuanshen-longwang": ["核心资产剥夺/暗改", "光速滑跪/天价补偿"],
    "yuanshen-1year": ["体验硬伤/预期管理失败", "破圈反噬/极端维权", "光速滑跪/天价补偿"],
    "mingchao-1.0": ["体验硬伤/预期管理失败", "价值观/圈层冲突", "光速滑跪/天价补偿"],
    "apex-bp": ["商业契约撕毁/逼氪", "破圈反噬/极端维权", "光速滑跪/天价补偿"],
    "diablo4-p11": ["教玩家玩游戏 (削弱爽感)", "光速滑跪/天价补偿"],
    "oncehuman-season": ["商业契约撕毁/逼氪", "光速滑跪/天价补偿"],
    "yanyun-female": ["价值观/圈层冲突", "性别与擦边议题", "情感背叛/OOC"],
    "yanyun-jiujian": ["教玩家玩游戏 (削弱爽感)", "破圈反噬/极端维权", "光速滑跪/天价补偿"],
    "dnf-mobile-dragon": ["教玩家玩游戏 (削弱爽感)", "价值观/圈层冲突", "公关装死/傲慢"]
}

# 1. Update data/cases.json
with open('/tmp/version-pr-case-h5/data/cases.json', 'r') as f:
    cases = json.load(f)

for c in cases:
    if c['id'] in tag_consolidation:
        c['tags'] = tag_consolidation[c['id']]

with open('/tmp/version-pr-case-h5/data/cases.json', 'w', encoding='utf-8') as f:
    json.dump(cases, f, ensure_ascii=False, indent=2)

