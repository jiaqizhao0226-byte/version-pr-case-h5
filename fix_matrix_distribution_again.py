import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# We need to change the criteria for High vs Low volume.
# Right now, all S and A are High. We have no B volumes.
# If we look at our data:
# volume: S (11 cases), A (5 cases)
# So if we make S = High Vol, A = Low Vol, we get 11 on the right, 5 on the left.
# Wait, let's look at the actual code for distribution.

logic_patch = """
  list.forEach(c => {
    const vol = c.volume || '';
    const dmg = c.damage || '';
    
    // In our dataset, volume is mostly S and A. 
    // To show a proper 2x2 matrix distribution:
    // Volume: 'S' is High Vol (Right), 'A' or lower is Low Vol (Left)
    // Damage: 'S' or 'A/S' is High Dmg (Top), 'A' or 'B/A' or 'B' is Low Dmg (Bottom)
    
    const highVol = vol.includes('S'); 
    const highDmg = dmg.includes('S') || dmg.includes('A/S');
    
    if (highDmg && highVol) q1.push(c);        // Top Right: High Dmg, High Vol
    else if (highDmg && !highVol) q2.push(c);  // Top Left: High Dmg, Low Vol
    else if (!highDmg && highVol) q3.push(c);  // Bottom Right: Low Dmg, High Vol
    else q4.push(c);                           // Bottom Left: Low Dmg, Low Vol
  });
"""

# Let's see what is currently in app.js
import sys
start_idx = js.find('list.forEach(c => {')
end_idx = js.find('});\n\n  const getBubbleColor', start_idx)

if start_idx != -1 and end_idx != -1:
    js = js[:start_idx] + logic_patch.strip() + js[end_idx + 3:]

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
