import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Fix the duplicated replace block in the template literal
bad_str = r"${s.critique.replace(/\\n/g, '<br>').replace(/\\\*\\\*(.*?)\\\*\\\*/g, '<b style=\"color:#000;\">$1</b>')}\n/g, '<br>').replace(/\\\*\\\*(.*?)\\\*\\\*/g, '<b style=\"color:#000;\">$1</b>')}"

# Look at the exact lines to fix it cleanly
lines = js.split('\n')
for i, line in enumerate(lines):
    if "深度拆解：" in line:
        lines[i] = "                  <b style=\"color:var(--blue); display:block; margin-bottom:4px;\">深度拆解：</b>${s.critique.replace(/\\n/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<b style=\"color:#000;\">$1</b>')}"
    if "/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<b style=\"color:#000;\">$1</b>')}" in line:
        lines[i] = ""

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write('\n'.join(lines))
