import json

with open('/tmp/version-pr-case-h5/cases/luoke-s2.json', 'r') as f:
    data = json.load(f)

# Update official action
data['data']['analysis']['official_action'] = {
    "judgement": "前期的傲慢险些酿成大祸，最终靠着后期教科书级别的“主策出镜+背锅+清单+厚礼”组合拳完成了史诗级挽尊。",
    "stages": [
        {
            "action": "首次长文图文公告 (5月25日)",
            "content": "辩称大量改动是“修复Bug”或“正常优化”，并给出了一定补偿。",
            "result": "❌ 严重翻车 / 火上浇油",
            "critique": "官方试图用“合理性”来掩盖“程序非正义（未提前公告）”。玩家的核心愤怒是“你剥夺了我的知情权”，而公告却在狡辩“我是为了你好”，导致沟通错位。叠加补偿方案中夹带私货（部分玩家无法领取），直接坐实了玩家心中“傲慢、把玩家当傻子”的负面印象。"
        },
        {
            "action": "主策“开水哥”亲自出镜视频道歉与详尽清单 (5月26日)",
            "content": "放弃公关辞令，主策出面承认是“版本分支合并错误”导致的研发事故；同步放出精准到每个动作细节的修复核对清单；全服发放高额无门槛实装补偿。",
            "result": "✅ 成功平息舆论",
            "critique": "这套组合拳之所以能让玩家原谅，核心在于：\n1. **转移矛盾定性**：用“工业管理事故（证明自己菜）”成功阻断了玩家对“官方主观恶意暗改逼氪（证明自己坏）”的阴谋论猜忌。\n2. **情绪价值拉满**：在严重的信任危机前，真实的“人”出来挨骂比冰冷的“蓝底白字”更能消耗社区戾气。\n3. **重建安全感**：详尽的修复清单和没有套路的厚礼，让玩家看到了“不再暗改”的实质性担保。"
        }
    ]
}

with open('/tmp/version-pr-case-h5/cases/luoke-s2.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
