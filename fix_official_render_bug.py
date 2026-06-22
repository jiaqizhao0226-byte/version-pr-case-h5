import re
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Fix the regex syntax error in the string replacement logic inside template literal
buggy_str = r"s\.critique\.replace\(/\\n/g, '<br>'\)\.replace\(/\\*\\*\(.*?\\)\\*\\*/g, '<b style=\"color:#000;\">\$1</b>'\)"
fixed_str = r"s.critique.replace(/\\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b style=\"color:#000;\">$1</b>')"

js = re.sub(buggy_str, fixed_str, js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
