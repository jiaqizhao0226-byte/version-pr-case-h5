import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Make absolutely sure the filter section is closed properly
# Current looks like:
#     <section class="panel filters">
#       <div class="filterGrid">
#       ...
#       </div>
#     </section>
#
#     <div class="sectionTitle"><h2>案例格子</h2><div class="count" id="resultCount"></div></div>
#     <section class="caseGrid" id="caseGrid"></section>

lines = html.split('\n')
out = []
for line in lines:
    if line.strip() == '</section>':
        # Don't keep isolated closing section tags if it's right before sectionTitle
        pass
    out.append(line)

html = '\n'.join(out)
# Now manually add the proper closing tag for the filters section
html = html.replace('</div>\n    \n    \n    <div class="sectionTitle">', '</div>\n    </section>\n\n    <div class="sectionTitle">')

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
