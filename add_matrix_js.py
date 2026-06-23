import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

matrix_render_logic = """
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
    
    // Y-axis = Damage, X-axis = Volume
    // Top-Left (Q2): High Dmg, Low Vol (隐性流失)
    // Top-Right (Q1): High Dmg, High Vol (核心危机)
    // Bottom-Left (Q4): Low Dmg, Low Vol (常规客诉)
    // Bottom-Right (Q3): Low Dmg, High Vol (舆论风暴)
    
    if (highDmg && highVol) q1.push(c);
    else if (highDmg && !highVol) q2.push(c);
    else if (!highDmg && highVol) q3.push(c);
    else q4.push(c);
  });

  const bubble = (c, color) => `<div class="matrix-bubble ${color}" onclick="openCase('${c.id}')" title="伤害 ${c.damage} / 声量 ${c.volume}&#10;${c.game}">${c.title}</div>`;

  container.innerHTML = `
    <div class="matrix-chart-wrap">
      <div class="matrix-y-axis"><span>高<br>伤<br>害</span><span>低<br>伤<br>害</span></div>
      <div class="matrix-content">
        <div class="matrix-chart">
          
          <!-- Top Left: High Damage, Low Volume -->
          <div class="matrix-quad q2">
            <div class="q-bg-label">隐性流失</div>
            ${q2.map(c=>bubble(c, 'b-blue')).join('')}
          </div>
          
          <!-- Top Right: High Damage, High Volume -->
          <div class="matrix-quad q1">
            <div class="q-bg-label">核心危机</div>
            ${q1.map(c=>bubble(c, 'b-red')).join('')}
          </div>

          <!-- Bottom Left: Low Damage, Low Volume -->
          <div class="matrix-quad q4">
            <div class="q-bg-label">常规客诉</div>
            ${q4.map(c=>bubble(c, 'b-gray')).join('')}
          </div>

          <!-- Bottom Right: Low Damage, High Volume -->
          <div class="matrix-quad q3">
            <div class="q-bg-label">舆论风暴</div>
            ${q3.map(c=>bubble(c, 'b-amber')).join('')}
          </div>

        </div>
        <div class="matrix-x-axis"><span style="padding-left:20px;">低声量</span><span style="padding-right:20px;">高声量</span></div>
      </div>
    </div>
  `;
}
"""

js = re.sub(r'function renderGrid\(\)\{', matrix_render_logic.strip() + '\n\nfunction renderGrid(){', js)
js = js.replace("renderStats();", "renderStats();\n  renderMatrixChart(filtered());")

# I need to also remove the tableHtml creation from renderGrid, since we replaced it with the 2x2 matrix!
# Wait, let's keep the table below the matrix for those who prefer list view.
js = js.replace("$('mappingTableContainer').innerHTML = tableHtml;", "$('mappingTableContainer').innerHTML = tableHtml; $('mappingTableContainer').style.display = 'none'; // hidden because matrix replaces it")


with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
