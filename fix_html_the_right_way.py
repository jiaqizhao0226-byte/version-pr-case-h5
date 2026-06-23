with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Let's completely clean up the dashboard main block to ensure valid HTML
dashboard_html = """  <main id="dashboard">
    <section class="hero">
      <div class="card heroMain">
        <h2>版本舆情案例Dashboard</h2>
        <p>当前首页已接入多个已深挖案例，用于验证信息架构、对比阅读体验与跨案例复盘逻辑。后续可继续按同一模板扩展更多案例。</p>
        <div class="notice">筛选器与案例卡片均已支持多案例浏览；后续扩展时，只需要新增 cases/*.json 并更新 data/cases.json。</div>
      </div>
      <div class="stats" id="stats"></div>
    </section>

    <section class="panel filters">
      <div class="filterGrid">
        <input id="q" class="control" placeholder="搜索案例、标签、游戏名" />
        <select id="matrix" class="control"><option value="">全部声量与伤害</option></select>
        <select id="voice_nature" class="control"><option value="">全部声音性质</option></select>
        <select id="core_tag" class="control"><option value="">全部核心矛盾标签</option></select>
      </div>
    </section>

    <div class="sectionTitle"><h2>案例格子</h2><div class="count" id="resultCount"></div></div>
    <section class="caseGrid" id="caseGrid"></section>
  </main>"""

import re
html = re.sub(r'<main id="dashboard">[\s\S]*?</main>', dashboard_html, html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
