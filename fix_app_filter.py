import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Make sure filtered() does not throw an error or return an empty array incorrectly
# Update filtered function to handle mapping matrix safely
filter_logic = """
function filtered(){
  const q=$('q').value.trim().toLowerCase();
  const mx=$('matrix').value;
  const vn=$('voice_nature').value;
  const ct=$('core_tag').value;
  
  return caseSummaries.filter(c=>{
    const hay=[c.title,c.game,c.company,c.market,c.type,c.summary,...(c.tags||[])].join(' ').toLowerCase();
    
    if (q && !hay.includes(q)) return false;

    if (mx) {
      const highVol = c.volume && (c.volume.includes('S') || c.volume.includes('A'));
      const highDmg = c.damage && (c.damage.includes('S') || c.damage === 'A' || c.damage === 'A/S');
      
      if (mx === '高伤害 + 高声量 (核心危机)' && !(highVol && highDmg)) return false;
      if (mx === '低伤害 + 高声量 (舆论风暴)' && !(highVol && !highDmg)) return false;
      if (mx === '高伤害 + 低声量 (隐性流失)' && !(!highVol && highDmg)) return false;
    }

    if (vn) {
      let cvn = (c.mapping && c.mapping.voice_nature) || '';
      if(cvn.includes('真实痛点')) cvn = '真实痛点';
      else if(cvn.includes('圈层')) cvn = '圈层噪音/带节奏';
      if (cvn !== vn) return false;
    }

    if (ct && !(c.tags || []).includes(ct)) return false;

    return true;
  });
}
"""

js = re.sub(r'function filtered\(\)[\s\S]*?return true;\s*\n\s*\w*\s*\}\s*\n', filter_logic.strip() + '\n', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
