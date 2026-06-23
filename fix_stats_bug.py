import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# I see the problem. `renderStats()` is called in `renderGrid()` but it was accidentally deleted in one of the previous rewrites!
stats_func = """
function renderStats(){
  const list = filtered();
  $('stats').innerHTML=`<div class="stat"><b>${list.length}</b><span>当前展示案例</span></div><div class="stat"><b>S</b><span>最高声量</span></div><div class="stat"><b>14</b><span>收录案例数</span></div><div class="stat"><b>3</b><span>深度复盘维度</span></div>`;
}

function renderGrid(){
"""

js = js.replace('function renderGrid(){', stats_func)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
