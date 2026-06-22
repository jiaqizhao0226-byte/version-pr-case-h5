import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Add mappingTableContainer inside <main id="mapping">
new_mapping = """
  <main id="mapping" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>全部案例 Mapping (伤害与声量分布)</h2>
      <p class="muted">预留空间：后续将在这里填入案例的声量与伤害分布矩阵、玩家真实声音与噪音的区分、以及核心体验影响度分析。</p>
    </section>
    <section id="mappingTableContainer" style="overflow-x:auto; margin-bottom: 24px; box-shadow: var(--shadow); border-radius: 12px; border: 1px solid var(--line);"></section>
  </main>
"""

html = re.sub(r'<main id="mapping" style="display:none">[\s\S]*?</main>', new_mapping.strip(), html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
