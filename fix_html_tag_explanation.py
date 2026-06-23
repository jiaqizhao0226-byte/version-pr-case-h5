import re

with open('/tmp/version-pr-case-h5/index.html', 'r') as f:
    html = f.read()

# Update the explanation for '破圈反噬/极端维权'
new_explanation = """<li style="margin-bottom:6px;"><b>破圈反噬/极端维权</b>：指舆情突破了游戏社区本身，演变为社会性事件或使用非常规手段降维打击。例如：诉诸 12315/消保委/律师函 (恋与深空/枫之谷)；组织跨平台的 App Store/Steam 全球差评轰炸 (原神一周年/Apex)；或者因内容尺度过大引来圈外路人的道德审判与监管危机 (恋与深空夏以昼)。这是玩家逼迫官方就范的终极武器。</li>"""

html = re.sub(r'<li style="margin-bottom:6px;"><b>破圈反噬/极端维权</b>：.*?</li>', new_explanation, html)

with open('/tmp/version-pr-case-h5/index.html', 'w') as f:
    f.write(html)
