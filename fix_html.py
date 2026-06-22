import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# 1. Remove the duplicate nav. The duplicate nav is likely caused by having two <nav class="mainNav"> blocks or something similar.
# Let's see the structure first.
