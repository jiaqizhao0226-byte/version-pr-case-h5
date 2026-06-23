import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Make double sure renderGrid gets called!
render_patch = """
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
"""

js = re.sub(r'async function init\(\)\{[\s\S]*?\}', render_patch.strip(), js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
