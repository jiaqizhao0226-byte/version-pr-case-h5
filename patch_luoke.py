import re
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Update renderDetail to use the new simplified 3 tabs
nav_tabs = """
function renderDetail(c){
  $('detailHero').innerHTML=`<div class="sub">${c.game} / ${c.company}</div><h2>${c.title}</h2><div class="meta"><span>${c.market}</span><span>${c.time}</span><span>${c.lifecycle}</span><span>声量 <strong style="color:var(--red);">${c.volume}</strong></span><span>伤害 <strong style="color:var(--red);">${c.damage}</strong></span></div>`;
  const tabs=[
    ['timeline','T-Window 时间线'],
    ['players','核心矛盾与玩家痛点'],
    ['insight','事后诸葛亮与PR复盘']
  ];
  $('tabs').innerHTML=tabs.map((x,i)=>`<button class="tab ${i===0?'active':''}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=tabs.map((x,i)=>`<section class="tabPanel ${i===0?'active':''}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}
"""

js = re.sub(r'function renderDetail\(c\)[\s\S]*?function tab\(id\)', nav_tabs + '\nfunction tab(id)', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
