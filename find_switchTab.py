import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

if "switchMainTab" in js:
    print("switchMainTab exists in app.js")
else:
    print("switchMainTab is missing!")
