import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Replace "事后诸葛亮" references
js = re.sub(r'官方动作复盘与事后诸葛亮', '官方动作复盘与应对启发', js)
js = re.sub(r'PR应对建议 \(事后诸葛亮\) 与核心启发', 'PR 应对建议与核心启发', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
