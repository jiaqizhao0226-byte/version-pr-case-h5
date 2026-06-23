import json
import os

cases_dir = '/tmp/version-pr-case-h5/cases/'
registry_file = '/tmp/version-pr-case-h5/data/cases.json'

with open(registry_file, 'r') as f:
    registry = json.load(f)

# Get current ids in registry
existing_ids = {c['id']: c for c in registry}

new_registry = []

# Base meta structure mapping to reconstruct index entries
mapping_meta = {
    "luoke-s2": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "核心机制剥夺, 透明度缺失", "pr_eval": "较差 (补偿失效，回应避重就轻)"},
    "sanjiaozhou-jail": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "玩法契约破坏, 官方教玩游戏", "pr_eval": "较差 (冷处理导致不信任)"},
    "shijiezhiwai-money": {"voice_nature": "真实痛点", "core_exp": "否 (核心是价格)", "core_tag": "逼氪背刺, 官方发疯", "pr_eval": "灾难 (公关直言'想赚钱'，自毁长城)"},
    "lianyu-mechanic": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "商业欺诈, 核心机制缺失", "pr_eval": "灾难 (傲慢导致律师函警告)"},
    "lianyu-scale": {"voice_nature": "圈层杂音/道德审判", "core_exp": "否", "core_tag": "性别争议, 破圈反噬", "pr_eval": "优秀 (稳坐钓鱼台，保护核心圈层)"},
    "fengzhigu-refund": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "数值欺诈", "pr_eval": "狠辣 (全额退款换封号，切断法律风险)"},
    "benghuai-rabbit": {"voice_nature": "真实痛点 (情感)", "core_exp": "是", "core_tag": "区别对待, 情感背叛/OOC", "pr_eval": "极差 (装死一个月，错失黄金公关期)"},
    "yuanshen-longwang": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "变相削弱", "pr_eval": "极佳 (24小时光速滑跪+史无前例10连抽)"},
    "yuanshen-1year": {"voice_nature": "真实痛点", "core_exp": "否 (福利预期)", "core_tag": "预期管理失败", "pr_eval": "被动 (全球差评后紧急妥协送翅膀)"},
    "mingchao-1.0": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "开服灾难, 价值观错位", "pr_eval": "有效 (卑微滑跪+自选五星强行续命)"},
    "apex-bp": {"voice_nature": "真实痛点", "core_exp": "否", "core_tag": "战令经济学, 强制氪金", "pr_eval": "较差 (试探底线被差评轰炸后被迫撤回)"},
    "diablo4-p11": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "教玩家玩游戏, 无差别削弱", "pr_eval": "有效 (篝火夜谈真诚认错并改大纲)"},
    "oncehuman-season": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "赛季清零, 资产安全感", "pr_eval": "极佳 (光速改底层规则，顺应玩家诉求)"},
    "yanyun-female": {"voice_nature": "圈层争议", "core_exp": "否", "core_tag": "性别对立, 违背初心", "pr_eval": "被动 (试图两头讨好，最终两头挨骂)"},
    "yanyun-jiujian": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "平衡调整, 按闹分配", "pr_eval": "双刃剑 (光速滑跪但催生了按闹分配的毒瘤生态)"},
    "dnf-mobile-dragon": {"voice_nature": "真实痛点", "core_exp": "是", "core_tag": "粗暴执法, 平民利益", "pr_eval": "较差 (削本保日活正确，但用封号掩盖Bug傲慢)"}
}

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

# Iterate through all files in cases/ to rebuild the registry
for file in os.listdir(cases_dir):
    if file.endswith('.json'):
        with open(os.path.join(cases_dir, file), 'r') as f:
            case_data = json.load(f)
            
        c_id = case_data.get('id')
        
        # If it's an old complex case with `data`, we might need some basic metadata fallback
        # or we just rely on what we can find
        
        # Determine some basic fields if not already in index
        title = case_data.get('title', c_id)
        
        # Try to pull company and market from existing registry if possible, else default
        existing = existing_ids.get(c_id, {})
        
        entry = {
            "id": c_id,
            "title": title,
            "game": existing.get('game', title.split('-')[0]),
            "company": existing.get('company', 'Unknown'),
            "market": existing.get('market', 'Unknown'),
            "time": existing.get('time', 'Unknown'),
            "lifecycle": existing.get('lifecycle', ''),
            "type": existing.get('type', ''),
            "volume": existing.get('volume', 'S'),
            "damage": existing.get('damage', 'A'),
            "status": "已深挖样例",
            "tags": tag_mapping.get(c_id, existing.get('tags', [])),
            "summary": case_data.get('summary', existing.get('summary', '该案例已入库，包含详细的时间线和深度还原。')),
            "mapping": mapping_meta.get(c_id, {}),
            "caseFile": f"./cases/{file}"
        }
        
        new_registry.append(entry)

with open(registry_file, 'w', encoding='utf-8') as f:
    json.dump(new_registry, f, ensure_ascii=False, indent=2)

print("Registry rebuilt with", len(new_registry), "cases")
