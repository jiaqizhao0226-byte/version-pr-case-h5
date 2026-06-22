import re

# 1. Update index.html
with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

new_filters = """
      <div class="filterGrid">
        <input id="q" class="control" placeholder="搜索案例、标签、游戏名" />
        <select id="matrix" class="control"><option value="">全部声量与伤害</option></select>
        <select id="voice_nature" class="control"><option value="">全部声音性质</option></select>
        <select id="core_tag" class="control"><option value="">全部核心矛盾标签</option></select>
      </div>
"""
html = re.sub(r'<div class="filterGrid">[\s\S]*?</div>', new_filters.strip(), html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)

# 2. Update app.js
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

filter_patch = """
function fillFilters(){
  // Matrix
  const matrixEl = $('matrix');
  ['高伤害 + 高声量 (核心危机)', '低伤害 + 高声量 (舆论风暴)', '高伤害 + 低声量 (隐性流失)'].forEach(x => {
    const o=document.createElement('option');o.value=x;o.textContent=x;matrixEl.appendChild(o);
  });
  
  // Voice Nature
  const voiceNatures = uniq(caseSummaries.map(c => {
     let v = (c.mapping && c.mapping.voice_nature) || '';
     if(v.includes('真实痛点')) return '真实痛点';
     if(v.includes('圈层')) return '圈层噪音/带节奏';
     return v;
  }).filter(Boolean));
  const vnEl = $('voice_nature');
  voiceNatures.forEach(x => {
     const o=document.createElement('option');o.value=x;o.textContent=x;vnEl.appendChild(o);
  });

  // Core Tags
  const tags = uniq(caseSummaries.flatMap(c => c.tags || []));
  const tagEl = $('core_tag');
  tags.forEach(x => {
     const o=document.createElement('option');o.value=x;o.textContent=x;tagEl.appendChild(o);
  });
}

function bindFilters(){
  ['q','matrix','voice_nature','core_tag'].forEach(id=>$(id).addEventListener('input',renderGrid));
}

function filtered(){
  const q=$('q').value.trim().toLowerCase();
  const mx=$('matrix').value;
  const vn=$('voice_nature').value;
  const ct=$('core_tag').value;
  
  return caseSummaries.filter(c=>{
    const hay=[c.title,c.game,c.company,c.market,c.type,c.summary,...(c.tags||[])].join(' ').toLowerCase();
    
    // Text search
    if (q && !hay.includes(q)) return false;

    // Matrix check
    if (mx) {
      const highVol = c.volume.includes('S') || c.volume.includes('A');
      // A/S, S, A are high damage. B/A, B are low damage.
      const highDmg = c.damage.includes('S') || c.damage === 'A';
      if (mx === '高伤害 + 高声量 (核心危机)' && !(highVol && highDmg)) return false;
      if (mx === '低伤害 + 高声量 (舆论风暴)' && !(highVol && !highDmg)) return false;
      if (mx === '高伤害 + 低声量 (隐性流失)' && !(!highVol && highDmg)) return false;
    }

    // Voice nature check
    if (vn) {
      let cvn = (c.mapping && c.mapping.voice_nature) || '';
      if(cvn.includes('真实痛点')) cvn = '真实痛点';
      else if(cvn.includes('圈层')) cvn = '圈层噪音/带节奏';
      if (cvn !== vn) return false;
    }

    // Core tag check
    if (ct && !(c.tags || []).includes(ct)) return false;

    return true;
  });
}
"""

js = re.sub(r'function fillFilters\(\)[\s\S]*?function renderGrid\(\)', filter_patch + '\nfunction renderGrid()', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
