import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Let's inspect the HTML file to see if there are any unclosed tags
# that might be hiding the caseGrid
