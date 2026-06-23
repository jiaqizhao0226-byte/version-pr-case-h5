import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Make sure switchMainTab('dashboard') is called in goHome() and hash change triggers properly
gohome_patch = """
function openCase(id){location.hash=`case=${id}`;}
function goHome(){
  location.hash='';
  switchMainTab('dashboard');
}
"""

js = re.sub(r"function openCase\(id\)\{location\.hash=`case=\$\{id\}`;\}\s*function goHome\(\)\{location\.hash='';\}", gohome_patch.strip(), js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
