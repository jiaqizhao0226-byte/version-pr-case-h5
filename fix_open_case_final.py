import re
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Insert the missing functions right before async function route()
insert_code = """
function openCase(id){location.hash=`case=${id}`;}
function goHome(){location.hash='';}

"""

if "function openCase" not in js:
    js = js.replace('async function route()', insert_code + 'async function route()')

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
