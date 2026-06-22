import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

nav_html = """
  <header class="top">
    <div class="brand">
      <div class="logo"></div>
      <div>
        <h1>游戏版本舆情案例库</h1>
        <div class="sub">14 个典型游戏舆情案例深挖与公关复盘</div>
      </div>
    </div>
    <div class="pill">Dashboard / case detail / H5</div>
  </header>

  <nav class="mainNav">
    <button onclick="switchMainTab('dashboard')" id="nav-dashboard" class="active">案例库大盘</button>
    <button onclick="switchMainTab('mapping')" id="nav-mapping">全部案例 Mapping</button>
    <button onclick="switchMainTab('conclusions')" id="nav-conclusions">结论与标签梳理</button>
  </nav>

  <main id="mapping" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>全部案例 Mapping (伤害与声量分布)</h2>
      <p class="muted">预留空间：后续将在这里填入案例的声量与伤害分布矩阵、玩家真实声音与噪音的区分、以及核心体验影响度分析。</p>
    </section>
  </main>

  <main id="conclusions" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>结论梳理与核心矛盾标签</h2>
      <p class="muted">预留空间：后续将在这里梳理提炼出的公关标签（如“核心资产剥夺”、“性别争议”等），并针对官方实际PR动作进行“得与失”的横向对比与总结。</p>
    </section>
  </main>
"""

# Replace existing header with new header + nav + new mains
html = re.sub(r'<header class="top">[\s\S]*?</header>', nav_html, html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
