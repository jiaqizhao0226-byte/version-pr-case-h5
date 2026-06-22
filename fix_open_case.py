import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Make sure openCase exists
open_case_func = """
function openCase(id){location.hash=`case=${id}`;}
function goHome(){location.hash='';}

async function route(){
"""

if "function openCase" not in js:
    js = re.sub(r'async function route\(\)', open_case_func, js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
