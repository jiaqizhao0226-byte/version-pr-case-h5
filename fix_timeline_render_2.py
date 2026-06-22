import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

correct_func = """
function renderTab(c,id){
  if(id==='timeline'){
    const timeline = c.timeline || [];
    return `<div class="block"><h3>时间线还原 (官方 vs 玩家动作)</h3><div class="timeline">${timeline.map(e=>`<div class="event ${e.side||'player'}"><div class="time"><span class="side" style="margin-right:8px; font-weight:bold; color:${e.side==='official'?'var(--red)':'var(--blue)'}">${e.side==='official'?'官方动作':'玩家动作'}</span>${e.date||''}</div><div class="name">${e.event}</div><div class="impact" style="margin-top:8px;">${e.description||''}</div></div>`).join('')}</div></div>`;
  }
  if(id==='players') return renderPlayerJourney(c);
  if(id==='insight') return renderInsight(c);
  return '';
}
"""

js = re.sub(r"function renderTab\(c,id\)\{[\s\S]*?return '';\s*\}", correct_func.strip(), js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
