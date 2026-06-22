with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    lines = f.read().split('\n')

out = []
skip = False
for line in lines:
    if "').join('<br>');" in line and "crit = crit" not in line:
        continue # this is the stray bad line
    out.append(line)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write('\n'.join(out))
