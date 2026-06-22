import re
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# I see what happened, function openCase got wiped out in the last rewrite.
# Let's insert it before route.
insert_idx = js.find('async function route()')
if insert_idx != -1 and 'function openCase' not in js:
    js = js[:insert_idx] + "function openCase(id){location.hash=`case=${id}`;} function goHome(){location.hash='';}\n\n" + js[insert_idx:]

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
