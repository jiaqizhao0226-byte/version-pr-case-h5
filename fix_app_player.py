import re
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

player_patch = """
function renderPlayerJourney(c){
  if(c.analysis && c.analysis.player_mindset) {
     return `<div class="analysisBox fullWidth">
       <div style="background:var(--redBg); border: 1px solid var(--red); color:var(--red); padding:18px; border-radius:12px; margin-bottom:24px; box-shadow: 0 4px 12px rgba(163,45,45,0.08);">
         <h4 style="margin:0 0 10px; font-size:16px;">🔥 核心矛盾定性分析</h4>
         <p style="margin:0; font-weight:600; line-height:1.7;">${c.analysis.core_conflict || ''}</p>
       </div>
       <h3 style="margin-bottom: 16px;">玩家痛点多维剖析</h3>
       <div class="emotionSourceGrid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
         ${c.analysis.player_mindset.map((x,i)=>`<article style="background:var(--soft); border:1px solid var(--line); border-radius:12px; padding:18px; display:flex; flex-direction:column; gap:8px;">
           <span style="background:var(--blueBg); color:var(--blue); font-size:12px; font-weight:bold; padding:4px 10px; border-radius:999px; width:fit-content;">痛点维度 0${i+1}</span>
           <p style="font-size:14px; margin:0; line-height:1.65; color:var(--text);">${x.replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--text); font-size:15px; display:block; margin-bottom:6px;">$1</b>')}</p>
         </article>`).join('')}
       </div>
     </div>`;
  }
  return `<div class="analysisBox fullWidth"><p class="muted">旧版数据，请升级至新模板。</p></div>`;
}
"""

js = re.sub(r"function renderPlayerJourney\(c\)\{[\s\S]*?return `<div class=\"analysisBox fullWidth\"><p class=\"muted\">旧版数据，请升级至新模板。<\/p><\/div>`;\s*\}", player_patch.strip(), js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
