import re
import json

# 1. Update app.js to use <optgroup> for the dropdown
with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

grouped_filter_logic = """
  // Core Tags grouped
  const tagCategories = {
    '💰 利益受损 (硬核矛盾)': ['核心资产剥夺', '底层契约撕毁', '教玩家玩游戏', '预期管理失败', '产品硬伤', '逼氪背刺', '商业化暴雷', '商业欺诈', '变相削弱', '数值造假', '战令经济学', '强制法币氪金', '无差别削弱', '剥夺爽感', '资产清零焦虑', '暗改难度', '玩法契约破坏'],
    '🎭 情感与价值观 (文化冲突)': ['价值观冲突', '情感背叛/OOC', '性别争议', '性别对立', '破圈反噬', '男凝争议', '软色情争议', '违背初心', '区域区别对待', '信任危机', '平民与硬核分歧'],
    '⚔️ 公关应对与玩家反制': ['光速滑跪', '滑跪标杆', '天价补偿', '冷处理傲慢', '公关装死', '发疯反噬', '差评轰炸', '全球差评轰炸', '律师函维权', '全额退款', '法律风险', '按闹分配', '粗暴执法封号', '直播道歉', '光速改底座']
  };

  const tagEl = $('core_tag');
  tagEl.innerHTML = '<option value="">全部核心矛盾标签</option>'; // reset
  
  // To collect all unique tags from cases
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

  // Handle any orphan tags that didn't match the dictionary
  const orphanTags = allTags.filter(t => !placedTags.has(t));
  if (orphanTags.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '📌 其他标签';
    orphanTags.forEach(t => {
      const o=document.createElement('option');o.value=t;o.textContent=t;optgroup.appendChild(o);
    });
    tagEl.appendChild(optgroup);
  }
}
"""

js = re.sub(r"// Core Tags[\s\S]*?\}\s*function bindFilters", grouped_filter_logic.strip() + "\n\nfunction bindFilters", js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)

# 2. Update index.html to build the conclusions page!
with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

conclusions_html = """
  <main id="conclusions" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>结论梳理与核心矛盾标签</h2>
      <p class="muted">在深度复盘了 14 个典型游戏舆情案例后，我们发现绝大多数危机看似偶然，实则都踩中了以下三大底层分类的“雷区”。</p>
    </section>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 40px;">
      
      <!-- Category 1 -->
      <article class="card" style="padding:20px; border-top: 4px solid var(--red);">
        <h3 style="margin-top:0; color:var(--red);">💰 利益受损 (硬核矛盾)</h3>
        <p style="font-size:14px; color:var(--muted); line-height:1.6; margin-bottom:16px;">
          **共性归纳**：玩家觉得自己的“真金白银、时间投入或数字资产”遭到了官方的掠夺或欺诈。这是最致命的红线，一旦越界必然引发核心危机。
        </p>
        <div class="chips" style="margin-bottom:12px;">
          <span class="chip" style="background:var(--redBg); color:var(--red); border-color:var(--red);">核心资产剥夺</span>
          <span class="chip" style="background:var(--redBg); color:var(--red); border-color:var(--red);">底层契约撕毁</span>
          <span class="chip" style="background:var(--redBg); color:var(--red); border-color:var(--red);">教玩家玩游戏</span>
        </div>
        <ul style="font-size:13px; color:var(--text); padding-left:16px; margin:0;">
          <li style="margin-bottom:6px;"><b>暗改/削弱</b>：原神龙王转圈、DNF雷龙难度暗改。</li>
          <li style="margin-bottom:6px;"><b>虚假宣传/欺诈</b>：恋与深空PV不符、枫之谷数值造假。</li>
          <li><b>单方面毁约</b>：Apex战令改美金、七日世界外观绑定。</li>
        </ul>
      </article>

      <!-- Category 2 -->
      <article class="card" style="padding:20px; border-top: 4px solid var(--amber);">
        <h3 style="margin-top:0; color:var(--amber);">🎭 情感与价值观 (文化冲突)</h3>
        <p style="font-size:14px; color:var(--muted); line-height:1.6; margin-bottom:16px;">
          **共性归纳**：未触及直接经济利益，但严重冒犯了玩家的身份认同、性别立场或对角色的情感寄托。极易引发剧烈的圈层对立与饭圈化撕扯。
        </p>
        <div class="chips" style="margin-bottom:12px;">
          <span class="chip" style="background:var(--amberBg); color:var(--amber); border-color:var(--amber);">价值观冲突</span>
          <span class="chip" style="background:var(--amberBg); color:var(--amber); border-color:var(--amber);">情感背叛/OOC</span>
          <span class="chip" style="background:var(--amberBg); color:var(--amber); border-color:var(--amber);">性别争议</span>
        </div>
        <ul style="font-size:13px; color:var(--text); padding-left:16px; margin:0;">
          <li style="margin-bottom:6px;"><b>人设崩塌 (OOC)</b>：崩坏3兔女郎外服跳舞。</li>
          <li style="margin-bottom:6px;"><b>文案价值观雷点</b>：鸣潮“你怎么还在”抢功劳事件。</li>
          <li><b>性别/擦边对立</b>：燕云十六声“女侠变软色情”争议、恋与深空夏以昼破圈反噬。</li>
        </ul>
      </article>

      <!-- Category 3 -->
      <article class="card" style="padding:20px; border-top: 4px solid var(--blue);">
        <h3 style="margin-top:0; color:var(--blue);">⚔️ 公关应对与玩家反制</h3>
        <p style="font-size:14px; color:var(--muted); line-height:1.6; margin-bottom:16px;">
          **共性归纳**：游戏外的“第二战场”。展示了玩家如何通过降维打击逼迫官方，以及官方在傲慢与卑微之间的两极管操作。
        </p>
        <div class="chips" style="margin-bottom:12px;">
          <span class="chip" style="background:var(--blueBg); color:var(--blue); border-color:var(--blue);">史诗级滑跪</span>
          <span class="chip" style="background:var(--blueBg); color:var(--blue); border-color:var(--blue);">官方傲慢/装死</span>
          <span class="chip" style="background:var(--blueBg); color:var(--blue); border-color:var(--blue);">极端维权</span>
        </div>
        <ul style="font-size:13px; color:var(--text); padding-left:16px; margin:0;">
          <li style="margin-bottom:6px;"><b>反制手段</b>：12315律师函 (恋与深空)、应用商店差评轰炸 (原神一周年、Apex)。</li>
          <li style="margin-bottom:6px;"><b>负面公关</b>：世界之外发疯说“想赚钱”、崩坏3装死一个月。</li>
          <li><b>有效公关</b>：暴雪直播出镜认错、库洛/米哈游天价补偿强行阻断。</li>
        </ul>
      </article>

    </div>
  </main>
"""

html = re.sub(r'<main id="conclusions" style="display:none">[\s\S]*?</main>', conclusions_html.strip(), html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
