with open('/tmp/version-pr-case-h5/FRAMEWORK.md', 'r') as f:
    lines = f.read().split('\n')

# Find where to insert the 4th category
insert_idx = -1
for i, line in enumerate(lines):
    if "3. **🧊 隐性流失（高伤害 + 低声量）**" in line:
        # found category 3, find end of it
        pass
    if "## 二、 玩家声音定性分析" in line:
        insert_idx = i
        break

if insert_idx != -1:
    new_cat = [
        "4. **🩹 常规客诉（低伤害 + 低声量）**",
        "   - **特征**：小范围的Bug抱怨、普通福利不足等，不影响核心体验，也没有引发全网串联。",
        "   - **公关应对**：通过客服或常态化的蓝底白字公告进行常规补偿和修复即可，无需大动干戈占用核心资源。",
        ""
    ]
    lines = lines[:insert_idx] + new_cat + lines[insert_idx:]

with open('/tmp/version-pr-case-h5/FRAMEWORK.md', 'w') as f:
    f.write('\n'.join(lines))
