import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

nav_js = """
function switchMainTab(tabId) {
  document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
  document.getElementById('nav-' + tabId).classList.add('active');
  
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('mapping').style.display = 'none';
  document.getElementById('conclusions').style.display = 'none';
  document.getElementById('detail').style.display = 'none';
  
  if (tabId === 'dashboard') {
    location.hash = '';
    document.getElementById('dashboard').style.display = 'block';
  } else {
    document.getElementById(tabId).style.display = 'block';
  }
}

async function route(){
  const id=(location.hash.match(/case=([^&]+)/)||[])[1];
  if(id){
    const summary=caseSummaries.find(c=>c.id===id)||caseSummaries[0];
    currentCase=await loadJson(summary.caseFile);
    $('dashboard').style.display='none';
    $('mapping').style.display='none';
    $('conclusions').style.display='none';
    $('detail').style.display='block';
    
    // Clear active nav when entering detail
    document.querySelectorAll('.mainNav button').forEach(b => b.classList.remove('active'));
    
    renderDetail(currentCase);
    scrollTo(0,0);
  }else{
    // Go to dashboard by default if no hash
    switchMainTab('dashboard');
    renderGrid();
  }
}
"""

# Replace route function and add switchMainTab
js = re.sub(r'async function route\(\)\{[\s\S]*?\}[\s]*function renderDetail', nav_js + '\nfunction renderDetail', js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
