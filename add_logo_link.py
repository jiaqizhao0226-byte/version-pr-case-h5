import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Make the brand logo and title clickable to go home
new_brand = """    <div class="brand" style="cursor: pointer;" onclick="goHome()">
      <div class="logo"></div>
      <div>
        <h1>游戏版本舆情洞察与案例库</h1>
        <div class="sub">14 个典型游戏舆情案例深挖与公关复盘</div>
      </div>
    </div>"""

html = re.sub(r'<div class="brand">[\s\S]*?</div>\n    </div>', new_brand, html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
