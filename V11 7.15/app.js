let caseSummaries=[];
let currentCase=null;

// 案例库大盘置顶：这四个案例固定排在案例浏览最前（按此顺序）
const PINNED_IDS=['luoke-s2','sanjiaozhou-jail','lianyu-aoyin','chenbai-forbidden'];
// 已核查（已人工主动挑战核阅过）：在卡片上加「已核查」标记
const VERIFIED_IDS=new Set(['luoke-s2','sanjiaozhou-jail','lianyu-aoyin']);
// 将置顶案例排到列表最前，其余保持原顺序
function applyPinned(list){
  const rank=id=>{const i=PINNED_IDS.indexOf(id);return i===-1?PINNED_IDS.length:i;};
  return list.map((c,i)=>({c,i})).sort((a,b)=>{
    const ra=rank(a.c.id),rb=rank(b.c.id);
    return ra!==rb?ra-rb:a.i-b.i;
  }).map(x=>x.c);
}

const $=id=>document.getElementById(id);
const esc=s=>(s==null?'':String(s));
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const splitType=v=>(v||'').split('/').map(x=>x.trim()).filter(Boolean);
const sevClass=v=>typeof v==='string'?(v.includes('S')?'s':(v.includes('A')?'a':'s')):'s';
// 声量/伤害等级 → 高/中/低（S=高，A=中，B=低；A/S、B/A 含A→中）；无数据/未收录 如实透传
const gradeLevel=g=>{g=g||'';if(g==='无数据'||g==='未收录')return g;return /S/.test(g)?'高':(/A/.test(g)?'中':'低');};
// 等级 → 徽章配色（高=红 / 中=琥珀 / 低=绿 / 无数据·未收录=灰）
const levelClass=g=>{const l=gradeLevel(g);if(l==='无数据'||l==='未收录')return 'lv-na';return l==='高'?'lv-hi':(l==='中'?'lv-mid':'lv-lo');};

function switchMainTab(tabId) {
  document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + tabId);
  if (btn) btn.classList.add('active');
  
  if(document.getElementById('overview')) document.getElementById('overview').style.display = 'none';
  if(document.getElementById('dashboard')) document.getElementById('dashboard').style.display = 'none';
  if(document.getElementById('mapping')) document.getElementById('mapping').style.display = 'none';
  if(document.getElementById('conclusions')) document.getElementById('conclusions').style.display = 'none';
  if(document.getElementById('conclusions2')) document.getElementById('conclusions2').style.display = 'none';
  if(document.getElementById('conclusions3')) document.getElementById('conclusions3').style.display = 'none';
  if(document.getElementById('detail')) document.getElementById('detail').style.display = 'none';
  
  // 用 hash 记住当前 tab，刷新后能恢复
  if (location.hash.indexOf('case=') === -1) {
    location.hash = 'tab=' + tabId;
  }
  if(document.getElementById(tabId)) document.getElementById(tabId).style.display = 'block';
}


async function loadJson(url){
  try {
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error(`${url} returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load: " + url, err);
    throw err;
  }
}

async function init(){
  try {
    caseSummaries=await loadJson('./data/cases.json');
    fillFilters();
    bindFilters();
    route();
    addEventListener('hashchange',route);
    
    // Fallback manual render if route fails to call it
    if ($('caseGrid') && $('caseGrid').innerHTML.trim() === '') {
       renderGrid();
    }
  } catch (err) {
    console.error("Init Error:", err);
    throw err;
  }
}


function fillFilters(){
  // Matrix
  const matrixEl = $('matrix');
  // value = matrixCell() 编码（声量+伤害：h高/m中/l低），与散点矩阵同一套标准分类。
  // 本库声量仅 S(高)/A(中)，无 B(低)；故仅提供 高/中 声量两档。
  [
    { v:'hh', t:'高伤害 + 高声量' },
    { v:'hm', t:'中伤害 + 高声量' },
    { v:'hl', t:'低伤害 + 高声量' },
    { v:'mh', t:'高伤害 + 中声量' },
    { v:'mm', t:'中伤害 + 中声量' },
    { v:'ml', t:'低伤害 + 中声量' }
  ].forEach(x => {
    const o=document.createElement('option');o.value=x.v;o.textContent=x.t;matrixEl.appendChild(o);
  });

  // Core Tags grouped（四族 11 标准标签，与校对表 + cases.json 核心矛盾完全对齐）
  const tagCategories = {
    '💰 商业化 / 付费': [
       '付费内容贬值/不实',
       '商业化契约/动机争议'
    ],
    '🎮 数值 / 玩法 / 体验': [
       '数值/平衡争议',
       '体验/质量争议',
       '自创玩法管控争议',
       '产能/优先级排期'
    ],
    '🎭 内容与价值观': [
       '情感/价值观争议',
       '内容尺度/合规争议'
    ],
    '👥 圈层矛盾': [
       '圈层矛盾-性别',
       '圈层矛盾-竞品',
       '圈层矛盾-内部'
    ]
  };

  const tagEl = $('core_tag');
  tagEl.innerHTML = '<option value="">全部核心矛盾</option>';
  
  const allTags = uniq(caseSummaries.flatMap(c => c.tags || []));
  let placedTags = new Set();

  for (const [groupName, groupTags] of Object.entries(tagCategories)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;
    let added = false;
    groupTags.forEach(t => {
      if (allTags.includes(t)) {
        const o=document.createElement('option');o.value=t;o.textContent=t;optgroup.appendChild(o);
        placedTags.add(t);
        added = true;
      }
    });
    if (added) tagEl.appendChild(optgroup);
  }

  const orphanTags = allTags.filter(t => !placedTags.has(t));
  if (orphanTags.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '📌 其他标签';
    orphanTags.forEach(t => {
      const o=document.createElement('option');o.value=t;o.textContent=t;optgroup.appendChild(o);
    });
    tagEl.appendChild(optgroup);
  }

  // 公关应对：四类固定枚举（校对后），按诚意/有效性高→低排序
  const prEl = $('pr');
  if (prEl) {
    const prOrder = [
      '立刻滑跪',
      '正常处理',
      '前期冷处理+后期滑跪',
      '冷处理',
    ];
    const present = new Set(caseSummaries.map(c => c.pr));
    prOrder.forEach(p => {
      if (!present.has(p)) return;
      const o=document.createElement('option');o.value=p;o.textContent=p;prEl.appendChild(o);
    });
    // 兜底：任何不在枚举内的历史值仍可显示，避免漏案
    [...present].filter(p => p && !prOrder.includes(p)).forEach(p => {
      const o=document.createElement('option');o.value=p;o.textContent=p;prEl.appendChild(o);
    });
  }
}

function bindFilters(){
  ['q','matrix','core_tag','pr'].forEach(id=>$(id)&&$(id).addEventListener('input',renderGrid));
}

function filtered(){
  const q=$('q')?$('q').value.trim().toLowerCase():'';
  const mx=$('matrix')?$('matrix').value:'';
  const ct=$('core_tag')?$('core_tag').value:'';
  const pr=$('pr')?$('pr').value:'';

  return caseSummaries.filter(c=>{
    const hay=[c.title||'',c.game||'',c.company||'',c.market||'',c.type||'',c.summary||'',c.pr||'',...(c.tags||[])].join(' ').toLowerCase();
    
    if (q && !hay.includes(q)) return false;

    // 声量×伤害筛选：与散点矩阵同一套标准分类（matrixCell），
    // 无数据/未收录（na）不落入任何声量×伤害档，仅在「全部」下出现。
    if (mx && matrixCell(c) !== mx) return false;

    if (ct && !(c.tags || []).includes(ct)) return false;

    if (pr && c.pr !== pr) return false;

    return true;
  });
}


function renderStats(){
  // stats 已移除
}

// 每个案例在散点图中的相对坐标（x: 声量低→高 0-100；y: 伤害低→高 0-100）
// 校准原则：
//   y 轴（伤害）——仅「伤害高(S)」进上区(y>50)，中/低一律下区；档内按严重度微调。
//   x 轴（声量）——按「声量强度实感」（含破圈广度）铺排，而非简单 S/A 档位；
//                 破圈/全网级讨论的案例右推，真正未出圈的小众事件留左侧。
// 结果：黄区（高声量·低/中伤害「舆论风暴」）为最大区块，印证「声量普遍高于实际伤害」。
// 声量×伤害 3×3 分类矩阵：声量 S=高、A=中、B=低；伤害 S=高、A/中=中、B=低
// 本案例库无 B 级（低声量）样本，低声量列保留框架但显示"无样本"
function matrixCell(c) {
  const d = c.damage || '';
  if (d === '无数据' || d === '未收录') return 'na';
  // 声量 3 档
  let vol;
  if (/S/.test(c.volume || '')) vol = 'h';      // S=高声量
  else if (/A/.test(c.volume || '')) vol = 'm'; // A=中声量
  else vol = 'l';                                // B=低声量
  // 伤害 3 档
  let dmg;
  if (/S/.test(d)) dmg = 'h';                   // S=高伤害
  else if (/A/.test(d) || d === '中') dmg = 'm'; // A/中=中伤害
  else dmg = 'l';                                // B=低伤害
  return vol + dmg;
}

// 胶囊颜色按「伤害档」一行一色，与 DMG3_COLORS / 全站严重度色阶统一：
// 高伤害→红(b-red)、中伤害→琥珀(b-amber)、低伤害→钢蓝(b-blue)。
const CELL_META = {
  // 高伤害行
  lh: { sub: '低声量 · 高伤害', color: 'b-red' },
  mh: { sub: '中声量 · 高伤害', color: 'b-red' },
  hh: { sub: '高声量 · 高伤害', color: 'b-red' },
  // 中伤害行
  lm: { sub: '低声量 · 中伤害', color: 'b-amber' },
  mm: { sub: '中声量 · 中伤害', color: 'b-amber' },
  hm: { sub: '高声量 · 中伤害', color: 'b-amber' },
  // 低伤害行
  ll: { sub: '低声量 · 低伤害', color: 'b-blue' },
  ml: { sub: '中声量 · 低伤害', color: 'b-blue' },
  hl: { sub: '高声量 · 低伤害', color: 'b-blue' },
};

function renderMatrixChart() {
  const container = document.getElementById('matrixChartContainer');
  if (!container) return;
  const all = caseSummaries || [];

  const groups = { lh:[], mh:[], hh:[], lm:[], mm:[], hm:[], ll:[], ml:[], hl:[], na:[] };
  all.forEach(c => groups[matrixCell(c)].push(c));

  // 单个案例胶囊
  const chip = (c, color) => {
    const parts = (c.title || '').split('-');
    const sub = parts.length > 1 ? parts.slice(1).join('-').slice(0, 12) : '';
    return `<button type="button" class="qcase ${color}" onclick="openCase('${c.id}')"
        title="${esc(c.title)}&#10;声量 ${gradeLevel(c.volume)} / 伤害 ${gradeLevel(c.damage)}">
        <span class="qcName">${esc(c.game || '')}</span>${sub ? `<span class="qcSub">${esc(sub)}</span>` : ''}
      </button>`;
  };

  // 单个象限格子
  const quad = (key) => {
    const m = CELL_META[key];
    const list = groups[key];
    return `<div class="qcell qcell-${key}">
        <div class="qcHead"><span class="qcMeta">${m.sub}</span><span class="qcCount">${list.length}</span></div>
        <div class="qcBody">${list.map(c => chip(c, m.color)).join('') || '<span class="qcEmpty">—</span>'}</div>
      </div>`;
  };

  const naList = groups.na;
  const naBlock = naList.length ? `
      <div class="qnaTray">
        <div class="qnaHead"><span class="qnaTitle">数据缺失 · 未收录</span><span class="qcMeta">停运/未上架/数据源不覆盖，伤害无法量化，不参与上方分类</span><span class="qcCount">${naList.length}</span></div>
        <div class="qnaBody">${naList.map(c => chip(c, 'b-na')).join('')}</div>
      </div>` : '';

  container.innerHTML = `
    <div class="qmatrix-wrap">
      <div class="qmatrix-title">声量 × 伤害 3×3 分类矩阵<span class="qmatrix-note">声量 S=高 / A=中 / B=低；本案例库无 B 级样本，低声量列保留框架</span></div>
      <div class="qmatrix-grid qmatrix-3x3">
        <div class="qaxis-y"><span>高伤害</span><span>中伤害</span><span>低伤害</span></div>
        <div class="qquads qquads-3">
          ${quad('lh')}${quad('mh')}${quad('hh')}
          ${quad('lm')}${quad('mm')}${quad('hm')}
          ${quad('ll')}${quad('ml')}${quad('hl')}
        </div>
      </div>
      <div class="qaxis-x"><span>低声量</span><span>中声量</span><span>高声量</span></div>
      ${naBlock}
    </div>
  `;
}

// === 量化分析仪表盘：5 个图表 ===

// 公关应对环形图
function renderPrChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => { const k = c.pr || '其他'; counter[k] = (counter[k]||0)+1; });
  renderBarChart('prChart', counter, DIST_RAMP);
  const wrap = document.getElementById('prChart');
  if (wrap) wrap.innerHTML += `<div class="chartInsights chartInsightsSub"><b>洞察：</b>这是基础计数，只能看处置口径分布；处置是否有效，需要回到“公关应对 × 伤害结构”和“核心矛盾 × 公关应对 × 伤害”。</div>`;
}

// 时间线分布
// 年度趋势分析：热力图矩阵（矛盾构成 × 公关应对）
function renderYearTrendChart() {
  const wrap = document.getElementById('yearTrendChart');
  if (!wrap) return;
  const all = caseSummaries || [];

  // 按年份分组
  const yearMap = {};
  all.forEach(c => {
    const y = (c.time||'').slice(0,4);
    if (!y) return;
    if (!yearMap[y]) yearMap[y] = { tags:{}, pr:{} };
    caseTags(c).forEach(t => yearMap[y].tags[t] = (yearMap[y].tags[t]||0)+1);
    const p = c.pr || '其他';
    yearMap[y].pr[p] = (yearMap[y].pr[p]||0)+1;
  });
  const years = Object.keys(yearMap).sort();
  if (!years.length) { wrap.innerHTML = '<p class="muted">无时间数据</p>'; return; }

  // Top 6 矛盾标签
  const tagTotal = {};
  all.forEach(c => caseTags(c).forEach(t => tagTotal[t]=(tagTotal[t]||0)+1));
  const topTags = Object.entries(tagTotal).sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>e[0]);

  // 公关应对
  const prOrder = ['立刻滑跪','正常处理','前期冷处理+后期滑跪','冷处理'];

  // 通用频次热力图渲染（跟公关应对×年份统一格式）
  function drawFreqHeatmap(rows, cols, cells, rowTitle, colTitle, color) {
    const maxVal = Math.max(...Object.values(cells), 1);
    const colHeads = cols.map(c=>`<div class="thColHead">${esc(c)}</div>`).join('');
    const body = rows.map(r=>{
      const cellHtml = cols.map(c=>{
        const n = cells[`${r}|||${c}`] || 0;
        const intensity = n / maxVal;
        const bg = n === 0 ? 'transparent' : `rgba(${color},${0.12 + intensity * 0.78})`;
        const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
        return `<div class="thCell" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${c}: ${n}">
          ${n?`<b style="color:${txtColor}">${n}</b>`:''}
        </div>`;
      }).join('');
      return `<div class="thRow"><div class="thRowHead">${esc(r)}</div>${cellHtml}</div>`;
    }).join('');
    const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(${color},${i});border-radius:2px"></span>`).join('');
    return `<div class="triHeat">
      <div class="triHeatAxis"><span>${esc(rowTitle)}</span><span>${esc(colTitle)}</span></div>
      <div class="triHeatGrid" style="--th-cols:${cols.length}">
        <div class="thCorner"></div>${colHeads}${body}
      </div>
      <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    </div>`;
  }
  // 占比热力图：格子显示百分比，颜色按百分比深浅
  function drawPctHeatmap(rows, cols, freqCells, pctCells, rowTitle, colTitle, color) {
    const colHeads = cols.map(c=>`<div class="thColHead">${esc(c)}</div>`).join('');
    const body = rows.map(r=>{
      const cellHtml = cols.map(c=>{
        const n = freqCells[`${r}|||${c}`] || 0;
        const pct = pctCells[`${r}|||${c}`] || 0;
        const intensity = pct / 100;
        const bg = n === 0 ? 'transparent' : `rgba(${color},${0.12 + intensity * 0.78})`;
        const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
        return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${c}: ${n}次 (${pct}%)">
          ${n?`<b style="color:${txtColor}">${pct}%</b>`:''}
        </div>`;
      }).join('');
      return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
    }).join('');
    const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(${color},${i});border-radius:2px"></span>`).join('');
    return `<div class="triHeat">
      <div class="triHeatAxis"><span>${esc(rowTitle)}</span><span>${esc(colTitle)}</span></div>
      <div class="triHeatGrid" style="--th-cols:${cols.length}">
        <div class="thCorner"></div>${colHeads}${body}
      </div>
      <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">占比：</span>低${legendStops}高</div>
    </div>`;
  }

  // 矛盾构成占比热力图（红色系）— 按年份归一化为占比
  const tagCells = {};
  const tagPctCells = {};
  topTags.forEach(t=>years.forEach(y=>tagCells[`${t}|||${y}`]=yearMap[y].tags[t]||0));
  // 每年标签总数
  years.forEach(y=>{
    const yearTagTotal = topTags.reduce((s,t)=>s+(yearMap[y].tags[t]||0),0);
    topTags.forEach(t=>{
      const n = yearMap[y].tags[t]||0;
      tagPctCells[`${t}|||${y}`] = yearTagTotal>0 ? Math.round(n/yearTagTotal*100) : 0;
    });
  });
  const tagHeatmap = drawPctHeatmap(topTags, years, tagCells, tagPctCells, '核心矛盾', '年份', '184,84,80');

  // 公关应对占比热力图（深靛蓝系）— 按年份归一化为占比
  const prCells = {};
  const prPctCells = {};
  prOrder.forEach(p=>years.forEach(y=>prCells[`${p}|||${y}`]=yearMap[y].pr[p]||0));
  years.forEach(y=>{
    const yearPrTotal = prOrder.reduce((s,p)=>s+(yearMap[y].pr[p]||0),0);
    prOrder.forEach(p=>{
      const n = yearMap[y].pr[p]||0;
      prPctCells[`${p}|||${y}`] = yearPrTotal>0 ? Math.round(n/yearPrTotal*100) : 0;
    });
  });
  const prHeatmap = drawPctHeatmap(prOrder, years, prCells, prPctCells, '公关应对', '年份', '44,62,92');

  wrap.innerHTML = `
    <div class="ytSection">
      <div class="ytSectionTitle">矛盾构成年度趋势</div>
      ${tagHeatmap}
    </div>
    <div class="ytSection">
      <div class="ytSectionTitle">公关应对年度趋势</div>
      ${prHeatmap}
    </div>
    <div class="chartInsights"><b>说明：</b>
      <p style="margin:0;">各年矛盾类型高度混合，没有清晰的单向趋势：商业化契约争议贯穿始终；情感/价值观争议自 2023 年起稳定占一定比例，但从未成为某一年的主导类型；最近两年反而是"功能性矛盾"在打头（2025 数值/平衡、2026 体验/质量）。<b>跨年样本每年仅 4–9 个、且为精选案例，不足以支撑趋势判断，此图仅作逐年构成速览。</b></p>
    </div>
  `;
}

// 象限堆叠条
// —— 生命周期归箱：按“事件发生时间－游戏上线时间”统一归箱。显式表避免 lifecycle 文案含混造成误分。——
const LC_STAGE_BY_ID = {
  // 上线期：0–0.5 年（含测试/公测当期）
  'oncehuman-season':'上线期',
  'mingchao-1.0':'上线期',
  'luoke-s2':'上线期',
  'diablo4-p11':'上线期',
  'fengzhigu-refund':'上线期',
  'yanyun-jiujian':'上线期',
  'codm-cn-launch':'上线期',
  'wzry-world-demo':'上线期',
  'moer-manor':'上线期',
  'hpmagic-pay':'上线期',
  'gf2-daiyan':'上线期',
  'shediao-bjd':'上线期',
  'helldivers2-psn':'上线期',

  // 成长期：0.5–3 年
  'lianyu-mechanic':'成长期',
  'lianyu-scale':'成长期',
  'shijiezhiwai-money':'成长期',
  'dnf-mobile-dragon':'成长期',
  'yuanshen-1year':'成长期',
  'sanjiaozhou-jail':'成长期',
  'yanyun-female':'成长期',
  'bluearchive-cn':'成长期',
  'reverse1999-3rd':'成长期',
  'lianyu-aoyin':'成长期',
  'helldivers2-nerf':'成长期',
  'chenbai-forbidden':'成长期',

  // 成熟期：3 年以上
  'yuanshen-longwang':'成熟期',
  'apex-bp':'成熟期',
  'benghuai-rabbit':'成熟期',
  'dnf-pc-harmony':'成熟期',
  'wzry-s40':'成熟期',
  'arknights-collab':'成熟期',
};
function lcStage(c){
  if (LC_STAGE_BY_ID[c.id]) return LC_STAGE_BY_ID[c.id];
  const lc = c.lifecycle || '';
  if (/近四年|四周年|十余年|长青|衰退|成熟/.test(lc)) return '成熟期';
  if (/第一年|一周年|三周年|爆款上升|长线/.test(lc)) return '成长期';
  if (/公测|上线|开服|开测|国服|大赛季|半年后|约2个月|约3个月|ML转型|S1|S2/.test(lc)) return '上线期';
  return '未归类';
}
// 图 · 生命周期阶段 × 伤害（按案例数堆叠，诚实呈现小样本；无数据/未收录不计入，与方法论 3.2 一致）
function renderLifecycleDamageChart(targetId){
  const wrap = document.getElementById(targetId || 'lifecycleDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const order = ['上线期','成长期','成熟期'];
  const label = {'上线期':'上线期（0–0.5年）','成长期':'成长期（0.5–3年）','成熟期':'成熟期（3年+）'};
  const agg = {}; order.forEach(s=>agg[s]={high:0,mid:0,low:0,na:0});
  all.forEach(c=>{ const s=lcStage(c); if(!agg[s])return; agg[s][dmgTier3(c.damage)]++; });
  const maxN = Math.max(...order.map(s=>agg[s].high+agg[s].mid+agg[s].low), 1);
  const seg = (n,tier)=> n? `<div class="quadStackSeg" style="width:${n/maxN*100}%;background:${DMG3_COLORS[tier]};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px" title="${DMG3_LABELS[tier]}伤害：${n}">${n}</div>`:'';
  const rows = order.map(s=>{
    const a=agg[s]; const valid=a.high+a.mid+a.low;
    const rate = valid? Math.round(100*a.high/valid) : null;
    const rateTxt = valid ? (valid<=3? `n=${valid}（样本小）` : `n=${valid} · 高伤害 ${rate}%`) : 'n=0';
    return `<div class="quadStackRow" style="display:flex;gap:10px;min-width:0"><div class="quadStackLabel" style="flex:0 0 112px">${esc(label[s])}</div><div class="quadStackBar" style="flex:1 1 auto;min-width:0">${seg(a.high,'high')}${seg(a.mid,'mid')}${seg(a.low,'low')}</div><div class="quadStackVal" style="flex:0 0 132px;text-align:right;font-size:12px;color:var(--muted)">${rateTxt}</div></div>`;
  }).join('');
  const legend = `<div style="display:flex;gap:14px;margin-top:12px;font-size:12px;color:var(--muted);flex-wrap:wrap"><span><i style="display:inline-block;width:10px;height:10px;background:${DMG3_COLORS.high};border-radius:2px;margin-right:4px"></i>高</span><span><i style="display:inline-block;width:10px;height:10px;background:${DMG3_COLORS.mid};border-radius:2px;margin-right:4px"></i>中</span><span><i style="display:inline-block;width:10px;height:10px;background:${DMG3_COLORS.low};border-radius:2px;margin-right:4px"></i>低</span><span>条长 = 案例数（无数据 / 未收录不计入）</span></div>`;
  const rate3 = s=>{const a=agg[s];const v=a.high+a.mid+a.low;return {rate:v?Math.round(100*a.high/v):0,high:a.high,valid:v};};
  const r0=rate3('上线期'),r1=rate3('成长期'),r2=rate3('成熟期');
  const insight = `<div class="chartInsights"><b>洞察：</b>越靠近上线窗口，同样的舆情越容易真伤到核心盘——上线期高伤害率 ${r0.rate}%（${r0.high}/${r0.valid}），成长期为 ${r1.rate}%（${r1.high}/${r1.valid}），成熟期为 ${r2.rate}%（${r2.high}/${r2.valid}）。上线半年内尚未形成稳定留存与信任，一个坏的第一印象更容易转化为结构性伤害；进入成长期后风险仍在，但高伤比例明显回落。</div>`;
  wrap.innerHTML = `<div class="quadStack">${rows}</div>${legend}${insight}`;
}
function renderQuadrantChart() {
  const wrap = document.getElementById('quadrantChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  // 组合：声量(S/A) × 伤害(S/A/B)
  const combos = {};
  all.forEach(c => {
    const v = c.volume || '';
    const d = c.damage || '';
    const vl = /S/.test(v) ? 'S' : 'A';
    let dl = /S/.test(d) ? 'S' : (/A/.test(d) ? 'A' : 'B');
    const key = `声量${vl}+伤害${dl}`;
    combos[key] = (combos[key]||0)+1;
  });
  // 按声量分组，每组堆叠伤害分布
  const groups = [
    {label:'声量 高', filter:k=>k.startsWith('声量S'), color:'#B85450'},
    {label:'声量 中', filter:k=>k.startsWith('声量A'), color:'#8B6F47'},
  ];
  const damageColors = {'S':'#B85450','A':'#8B6F47','B':'#5B7B9A'};
  const total = all.length;
  wrap.innerHTML = `<div class="quadStack">${groups.map(g => {
    const keys = Object.keys(combos).filter(g.filter);
    const groupTotal = keys.reduce((s,k)=>s+combos[k],0);
    const segs = keys.map(k => {
      const dl = k.split('伤害')[1];
      const n = combos[k];
      const w = groupTotal ? n/groupTotal*100 : 0;
      return `<div class="quadStackSeg" style="width:${w}%;background:${damageColors[dl]}" title="${k}: ${n}"></div>`;
    }).join('');
    return `<div class="quadStackRow"><div class="quadStackLabel">${g.label}</div><div class="quadStackBar">${segs}</div><div class="quadStackVal">${groupTotal}</div></div>`;
  }).join('')}</div>`;
  // 图例
  const legend = `<div style="display:flex;gap:14px;margin-top:14px;font-size:12px;color:var(--muted)"><span><span style="display:inline-block;width:10px;height:10px;background:#B85450;border-radius:2px;margin-right:4px"></span>伤害 高</span><span><span style="display:inline-block;width:10px;height:10px;background:#8B6F47;border-radius:2px;margin-right:4px"></span>伤害 中</span><span><span style="display:inline-block;width:10px;height:10px;background:#5B7B9A;border-radius:2px;margin-right:4px"></span>伤害 低</span></div>`;
  wrap.innerHTML += legend;
}

// 通用水平条形图
function renderBarChart(containerId, counter, maxColors) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const entries = Object.entries(counter).sort((a,b)=>b[1]-a[1]).slice(0, 10);
  const max = Math.max(...entries.map(e=>e[1]));
  wrap.innerHTML = entries.map(([k,n], i) => {
    const w = max ? n/max*100 : 0;
    const color = maxColors[i % maxColors.length];
    return `<div><span class="mapBarLabel">${esc(k)}</span><div class="mapBar"><div class="mapBarTrack"><div class="mapBarFill" style="width:${w}%;background:${color}"></div></div><span class="mapBarVal">${n}</span></div></div>`;
  }).join('');
}

function renderMiniDistribution(containerId, title, meta, entries, note, colors){
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const max = Math.max(1, ...entries.map(e=>e.value));
  const rows = entries.map((e,i)=>{
    const w = Math.max(3, e.value / max * 100);
    const color = colors[i % colors.length];
    return `<div class="overviewMiniRow">
      <span class="overviewMiniLabel">${esc(e.label)}</span>
      <div class="overviewMiniTrack"><div class="overviewMiniFill" style="width:${w}%;background:${color}"></div></div>
      <b>${esc(e.display || e.value)}</b>
    </div>`;
  }).join('');
  wrap.innerHTML = `<div class="overviewMiniHead"><h3>${esc(title)}</h3>${meta?`<span>${esc(meta)}</span>`:''}</div>
    <div class="overviewMiniRows">${rows}</div>
    ${note?`<p>${esc(note)}</p>`:''}`;
}

function counterEntries(counter, limit=6){
  return Object.entries(counter)
    .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label,value])=>({label,value}));
}

// 计数分布图统一配色：同一墨蓝色系、由深到浅（bar 按数值降序，最大最深）。
// 颜色不表意，只承担"同族一致感"；语义色（伤害档等）另见 DMG3_COLORS。
const DIST_RAMP = ['#2F3E56','#3E5470','#4E6A8A','#6486A5','#8AA0B8','#B2C0CE','#C9D2DC','#DDE3EA'];

function renderOverviewCards(){
  const all = caseSummaries || [];
  const colors = DIST_RAMP;
  const warmColors = DIST_RAMP;

  const yearCounter = {};
  all.forEach(c=>{ const y=(c.time||'').slice(0,4); if(y) yearCounter[y]=(yearCounter[y]||0)+1; });
  const years = Object.keys(yearCounter).sort();
  const recent = ['2024','2025','2026'].reduce((s,y)=>s+(yearCounter[y]||0),0);
  renderMiniDistribution(
    'overviewTimeCard',
    '时间分布',
    `${all.length} 个案例 · ${years[0] || ''}–${years[years.length-1] || ''}`,
    years.map(y=>({label:y,value:yearCounter[y]})),
    `其中 2024–2026 占 ${recent} 个，以近年为主。`,
    colors
  );

  const genreCounter = {};
  all.forEach(c=>{ if(c.theme) genreCounter[c.theme]=(genreCounter[c.theme]||0)+1; });
  renderMiniDistribution(
    'overviewGenreCard',
    '题材分布',
    '全 5 类',
    counterEntries(genreCounter, 6),
    '按题材分 5 类：二次元 / 写实竞技 / 情怀IP / 乙女向 / 武侠国风。',
    warmColors
  );

  const marketCounter = {};
  all.forEach(c=>{ const m=c.market || '未标注'; marketCounter[m]=(marketCounter[m]||0)+1; });
  renderMiniDistribution(
    'overviewMarketCard',
    '市场分布',
    '',
    counterEntries(marketCounter, 6),
    '',
    DIST_RAMP
  );

  const tagCounter = {};
  all.forEach(c=>caseTags(c).forEach(t=>tagCounter[t]=(tagCounter[t]||0)+1));
  renderMiniDistribution(
    'overviewTagCard',
    '核心矛盾',
    'Top 6',
    counterEntries(tagCounter, 6),
    '只表示出现频次，严重度以上方「核心矛盾 × 伤害」为准。',
    DIST_RAMP
  );

  const prCounter = {};
  all.forEach(c=>{ const p=c.pr || '未标注'; prCounter[p]=(prCounter[p]||0)+1; });
  const prOrder = PR_ORDER.filter(p=>prCounter[p]).map(p=>({label:p,value:prCounter[p]}));
  const prRest = counterEntries(prCounter, 6).filter(e=>!PR_ORDER.includes(e.label));
  renderMiniDistribution(
    'overviewPrCard',
    '公关应对',
    '',
    prOrder.concat(prRest).slice(0,6),
    '只表示处置口径分布，不直接代表处置效果。',
    DIST_RAMP
  );
}

// 品类分布条形图
function renderGenreChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => (c.genre||[]).forEach(g => counter[g] = (counter[g]||0)+1));
  renderBarChart('genreChart', counter, DIST_RAMP);
  const wrap = document.getElementById('genreChart');
  if (wrap) wrap.innerHTML += `<div class="chartInsights chartInsightsSub"><b>洞察：</b>这是样本结构提示，二次元抽卡、乙女向、情怀 IP 等样本较多，后续品类结论更适用于这些样本充足的方向。</div>`;
}

// 核心矛盾聚类条形图
function renderTagsChart() {
  const counter = {};
  (caseSummaries||[]).forEach(c => caseTags(c).forEach(t => counter[t] = (counter[t]||0)+1));
  renderBarChart('tagsChart', counter, DIST_RAMP);
  const wrap = document.getElementById('tagsChart');
  if (wrap) wrap.innerHTML += `<div class="chartInsights chartInsightsSub"><b>洞察：</b>这是基础计数，只回答“哪些矛盾更常见”，不直接回答“哪些更严重”；严重度以上方“核心矛盾 × 伤害”为准。</div>`;
}

// 三维热力图：横纵轴为分类，颜色为伤害，数字为案例数
const PR_ORDER = ['立刻滑跪','正常处理','前期冷处理+后期滑跪','冷处理'];
const DMG3_COLORS = { high:'#B85450', mid:'#D99A3E', low:'#7A93B5', na:'#E6E9ED' };
const DMG3_LABELS = { high:'高', mid:'中', low:'低', na:'无' };
const DMG3_RANK = { high:3, mid:2, low:1, na:0 };

function damageLevelFromCase(c){ return dmgTier3(c.damage); }
function highestDamage(cases){
  if (!cases.length) return 'empty';
  return cases.map(damageLevelFromCase).sort((a,b)=>(DMG3_RANK[b]||0)-(DMG3_RANK[a]||0))[0] || 'na';
}
function damageMix(cases){
  const m={high:0,mid:0,low:0,na:0};
  cases.forEach(c=>m[damageLevelFromCase(c)]++);
  return m;
}
function caseShort(c){ return `${c.game||c.title}: ${(c.summary||c.type||'').slice(0,18)}${(c.summary||c.type||'').length>18?'...':''}`; }
function topNByCount(counter, n, min=1){
  return Object.entries(counter).filter(([,v])=>v>=min).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k])=>k);
}
function matrixCells(rows, cols, getRowVals, getColVals){
  const cells={};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=[]));
  (caseSummaries||[]).forEach(item=>{
    getRowVals(item).filter(v=>rows.includes(v)).forEach(r=>{
      getColVals(item).filter(v=>cols.includes(v)).forEach(c=>{
        cells[`${r}|||${c}`].push(item);
      });
    });
  });
  return cells;
}
function heatLegend(){
  return `<div class="triHeatLegend">
    <span><i style="background:${DMG3_COLORS.high}"></i>出现高伤害</span>
    <span><i style="background:${DMG3_COLORS.mid}"></i>以中伤害为主</span>
    <span><i style="background:${DMG3_COLORS.low}"></i>低伤害</span>
    <span><i style="background:${DMG3_COLORS.na}"></i>无数据/未收录</span>
  </div>`;
}
function renderTriHeatmap({rows, cols, cells, rowTitle='', colTitle='', note='', conclusion='', compact=false}){
  const colHeads = cols.map(c=>`<div class="thColHead">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const list = cells[`${r}|||${c}`] || [];
      const tier = highestDamage(list);
      const mix = damageMix(list);
      const cases = list.slice(0,6).map(caseShort).join('\n');
      const count = list.length;
      const detail = count ? `${r} × ${c}\n案例数：${count}\n伤害：${mix.high}高 / ${mix.mid}中 / ${mix.low}低${mix.na?` / ${mix.na}无`:''}\n${cases}` : `${r} × ${c}\n暂无案例`;
      return `<div class="thCell th-${tier}" title="${esc(detail)}">
        ${count?`<b>${count}</b><span>${mix.high?`${mix.high}高`:mix.mid?`${mix.mid}中`:mix.low?`${mix.low}低`:'无'}</span>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  return `<div class="triHeat${compact?' triHeatCompact':''}">
    <div class="triHeatAxis"><span>${esc(rowTitle)}</span><span>${esc(colTitle)}</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    ${heatLegend()}
    ${conclusion?`<div class="chartInsights"><b>洞察：</b>${conclusion}</div>`:''}
    ${note?`<p class="chartReadNote">${note}</p>`:''}
  </div>`;
}

// 品类 × 核心矛盾 × 伤害
function renderGenreDamageChart() {
  const wrap = document.getElementById('genreDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const themeTotal = {};
  const tagTotal = {};
  all.forEach(c=>{
    if (c.theme) themeTotal[c.theme]=(themeTotal[c.theme]||0)+1;
    caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1);
  });
  const rows = Object.keys(themeTotal).sort((a,b)=>themeTotal[b]-themeTotal[a]);
  const cols = topNByCount(tagTotal, 8);
  // 纯频次统计
  const cells = {};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=0));
  all.forEach(c=>{
    if (c.theme && rows.includes(c.theme)) caseTags(c).forEach(t=>{
      if (cols.includes(t)) cells[`${c.theme}|||${t}`]++;
    });
  });
  // 频次热力图（暖棕色系）
  const maxVal = Math.max(...Object.values(cells), 1);
  const colHeads = cols.map(c=>`<div class="thColHead" data-col="${esc(c)}">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const n = cells[`${r}|||${c}`] || 0;
      const intensity = n / maxVal;
      const bg = n === 0 ? 'transparent' : `rgba(139,111,71,${0.12 + intensity * 0.78})`;
      const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
      return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${esc(c)}: ${n}">
        ${n?`<b style="color:${txtColor}">${n}</b>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(139,111,71,${i});border-radius:2px"></span>`).join('');
  wrap.innerHTML = `<div class="triHeat">
    <div class="triHeatAxis"><span>游戏题材</span><span>核心矛盾</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    <div class="chartInsights"><b>洞察：</b>
      <p style="margin:0 0 6px;font-size:12px;">（各题材样本仅 3–9 个，以下为方向性观察，不宜当作稳定规律。）</p>
      <ul>
        <li data-tag="乙女向"><b>乙女向</b>（n=4）矛盾几乎都落在情感/价值观（3/4）——核心资产是角色关系与情感契约。</li>
        <li data-tag="二次元"><b>二次元</b>（n=9）矛盾偏广：情感/价值观（5）与圈层矛盾（4）最多，付费/商业化其次（3）。</li>
        <li data-tag="写实/竞技"><b>写实/竞技</b>（n=9）集中在商业化与数值/平衡（各 4）——平衡调整和付费机制是最敏感的触发点。</li>
        <li data-tag="情怀IP"><b>情怀IP</b>（n=6）矛盾分散，圈层 / 数值 / 体验各占 2，无单一主导类型。</li>
      </ul>
    </div>
  </div>`;
}

// 玩法 × 核心矛盾（频次热力图）
function renderGameplayTagChart(){
  const wrap = document.getElementById('gameplayTagChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const gameplayTotal = {};
  const tagTotal = {};
  all.forEach(c=>{
    if (c.gameplay) gameplayTotal[c.gameplay]=(gameplayTotal[c.gameplay]||0)+1;
    caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1);
  });
  const rows = Object.keys(gameplayTotal).sort((a,b)=>gameplayTotal[b]-gameplayTotal[a]);
  const cols = topNByCount(tagTotal, 8);
  const cells = {};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=0));
  all.forEach(c=>{
    if (c.gameplay && rows.includes(c.gameplay)) caseTags(c).forEach(t=>{
      if (cols.includes(t)) cells[`${c.gameplay}|||${t}`]++;
    });
  });
  const maxVal = Math.max(...Object.values(cells), 1);
  const colHeads = cols.map(c=>`<div class="thColHead" data-col="${esc(c)}">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const n = cells[`${r}|||${c}`] || 0;
      const intensity = n / maxVal;
      const bg = n === 0 ? 'transparent' : `rgba(91,123,166,${0.12 + intensity * 0.78})`;
      const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
      return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${esc(c)}: ${n}">
        ${n?`<b style="color:${txtColor}">${n}</b>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(91,123,166,${i});border-radius:2px"></span>`).join('');
  wrap.innerHTML = `<div class="triHeat">
    <div class="triHeatAxis"><span>游戏玩法</span><span>核心矛盾</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    <div class="chartInsights"><b>洞察：</b>
      <p style="margin:0 0 6px;font-size:12px;">（各玩法样本仅 4–7 个，以下为方向性观察，不宜当作稳定规律。）</p>
      <ul>
        <li data-tag="模拟/养成"><b>模拟/养成</b>（n=7）以情感/价值观（4）为主，付费内容贬值与体验/质量其次（各 3）——长线情感投入与持续付费是核心。</li>
        <li data-tag="射击"><b>射击</b>（n=6）集中在商业化契约（4）与数值/平衡（2）——付费机制和平衡调整是最敏感的触发点。</li>
        <li data-tag="开放世界"><b>开放世界</b>（n=6）矛盾分散，圈层与体验/质量并列偏多（各 3），无单一主导。</li>
        <li data-tag="抽卡RPG"><b>抽卡RPG</b>（n=4，样本少）矛盾以情感/价值观为主，付费与商业化争议各仅 1 例。</li>
      </ul>
    </div>
  </div>`;
}

// —— 伤害分档辅助：S/A=中高，B=低，无数据/未收录=无（旧·两档，保留兼容）——
function dmgTier(d){
  d = d || '';
  if (d === '无数据' || d === '未收录') return 'na';
  if (/S/.test(d) || d === 'A') return 'high';
  return 'low';
}
// —— 伤害三档：S=高，A=中，B=低，无数据/未收录=无 ——
function dmgTier3(d){
  d = d || '';
  if (d === '无数据' || d === '未收录') return 'na';
  if (/S/.test(d) || d === '高') return 'high';
  if (/A/.test(d) || d === '中') return 'mid';
  return 'low';
}
// —— 核心矛盾标签合并：圈层矛盾-性别 / 圈层矛盾-竞品 统称「圈层矛盾」 ——
const mergeTag = t => (t||'').startsWith('圈层矛盾') ? '圈层矛盾' : (t||'');
// 返回单个案例去重后的合并标签数组
const caseTags = c => [...new Set((c.tags||[]).map(mergeTag).filter(Boolean))];
// 图1 · 核心矛盾 × 伤害（分层堆叠柱状图）
function renderTagDamageChart(){
  const wrap = document.getElementById('tagDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  // 收集标签和伤害档位
  const tagTotal = {};
  all.forEach(c => caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1));
  const rows = topNByCount(tagTotal, 9);
  const agg = {};
  rows.forEach(r=>agg[r]={high:0,mid:0,low:0,total:0});
  all.forEach(c=>{
    const tier = dmgTier3(c.damage);
    if (tier === 'na') return; // 跳过无数据案例
    caseTags(c).forEach(t=>{
      if (agg[t]) { agg[t][tier]++; agg[t].total++; }
    });
  });
  const C = DMG3_COLORS;
  const maxTotal = Math.max(...rows.map(r=>agg[r].total), 1);
  const seg = (n, tier, r) => n
    ? `<div class="gdSeg" style="width:${n/agg[r].total*100}%;background:${C[tier]};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;overflow:hidden" title="${esc(r)} × ${DMG3_LABELS[tier]}伤害: ${n}">${n}</div>`
    : '';
  const bars = rows.map(r=>{
    const d = agg[r];
    const w = d.total / maxTotal * 100;
    return `<div class="gdRow" data-tag="${esc(r)}" data-row="${esc(r)}">
      <div class="gdGenre">${esc(r)} <span class="gdCount">${d.total}</span></div>
      <div class="gdBars"><div class="gdBarLine">
        <div class="gdBar" style="width:${w}%">${seg(d.high,'high',r)}${seg(d.mid,'mid',r)}${seg(d.low,'low',r)}</div>
        <span class="gdBarVal">${d.high}高 / ${d.mid}中 / ${d.low}低</span>
      </div></div>
    </div>`;
  }).join('');
  const legend = `<div class="gdLegend">
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.high}"></span>高伤害(S)</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.mid}"></span>中伤害(A)</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.low}"></span>低伤害(B)</span>
  </div>`;
  wrap.innerHTML = `<div class="triHeatAxis"><span>核心矛盾</span><span>伤害档位分布（按案例数堆叠）</span></div>
    <div class="gdRows">${bars}</div>${legend}
    <div class="chartInsights"><b>洞察：</b>
      <p style="margin:0 0 6px;font-size:12px;">（各矛盾类型的有效样本约 4–10 个，占比为方向性参考。）</p>
      <ul>
        <li data-tag="商业化契约/动机争议,体验/质量争议"><b>商业化契约/动机争议</b>和<b>体验/质量争议</b>的高伤害占比最高（分别 62%、5/8 和 67%、4/6）——前者是玩家认为厂商"故意坑钱"时信任受损，后者是基础品质问题直接导致流失。这两类矛盾最容易实质伤到留存盘。</li>
        <li data-tag="情感/价值观争议"><b>情感/价值观争议</b>呈两极分化（有效 10 例：高 4 / 中 2 / 低 4，高伤占比 40%）——触及情感契约底线则伤及留存，未触及则只是情绪宣泄。</li>
        <li data-tag="数值/平衡争议"><b>数值/平衡争议</b>以低伤害为主（17%），多数可通过后续调整修复。</li>
      </ul>
    </div>`;
}

// 图2 · 声量 × 核心矛盾（频次热力图）
function renderScopeTagChart(){
  const wrap = document.getElementById('scopeTagChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const tagTotal = {};
  all.forEach(c => caseTags(c).forEach(t=>tagTotal[t]=(tagTotal[t]||0)+1));
  const rows = ['高声量','中声量'];
  const cols = topNByCount(tagTotal, 7);
  const cells = {};
  rows.forEach(r=>cols.forEach(c=>cells[`${r}|||${c}`]=0));
  all.forEach(c=>{
    const vol = c.volume || '';
    let scope;
    if (/S/.test(vol)) scope = '高声量';
    else if (/A/.test(vol)) scope = '中声量';
    else scope = '低声量';
    caseTags(c).forEach(t=>{
      if (cols.includes(t)) cells[`${scope}|||${t}`]++;
    });
  });
  const maxVal = Math.max(...Object.values(cells), 1);
  const colHeads = cols.map(c=>`<div class="thColHead" data-col="${esc(c)}">${esc(c)}</div>`).join('');
  const body = rows.map(r=>{
    const cellHtml = cols.map(c=>{
      const n = cells[`${r}|||${c}`] || 0;
      const intensity = n / maxVal;
      const bg = n === 0 ? 'transparent' : `rgba(44,62,92,${0.12 + intensity * 0.78})`;
      const txtColor = intensity > 0.5 ? '#fff' : 'var(--text)';
      return `<div class="thCell" data-row="${esc(r)}" data-col="${esc(c)}" style="background:${bg};${n===0?'border:1px solid var(--line)':''}" title="${esc(r)} × ${esc(c)}: ${n}">
        ${n?`<b style="color:${txtColor}">${n}</b>`:''}
      </div>`;
    }).join('');
    return `<div class="thRow"><div class="thRowHead" data-row="${esc(r)}">${esc(r)}</div>${cellHtml}</div>`;
  }).join('');
  const legendStops = [0.12,0.3,0.5,0.7,0.9].map(i=>`<span style="display:inline-block;width:14px;height:10px;background:rgba(44,62,92,${i});border-radius:2px"></span>`).join('');
  wrap.innerHTML = `<div class="triHeat">
    <div class="triHeatAxis"><span>声量</span><span>核心矛盾</span></div>
    <div class="triHeatGrid" style="--th-cols:${cols.length}">
      <div class="thCorner"></div>${colHeads}${body}
    </div>
    <div class="heatLegend" style="justify-content:center"><span style="font-size:11px;color:var(--muted)">案例数：</span>少${legendStops}多</div>
    <div class="chartInsights"><b>说明：</b>
      <p style="margin:0;">全库样本仅高声量（S）与中声量（A）两档、且各约占一半，没有低声量样本作基线；各矛盾类型在高 / 中声量间的分布无显著差异（如情感/价值观 7 : 4、内容尺度/合规 3 : 2），不足以判断"哪类更易破圈"。此图仅作声量 × 矛盾的构成参考。</p>
    </div>
  </div>`;
}

// 图3 · 公关应对 × 伤害（含选择效应说明）— 三档：高/中/低
function renderPrDamageChart(){
  const wrap = document.getElementById('prDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const order = ['立刻滑跪','正常处理','前期冷处理+后期滑跪','冷处理'];
  const data = {}; order.forEach(p=> data[p]={high:0,mid:0,low:0,na:0,total:0});
  all.forEach(c => {
    const p = c.pr; if (!data[p]) return;
    data[p][dmgTier3(c.damage)]++; data[p].total++;
  });
  const rows = order.filter(p=>data[p].total>0);
  const maxTotal = Math.max(...rows.map(p=>data[p].total));
  const C = DMG3_COLORS;
  const html = rows.map(p=>{
    const d=data[p]; const w=d.total/maxTotal*100;
    const hi=d.total?d.high/d.total*100:0, mi=d.total?d.mid/d.total*100:0, lo=d.total?d.low/d.total*100:0, na=d.total?d.na/d.total*100:0;
    return `<div class="gdRow" data-row="${esc(p)}">
      <div class="gdGenre">${esc(p)} <span class="gdCount">${d.total}</span></div>
      <div class="gdBars"><div class="gdBarLine">
        <span class="gdBarLabel">伤害</span>
        <div class="gdBar" style="width:${w}%">
          <div class="gdSeg" style="width:${hi}%;background:${C.high}" title="高伤害(S): ${d.high}"></div>
          <div class="gdSeg" style="width:${mi}%;background:${C.mid}" title="中伤害(A): ${d.mid}"></div>
          <div class="gdSeg" style="width:${lo}%;background:${C.low}" title="低伤害(B): ${d.low}"></div>
          <div class="gdSeg" style="width:${na}%;background:${C.na}" title="无数据/未收录: ${d.na}"></div>
        </div>
        <span class="gdBarVal">${d.high}高 / ${d.mid}中 / ${d.low}低${d.na?` / ${d.na}无`:''}</span>
      </div></div>
    </div>`;
  }).join('');
  const legend = `<div class="gdLegend">
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.high}"></span>高伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.mid}"></span>中伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.low}"></span>低伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.na}"></span>无数据/未收录</span>
  </div>`;
  wrap.innerHTML = `<div class="gdRows">${html}</div>${legend}
    <div class="chartInsights"><b>洞察：</b>
      <p style="margin:0 0 8px;">先看数据本身：四种处置方式与伤害档位之间并非随机分布，而是存在明显的匹配关系——说明官方并非"随便选一个应对方式"，处置选择与事件性质高度相关。</p>
      <ul>
        <li data-tag="立刻滑跪,前期冷处理+后期滑跪"><b>滑跪（含立刻滑跪和后期滑跪）</b>的伤害分布比其它处置更偏向中 / 高档（合并后 16 例中，中 / 高伤害 12 例、低伤害仅 1 例、无数据 / 未收录 3 例），且触及核心付费 / 契约的案例几乎都会滑跪。这说明滑跪更多是<b>事件已被判定为"动了根基"后的止损选择</b>——不是"滑跪导致高伤害"，而是"判断伤到核心才滑跪"（选择效应，非因果）。需注意：单看"立刻滑跪"一项，伤害分布其实较分散（高/中/低都有），滑跪速度本身是姿态选择，不能直接当作严重度信号。</li>
        <li data-tag="冷处理"><b>冷处理</b>清一色低伤害（5 例全为低伤害），说明它多用于官方判断"没动到核心盘"的场景。风险在于误判：<b>世界之外</b>与<b>崩坏3</b>最初都想用冷处理应对核心契约 / 情感被击穿的事件，结果误判为动了根基、被迫在后期滑跪道歉（归入"前期冷处理 + 后期滑跪"），错过了最佳止损窗口——冷处理一旦用错场景，代价就是从低伤直接被拖成中 / 高伤。</li>
        <li data-tag="正常处理"><b>正常处理</b>也偏低伤害（6/10 低、3 例高），是矛盾可控、诉求明确时的标准路径——按常规节奏公告说明即可。</li>
      </ul>
      <p style="margin:8px 0 0;"><b>一句话结论：</b>处置方式没有绝对优劣，关键是匹配事件性质——触及核心付费就快速止损，没触及就冷处理，判断对了比选哪个更重要。</p>
    </div>`;
}

// 图4「结局落点分布」已废弃：落点统一由 matrixCell() 生成，并在 Mapping 页九宫格呈现，
// 不再单独维护基于 resultCell 字段的分布图（原 renderResultCellChart 已移除）。


/* ============================================================
   结论页（改）· 专属图表渲染
   逻辑：先给核心观点，再用"能证明它"的图/案例做论证——
   图是证据，不追求全量统计。全部基于全库 31 案实时计算。
   ============================================================ */

function c2CaseLabel(c){
  return c ? (c.title || c.game || c.name || c.id || '未命名案例') : '未命名案例';
}
function c2CaseList(items){
  return (items || []).length ? items.map(c2CaseLabel).join('；') : '无';
}

// —— C2 图1 · 核心矛盾 × 伤害：分段柱 + 中高伤害率折线（SVG 组合图）——
function renderC2TagDamage(){
  const wrap = document.getElementById('c2TagDamageChart');
  if (!wrap) return;
  const all = caseSummaries || [];
  const agg = {};
  all.forEach(c => caseTags(c).forEach(t=>{
    (agg[t] = agg[t] || {high:0,mid:0,low:0,na:0,items:{high:[],mid:[],low:[],na:[]}});
    const tier=dmgTier3(c.damage);
    agg[t][tier]++;
    agg[t].items[tier].push(c);
  }));
  // 取有效样本≥6 的矛盾，按"中高伤害率"降序，折线才有清晰走势
  const rows = Object.entries(agg)
    .map(([t,d])=>{const eff=d.high+d.mid+d.low; return {t,d,eff,mh:eff?(d.high+d.mid)/eff:0,hi:eff?d.high/eff:0};})
    .filter(r=>r.eff>=6)
    .sort((a,b)=>b.mh-a.mh);
  const C = DMG3_COLORS;
  const LINE='#B85450';
  const W=640, H=620, padL=40, padR=52, padT=55, padB=90;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const n=rows.length, slot=plotW/n, bw=Math.min(46, slot*0.5);
  const maxCount=Math.max(...rows.map(r=>r.eff),1);
  const yCount=v=> padT+plotH-(v/maxCount)*plotH;
  const yRate=v=> padT+plotH-(v)*plotH; // v in 0..1
  // 右轴虚线网格（0/50/100%）——先铺底
  let grid='';
  [0,.5,1].forEach(v=>{grid+=`<line x1="${padL}" y1="${yRate(v).toFixed(1)}" x2="${W-padR}" y2="${yRate(v).toFixed(1)}" stroke="${v?'#EbC9C7':'var(--line)'}" stroke-dasharray="${v?'3,4':'0'}"/>`;});
  // 柱（堆叠 高/中/低）
  let bars='', line='', dots='', xlabels='', rlabels='';
  rows.forEach((r,i)=>{
    const cx=padL+slot*i+slot/2;
    const bx=cx-bw/2;
    let yTop=padT+plotH;
    [['low',C.low],['mid',C.mid],['high',C.high]].forEach(([k,col])=>{
      const v=r.d[k]; if(!v) return;
      const h=(v/maxCount)*plotH;
      yTop-=h;
      bars+=`<rect x="${bx.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="${col}" style="cursor:help"><title>${esc(`${r.t} · ${k==='high'?'高':k==='mid'?'中':'低'}伤害 ${v} 例：${c2CaseList(r.d.items[k])}`)}</title></rect>`;
      if(h>13) bars+=`<text x="${cx.toFixed(1)}" y="${(yTop+h/2+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#fff">${v}</text>`;
    });
  });
  // 折线画在柱之上（先连线，再画带白色药丸底的数值 + 描边点）
  rows.forEach((r,i)=>{
    const cx=padL+slot*i+slot/2;
    const py=yRate(r.mh);
    if(i>0){const p=rows[i-1];const pcx=padL+slot*(i-1)+slot/2;line+=`<line x1="${pcx.toFixed(1)}" y1="${yRate(p.mh).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${py.toFixed(1)}" stroke="${LINE}" stroke-width="3"/>`;}
  });
  rows.forEach((r,i)=>{
    const cx=padL+slot*i+slot/2;
    const py=yRate(r.mh);
    const pct=Math.round(r.mh*100)+'%';
    const lblY=py-13; const tw=pct.length*8+8;
    const mhCases=[...r.d.items.high,...r.d.items.mid];
    dots+=`<circle cx="${cx.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="#fff" stroke="${LINE}" stroke-width="3" style="cursor:help"><title>${esc(`${r.t} · 中高伤害率 ${pct}：${c2CaseList(mhCases)}`)}</title></circle>`;
    dots+=`<rect x="${(cx-tw/2).toFixed(1)}" y="${(lblY-12).toFixed(1)}" width="${tw}" height="17" rx="8.5" fill="#fff" stroke="${LINE}" stroke-width="1" opacity="0.96"/>`;
    dots+=`<text x="${cx.toFixed(1)}" y="${(lblY).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="${LINE}">${pct}</text>`;
  });
  rows.forEach((r,i)=>{
    const cx=padL+slot*i+slot/2;
    // x 轴标签（可能较长，两行）
    const label=r.t.replace(/争议$/,'').replace('/','/');
    xlabels+=`<text x="${cx.toFixed(1)}" y="${(padT+plotH+16).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(label.length>6?label.slice(0,6):label)}</text>`;
    if(label.length>6) xlabels+=`<text x="${cx.toFixed(1)}" y="${(padT+plotH+30).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(label.slice(6))}</text>`;
    xlabels+=`<text x="${cx.toFixed(1)}" y="${(padT+plotH+(label.length>6?44:30)).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--muted)">n=${r.eff}</text>`;
  });
  // 右轴 0/50/100%
  [0,.5,1].forEach(v=>{rlabels+=`<text x="${(W-padR+8)}" y="${(yRate(v)+4).toFixed(1)}" font-size="10" font-weight="600" fill="${LINE}">${Math.round(v*100)}%</text>`;});
  const svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:980px;display:block;margin:0 auto">${grid}<line x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}" stroke="var(--line)"/>${bars}${line}${dots}${xlabels}${rlabels}</svg>`;
  const legend=`<div class="gdLegend" style="justify-content:center;margin-top:4px">
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.high}"></span>高伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.mid}"></span>中伤害</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.low}"></span>低伤害</span>
    <span class="gdLegendItem"><span style="display:inline-block;width:16px;height:3px;background:${LINE};vertical-align:middle;margin-right:4px;border-radius:2px"></span>中高伤害率（折线，右轴）</span>
  </div>`;
  wrap.innerHTML = svg + legend;
  document.querySelectorAll('#conclusions2 .c2DamageCardCases[data-damage-tag]').forEach(el=>{
    const tag=el.dataset.damageTag;
    const cases=all.filter(c=>caseTags(c).includes(tag)&&dmgTier3(c.damage)==='high');
    el.innerHTML=`<span>高伤案例</span>${cases.length?cases.map(c=>`<a class="conclCase" onclick="openCase('${c.id}')" title="${esc(c.title)}">${esc(c.game||c.title)}</a>`).join(''):'<small>暂无</small>'}`;
  });
}

// —— C2 图2b · 上线期（0–0.5 年）高伤 6 案根因分类（色条 + 可点击案例 chip）——
const C2_LAUNCH_ROOTS = [
  { name:'付费诚信问题', color:'#B85450', cases:[['fengzhigu-refund','枫之谷']], desc:'暗改数值 / 付费属性失真，击穿消费信任' },
  { name:'产品定位错位', color:'#D99A3E', cases:[['hpmagic-pay','哈利波特'],['gf2-daiyan','少女前线2'],['shediao-bjd','射雕']], desc:'定价 / 角色 / 建模定位与核心用户预期冲突' },
  { name:'资格 / 权益合规触线', color:'#8E7CC3', cases:[['helldivers2-psn','绝地潜兵2']], desc:'强绑 PSN，直接影响已购用户游玩资格' },
  { name:'开服质量崩坏', color:'#7A93B5', cases:[['moer-manor','摩尔庄园']], desc:'bug / 外挂 / 骗氪，承接不住上线预期' },
];
function renderC2LaunchRoots(){
  const wrap=document.getElementById('c2LaunchRoots');
  if(!wrap) return;
  const maxN=Math.max(...C2_LAUNCH_ROOTS.map(r=>r.cases.length));
  wrap.innerHTML = C2_LAUNCH_ROOTS.map(r=>{
    const chips=r.cases.map(([id,nm])=>`<a class="conclCase" onclick="openCase('${id}')">${nm}</a>`).join('');
    // 柱条略长(最长 116px)，数量标在柱右、用柱色
    const barW=Math.round(r.cases.length/maxN*116);
    return `<div class="c2RootRow">
      <div class="c2RootHead">
        <div class="n">${r.name}</div>
        <div class="dsc">${r.desc}</div>
      </div>
      <div class="c2RootBar" title="${esc(`${r.name}：${r.cases.map(x=>x[1]).join('；')}`)}"><div class="b" style="width:${barW}px;background:${r.color};cursor:help"></div><span class="cnt" style="color:${r.color}">${r.cases.length}</span></div>
      <div class="c2RootCases">${chips}</div>
    </div>`;
  }).join('');
}

// —— C2 图3 · 破圈率横向条形（通用渲染）——
// rows: [{name, tot, rate}]，已排序；只渲染，不做排序/截断
function c2RenderBreakoutBars(wrap, rows, labelW){
  wrap.innerHTML = rows.map(r=>{
    const pct=Math.round(r.rate*100);
    const col = pct>=80?'#B85450':pct>=50?'#D99A3E':'#7A93B5';
    return `<div style="display:flex;align-items:center;gap:10px;margin:9px 0">
      <div style="flex:0 0 ${labelW}px;text-align:right;font-size:13px;color:var(--text);line-height:1.3">${r.name}</div>
      <div style="flex:1 1 auto;background:var(--soft);border-radius:5px;height:20px;position:relative;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:5px"></div>
      </div>
      <div style="flex:0 0 90px;font-size:12px;color:var(--muted)"><b style="color:${col}">${pct}%</b> <span style="color:var(--muted)">(n=${r.tot})</span></div>
    </div>`;
  }).join('');
}
// 图3左 · 品类 × 声量 破圈率（Top6）
function renderC2Breakout(){
  const wrap=document.getElementById('c2BreakoutChart');
  if(!wrap) return;
  const gv={};
  (caseSummaries||[]).forEach(c=>(c.genre||[]).forEach(g=>{
    (gv[g]=gv[g]||{S:0,A:0});
    if(c.volume==='S') gv[g].S++; else if(c.volume==='A') gv[g].A++;
  }));
  const rows=Object.entries(gv)
    .map(([g,d])=>({name:g,tot:d.S+d.A,rate:(d.S+d.A)?d.S/(d.S+d.A):0}))
    .filter(r=>r.tot>=3)
    .sort((a,b)=>b.rate-a.rate || b.tot-a.tot)
    .slice(0,6);
  c2RenderBreakoutBars(wrap, rows, 84);
}
// 图3右 · 核心矛盾 × 声量 破圈率（Top6）
function renderC2ContraBreakout(){
  const wrap=document.getElementById('c2ContraBreakoutChart');
  if(!wrap) return;
  const tv={};
  (caseSummaries||[]).forEach(c=>caseTags(c).forEach(t=>{
    (tv[t]=tv[t]||{S:0,A:0});
    if(c.volume==='S') tv[t].S++; else if(c.volume==='A') tv[t].A++;
  }));
  const rows=Object.entries(tv)
    .map(([t,d])=>({name:t,tot:d.S+d.A,rate:(d.S+d.A)?d.S/(d.S+d.A):0}))
    .filter(r=>r.tot>=3)
    .sort((a,b)=>b.rate-a.rate || b.tot-a.tot)
    .slice(0,6);
  c2RenderBreakoutBars(wrap, rows, 128);
}

// —— C2 图4 · 品类核心契约红线（契约句式 + 卡内案例 + 中高伤率柱）——
// genres: 该品类涵盖的题材（用于统计踩线中高伤害率）
const C2_REDLINE = [
  {g:'情怀 IP', color:'#D99A3E', contract:'"记忆"', line:'不能背离玩家熟悉的记忆',
   statIds:['luoke-s2','dnf-pc-harmony','hpmagic-pay'],
   criteria:[
     {t:'经典形象 / 玩法 / 画风被篡改、阉割', cases:[['luoke-s2','洛克王国'],['dnf-pc-harmony','DNF端游']]},
     {t:'IP 沦为噱头、被拿来当皮卖别的东西', cases:[['hpmagic-pay','哈利波特']]},
   ]},
  {g:'情感陪伴类（乙游 / 二游）', color:'#B85450', contract:'"情感专属"', line:'陪伴断供或专属被背叛即崩塌',
   statIds:['lianyu-aoyin','gf2-daiyan'],
   criteria:[
     {t:'现有角色停更断供，玩家的情感陪伴需求得不到持续满足', cases:[['lianyu-aoyin','恋与·敖尹']]},
     {t:'角色 OOC、与他人暧昧或被移情，背叛专属关系', cases:[['gf2-daiyan','少前2·黛烟']]},
   ]},
  {g:'竞技 / 射击', color:'#3B6EA5', contract:'"规则公平"', line:'规则被单方推翻即触雷',
   statIds:['diablo4-p11','helldivers2-nerf','wzry-s40','apex-bp','helldivers2-psn','sanjiaozhou-jail'],
   criteria:[
     {t:'我积累的数值 / 强度，被官方一纸补丁削弱', cases:[['diablo4-p11','暗黑4'],['helldivers2-nerf','潜兵2·削弱'],['wzry-s40','王者荣耀']]},
     {t:'既定的经济 / 准入 / 玩法规则中途变卦，推翻已成立的契约', cases:[['apex-bp','Apex'],['helldivers2-psn','潜兵2·PSN'],['sanjiaozhou-jail','三角洲']]},
   ]},
  {g:'抽卡 RPG', color:'#8E7CC3', contract:'"资产保值"', line:'已购资产被事后暗改、贬值即零容忍',
   statIds:['yuanshen-longwang'],
   criteria:[
     {t:'我氪金抽到的角色 / 强度 / 机制，被官方事后暗改、削弱、贬值', cases:[['yuanshen-longwang','原神·那维']]},
   ]},
];
function renderC2Redline(){
  const wrap=document.getElementById('c2RedlineChart');
  if(!wrap) return;
  const byId={}; (caseSummaries||[]).forEach(c=>{byId[c.id]=c;});
  // 计算各品类踩线中高伤害率
  const rate={};
  C2_REDLINE.forEach(r=>{
    let hi=0,mid=0,lo=0; const items=[];
    (r.statIds||[]).forEach(id=>{
      const c=byId[id]; if(!c) return;
      const t=dmgTier3(c.damage);
      if(t==='high'){hi++;items.push(c);} else if(t==='mid'){mid++;items.push(c);} else if(t==='low'){lo++;items.push(c);}
    });
    const eff=hi+mid+lo;
    rate[r.g]={mh:eff?Math.round((hi+mid)/eff*100):0, n:eff, items};
  });
  const isHi=id=>{const c=byId[id];return c&&dmgTier3(c.damage)==='high';};
  const chipHtml=(id,nm,color)=>{
    const hi=isHi(id);
    const cls=hi?'conclCase c2RedHi':'conclCase';
    const st =hi?` style="border-color:${color};color:${color}"`:'';
    return `<a class="${cls}"${st} onclick="openCase('${id}')">${nm}</a>`;
  };
  wrap.innerHTML = `<div class="c2RedGrid">${
    C2_REDLINE.map(r=>{
      let body;
      if(r.criteria){
        // 新结构：分条列出踩线标准，每条后跟对应案例
        body = `<ol class="c2RedCrit">${
          r.criteria.map(cr=>{
            const ordered=cr.cases.slice().sort((a,b)=>isHi(b[0])-isHi(a[0]));
            const chips=ordered.map(([id,nm])=>chipHtml(id,nm,r.color)).join('');
            return `<li><span class="ct">${cr.t}</span><span class="cs">${chips}</span></li>`;
          }).join('')
        }</ol>`;
      }else{
        // 旧结构（暂未逐条细分的品类）
        const ordered=r.cases.map((x,i)=>[x,i])
          .sort((a,b)=>(isHi(b[0][0])-isHi(a[0][0]))||(a[1]-b[1]))
          .map(x=>x[0]);
        const chips=ordered.map(([id,nm])=>chipHtml(id,nm,r.color)).join('');
        body = `<div class="d">契约是${r.contract}，<b>${r.line}</b>。</div><div class="cs">${chips}</div>`;
      }
      const rt=rate[r.g];
      return `<div class="c2RedItem" style="border-left-color:${r.color}">
        <div class="h" style="color:${r.color}">${r.g}</div>
        <div class="rl">红线：${r.contract} — <b>${r.line}</b></div>
        ${body}
        <div class="c2RedRate">
          <div class="lbl">踩线案例中高伤害率（n=${rt.n}）</div>
          <div class="row" title="${esc(`${r.g}踩线案例：${c2CaseList(rt.items)}`)}"><div class="track"><div class="fill" style="width:${rt.mh}%;background:${r.color};cursor:help"></div></div><span class="val" style="color:${r.color}">${rt.mh}%</span></div>
        </div>
      </div>`;
    }).join('')
  }</div>`;
}

// —— C2 图5 · 官方处置烈度 × 中高伤害比例（横向条形）——
function renderC2PrChart(){
  const wrap=document.getElementById('c2PrChart');
  if(!wrap) return;
  const order=['冷处理','正常处理','立刻滑跪','前期冷处理+后期滑跪'];
  const agg={}; order.forEach(p=>agg[p]={high:0,mid:0,low:0,na:0,items:{high:[],mid:[],low:[],na:[]}});
  (caseSummaries||[]).forEach(c=>{ if(agg[c.pr]){const tier=dmgTier3(c.damage);agg[c.pr][tier]++;agg[c.pr].items[tier].push(c);} });
  wrap.innerHTML = order.map(p=>{
    const d=agg[p]; const eff=d.high+d.mid+d.low;
    const mh=eff?Math.round((d.high+d.mid)/eff*100):0;
    const col = mh>=70?'#B85450':mh>=40?'#D99A3E':'#7A93B5';
    const warn = p.indexOf('后期滑跪')>=0;
    return `<div style="display:flex;align-items:center;gap:10px;margin:8px 0">
      <div style="flex:0 0 132px;text-align:right;font-size:13px;color:var(--text)">${p}${warn?'<span style="color:var(--red);font-size:11px"> ⚠</span>':''}</div>
      <div style="flex:1 1 auto;background:var(--soft);border-radius:5px;height:22px;overflow:hidden">
        <div style="height:100%;width:${mh}%;background:${col};border-radius:5px;cursor:help" title="${esc(`${p} · 中高伤害：${c2CaseList([...d.items.high,...d.items.mid])}；低伤害：${c2CaseList(d.items.low)}`)}"></div>
      </div>
      <div style="flex:0 0 96px;font-size:12px;color:var(--muted)"><b style="color:${col}">${mh}%</b> <span>(n=${eff})</span></div>
    </div>`;
  }).join('');
}

// —— C2 图1b · 情感/圈层「中高伤害」乙游二游集中度（竖向分组堆叠柱，与左图等高）——
const C2_YO_GENRE = new Set(['乙女向','二次元']);
function isYoErYou(c){ return (c.genre||[]).some(g=>C2_YO_GENRE.has(g)); }
function renderC2YoConcentration(){
  const wrap=document.getElementById('c2YoConcChart');
  if(!wrap) return;
  const groups=[['情感/价值观争议','情感重伤'],['圈层矛盾','圈层重伤']];
  const rows=groups.map(([tag,label])=>{
    let yo=0, other=0;
    (caseSummaries||[]).forEach(c=>{
      if(caseTags(c).indexOf(tag)<0) return;
      const t=dmgTier3(c.damage);
      if(t!=='high'&&t!=='mid') return;
      if(isYoErYou(c)) yo++; else other++;
    });
    return {label, yo, other, tot:yo+other};
  });
  const YOCOL='#B85450', OTHCOL='#C9CFD8';
  // 竖向柱：viewBox 与左图一致(640×316)，保证渲染后视觉等高
  const W=640, H=316, padL=40, padR=52, padT=40, padB=66;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const maxV=Math.max(1,...rows.map(r=>r.tot));
  const slot=plotW/rows.length, bw=Math.min(120, slot*0.5);
  const yy=v=> padT+plotH-(v/maxV)*plotH;
  let grid='',bars='',axis='';
  for(let v=0;v<=maxV;v++){grid+=`<line x1="${padL}" y1="${yy(v).toFixed(1)}" x2="${W-padR}" y2="${yy(v).toFixed(1)}" stroke="var(--line)" stroke-dasharray="${v?'2,4':'0'}"/><text x="${padL-7}" y="${(yy(v)+3).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`;}
  rows.forEach((r,i)=>{
    const cx=padL+slot*i+slot/2, bx=cx-bw/2;
    const pct=r.tot?Math.round(r.yo/r.tot*100):0;
    let yTop=padT+plotH;
    [['other',OTHCOL,'#5a626e'],['yo',YOCOL,'#fff']].forEach(([k,col,tc])=>{
      const v=r[k]; if(!v) return;
      const h=(v/maxV)*plotH; yTop-=h;
      bars+=`<rect x="${bx.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="${col}"><title>${r.label} · ${k==='yo'?'乙游二游':'其他品类'} ${v}</title></rect>`;
      if(k==='yo'){
        // 大号占比 + 例数
        bars+=`<text x="${cx.toFixed(1)}" y="${(yTop+h/2-2).toFixed(1)}" text-anchor="middle" font-size="26" font-weight="800" fill="${tc}">${pct}%</text>`;
        bars+=`<text x="${cx.toFixed(1)}" y="${(yTop+h/2+17).toFixed(1)}" text-anchor="middle" font-size="12" fill="${tc}">乙游二游 ${v} 例</text>`;
      }else{
        bars+=`<text x="${cx.toFixed(1)}" y="${(yTop+h/2+4).toFixed(1)}" text-anchor="middle" font-size="12" fill="${tc}">其他 ${v}</text>`;
      }
    });
    // 顶部总数
    bars+=`<text x="${cx.toFixed(1)}" y="${(yy(r.tot)-8).toFixed(1)}" text-anchor="middle" font-size="12" fill="var(--muted)">共 ${r.tot} 例</text>`;
    // 类别标签
    axis+=`<text x="${cx.toFixed(1)}" y="${(padT+plotH+22).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">${r.label}</text>`;
  });
  const svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:660px;display:block;margin:0 auto"><line x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}" stroke="var(--line)"/>${grid}${bars}${axis}</svg>`;
  const legend=`<div class="gdLegend" style="justify-content:center;margin-top:4px">
    <span class="gdLegendItem"><span class="gdDot" style="background:${YOCOL}"></span>乙游二游（乙女向 / 二次元）</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${OTHCOL}"></span>其他品类</span>
  </div>`;
  wrap.innerHTML = svg + legend;
}

// —— C2 图7a · 性别议题案例分布与声量/伤害对照 ——
const C2_GENDER_CASE_IDS=new Set(['yanyun-female','lianyu-scale','chenbai-forbidden','luoke-s2','lianyu-aoyin']);
function renderC2GenderTrend(){
  const wrap=document.getElementById('c2GenderTrendChart');
  if(!wrap) return;
  const samples=(caseSummaries||[]).filter(c=>C2_GENDER_CASE_IDS.has(c.id));
  const titleEsc=s=>String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const caseName=c=>c.title||c.name||c.game||c.id;
  const caseList=items=>items.map(caseName).join('；');
  const buckets=[
    {label:'2021–2024',years:[2021,2022,2023,2024],n:0,cases:[],recent:false},
    {label:'2025',years:[2025],n:0,cases:[],recent:true},
    {label:'2026',years:[2026],n:0,cases:[],recent:true}
  ];
  samples.forEach(c=>{
    const y=parseInt((c.time||'').slice(0,4),10); if(!y) return;
    const bucket=buckets.find(b=>b.years.includes(y)); if(bucket){bucket.n++;bucket.cases.push(c);}
  });
  const W=560,H=220,padL=82,padR=42,padT=26,padB=26;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const maxV=Math.max(1,...buckets.map(b=>b.n));
  const slot=plotH/buckets.length, bh=Math.min(34,slot*0.58);
  let grid='',bars='',axis='';
  for(let v=0;v<=maxV;v++){
    const x=padL+(v/maxV)*plotW;
    grid+=`<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${padT+plotH}" stroke="var(--line)" stroke-dasharray="2,4"/>`;
  }
  buckets.forEach((b,i)=>{
    const cy=padT+slot*i+slot/2, yTop=cy-bh/2;
    const barW=(b.n/maxV)*plotW;
    const col=b.recent?'#B85450':'#D4C0C0';
    axis+=`<text x="${padL-10}" y="${(cy+4).toFixed(1)}" text-anchor="end" font-size="11" font-weight="700" fill="var(--text)">${b.label}</text>`;
    bars+=`<rect x="${padL}" y="${yTop.toFixed(1)}" width="${plotW}" height="${bh}" rx="5" fill="#EEF1F5"/>`;
    if(b.n){
      bars+=`<rect x="${padL}" y="${yTop.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh}" rx="5" fill="${col}" style="cursor:help"><title>${titleEsc(`${b.label} · ${b.n}例：${caseList(b.cases)}`)}</title></rect>`;
    }
    bars+=`<text x="${W-padR+12}" y="${(cy+4).toFixed(1)}" text-anchor="start" font-size="11" font-weight="800" fill="${b.n?'var(--text)':'var(--muted)'}">${b.n}</text>`;
  });
  wrap.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;margin:0 auto">${grid}${bars}${axis}</svg>`;

  const impact=document.getElementById('c2GenderImpactChart');
  if(!impact) return;
  const volumeHigh=samples.filter(c=>gradeLevel(c.volume)==='高');
  const damageGroups=[
    {name:'高伤害',items:samples.filter(c=>gradeLevel(c.damage)==='高'),color:'#B85450'},
    {name:'中伤害',items:samples.filter(c=>gradeLevel(c.damage)==='中'),color:'#D99A34'},
    {name:'低伤害',items:samples.filter(c=>gradeLevel(c.damage)==='低'),color:'#7E99BC'}
  ];
  const pct=n=>samples.length?Math.round(n/samples.length*100):0;
  const volumePct=pct(volumeHigh.length);
  const damageBars=damageGroups.map(g=>`<i style="width:${pct(g.items.length)}%;background:${g.color}" title="${titleEsc(`${g.name}案例：${caseList(g.items)}`)}"></i>`).join('');
  impact.innerHTML=`
    <div class="c2GenderImpactRow">
      <span class="c2GenderImpactLabel">声量</span>
      <div class="c2GenderImpactTrack"><i style="width:${volumePct}%;background:#3B6EA5" title="${titleEsc(`高声量案例：${caseList(volumeHigh)}`)}"></i></div>
      <b style="color:#3B6EA5">高声量 ${volumePct}% <small>(${volumeHigh.length}/${samples.length})</small></b>
    </div>
    <div class="c2GenderImpactRow">
      <span class="c2GenderImpactLabel">伤害</span>
      <div class="c2GenderImpactTrack">${damageBars}</div>
      <b class="c2GenderImpactSummary"><em style="color:#B85450">高 ${pct(damageGroups[0].items.length)}%</em><em style="color:#B77A18">中 ${pct(damageGroups[1].items.length)}%</em><small>低 ${pct(damageGroups[2].items.length)}%</small></b>
    </div>`;
}

// —— C2 图2a · 生命周期阶段 × 高伤害率（竖向堆叠柱：去掉回炉/停运，突出上线期高伤率）——
function renderC2Lifecycle(){
  const wrap=document.getElementById('c2LifecycleChart');
  if(!wrap) return;
  const order=['上线期','成长期','成熟期'];
  const label={'上线期':'上线期','成长期':'成长期','成熟期':'成熟期'};
  const sub={'上线期':'0–0.5年','成长期':'0.5–3年','成熟期':'3年+'};
  const agg={}; order.forEach(s=>agg[s]={high:0,mid:0,low:0,na:0,items:{high:[],mid:[],low:[],na:[]}});
  (caseSummaries||[]).forEach(c=>{ const s=lcStage(c); if(!agg[s])return; const tier=dmgTier3(c.damage);agg[s][tier]++;agg[s].items[tier].push(c); });
  const C=DMG3_COLORS;
  const rows=order.map(s=>{ const a=agg[s]; const valid=a.high+a.mid+a.low; return {s,a,valid,rate:valid?Math.round(100*a.high/valid):0}; });
  const W=560,H=316,padL=36,padR=64,padT=44,padB=52;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const maxN=Math.max(1,...rows.map(r=>r.valid));
  const slot=plotW/rows.length, bw=Math.min(96,slot*0.5);
  const yy=v=> padT+plotH-(v/maxN)*plotH;
  let grid='',bars='',axis='';
  for(let v=0;v<=maxN;v++){ if(maxN>8 && v%2) continue; grid+=`<line x1="${padL}" y1="${yy(v).toFixed(1)}" x2="${W-padR}" y2="${yy(v).toFixed(1)}" stroke="var(--line)" stroke-dasharray="${v?'2,4':'0'}"/><text x="${padL-7}" y="${(yy(v)+3).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`;}
  rows.forEach((r,i)=>{
    const cx=padL+slot*i+slot/2, bx=cx-bw/2;
    let yTop=padT+plotH;
    [['low',C.low,'#fff'],['mid',C.mid,'#fff'],['high',C.high,'#fff']].forEach(([k,col,tc])=>{
      const v=r.a[k]; if(!v) return;
      const h=(v/maxN)*plotH; yTop-=h;
      bars+=`<rect x="${bx.toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="${col}" style="cursor:help"><title>${esc(`${label[r.s]} · ${DMG3_LABELS[k]}伤害 ${v} 例：${c2CaseList(r.a.items[k])}`)}</title></rect>`;
      if(h>=16) bars+=`<text x="${cx.toFixed(1)}" y="${(yTop+h/2+4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="${tc}">${v}</text>`;
    });
    // 顶部高伤率徽标（上线期放大突出）
    const rateCol=r.rate>=50?'#B85450':r.rate>=20?'#D99A3E':'#7A93B5';
    const big=(i===0);
    const topY=yy(r.valid);
    bars+=`<text x="${cx.toFixed(1)}" y="${(topY-24).toFixed(1)}" text-anchor="middle" font-size="${big?22:16}" font-weight="800" fill="${rateCol}">${r.rate}%</text>`;
    bars+=`<text x="${cx.toFixed(1)}" y="${(topY-9).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--muted)">高伤 ${r.a.high}/${r.valid}</text>`;
    // x 轴标签
    axis+=`<text x="${cx.toFixed(1)}" y="${(padT+plotH+20).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">${label[r.s]}</text>`;
    axis+=`<text x="${cx.toFixed(1)}" y="${(padT+plotH+37).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--muted)">${sub[r.s]}</text>`;
  });
  const svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:600px;display:block;margin:0 auto"><line x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}" stroke="var(--line)"/>${grid}${bars}${axis}</svg>`;
  const legend=`<div class="gdLegend" style="justify-content:center;margin-top:6px">
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.high}"></span>高</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.mid}"></span>中</span>
    <span class="gdLegendItem"><span class="gdDot" style="background:${C.low}"></span>低</span>
    <span class="gdLegendItem" style="color:var(--muted)">柱高 = 案例数（无数据/未收录不计入）</span>
  </div>`;
  wrap.innerHTML=svg+legend;
}

function renderConclusions2(){
  renderC2TagDamage();
  renderC2Lifecycle(); // 专用生命周期柱（去回炉/停运，突出上线期高伤率）
  renderC2LaunchRoots();
  renderC2Redline();
  renderC2PrChart();
  renderC2GenderTrend();
}

const C4_GROUPS=[
  {
    key:'user',
    label:'一、用户：玩家如何变化、组织与放大议题',
    note:'从参与治理到议题传播，再到圈层行动能力',
    items:[
      {
        match:'玩家角色迁移', tag:'用户趋势',
        title:'玩家从游戏规则的接受者走向规则共创者',
        thesis:'玩家正从规则结果的评价者逐步进入规则形成过程：参与方案选择与测试验证、创造新的玩法规则，并借助官方工具生产和分发内容。',
        template:'c4-cocreate-template'
      },
      {
        match:'性别议题增多', tag:'用户趋势',
        title:'性别议题增多，并逐渐成为“传播放大器”',
        thesis:'性别议题降低了跨圈传播门槛，但是否伤及大盘，仍取决于原始矛盾是否真实及官方能否及时止损。',
        enhance:'genderDataConclusion'
      },
      {
        match:'制度化施压能力', tag:'用户圈层',
        title:'女性向 / 乙游圈层天然具备制度化施压的结构条件',
        thesis:'高强度情感关系、成熟的社群组织技术与公共风险转译能力，共同支撑圈层将社区不满转化为企业和外部机构需要回应的治理压力。',
        enhance:'pressureStructure'
      }
    ]
  },
  {
    key:'official',
    label:'二、官方：如何配置资源、解释决策与修复信任',
    note:'从版本优先级判断到舆情回应质量',
    items:[
      {
        match:'版本顺序就是资源表态', tag:'官方决策',
        title:'版本顺序体现资源与立场选择，官方需明确产能优先级',
        thesis:'产能投向会进一步影响玩家对需求代表性与后续版本规划的信任。',
        template:'c4-priority-template'
      },
      {
        match:'回应质量', tag:'官方回应',
        title:'透明度 / 时效 / 实际动作 > 补偿力度',
        thesis:'有效回应依赖正确定性、黄金窗口与可验证动作；补偿只能修复损失，不能替代方向回退。',
        enhance:'responseTiming'
      }
    ]
  },
  {
    key:'regulatory',
    label:'三、监管：哪些风险会越过普通公关边界',
    note:'识别可能影响经营连续性的外部强制风险',
    items:[
      {
        match:'内容合规容错空间正在收窄', tag:'监管边界',
        title:'强陪伴型乙游 / 二游的合规容错空间收窄',
        thesis:'圈内争议一旦公共化或内容直接进入审查，可能越过普通公关范畴，升级为停服、下架或强制整改。',
        enhance:'regulatoryScaleContrast'
      }
    ]
  }
];

function buildConclusions3(){
  const target=$('conclusions3Content');
  const source=$('conclusions3Source');
  if(!target||!source) return;
  const sourceCards=[...source.querySelectorAll(':scope > .c2Grid > .c2Card')];
  let pressureScaleContrast=null;
  target.innerHTML='';
  C4_GROUPS.forEach(group=>{
    const section=document.createElement('section');
    section.className=`c4Section c4-${group.key}`;
    section.innerHTML=`<header class="c4SectionHead"><div><h3>${group.label}</h3><p>${group.note}</p></div></header><div class="c4Cards"></div>`;
    const cardWrap=section.querySelector('.c4Cards');
    group.items.forEach(item=>{
      const sourceCard=sourceCards.find(card=>(card.querySelector('.c2Point')?.textContent||'').includes(item.match));
      const sourceTemplate=item.template?$(item.template):null;
      if(!sourceCard&&!sourceTemplate) return;
      const details=document.createElement('details');
      details.className='c4Card';
      details.innerHTML=`
        <summary>
          <span class="c4Tag">${item.tag}</span>
          <b class="c4Title">${item.title}</b>
          <span class="c4Thesis">${item.thesis}</span>
          <span class="c4Chevron" aria-hidden="true"></span>
        </summary>`;
      const expanded=document.createElement('div');
      expanded.className='c4Expanded';
      if(sourceTemplate){
        expanded.appendChild(sourceTemplate.content.cloneNode(true));
      }else{
        const clone=sourceCard.cloneNode(true);
        clone.querySelector('.c2Point')?.remove();
        clone.removeAttribute('style');
        clone.className='c4ClonedContent';
        clone.querySelectorAll('[id]').forEach(el=>{el.id=`${el.id}-c4`;});
        while(clone.firstChild) expanded.appendChild(clone.firstChild);
      }
      if(item.enhance==='responseTiming'){
        const lead=expanded.querySelector('.c2ChartTitle');
        lead?.remove();
        const pillars=expanded.querySelector('.c2ResponsePillars');
        if(pillars){
          const timing=document.createElement('section');
          timing.className='c2ResponseTiming';
          timing.innerHTML='<div><span>前置门槛</span><b>时效决定能否进入黄金窗口</b></div><p>越早完成事实确认、责任承接和止损动作，越能在情绪固化前阻断扩散；延迟回应会削弱后续解释、回退与补偿的可信度。</p>';
          pillars.parentNode.insertBefore(timing,pillars);
        }
      }
      if(item.enhance==='pressureStructure'){
        const body=expanded.querySelector('.c2Body');
        const conclusion=expanded.querySelector('.c2PressureConclusion');
        const features=expanded.querySelector('.c2PressureFeatures');
        const chain=expanded.querySelector('.c2PressureChain');
        pressureScaleContrast=expanded.querySelector('.c2PressureCases');
        pressureScaleContrast?.remove();
        expanded.querySelector(':scope > .c2Insight')?.remove();
        if(body&&features){
          const sectionTitle=document.createElement('div');
          sectionTitle.className='c2PressureSectionTitle';
          sectionTitle.textContent='制度化施压的三项结构特征';
          body.insertBefore(sectionTitle,features);
          features.setAttribute('aria-label','制度化施压的三项结构特征');
          const featureTitles=features.querySelectorAll('h3');
          if(featureTitles[0]) featureTitles[0].textContent='具备高强度动员燃料';
          if(featureTitles[1]) featureTitles[1].textContent='继承成熟的组织技术';
          if(featureTitles[2]) featureTitles[2].textContent='能将圈内诉求翻译成公共风险';
        }
        if(chain){
          const chainTitle=document.createElement('div');
          chainTitle.className='c2PressureSectionTitle c2PressureChainTitle';
          chainTitle.textContent='制度化施压的转化链路';
          chain.parentNode.insertBefore(chainTitle,chain);
          chain.classList.add('isDetailed');
          chain.setAttribute('aria-label','制度化施压的六步转化链路');
          chain.innerHTML=`
            <article><span>01</span><h4>情感契约受损</h4><p>角色、内容或商业化变化被理解为关系承诺被打破。</p></article>
            <article><span>02</span><h4>圈层共识</h4><p>个人不满被重述为整个圈层需要共同维护的利益。</p></article>
            <article><span>03</span><h4>诉求标准化</h4><p>分散意见被整理为统一话术、诉求清单与证据包。</p></article>
            <article><span>04</span><h4>行动工具化</h4><p>投诉、停氪、退款、评分与跨平台分工被复制执行。</p></article>
            <article class="isHot"><span>05</span><h4>公共风险转译</h4><p>圈内争议被翻译为权益、合规、未保或品牌风险。</p></article>
            <article class="isHot"><span>06</span><h4>企业 / 机构回应</h4><p>风险进入平台、媒体、合作方或有关部门的治理接口。</p></article>`;

          const evidence=document.createElement('section');
          evidence.className='c2PressureEvidence';
          evidence.setAttribute('aria-label','制度化施压的代表案例');
          evidence.innerHTML=`
            <div class="c2PressureEvidenceHead">
              <span>案例映射</span>
              <h3>三种制度化施压样本</h3>
            </div>
            <div class="c2PressureEvidenceGrid">
              <article>
                <div class="c2PressureEvidenceTag">组织能力样本</div>
                <a onclick="openCase('lianyu-mechanic')">恋与深空 · 暗蚀国王</a>
                <p>核心付费玩家将“PV 与实装不符”整理为统一诉求，通过联名、停氪联盟、集中投诉与律师函持续施压。</p>
                <div class="c2PressureEvidencePath"><b>联名</b><i>→</i><b>停氪联盟</b><i>→</i><b>集中投诉</b><i>→</i><b>律师函</b></div>
                <small><b>验证：</b>组织技术清晰，但施压能力不等于必然迫使官方让步。</small>
              </article>
              <article class="isKey">
                <div class="c2PressureEvidenceTag">完整转化样本</div>
                <a onclick="openCase('lianyu-aoyin')">恋与深空 · 敖尹</a>
                <p>新男主争议叠加存量内容债，玩家以停氪、停登与投诉维持压力，并将争议推向女性安全等公共议题。</p>
                <div class="c2PressureEvidencePath"><b>情感契约</b><i>→</i><b>集体行动</b><i>→</i><b>公共风险</b><i>→</i><b>战略回撤</b></div>
                <small><b>验证：</b>多重压力最终推动官方取消新男主并承诺不再新增。</small>
              </article>
              <article>
                <div class="c2PressureEvidenceTag">风险转译补充</div>
                <a onclick="openCase('shijiezhiwai-money')">世界之外 · 召唤之王</a>
                <p>玩家将未预告涨价从付费不满转译为消费者知情权与公平交易问题，并通过制度渠道集中表达。</p>
                <div class="c2PressureEvidencePath"><b>固定证据</b><i>→</i><b>停氪罢玩</b><i>→</i><b>消保 / 12315</b><i>→</i><b>权益议题</b></div>
                <small><b>验证：</b>圈内诉求能够被翻译为外部机构可识别的消费者权益风险。</small>
              </article>
            </div>
          `;
          chain.insertAdjacentElement('afterend',evidence);

          if(conclusion){
            const conclusionText=conclusion.querySelector('p');
            if(conclusionText) conclusionText.innerHTML='女性向 / 乙游圈层的制度化施压能力来自三项结构条件：<b>高强度情感关系</b>将分散情绪转化为共同利益，<b>成熟组织技术</b>把不满变成可复制行动，<b>公共风险转译</b>使诉求进入平台、媒体、合作方及有关部门需要回应的治理接口。';
            conclusion.classList.add('isAfterAnalysis');
            evidence.insertAdjacentElement('afterend',conclusion);
          }
        }
      }
      if(item.enhance==='regulatoryScaleContrast'&&pressureScaleContrast){
        const body=expanded.querySelector('.c2Body');
        const lead=body?.querySelector('.c2ChartTitle');
        const riskLanes=body?.querySelector('.c2RiskLanes');
        const riskOutcome=body?.querySelector('.c2RiskOutcome');
        const insight=expanded.querySelector(':scope > .c2Insight');
        const header=pressureScaleContrast.querySelector('header');
        const label=header?.querySelector('span');
        const title=header?.querySelector('h3');
        const note=header?.querySelector(':scope > p');
        const publicTag=pressureScaleContrast.querySelector('.c2PressureCase.isPublic .c2PressureCaseTag');
        const takeaway=pressureScaleContrast.querySelector('.c2PressureCaseTakeaway');
        pressureScaleContrast.classList.add('c2RegulatoryScaleContrast');
        if(lead) lead.innerHTML='强陪伴型乙游 / 二游的合规风险存在两条触发路径：公共舆情触发和直接内容审查，<b>最终都可能影响经营连续性。</b>';
        if(label) label.textContent='辩证案例';
        if(title) title.textContent='同为成人向尺度，私域内容与公共场景为何产生不同处置结果？';
        if(note) note.textContent='用于观察内容场景、公共品牌接口与目标让步成本如何改变合规暴露，不用于判断某一性别圈层的“伤害力”更强。';
        if(publicTag) publicTag.textContent='公共场景 / 合规接口暴露';
        if(takeaway) takeaway.innerHTML='<b>分析结论：</b>同类尺度内容在核心玩家私域中，主要由产品定位与付费关系约束；进入公共品牌、线下空间或机构合作后，则同时接受品牌形象、未成年人、合作审查等外部标准，合规容错空间显著收窄。';
        insight?.remove();
        if(riskOutcome){
          riskOutcome.insertAdjacentElement('afterend',pressureScaleContrast);
        }else{
          riskLanes?.insertAdjacentElement('afterend',pressureScaleContrast);
        }
      }
      if(item.enhance==='genderDataConclusion'){
        const sectionHeads=expanded.querySelectorAll('.c2GenderSectionHead');
        const dataHead=sectionHeads[0];
        const dataTitle=dataHead?.querySelector('b');
        const dataSub=dataHead?.querySelector('small');
        if(dataTitle) dataTitle.textContent='数据发现：性别议题在 2025 年后集中进入版本舆情，并表现出稳定的声量放大效应；但声量放大不等于必然造成产品重伤。';
        dataSub?.remove();
        const flowTitle=sectionHeads[1]?.querySelector('b');
        const flowSub=sectionHeads[1]?.querySelector('small');
        if(flowTitle) flowTitle.textContent='传播路径：原始版本争议经性别化重述与圈层动员，转化为跨平台公共议题。';
        flowSub?.remove();
        const typeTitle=sectionHeads[2]?.querySelector('b');
        const typeSub=sectionHeads[2]?.querySelector('small');
        if(typeTitle) typeTitle.textContent='案例分型：性别议题可能直接构成原始矛盾，也可能在传播中叠加并放大既有争议。';
        typeSub?.remove();
        expanded.querySelector('.c2GenderBridge')?.remove();
      }
      details.appendChild(expanded);
      cardWrap.appendChild(details);
    });
    target.appendChild(section);
  });
}


function renderGrid(){
  renderStats();
  renderMatrixChart();
  renderOverviewCards();
  renderGenreChart();
  renderPrChart();
  renderYearTrendChart();
  renderTagsChart();
  renderGenreDamageChart();
  renderGameplayTagChart();
  renderTagDamageChart();
  renderScopeTagChart();
  renderPrDamageChart();
  renderLifecycleDamageChart();
  renderConclusions2();
  buildConclusions3();
  const list=applyPinned(filtered());
  $('resultCount').textContent=`${list.length} / ${caseSummaries.length} 个案例`;
  $('caseGrid').innerHTML=list.map(c=>`<article class="card caseCard" onclick="openCase('${c.id}')"><div class="caseHead"><div><div class="caseTitle">${VERIFIED_IDS.has(c.id)?`<span class="verifiedTag" title="已人工主动挑战核阅">✓ 已核查</span>`:''}${c.title}</div><div class="game">${c.game} / ${c.company}${(c.genre||[]).length?' / '+(c.genre||[]).join(' · '):''}</div></div><div class="caseBadges"><span class="badge ${levelClass(c.volume)}" title="声量等级">声量 ${gradeLevel(c.volume)}</span><span class="badge ${levelClass(c.damage)}" title="伤害等级">伤害 ${gradeLevel(c.damage)}</span></div></div><div class="desc">${c.summary}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip chip-conflict">${t}</span>`).join('')}${c.pr?`<span class="chip chip-pr">${c.pr}</span>`:''}</div><div class="foot"><span>${c.market}</span><span>${c.time}</span></div></article>`).join('');
}

function openCase(id){location.hash=`case=${id}`;}
function openCaseResponse(id,stage=0){location.hash=`case=${id}&section=official&stage=${stage}`;}
function goHome(){
  switchMainTab('overview');
}

async function route(){
  const id=(location.hash.match(/case=([^&]+)/)||[])[1];
  if(id){
    const summary=caseSummaries.find(c=>c.id===id)||caseSummaries[0];
    const rawCase=await loadJson(summary.caseFile);
    
    // Lift data up if present
    currentCase = rawCase.data ? { ...summary, ...rawCase.data } : { ...summary, ...rawCase };
    
    $('dashboard').style.display='none';
    if($('overview')) $('overview').style.display='none';
    if($('mapping')) $('mapping').style.display='none';
    if($('conclusions')) $('conclusions').style.display='none';
    if($('conclusions2')) $('conclusions2').style.display='none';
    if($('conclusions3')) $('conclusions3').style.display='none';
    $('detail').style.display='block';
    
    document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
    
    renderDetail(currentCase);
    const section=(location.hash.match(/section=([^&]+)/)||[])[1];
    const stageMatch=location.hash.match(/stage=(\d+)/);
    if(section){
      tab(section);
      requestAnimationFrame(()=>{
        if(section==='official'&&stageMatch){
          const target=$(`ocard-${Number(stageMatch[1])}`);
          if(target){
            document.querySelectorAll('.oCard').forEach(card=>{card.open=false;});
            target.open=true;
            target.scrollIntoView({behavior:'smooth',block:'start'});
            return;
          }
        }
        scrollTo(0,0);
      });
    }else{
      scrollTo(0,0);
    }
  }else{
    // 读取 #tab=xxx 恢复之前所在 tab，没有则默认 overview
    let tabId=(location.hash.match(/tab=([^&]+)/)||[])[1] || 'overview';
    if(tabId==='conclusions4') tabId='conclusions3';
    switchMainTab(tabId);
    renderGrid();
  }
}

function renderDetail(c){
  const conflictTags=(c.tags||[]).map(t=>`<span class="metaTag mt-conflict">${esc(t)}</span>`).join('');
  const prTag=c.pr?`<span class="metaTag mt-pr">${esc(c.pr)}</span>`:'';
  const volStr=gradeLevel(c.volume)+(c.volumeScope?' · '+c.volumeScope:'');
  $('detailHero').innerHTML=`<div class="sub">${c.game} / ${c.company}</div><h2>${c.title}</h2><div class="meta"><span>${c.time}</span><span>${c.market}</span>${conflictTags}${prTag}<span>声量 <strong style="color:var(--red);">${esc(volStr)}</strong></span><span>伤害 <strong style="color:var(--red);">${gradeLevel(c.damage)}</strong></span></div>`;
  // V1 深挖案例（有 recap / cause / official 数据）→ 五标签结构；其余 V2 案例 → 原三标签
  const isV1 = !!(c.recap || c.cause || c.official);
  const tabs = isV1 ? [
    ['timeline','T-Window 时间线'],
    ['players','核心矛盾与玩家痛点'],
    ['official','官方动作复盘'],
    ['impact','影响量化'],
    ['lesson','案例启发']
  ] : [
    ['timeline','T-Window 时间线'],
    ['players','核心矛盾与玩家痛点'],
    ['insight','官方动作复盘与应对启发']
  ];
  $('tabs').innerHTML=tabs.map((x,i)=>`<button class="tab ${i===0?'active':''}" id="tabbtn-${x[0]}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=tabs.map((x,i)=>`<section class="tabPanel ${i===0?'active':''}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}

function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.remove('active'));
  const btn=$(`tabbtn-${id}`); if(btn) btn.classList.add('active');
  const p=$(`tab-${id}`); if(p) p.classList.add('active');
}

function renderTab(c,id){
  if(id==='timeline'){
    if(c.recap) return renderRecapV1(c.recap);
    const timeline = c.timeline || [];
    return `<div class="block"><h3>时间线还原 (官方 vs 玩家动作)</h3><div class="timeline">${timeline.map(e=>`<div class="event ${e.side||'player'}"><div class="time"><span class="side" style="margin-right:8px; font-weight:bold; color:${e.side==='official'?'var(--red)':'var(--blue)'}">${e.side==='official'?'官方动作':'玩家动作'}</span>${e.date||''}</div><div class="name">${e.event}</div><div class="impact" style="margin-top:8px;">${e.description||''}</div></div>`).join('')}</div></div>`;
  }
  if(id==='players') return renderPlayerJourney(c);
  if(id==='official') return `<div class="v1deep">${renderOfficialV1(c)}</div>`;
  if(id==='impact') return `<div class="v1deep">${renderImpactV1(c)}</div>`;
  if(id==='lesson') return `<div class="v1deep">${renderInsightV1(c)}</div>`;
  if(id==='insight') return renderInsight(c);
  return '';
}

/* V1 事件复盘（背景 + 官方/玩家双线分段时间线 + 标签 + 来源链接），原样移植，作用域 .v1recap */
function renderRecapV1(r){
  r=r||{};const tl=r.timeline||[];
  let lastSeg=null;
  const rows=tl.map(e=>{
    let band='';
    if(e.segment&&e.segment!==lastSeg){band=`<div class="tlBand"><span>${esc(e.segment)}</span></div>`;lastSeg=e.segment;}
    return `${band}<div class="event ${e.side}"><div class="time"><span class="side">${e.side==='official'?'官方':'玩家'}</span>${esc(e.phase)} / ${esc(e.time)}</div>${e.name?`<div class="name">${esc(e.name)}</div>`:''}<div class="eventText">${esc(e.event)}</div>${e.impact?`<div class="impact">影响：${esc(e.impact)}</div>`:''}${(e.tags&&e.tags.length)?`<div class="evTags">${e.tags.map(t=>`<span class="evTag">${esc(t)}</span>`).join('')}</div>`:''}${e.links&&e.links.length?`<div class="eventLinks"><span>来源</span>${e.links.map(l=>`<a target="_blank" rel="noopener" href="${esc(l.url)}">${esc(l.label)}</a>`).join('')}</div>`:''}</div>`;
  }).join('');
  const seg=tl.some(e=>e.segment);
  return `<div class="v1recap">${r.background?`<div class="block goldBox"><h3>事件背景</h3><p>${esc(r.background)}</p></div>`:''}<div class="block"><h3>时间线（官方 / 玩家双线，T-window 记法）</h3><div class="timeline${seg?' timelineSeg':''}">${rows}</div></div></div>`;
}

/* V1 原因追溯（迁移并按要求重构）：核心矛盾卡片 + 玩家心路历程 + 玩家认知特征，作用域 .v1cause */
function renderCauseV1(c){
  const ca=c.cause||{};
  const stages=ca.journey||[];
  const trend=stages.length?renderEmotionTrend(stages):'';
  const cn=['一','二','三','四','五','六','七','八'];
  const stageNo=(s,i)=>esc(s.stageNo||cn[i]||(i+1));

  // a) 核心矛盾（替代催化剂）：卡片，上标题 + 下解释；标题为统一名词短语，供后续筛选标签复用
  const conflicts=(ca.coreConflicts||[]).map(x=>`<article class="ccCard"><b class="ccTitle">${esc(x.title)}</b><p class="ccDesc">${esc(x.desc)}</p></article>`).join('');
  const conflictBlock=conflicts?`<div class="block ccBlock"><h3>核心矛盾</h3><p class="muted">本案触发玩家强烈反应的几条核心矛盾（不含外部时机与后续处置失误）。标题采用统一命名，后续将作为跨案例筛选标签。</p><div class="ccGrid">${conflicts}</div></div>`:'';

  // b) 玩家心路历程（保留 V1 内容不变）
  const stageBody=s=>{
    const head=s.summary?`<div class="storyPoint">${esc(s.summary)}</div>`:'';
    if((s.econ||[]).length){
      return `${head}<div class="econGrid">${s.econ.map(x=>`<article><b>${esc(x.title)}</b><p>${esc(x.text)}</p></article>`).join('')}</div>${s.nature?`<p><b>舆情性质：</b>${esc(s.nature)}</p>`:''}${s.platform?`<p><b>平台放大：</b>${esc(s.platform)}</p>`:''}`;
    }
    return `${head}${s.psychology?`<p><b>玩家怎么想：</b>${esc(s.psychology)}</p>`:''}${s.playerDemand?`<p><b>玩家要什么：</b>${esc(s.playerDemand)}</p>`:''}${s.trigger?`<p><b>触发因素：</b>${esc(s.trigger)}</p>`:''}${(s.evidence||[]).length?`<div class="storyEvidence"><h5>玩家原话摘录</h5>${s.evidence.map(renderEvidenceCard).join('')}</div>`:''}`;
  };
  const cards=stages.map((s,i)=>`<details class="jStage${s.stageNo==='0'?' jStage0':''}" id="jstage-${i}" name="jacc"${i===0?' open':''}><summary><span class="jBadge">阶段${stageNo(s,i)}</span><span class="jHead"><span class="jStageName">${esc(s.title||s.label)}</span><span class="jMeta">${esc(s.time)}｜${esc(s.emotion)}</span></span></summary><div class="jBody">${stageBody(s)}</div></details>`).join('');
  const journeyBlock=`<div class="block"><h3>玩家心路历程</h3><p class="muted">阶段0 是事件前的经济存量底色（决定爆发烈度），阶段一起为本次事件的情绪演变。情绪强度趋势为骨架；点击趋势图上的节点，可展开对应阶段的详情卡片。</p>${trend}<div class="jSpine">${cards}</div></div>`;

  // d) 玩家认知特征：该类型玩家的共性 / 特定矛盾（供跨案例归纳）
  const tBadge=t=>t?`<span class="ctType ct-${t==='稳态'?'stable':(t==='新出现'?'new':'up')}">${esc(t)}</span>`:'';
  const traits=(ca.cognitionTraits||[]).map(x=>`<article class="ctCard"><div class="ctHead"><b>${esc(x.trait)}</b>${tBadge(x.type)}</div><p>${esc(x.text)}</p></article>`).join('');
  const genreLine=(c.genre||[]).length?`<div class="ctGenre"><span class="ctGenreLabel">游戏类型</span>${(c.genre||[]).map((g,i)=>`<span class="genreTag ${i===0?'gPrim':'gSub'}">${esc(g)}</span>`).join('')}</div>`:'';
  // 玩家认知特征已移至「案例启发」页的「这类游戏的玩家特征」
  void traits;void genreLine;

  return conflictBlock+journeyBlock;
}

function renderTopic(t){
  const chain=(t.chain||[]).map((x,i)=>`<article><b>${i+1}. ${esc(x.name)}</b><p>${esc(x.text)}</p></article>`).join('');
  const ev=(t.evidence||[]).length?`<div class="topicEvidenceHead">关键证据</div><div class="topicEvidence">${t.evidence.map(renderEvidenceCard).join('')}</div>`:'';
  return `<div class="block topicModule">${t.eyebrow?`<span class="moduleEyebrow">${esc(t.eyebrow)}</span>`:''}${t.title?`<h4 class="topicTitle">${esc(t.title)}</h4>`:''}${t.lead?`<p class="topicLead">${esc(t.lead)}</p>`:''}${chain?`<div class="topicChain">${chain}</div>`:''}${t.takeaway?`<div class="topicTakeaway">${esc(t.takeaway)}</div>`:''}${ev}</div>`;
}

function renderEmotionTrend(stages){
  const W=900,H=340,padL=66,padR=28,padT=30,padB=86;
  const iw=W-padL-padR,ih=H-padT-padB,n=stages.length;
  const cn=['一','二','三','四','五','六','七','八'];
  const sno=(s,i)=>esc(s.stageNo||cn[i]||(i+1));
  const sd=t=>(t||'').replace('2025-','').split(/[ /至]/)[0];
  const x=i=>padL+(n===1?iw/2:iw*i/(n-1));
  const y=v=>padT+ih-(Math.max(0,Math.min(100,v))/100)*ih;
  const pts=stages.map((s,i)=>`${x(i)},${y(s.emotionScore||0)}`).join(' ');
  const area=`${padL},${padT+ih} ${pts} ${padL+iw},${padT+ih}`;
  const grid=[0,25,50,75,100];
  return `<div class="trendWrap"><svg class="emoTrend" viewBox="0 0 ${W} ${H}" role="img" aria-label="玩家情感强度趋势"><defs><linearGradient id="emoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B85450" stop-opacity="0.18"/><stop offset="1" stop-color="#B85450" stop-opacity="0.02"/></linearGradient></defs>${grid.map(g=>`<line x1="${padL}" y1="${y(g)}" x2="${padL+iw}" y2="${y(g)}" class="tGrid"/>`).join('')}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+ih}" class="tAxisLine"/><line x1="${padL}" y1="${padT+ih}" x2="${padL+iw}" y2="${padT+ih}" class="tAxisLine"/><text x="22" y="${padT+ih/2}" class="tAxisTitle" transform="rotate(-90 22 ${padT+ih/2})">玩家情感强度</text><polygon points="${area}" fill="url(#emoArea)"/><polyline points="${pts}" class="tLine" fill="none"/>${stages.map((s,i)=>{const sc=s.emotionScore||0;const cy=y(sc);const ly=sc>=75?cy+28:cy-26;return `<g class="tPoint" onclick="openStage(${i})"><line x1="${x(i)}" y1="${cy}" x2="${x(i)}" y2="${padT+ih}" class="tGuide"/><circle cx="${x(i)}" cy="${cy}" r="7"/><text x="${x(i)}" y="${ly}" class="tCallout" text-anchor="middle">${esc(s.label)}</text><text x="${x(i)}" y="${padT+ih+26}" class="tStageNo" text-anchor="middle">阶段${sno(s,i)}</text><text x="${x(i)}" y="${padT+ih+45}" class="tDate" text-anchor="middle">${esc(s.chartDate||sd(s.time))}</text></g>`;}).join('')}</svg><div class="tHint">点击趋势图节点展开对应阶段（每次只展开一个）↓</div></div>`;
}

function openStage(i){
  document.querySelectorAll('.jStage').forEach(d=>{d.open=(d.id==='jstage-'+i);});
  const wrap=document.querySelector('.v1cause .trendWrap');
  if(wrap) wrap.scrollIntoView({behavior:'smooth',block:'start'});
  const el=document.getElementById('jstage-'+i);
  if(el){el.classList.add('jFlash');setTimeout(()=>el.classList.remove('jFlash'),1400);}
}

function renderEvidenceCard(e){
  const identity=e.playerId||'公开评论用户';
  const meta=[e.platform,e.time,e.sourceType].filter(Boolean).join('｜');
  const inner=`<div class="commentShotTop"><span class="avatar">${esc((e.platform||'评').slice(0,1))}</span><div><b>${esc(identity)}</b><small>${esc(meta)}</small></div></div><div class="commentShotText">${esc(e.text)}</div>${e.note?`<div class="commentShotMeta">${esc(e.note)}</div>`:''}<div class="commentShotFoot"><span>${esc(e.heat||'热度待补')}</span>${e.url?`<span class="srcLink">点击查看来源 ↗</span>`:''}</div>`;
  return e.url?`<a class="commentShot" target="_blank" rel="noopener" href="${esc(e.url)}">${inner}</a>`:`<div class="commentShot noLink">${inner}</div>`;
}

/* 官方动作复盘（迁移 V1）：仅 V1 官方处置时间线 + 官方动作借鉴点 / 雷点（绿红两框，卡片式） */
function renderOfficialV1(c){
  const d=c.official||{};
  const qClass={good:'q-good',bad:'q-bad',neutral:'q-neutral'};
  const cards=(d.stages||[]).map((s,i)=>{
    const q=qClass[s.quality]||qClass.neutral;
    const elems=(s.elements||[]).length?`<span class="oElems">${s.elements.map(e=>`<span class="oElem">${esc(e)}</span>`).join('')}</span>`:'';
    return `<details class="oCard ${q}" id="ocard-${i}" name="oacc"${i===0?' open':''}><summary><span class="oDot"></span><span class="oHead"><span class="oName"><span class="oKind">${esc(s.kind)}</span>${esc(s.name)}</span><span class="oMeta">${esc(s.time)}｜${esc(s.source)}${s.qualityLabel?`　<b class="oQuality">${esc(s.qualityLabel)}</b>`:''}</span></span>${elems}</summary><div class="oBody">${((s.officialExcerpt||[]).length||s.sourceUrl)?`<div class="officialQuoteBlock"><b>官方原文 / 要点摘录</b>${(s.officialExcerpt||[]).map(x=>`<p>${esc(x)}</p>`).join('')}${s.sourceUrl?`<a class="srcLink quoteSrc" target="_blank" rel="noopener" href="${esc(s.sourceUrl)}">查看来源 ↗</a>`:''}</div>`:''}<div class="officialValueGrid"><section><h5>有价值的部分</h5><ul>${(s.valuable||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section><h5>低价值 / 未回答的部分</h5><ul>${(s.lowValue||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section></div><div class="officialEffect"><b>实际效果：</b>${esc(s.effect)}</div></div></details>`;
  }).join('');
  const timeline=`<div class="block"><h3>官方处置时间线</h3><p class="muted">每张卡片为一次官方动作，点击展开详情。色条表示该动作对舆情的实际作用——<span class="qLegend q-bad">红＝激化 / 失分</span><span class="qLegend q-good">绿＝有效缓解</span><span class="qLegend q-neutral">灰＝作用有限</span>。</p><div class="oSpine">${cards}</div></div>`;

  const pcCard=x=>`<article class="pcCard"><span class="pcTag">${esc(x.tag)}</span><p>${esc(x.text)}</p></article>`;
  // 兼容旧的扁平数组与新的分组结构 [{group,sub,items:[]}]
  const pcGroups=arr=>{
    arr=arr||[];
    if(arr.length&&arr[0]&&arr[0].items) return arr.map(g=>`<div class="pcGroup"><div class="pcGroupHead"><span class="pcGroupName">${esc(g.group)}</span>${g.sub?`<span class="pcGroupSub">${esc(g.sub)}</span>`:''}</div><div class="pcCards">${(g.items||[]).map(pcCard).join('')}</div></div>`).join('');
    return `<div class="pcCards">${arr.map(pcCard).join('')}</div>`;
  };
  const pros=d.pros||[],cons=d.cons||[];
  const prosCons=(pros.length||cons.length)?`<div class="block"><h3>官方动作借鉴点与雷点</h3><p class="muted">把本案官方动作拆成“可借鉴 / 要避免”两侧并分类，供跨案例沉淀 PR 经验。</p><div class="pcRow"><section class="pcBox pros"><h4 class="pcHead">👍 借鉴点 · 可复用的动作</h4>${pcGroups(pros)}</section><section class="pcBox cons"><h4 class="pcHead">👎 雷点 · 要避免的动作</h4>${pcGroups(cons)}</section></div></div>`:'';

  return timeline+prosCons;
}

/* 影响量化：① 结论(作标题) → ② 影响量化评估(三卡 声量/数据/补偿 + 可切换面板) → ③ 其他影响。四象限已移到「案例启发」 */
function renderImpactV1(c){
  const q=c.impact||{};const quad=q.quadrant||{};
  const verdict=(label,t)=>t?`<div class="verdict"><span class="verdictLabel">${esc(label)}</span><span class="verdictText">${esc(t)}</span></div>`:'';
  const strip=t=>esc((t||'').replace(/^[^：]*：/,''));
  const ct=q.cardTags||{};
  const ds=q.dataSection||{};const dmg=ds.damage||{};
  const comp=q.compensation||{};
  const ratePill=(label,grade,tone)=>grade?`<span class="ratePill"><span class="rateLabel">${esc(label)}</span><b class="rateGrade g-${esc(tone||'hot')}">${esc(grade)}</b></span>`:'';

  // ① 结论
  const volTone=(ct.vol&&ct.vol.tone)||'hot';
  const conclBlock=q.headline?`<div class="block conclBlock"><h2 class="conclTitle">${esc(q.headline)}</h2>${q.valueConclusion?`<p class="conclBody">${esc(q.valueConclusion)}</p>`:''}</div>`:'';

  // ② 三面板：声量(指标+抗议行动) / 数据(结论+图) / 补偿(明细)
  const metrics=(q.volumeMetrics||[]).map(m=>`<article><b>${esc(m.value)}</b><span>${esc(m.label)}</span><p>${esc(m.note)}</p></article>`).join('');
  const ea=q.emotionAction||{};
  const phases=(ea.phases||[]).map(p=>`<article class="eaCard tone-${esc(p.tone||'')}"><div class="eaHead"><span class="eaPhase">${esc(p.phase)}</span><b>${esc(p.name)}</b></div><ul>${(p.actions||p.quotes||[]).map(qt=>`<li>${esc(qt)}</li>`).join('')}</ul></article>`).join('');
  const eaInner=(ea.phases||[]).length?`${ea.summary?`<p class="muted eaSummary">${esc(ea.summary)}</p>`:''}<div class="eaGrid">${phases}</div>${ea.note?`<p class="muted eaNote">${esc(ea.note)}</p>`:''}${ea.caution?`<div class="notice">${esc(ea.caution)}</div>`:''}`:'';
  const volPane=`${verdict('声量',q.volumeVerdict)}<div class="volHead"><span class="volLevel">声量 ${esc(gradeLevel(q.volumeLevel))}</span><span class="volConf">置信度：${esc(q.volumeConfidence)}</span></div><div class="impactMetricGrid">${metrics}</div>`;

  const charts=(ds.charts||[]).map(ch=>renderBarTrend(ch,ds)).join('');
  const dmgRow=dmg.grade?`<div class="dmgRow">${ratePill('伤害评级',gradeLevel(dmg.grade),dmg.tone)}${dmg.note?`<span class="dmgNote">${esc(dmg.note)}</span>`:''}</div>`:'';
  const whyHtml=(ds.whyParts&&ds.whyParts.length)
    ? `<div class="dataWhyBox">${ds.whyParts.map(p=>`<p class="dataWhy"><b>${esc(p.label)}：</b>${esc(p.text)}</p>`).join('')}</div>`
    : (ds.why?`<p class="dataWhy">${esc(ds.why)}</p>`:'');
  let dataPane;
  if(charts){
    dataPane=`${verdict('数据结论',ds.verdict)}${dmgRow}${whyHtml}<div class="dataCharts">${charts}</div>${ds.caption?`<p class="muted dataCaption">${esc(ds.caption)}</p>`:''}`;
  }else if(ds.verdict||dmg.grade||ds.caption){
    // 无脱敏图（无数据/未收录/无法量化）：优雅降级，仍展示数据结论 + 伤害评级 + 说明
    const naBadge=`<div class="dataNaBadge dna-${esc(dmg.tone||'mute')}">${esc(gradeLevel(dmg.grade)||'无数据')} · 无脱敏图</div>`;
    dataPane=`<div class="dataNaBox">${naBadge}${verdict('数据结论',ds.verdict)}${dmgRow}${whyHtml}${ds.caption?`<p class="muted dataCaption">${esc(ds.caption)}</p>`:''}</div>`;
  }else{
    dataPane='<p class="muted">暂无脱敏数据。</p>';
  }

  const compNote=comp.valueNote?`<p class="muted dataCaption">估算依据：${esc(comp.valueNote)}（按游戏内正常购买价粗估，仅供横向对比）</p>`:'';
  const compHead=`<div class="verdict compVerdict"><span class="verdictLabel">补偿力度</span><span class="verdictText">${esc(comp.strength)}</span>${comp.value?ratePill('估算市值',comp.value,comp.tone):''}</div>`;
  const compPane=comp.text?`${compHead}<p class="dataWhy">${esc(comp.text)}</p>${compNote}`:'<p class="muted">暂无补偿信息。</p>';

  // 三张卡
  const cardTag=k=>{const t=ct[k];return t&&t.tag?`<span class="cardTag t-${esc(t.tone||'warn')}">${esc(t.tag)}</span>`:'';};
  const toneCls=k=>{const t=ct[k];return t&&t.tone?' tone-'+esc(t.tone):'';};
  const compTag=comp.tag?`<span class="cardTag t-${esc(comp.tone||'warn')}">${esc(comp.tag)}</span>`:'';
  const cardOf=(key,label,akCls,sub,bodyHtml,tagHtml,footHtml)=>`<div class="axisCard assessCard${key==='vol'?' active':''}${key==='comp'?' tone-'+esc(comp.tone||'warn'):toneCls(key)}" data-imp="${key}" role="button" tabindex="0" onclick="showImpPanel('${key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showImpPanel('${key}')}"><div class="axisHead"><span class="axisKey ${akCls}">${label}</span><span class="axisSub">${sub}</span>${tagHtml}</div><p>${bodyHtml}</p>${footHtml}</div>`;
  const assessCards=`<div class="axisRow assessCards">`
    +cardOf('vol','声量','akVol','大不大',strip(quad.axis1),cardTag('vol'),q.volumeLevel?`<div class="cardFoot">${ratePill('声量',gradeLevel(q.volumeLevel),volTone)}</div>`:'')
    +cardOf('data','数据','akData','动没动',strip(quad.axis3),cardTag('data'),dmg.grade?`<div class="cardFoot">${ratePill('伤害',gradeLevel(dmg.grade),dmg.tone)}</div>`:'')
    +cardOf('comp','补偿','akComp','力度大不大',esc(comp.summary||''),compTag,(comp.strength||comp.value)?`<div class="cardFoot">${ratePill('力度',comp.strength,comp.tone)}${comp.value?ratePill('估值',comp.value,comp.tone):''}</div>`:'')
    +`</div>`;

  const assessBlock=`<div class="block assessBlock"><div class="assessHead"><h3>影响量化评估</h3></div>${assessCards}<div class="assessPanel"><div class="impPane" data-pane="vol">${volPane}</div><div class="impPane" data-pane="data" hidden>${dataPane}</div><div class="impPane" data-pane="comp" hidden>${compPane}</div></div></div>`;

  // ③ 其他影响（去掉商业数据 + 补偿/止血成本）
  const pi=(q.productImpact||[]).filter(x=>!/商业数据|止血成本|补偿/.test(x.name||''));
  const otherBlock=pi.length?`<div class="block"><h3>其他影响</h3><div class="damageGrid">${pi.map(x=>`<article><div><b>${esc(x.name)}</b>${x.level?`<span>${esc(x.level)}</span>`:''}</div><p>${esc(x.text)}</p></article>`).join('')}</div></div>`:'';

  return `${conclBlock}${assessBlock}${otherBlock}`;
}

/* 影响量化评估：点卡片 → 面板原地切换到该维度详情（声量/数据/补偿） */
function showImpPanel(which){
  document.querySelectorAll('.assessPanel .impPane').forEach(p=>{p.hidden=(p.dataset.pane!==which);});
  document.querySelectorAll('.assessCard').forEach(b=>b.classList.toggle('active',b.dataset.imp===which));
}

/* 脱敏趋势柱状图（SVG）：常规柱浅蓝、赛季节点(season)深蓝、事件节点(event)红；节点顶部带名称+日期引导线；底部 x 轴起止周 */
function renderBarTrend(ch,ds){
  ch=ch||{};ds=ds||{};
  const vals=(ch.values||[]).map(v=>Math.max(0,Math.min(100,Number(v)||0)));
  const n=vals.length; if(!n) return '';
  const markers=ds.markers||[];
  const kindOf={}; markers.forEach(m=>{kindOf[m.idx]=m.kind||'event';});
  const W=900,H=236,padL=16,padR=16,padT=48,padB=34;
  const iw=W-padL-padR,ih=H-padT-padB;
  const slot=iw/n, bw=Math.min(slot*0.6,34);
  const cx=i=>padL+slot*i+slot/2;
  const y=v=>padT+ih-(v/100)*ih;
  const baseY=padT+ih;
  const grid=[25,50,75,100].map(g=>`<line x1="${padL}" y1="${y(g).toFixed(1)}" x2="${padL+iw}" y2="${y(g).toFixed(1)}" class="btGrid"/>`).join('');
  const beOf={}; (ds.barEvents||[]).forEach(b=>{beOf[b.idx]={date:b.date,label:b.label};});
  const tipOf=i=>beOf[i]?`<title>${esc(beOf[i].date)} · ${esc(beOf[i].label)}</title>`:'';
  const bars=vals.map((v,i)=>{
    const k=kindOf[i];
    const cls='btBar'+(k==='event'?' btEv':(k==='season'?' btSeason':''));
    return `<rect class="${cls}" x="${(cx(i)-bw/2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(baseY-y(v)).toFixed(1)}" rx="3">${tipOf(i)}</rect>`;
  }).join('');
  const dots=vals.map((v,i)=>beOf[i]?`<circle class="btDot" cx="${cx(i).toFixed(1)}" cy="${(y(v)-7).toFixed(1)}" r="3.5">${tipOf(i)}</circle>`:'').join('');
  const mk=markers.map(m=>{
    const X=cx(m.idx).toFixed(1);
    const cls=m.kind==='event'?'mkEvent':'mkSeason';
    const anchor=m.idx<=0?'start':(m.idx>=n-1?'end':'middle');
    const lx=m.idx<=0?padL:(m.idx>=n-1?padL+iw:X);
    return `<line x1="${X}" y1="${padT-2}" x2="${X}" y2="${baseY}" class="btMkLine ${cls}"/><text x="${lx}" y="${padT-16}" class="btMkLabel ${cls}" text-anchor="${anchor}">${esc(m.label)} · ${esc(m.date)}</text>`;
  }).join('');
  // 横坐标：优先按月标（monthTicks），否则回退起止周
  let axisLbls;
  if((ds.monthTicks||[]).length){
    axisLbls=ds.monthTicks.map(t=>{
      const anchor=t.idx<=0?'start':(t.idx>=n-1?'end':'middle');
      const lx=t.idx<=0?padL:(t.idx>=n-1?padL+iw:cx(t.idx).toFixed(1));
      return `<text x="${lx}" y="${H-9}" class="btAxis" text-anchor="${anchor}">${esc(t.label)}</text>`;
    }).join('');
  }else{
    axisLbls=`<text x="${padL}" y="${H-9}" class="btAxis" text-anchor="start">${esc(ds.rangeStart)}</text><text x="${padL+iw}" y="${H-9}" class="btAxis" text-anchor="end">${esc(ds.rangeEnd)}</text>`;
  }
  return `<div class="barTrend"><div class="btHead"><span class="btTitle">${esc(ch.metric)}</span></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(ch.metric)}脱敏趋势">${grid}<line x1="${padL}" y1="${baseY}" x2="${padL+iw}" y2="${baseY}" class="btAxisLine"/>${bars}${dots}${mk}${axisLbls}</svg></div>`;
}

/* 案例启发：① 案例定型(四要素 + 四象限定性) → ② 这类游戏的玩家特征(认知特征) → ③ 关键启发 */
function renderInsightV1(c){
  const n=c.insight||{};const q=c.impact||{};const quad=q.quadrant||{};const ca=c.cause||{};

  // ① 案例定型：大字判定 + 小字归因解释
  const pf=n.profile||{};
  const pfHeadline=pf.headline?`<p class="pfVerdict">${esc(pf.headline)}</p>`:'';
  const profileSummary=pf.summary?`<p class="pfSummary">${esc(pf.summary)}</p>`:'';
  const profileBlock=(pfHeadline||profileSummary)?`<div class="block ctBlock"><h3>案例定型</h3>${pfHeadline}${profileSummary}</div>`:'';

  // ② 这类游戏的玩家特征（从核心矛盾页迁来）
  const tBadge=t=>t?`<span class="ctType ct-${t==='稳态'?'stable':(t==='新出现'?'new':'up')}">${esc(t)}</span>`:'';
  const traits=(ca.cognitionTraits||[]).map(x=>`<article class="ctCard"><div class="ctHead"><b>${esc(x.trait)}</b>${tBadge(x.type)}</div><p>${esc(x.text)}</p></article>`).join('');
  const genreLine=(c.genre||[]).length?`<div class="ctGenre"><span class="ctGenreLabel">游戏类型</span>${(c.genre||[]).map((g,i)=>`<span class="genreTag ${i===0?'gPrim':'gSub'}">${esc(g)}</span>`).join('')}</div>`:'';
  const cognitionBlock=(ca.cognitionLead||traits)?`<div class="block ctBlock"><div class="ctHeadRow"><h3>这类游戏的玩家特征</h3>${genreLine}</div>${ca.cognitionLead?`<p class="ctLead">${esc(ca.cognitionLead)}</p>`:''}<p class="muted">本次舆论事件中，该类型游戏玩家体现出的认知特征（不刻意区分玩家共性还是品类独有；徽章标注该特征属新出现 / 新强化 / 稳态）。后续将汇总多案例横向归纳。</p>${traits?`<div class="ctGrid">${traits}</div>`:''}</div>`:'';

  // ③ 关键启发
  const ki=(n.keyInsights||[]).map(x=>`<article class="ccCard"><b class="ccTitle">${esc(x.title)}</b>${x.text?`<p class="ccDesc">${esc(x.text)}</p>`:''}</article>`).join('');
  const kiBlock=ki?`<div class="block ccBlock"><h3>关键启发</h3><div class="ccGrid">${ki}</div></div>`:(n.coreInsight?`<div class="block goldBox"><h3>核心启发</h3><p class="coreInsight">${esc(n.coreInsight)}</p></div>`:'');

  return profileBlock+cognitionBlock+kiBlock;
}

function renderPlayerJourney(c){
  // 仅保留：核心矛盾 + 玩家心路历程 + 玩家认知特征（已删除 V2 原始内容）
  if(c.cause) return `<div class="v1cause v1causeTop">${renderCauseV1(c)}</div>`;
  return `<div class="analysisBox fullWidth"><p class="muted">本案暂无原因追溯数据。</p></div>`;
}

function renderInsight(c){
  if(c.analysis && c.analysis.takeaways) {
     const oa = c.analysis.official_action || {};
     const takeaways = c.analysis.takeaways || [];
     
     let officialHtml = '';
     if(oa.stages && oa.stages.length > 0) {
        officialHtml = `<div style="margin-bottom: 32px;">
          <h3 style="margin-bottom: 16px;">实际官方是怎么做的与深度评价</h3>
          <div style="background:var(--soft); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px;">
            <b style="color:var(--text); font-size:15px;">📌 总体定性：</b>
            <span style="font-size:14px;">${oa.judgement || ''}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${oa.stages.map(s => `
              <article style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; box-shadow:var(--shadow);">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                  <h5 style="margin:0; font-size:16px; color:var(--text);">${s.action}</h5>
                  <span style="font-size:12px; font-weight:bold; padding:4px 10px; border-radius:6px; background:${s.result.includes('成功')||s.result.includes('✅')?'var(--greenBg)':'var(--redBg)'}; color:${s.result.includes('成功')||s.result.includes('✅')?'var(--green)':'var(--red)'};">${s.result}</span>
                </div>
                <p style="margin:0 0 12px; font-size:14px; color:var(--muted); line-height:1.6;"><b>核心动作：</b>${s.content}</p>
                <div style="background:var(--blueBg); border-left:4px solid var(--blue); padding:14px; font-size:14px; color:var(--text); line-height:1.65; border-radius:0 8px 8px 0;">
<b style="color:var(--blue); display:block; margin-bottom:4px;">深度拆解：</b>${(s.critique||'').split('\n').join('<br>').replace(/\*\*(.*?)\*\*/g, '<b style="color:#000;">$1</b>')}
/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b style="color:#000;">$1</b>')}
                </div>
              </article>
            `).join('')}
          </div>
        </div>`;
     } else {
        officialHtml = `<div style="margin-bottom: 32px;">
          <h3 style="margin-bottom: 16px;">实际官方是怎么做的与评价</h3>
          <div class="officialValueGrid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <section style="background: #fff; padding: 18px; border-radius: 12px; border-top: 4px solid var(--green); box-shadow: var(--shadow);">
              <h5 style="margin-top:0; color:var(--green); font-size:16px;">👍 做得好/起效的部分 (Pros)</h5>
              <p style="margin-bottom:0; font-size:14px;">${oa.pros || '无'}</p>
            </section>
            <section style="background: #fff; padding: 18px; border-radius: 12px; border-top: 4px solid var(--red); box-shadow: var(--shadow);">
              <h5 style="margin-top:0; color:var(--red); font-size:16px;">👎 失误/无效的部分 (Cons)</h5>
              <p style="margin-bottom:0; font-size:14px;">${oa.cons || '无'}</p>
            </section>
          </div>
        </div>`;
     }

     return `<div class="block insightPage">
       ${officialHtml}
       <h3 style="margin-bottom: 16px;">PR 应对建议与核心启发</h3>
       <div class="conclusionGrid" style="display:grid; gap:16px;">
         ${takeaways.map((x,i)=>`<article style="background:var(--soft); padding:16px; border-radius:12px; border:1px solid var(--line);"><b>💡 启发 ${i+1}</b><p style="margin-top:8px; margin-bottom:0; font-size:15px;">${x.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</p></article>`).join('')}
       </div>
     </div>`;
  }
  return `<div class="block"><p class="muted">旧版数据，请升级至新模板。</p></div>`;
}

init().then(()=>{
  // 洞察 hover 高亮：hover <li data-tag="..."> 时高亮热力图对应行/列和条形图行
  document.addEventListener('mouseover', e=>{
    const li = e.target.closest('.chartInsights li[data-tag]');
    if(!li) return;
    const tags = li.dataset.tag.split(',');
    document.querySelectorAll('.thRowHead, .thColHead, .thCell, .gdRow').forEach(el=>el.classList.remove('hl'));
    tags.forEach(tag=>{
      // 高亮热力图行（thRowHead + thCell）
      document.querySelectorAll(`.thRowHead[data-row="${tag}"]`).forEach(el=>el.classList.add('hl'));
      document.querySelectorAll(`.thCell[data-row="${tag}"]`).forEach(el=>el.classList.add('hl'));
      // 高亮热力图列（thColHead + thCell）
      document.querySelectorAll(`.thColHead[data-col="${tag}"]`).forEach(el=>el.classList.add('hl'));
      document.querySelectorAll(`.thCell[data-col="${tag}"]`).forEach(el=>el.classList.add('hl'));
      // 高亮条形图行（gdRow）
      document.querySelectorAll(`.gdRow[data-row="${tag}"]`).forEach(el=>el.classList.add('hl'));
    });
  });
  document.addEventListener('mouseout', e=>{
    if(e.target.closest('.chartInsights li[data-tag]')){
      document.querySelectorAll('.thRowHead.hl, .thColHead.hl, .thCell.hl, .gdRow.hl').forEach(el=>el.classList.remove('hl'));
    }
  });
}).catch(err=>{
  console.error("Initialization error:", err);
  document.body.innerHTML=`<div class="app"><div class="block"><h3 style="color:red;">页面加载失败</h3><p class="muted">如果在本地访问，请使用 HTTP 服务器 (如 VSCode Live Server) 打开，直接双击文件会因为 CORS 被拦截。</p><p style="color:red; font-family:monospace; background:#f5f5f5; padding:10px;">${err.message}</p><p>请打开 F12 控制台查看详细报错。</p></div></div>`;
});
