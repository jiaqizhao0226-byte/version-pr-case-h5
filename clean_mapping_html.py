import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Let's clean up the mapping table container, we just use it for the matrix now
html = html.replace('<section id="mappingTableContainer" style="overflow-x:auto; margin-bottom: 24px; box-shadow: var(--shadow); border-radius: 12px; border: 1px solid var(--line);"></section>', '<section id="matrixChartContainer" style="margin-bottom: 24px;"></section>')

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()
# Let's remove the old table generation logic from renderGrid entirely to keep it clean.
clean_renderGrid = """
function renderGrid(){
  renderStats();
  renderMatrixChart(filtered());
  const list=filtered();
  $('resultCount').textContent=`${list.length} / ${caseSummaries.length} 个案例`;
  $('caseGrid').innerHTML=list.map(c=>`<article class="card caseCard" onclick="openCase('${c.id}')"><div class="caseHead"><div><div class="caseTitle">${c.title}</div><div class="game">${c.game} / ${c.company}</div></div><span class="badge ${sevClass(c.damage)}" title="伤害等级">伤害 ${c.damage}</span></div><div class="desc">${c.summary}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip">${t}</span>`).join('')}</div><div class="foot"><span>${c.market}</span><span>${c.time}</span></div></article>`).join('');
}
"""
js = re.sub(r'function renderGrid\(\)[\s\S]*?function openCase', clean_renderGrid.strip() + '\n\nfunction openCase', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
