with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Just a clean string replacement on the broken line
old_line = "                  <b style=\"color:var(--blue); display:block; margin-bottom:4px;\">深度拆解：</b>${s.critique.replace(/\\n/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<b style=\"color:#000;\">$1</b>')}"

new_line = """
                  <b style="color:var(--blue); display:block; margin-bottom:4px;">深度拆解：</b>${(s.critique||'').split('\\n').join('<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<b style="color:#000;">$1</b>')}
""".strip()

js = js.replace(old_line, new_line)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
