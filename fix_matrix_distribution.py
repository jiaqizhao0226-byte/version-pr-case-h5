import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Fix the distribution logic. Currently S and A are both considered "High" for both Volume and Damage.
# Since almost all our major cases are S or A, everything falls into Q1 (High, High).
# We need to distribute them better based on their actual ratings to show the matrix correctly.
# Volume: S -> High, A -> Low (relatively, to distribute them) OR we can use the mapping we know.

better_distribution = """
  list.forEach(c => {
    const vol = c.volume || '';
    const dmg = c.damage || '';
    
    // To create a meaningful distribution out of our 14 major cases:
    // Volume S -> High Vol, Volume A/B -> Low Vol
    // Damage S or A/S -> High Dmg, Damage A/B -> Low Dmg
    
    const highVol = vol.includes('S'); 
    const highDmg = dmg.includes('S') || dmg === 'A/S';
    
    if (highDmg && highVol) q1.push(c);
    else if (highDmg && !highVol) q2.push(c);
    else if (!highDmg && highVol) q3.push(c);
    else q4.push(c);
  });
"""

js = re.sub(r"list\.forEach\(c => \{[\s\S]*?if \(highDmg && highVol\) q1\.push\(c\);[\s\S]*?else q4\.push\(c\);\s*\}\);", better_distribution.strip(), js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
