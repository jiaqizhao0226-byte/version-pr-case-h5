import re

with open('/tmp/version-pr-case-h5/style.css', 'r') as f:
    css = f.read()

# Add new bubble color classes and legend styles
new_css = """
/* Bubble Colors by Voice Nature */
.bubble-real { background: #fff5f5; color: #c53030; border-color: #feb2b2; }
.bubble-real:hover { background: #c53030; color: #fff; }

.bubble-noise { background: #f5f3ff; color: #553c9a; border-color: #d6bcfa; }
.bubble-noise:hover { background: #553c9a; color: #fff; }

.bubble-other { background: #f7fafc; color: #4a5568; border-color: #e2e8f0; }
.bubble-other:hover { background: #718096; color: #fff; }

.matrix-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--muted);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid;
}
.legend-color.real { background: #fff5f5; border-color: #feb2b2; }
.legend-color.noise { background: #f5f3ff; border-color: #d6bcfa; }
"""

css += new_css

with open('/tmp/version-pr-case-h5/style.css', 'w') as f:
    f.write(css)

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Update renderMatrixChart to use Voice Nature for colors and add a legend
new_render_matrix = """
function renderMatrixChart(list) {
  const container = document.getElementById('matrixChartContainer');
  if (!container) return;

  const q1 = []; // 核心危机 (High Dmg, High Vol)
  const q2 = []; // 隐性流失 (High Dmg, Low Vol)
  const q3 = []; // 舆论风暴 (Low Dmg, High Vol)
  const q4 = []; // 常规客诉 (Low Dmg, Low Vol)

  list.forEach(c => {
    const vol = c.volume || '';
    const dmg = c.damage || '';
    const highVol = vol.includes('S') || vol.includes('A');
    const highDmg = dmg.includes('S') || dmg === 'A' || dmg === 'A/S';
    
    if (highDmg && highVol) q1.push(c);
    else if (highDmg && !highVol) q2.push(c);
    else if (!highDmg && highVol) q3.push(c);
    else q4.push(c);
  });

  const getBubbleColor = (c) => {
    const vn = (c.mapping && c.mapping.voice_nature) || '';
    if (vn.includes('真实痛点')) return 'bubble-real';
    if (vn.includes('圈层')) return 'bubble-noise';
    return 'bubble-other';
  };

  const bubble = (c) => {
    const colorClass = getBubbleColor(c);
    const vn = (c.mapping && c.mapping.voice_nature) || '未知';
    return `<div class="matrix-bubble ${colorClass}" onclick="openCase('${c.id}')" title="声音性质: ${vn}&#10;伤害 ${c.damage} / 声量 ${c.volume}&#10;${c.game}">${c.title}</div>`;
  };

  container.innerHTML = `
    <div class="matrix-chart-wrap">
      <div class="matrix-y-axis"><span>高<br>伤<br>害</span><span>低<br>伤<br>害</span></div>
      <div class="matrix-content">
        <div class="matrix-chart">
          
          <!-- Top Left: High Damage, Low Volume -->
          <div class="matrix-quad q2">
            <div class="q-bg-label">隐性流失</div>
            ${q2.map(c=>bubble(c)).join('')}
          </div>
          
          <!-- Top Right: High Damage, High Volume -->
          <div class="matrix-quad q1">
            <div class="q-bg-label">核心危机</div>
            ${q1.map(c=>bubble(c)).join('')}
          </div>

          <!-- Bottom Left: Low Damage, Low Volume -->
          <div class="matrix-quad q4">
            <div class="q-bg-label">常规客诉</div>
            ${q4.map(c=>bubble(c)).join('')}
          </div>

          <!-- Bottom Right: Low Damage, High Volume -->
          <div class="matrix-quad q3">
            <div class="q-bg-label">舆论风暴</div>
            ${q3.map(c=>bubble(c)).join('')}
          </div>

        </div>
        <div class="matrix-x-axis"><span style="padding-left:20px;">低声量</span><span style="padding-right:20px;">高声量</span></div>
      </div>
    </div>
    <div class="matrix-legend">
      <div class="legend-item"><div class="legend-color real"></div><span>真实痛点 (影响大盘核心利益)</span></div>
      <div class="legend-item"><div class="legend-color noise"></div><span>圈层争议/道德审判 (不影响核心体验)</span></div>
    </div>
  `;
}
"""

js = re.sub(r'function renderMatrixChart\(list\)[\s\S]*?\}\n(?=function renderGrid)', new_render_matrix.strip() + '\n\n', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)

