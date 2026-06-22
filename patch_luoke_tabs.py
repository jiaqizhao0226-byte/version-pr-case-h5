import re
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Update tab toggling logic
tab_func = """
function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.remove('active'));
  const names={timeline:'T-Window 时间线',players:'核心矛盾与玩家痛点',insight:'事后诸葛亮与PR复盘'};
  [...document.querySelectorAll('.tab')].find(x=>x.textContent===names[id]).classList.add('active');
  $(`tab-${id}`).classList.add('active');
}
"""
js = re.sub(r'function tab\(id\)[\s\S]*?function renderTab', tab_func + '\nfunction renderTab', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
