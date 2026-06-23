import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

grouped_filter_logic = """
  // Core Tags grouped
  const tagCategories = {
    '💰 利益受损 (硬核矛盾)': [
       '核心资产剥夺/暗改', 
       '商业契约撕毁/逼氪', 
       '教玩家玩游戏 (削弱爽感)', 
       '体验硬伤/预期管理失败'
    ],
    '🎭 情感与价值观 (文化冲突)': [
       '情感背叛/OOC', 
       '性别与擦边议题', 
       '价值观/圈层冲突'
    ],
    '⚔️ 公关应对与玩家反制': [
       '公关装死/傲慢', 
       '光速滑跪/天价补偿', 
       '破圈反噬/极端维权'
    ]
  };

  const tagEl = $('core_tag');
  tagEl.innerHTML = '<option value="">全部核心矛盾标签</option>';
  
  const allTags = uniq(caseSummaries.flatMap(c => c.tags || []));
  let placedTags = new Set();

  for (const [groupName, groupTags] of Object.entries(tagCategories)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;
    let added = false;
    groupTags.forEach(t => {
      if (allTags.includes(t)) {
        const o=document.createElement('option');o.value=t;o.textContent=t;optgroup.appendChild(o);
        placedTags.add(t);
        added = true;
      }
    });
    if (added) tagEl.appendChild(optgroup);
  }

  const orphanTags = allTags.filter(t => !placedTags.has(t));
  if (orphanTags.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '📌 其他标签';
    orphanTags.forEach(t => {
      const o=document.createElement('option');o.value=t;o.textContent=t;optgroup.appendChild(o);
    });
    tagEl.appendChild(optgroup);
  }
}
"""

js = re.sub(r"// Core Tags grouped[\s\S]*?\}\s*\n\nfunction bindFilters", grouped_filter_logic.strip() + "\n\nfunction bindFilters", js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
