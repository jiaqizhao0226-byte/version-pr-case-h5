import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Insert matrixChartContainer into the mapping tab
matrix_html = """
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>全部案例 Mapping (伤害与声量 2x2 矩阵)</h2>
      <p class="muted">横轴代表舆情声量（低 -> 高），纵轴代表商业伤害（低 -> 高）。点击气泡可直接进入案例详情复盘。</p>
    </section>
    <section id="matrixChartContainer" style="margin-bottom: 24px;"></section>
"""

html = re.sub(r'<section class="card heroMain" style="margin-bottom:20px;">[\s\S]*?</section>', matrix_html.strip(), html, count=1)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
