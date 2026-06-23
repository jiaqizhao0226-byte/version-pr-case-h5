import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

conclusions_html = """
  <main id="conclusions" style="display:none">
    <section class="card heroMain" style="margin-bottom:20px;">
      <h2>结论梳理与核心矛盾标签</h2>
      <p class="muted">在深度复盘了 14 个典型游戏舆情案例后，我们摒弃了过于零散的口语化标签，将所有危机合并同类项，提炼出这 10 个高频爆发的“底层雷区”。</p>
    </section>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 40px;">
      
      <!-- Category 1 -->
      <article class="card" style="padding:20px; border-top: 4px solid var(--red);">
        <h3 style="margin-top:0; color:var(--red);">💰 利益受损 (硬核矛盾)</h3>
        <p style="font-size:14px; color:var(--muted); line-height:1.6; margin-bottom:16px;">
          **共性归纳**：玩家感受到“真金白银、时间投入或数字资产”遭到掠夺。这是最致命的商业红线，极易引爆核心危机。
        </p>
        <div class="chips" style="margin-bottom:12px;">
          <span class="chip" style="background:var(--redBg); color:var(--red); border-color:var(--red);">核心资产剥夺/暗改</span>
          <span class="chip" style="background:var(--redBg); color:var(--red); border-color:var(--red);">商业契约撕毁/逼氪</span>
          <span class="chip" style="background:var(--redBg); color:var(--red); border-color:var(--red);">教玩家玩游戏 (削弱爽感)</span>
          <span class="chip" style="background:var(--redBg); color:var(--red); border-color:var(--red);">体验硬伤/预期管理失败</span>
        </div>
        <ul style="font-size:13px; color:var(--text); padding-left:16px; margin:0;">
          <li style="margin-bottom:6px;"><b>核心资产剥夺/暗改</b>：原神龙王转圈削弱、枫之谷数值造假。玩家对已购资产贬值零容忍。</li>
          <li style="margin-bottom:6px;"><b>商业契约撕毁/逼氪</b>：世界之外突击涨价、Apex战令改美金。打破了玩家习惯的低保安全感。</li>
          <li style="margin-bottom:6px;"><b>教玩家玩游戏</b>：暗黑4全员大砍、三角洲限制监狱。为了控制消耗速度牺牲玩家割草爽感。</li>
          <li><b>体验硬伤</b>：鸣潮开服卡顿Bug、原神一周年抠门。交付质量与心理预期严重错位。</li>
        </ul>
      </article>

      <!-- Category 2 -->
      <article class="card" style="padding:20px; border-top: 4px solid var(--amber);">
        <h3 style="margin-top:0; color:var(--amber);">🎭 情感与价值观 (文化冲突)</h3>
        <p style="font-size:14px; color:var(--muted); line-height:1.6; margin-bottom:16px;">
          **共性归纳**：未触及直接经济利益，但冒犯了玩家的身份认同、性别立场或对角色的精神寄托。极易引发剧烈的全网对立撕扯。
        </p>
        <div class="chips" style="margin-bottom:12px;">
          <span class="chip" style="background:var(--amberBg); color:var(--amber); border-color:var(--amber);">情感背叛/OOC</span>
          <span class="chip" style="background:var(--amberBg); color:var(--amber); border-color:var(--amber);">性别与擦边议题</span>
          <span class="chip" style="background:var(--amberBg); color:var(--amber); border-color:var(--amber);">价值观/圈层冲突</span>
        </div>
        <ul style="font-size:13px; color:var(--text); padding-left:16px; margin:0;">
          <li style="margin-bottom:6px;"><b>情感背叛/OOC</b>：崩坏3兔女郎外服跳舞。打破了二游玩家最看重的“排他性精神契约”。</li>
          <li style="margin-bottom:6px;"><b>性别与擦边议题</b>：恋与深空夏以昼露肉、燕云十六声飞白成诗内衣化。在“女凝”与“媚男”的极端对立中夹缝求生。</li>
          <li><b>价值观/圈层冲突</b>：鸣潮“你怎么还在”嘲讽玩家、美化逃跑将军。违背了大众朴素的正邪/尊重观。</li>
        </ul>
      </article>

      <!-- Category 3 -->
      <article class="card" style="padding:20px; border-top: 4px solid var(--blue);">
        <h3 style="margin-top:0; color:var(--blue);">⚔️ 公关应对与玩家反制</h3>
        <p style="font-size:14px; color:var(--muted); line-height:1.6; margin-bottom:16px;">
          **共性归纳**：舆情爆发后第二战场的博弈机制。展示了极端的玩家反制手段，以及官方“装死”或“滑跪”的最终疗效。
        </p>
        <div class="chips" style="margin-bottom:12px;">
          <span class="chip" style="background:var(--blueBg); color:var(--blue); border-color:var(--blue);">光速滑跪/天价补偿</span>
          <span class="chip" style="background:var(--blueBg); color:var(--blue); border-color:var(--blue);">公关装死/傲慢</span>
          <span class="chip" style="background:var(--blueBg); color:var(--blue); border-color:var(--blue);">破圈反噬/极端维权</span>
        </div>
        <ul style="font-size:13px; color:var(--text); padding-left:16px; margin:0;">
          <li style="margin-bottom:6px;"><b>破圈反噬/极端维权</b>：律师函/12315 (恋与深空)、应用商店全球差评轰炸 (原神/Apex)。玩家通过降维打击逼迫官方就范。</li>
          <li style="margin-bottom:6px;"><b>公关装死/傲慢</b>：世界之外直言“想赚钱”、崩坏3装死一个月。导致矛盾升级不可调和。</li>
          <li><b>光速滑跪/天价补偿</b>：原神10连、鸣潮送五星自选。证明了在绝对的利益面前，道歉与“血包”是切断危机的唯一解药。</li>
        </ul>
      </article>

    </div>
  </main>
"""

html = re.sub(r'<main id="conclusions" style="display:none">[\s\S]*?</main>', conclusions_html.strip(), html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
