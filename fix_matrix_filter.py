import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Add the missing category to the dropdown
new_matrix = "['高伤害 + 高声量 (核心危机)', '低伤害 + 高声量 (舆论风暴)', '高伤害 + 低声量 (隐性流失)', '低伤害 + 低声量 (常规客诉)'].forEach(x => {"
js = re.sub(r"\['高伤害 \+ 高声量 \(核心危机\)', '低伤害 \+ 高声量 \(舆论风暴\)', '高伤害 \+ 低声量 \(隐性流失\)'\]\.forEach\(x => \{", new_matrix, js)

# Update the filter logic to handle the new category
filter_logic = """
      if (mx === '高伤害 + 高声量 (核心危机)' && !(highVol && highDmg)) return false;
      if (mx === '低伤害 + 高声量 (舆论风暴)' && !(highVol && !highDmg)) return false;
      if (mx === '高伤害 + 低声量 (隐性流失)' && !(!highVol && highDmg)) return false;
      if (mx === '低伤害 + 低声量 (常规客诉)' && !(!highVol && !highDmg)) return false;
"""
js = re.sub(
    r"if \(mx === '高伤害 \+ 高声量 \(核心危机\)' && !\(highVol && highDmg\)\) return false;\s*if \(mx === '低伤害 \+ 高声量 \(舆论风暴\)' && !\(highVol && !highDmg\)\) return false;\s*if \(mx === '高伤害 \+ 低声量 \(隐性流失\)' && !(!highVol && highDmg\)\) return false;",
    filter_logic.strip(),
    js
)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
