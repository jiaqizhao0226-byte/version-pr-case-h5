with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Let's fix the newline character problem. Python's raw string is still causing a literal newline in the JS output.
# We will read the JS, find the split('...') and replace it with split('\\n')

lines = js.split('\n')
for i, line in enumerate(lines):
    if "crit = crit.split(" in line:
        lines[i] = "              crit = crit.split('\\n').join('<br>');"

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write('\n'.join(lines))
