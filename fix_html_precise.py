import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    lines = f.readlines()

# Remove the second nav block (lines 45-49 roughly)
nav_count = 0
out_lines = []
in_nav = False

for line in lines:
    if '<nav class="mainNav">' in line:
        nav_count += 1
        if nav_count == 2:
            in_nav = True
            continue
    if in_nav:
        if '</nav>' in line:
            in_nav = False
        continue
    
    # Also remove the mapping table from dashboard
    if '<div class="sectionTitle"><h2>现有案例 Mapping 与公关应对评判</h2></div>' in line:
        continue
    if '<section class="mappingTableWrap"' in line:
        continue
    if '<table class="table" id="mappingTable"' in line:
        continue
    # We need to be careful not to remove the </section> closing the whole page.
    # It's better to just regex out the mappingTableWrap block.
    
    out_lines.append(line)

html = "".join(out_lines)
html = re.sub(r'<section class="mappingTableWrap"[\s\S]*?</section>', '', html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
