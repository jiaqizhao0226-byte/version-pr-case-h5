with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Instead of regex, just simple replace
old_str = "s.critique.replace(/\\n/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<b style=\"color:#000;\">$1</b>')"
new_str = "s.critique.replace(/\\n/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<b style=\"color:#000;\">$1</b>')"

# The actual issue in node -c:
# SyntaxError: Invalid regular expression: missing /
# Let's just find the exact line and replace it
lines = js.split('\n')
for i, line in enumerate(lines):
    if "深度拆解：" in line:
        lines[i] = "                  <b style=\"color:var(--blue); display:block; margin-bottom:4px;\">深度拆解：</b>${s.critique.replace(/\\n/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<b style=\"color:#000;\">$1</b>')}"

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write('\n'.join(lines))
