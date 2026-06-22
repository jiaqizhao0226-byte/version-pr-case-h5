import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Fix duplicates of <main id="mapping"> and <main id="conclusions">
html = re.sub(r'<main id="mapping" style="display:none">[\s\S]*?</main>\s*<main id="conclusions" style="display:none">[\s\S]*?</main>', '', html, count=1)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
