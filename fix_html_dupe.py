import re
with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# We need to remove the duplicate mapping block carefully
lines = html.split('\n')
out = []
skip = False
mapping_count = 0
for line in lines:
    if '<main id="mapping"' in line:
        mapping_count += 1
        if mapping_count == 2:
            skip = True
            
    if skip:
        if '</main>' in line:
            skip = False
        continue
        
    out.append(line)

html = '\n'.join(out)

# Now remove the old mapping table from dashboard
html = re.sub(r'<div class="sectionTitle"><h2>现有案例 Mapping 与公关应对评判</h2></div>', '', html)
html = re.sub(r'<section class="mappingTableWrap"[\s\S]*?</section>', '', html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
