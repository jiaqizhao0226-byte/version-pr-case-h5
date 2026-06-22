import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Let's write the string replacements without backslashes in the python script to avoid python string literal escaping hell
good_block = r"""
     if(oa.stages && oa.stages.length > 0) {
        officialHtml = `<div style="margin-bottom: 32px;">
          <h3 style="margin-bottom: 16px;">实际官方是怎么做的与深度评价</h3>
          <div style="background:var(--soft); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px;">
            <b style="color:var(--text); font-size:15px;">📌 总体定性：</b>
            <span style="font-size:14px;">${oa.judgement || ''}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${oa.stages.map(s => {
              const resColor = (s.result.includes('成功')||s.result.includes('✅')) ? 'var(--green)' : 'var(--red)';
              const resBg = (s.result.includes('成功')||s.result.includes('✅')) ? 'var(--greenBg)' : 'var(--redBg)';
              
              let crit = s.critique || '';
              crit = crit.split('\n').join('<br>');
              crit = crit.replace(/\*\*(.*?)\*\*/g, '<b style="color:#000;">$1</b>');

              return `<article style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; box-shadow:var(--shadow);">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                  <h5 style="margin:0; font-size:16px; color:var(--text);">${s.action}</h5>
                  <span style="font-size:12px; font-weight:bold; padding:4px 10px; border-radius:6px; background:${resBg}; color:${resColor};">${s.result}</span>
                </div>
                <p style="margin:0 0 12px; font-size:14px; color:var(--muted); line-height:1.6;"><b>核心动作：</b>${s.content}</p>
                <div style="background:var(--blueBg); border-left:4px solid var(--blue); padding:14px; font-size:14px; color:var(--text); line-height:1.65; border-radius:0 8px 8px 0;">
                  <b style="color:var(--blue); display:block; margin-bottom:4px;">深度拆解：</b>${crit}
                </div>
              </article>`;
            }).join('')}
          </div>
        </div>`;
     } else {
"""

js = re.sub(r'if\(oa\.stages && oa\.stages\.length > 0\) \{[\s\S]*?\} else \{', good_block.strip() + ' else {', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
