import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Make sevClass completely crash-proof
safe_sevClass = "const sevClass=v=>typeof v==='string'?(v.includes('S')?'s':(v.includes('A')?'a':'s')):'s';"
js = re.sub(r"const sevClass=v=>\(v\|\|''\)\.includes\('S'\)\?'s':\(\(v\|\|''\)\.includes\('A'\)\?'a':'s'\);", safe_sevClass, js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
