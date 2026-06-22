import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Change the name of the 3rd tab to explicitly include "官方动作复盘"
js = re.sub(
    r"\['insight','事后诸葛亮与PR复盘'\]",
    "['insight','官方动作复盘与事后诸葛亮']",
    js
)
js = re.sub(
    r"insight:'事后诸葛亮与PR复盘'",
    "insight:'官方动作复盘与事后诸葛亮'",
    js
)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
