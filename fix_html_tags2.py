import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Fix the duplicate conclusions main and the stray </section>
html = html.replace("""  <main id="conclusions" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>结论梳理与核心矛盾标签</h2>
      <p class="muted">预留空间：后续将在这里梳理提炼出的公关标签（如“核心资产剥夺”、“性别争议”等），并针对官方实际PR动作进行“得与失”的横向对比与总结。</p>
    </section>
  </main>

""", "", 1)

html = html.replace("""    </section>

    <div class="sectionTitle"><h2>案例格子</h2><div class="count" id="resultCount"></div></div>""", """    <div class="sectionTitle"><h2>案例格子</h2><div class="count" id="resultCount"></div></div>""")

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
