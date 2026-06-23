import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# I realize `switchMainTab` function definition got deleted somehow! 
# Let's restore it at the very top of the file after variable declarations
switch_func = """
function switchMainTab(tabId) {
  document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + tabId);
  if (btn) btn.classList.add('active');
  
  if(document.getElementById('dashboard')) document.getElementById('dashboard').style.display = 'none';
  if(document.getElementById('mapping')) document.getElementById('mapping').style.display = 'none';
  if(document.getElementById('conclusions')) document.getElementById('conclusions').style.display = 'none';
  if(document.getElementById('detail')) document.getElementById('detail').style.display = 'none';
  
  if (tabId === 'dashboard') {
    location.hash = '';
    if(document.getElementById('dashboard')) document.getElementById('dashboard').style.display = 'block';
  } else {
    if(document.getElementById(tabId)) document.getElementById(tabId).style.display = 'block';
  }
}
"""

js = js.replace('const sevClass=v=>typeof v===\'string\'?(v.includes(\'S\')?\'s\':(v.includes(\'A\')?\'a\':\'s\')):\'s\';', 
                'const sevClass=v=>typeof v===\'string\'?(v.includes(\'S\')?\'s\':(v.includes(\'A\')?\'a\':\'s\')):\'s\';\n' + switch_func)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
