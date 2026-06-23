with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    lines = f.read().split('\n')

for i, line in enumerate(lines):
    if "['高伤害 + 高声量 (核心危机)', '低伤害 + 高声量 (舆论风暴)', '高伤害 + 低声量 (隐性流失)'].forEach" in line:
        lines[i] = "  ['高伤害 + 高声量 (核心危机)', '低伤害 + 高声量 (舆论风暴)', '高伤害 + 低声量 (隐性流失)', '低伤害 + 低声量 (常规客诉)'].forEach(x => {"
    if "if (mx === '高伤害 + 低声量 (隐性流失)' && !(!highVol && highDmg)) return false;" in line:
        lines[i] = line + "\n      if (mx === '低伤害 + 低声量 (常规客诉)' && !(!highVol && !highDmg)) return false;"

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write('\n'.join(lines))
