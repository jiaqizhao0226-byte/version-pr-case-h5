import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Make the badge explicitly say "伤害 S" or "伤害 A/S"
js = js.replace('<span class="badge ${sevClass(c.damage)}">${c.damage}</span>',
                '<span class="badge ${sevClass(c.damage)}" title="伤害等级">伤害 ${c.damage}</span>')

# Update cache-busting timestamp in HTML so CSS changes take effect immediately
with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()
html = re.sub(r'\?v=\d+-\d+', '?v=20260623-1600', html)
with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
