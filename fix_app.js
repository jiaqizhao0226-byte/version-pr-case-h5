const fs = require('fs');
let code = fs.readFileSync('/tmp/version-pr-case-h5/app.js', 'utf8');

// Find where renderGrid should start and where it should end
// The next function after renderGrid is openCase(id)
const before = code.split('function renderGrid()')[0];
const afterMatch = code.match(/function openCase\(id\)/);
const after = code.substring(afterMatch.index);

const correctRenderGrid = `
function renderGrid(){
  renderStats();
  const list=filtered();
  $('resultCount').textContent=\`\${list.length} / \${caseSummaries.length} 个案例\`;
  $('caseGrid').innerHTML=list.map(c=>\`<article class="card caseCard" onclick="openCase('\${c.id}')"><div class="caseHead"><div><div class="caseTitle">\${c.title}</div><div class="game">\${c.game} / \${c.company}</div></div><span class="badge \${sevClass(c.damage)}">\${c.damage}</span></div><div class="desc">\${c.summary}</div><div class="chips">\${(c.tags||[]).map(t=>\`<span class="chip">\${t}</span>\`).join('')}</div><div class="foot"><span>\${c.market}</span><span>\${c.time}</span></div></article>\`).join('');
  
  if ($('mappingTable')) {
    const tableHtml = \`<tr>
      <th>案例名称</th>
      <th>伤害 / 声量</th>
      <th>声音性质</th>
      <th>影响核心体验</th>
      <th>核心矛盾 Tag</th>
      <th>PR 实际应对与评判</th>
    </tr>\` + list.map(c => {
      const m = c.mapping || {};
      return \`<tr>
        <td style="font-weight:bold; cursor:pointer; color:#0052d9;" onclick="openCase('\${c.id}')">\${c.title}</td>
        <td><span class="badge \${sevClass(c.damage)}">\${c.damage}</span> / <span class="badge \${sevClass(c.volume)}">\${c.volume}</span></td>
        <td>\${m.voice_nature || '-'}</td>
        <td>\${m.core_exp || '-'}</td>
        <td>\${m.core_tag || '-'}</td>
        <td>\${m.pr_eval || '-'}</td>
      </tr>\`;
    }).join('');
    $('mappingTable').innerHTML = tableHtml;
  }
}

`;

fs.writeFileSync('/tmp/version-pr-case-h5/app.js', before + correctRenderGrid + after);
