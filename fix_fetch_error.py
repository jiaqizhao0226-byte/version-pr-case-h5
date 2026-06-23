import re

with open('/tmp/version-pr-case-h5/app.js', 'r') as f:
    js = f.read()

# Update loadJson to handle Github Pages paths better and provide better error message
fetch_patch = """
async function loadJson(url){
  try {
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error(`${url} returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load: " + url, err);
    throw err;
  }
}
"""

js = re.sub(r'async function loadJson\(url\)\{[\s\S]*?return res\.json\(\);\s*\}', fetch_patch.strip(), js)

with open('/tmp/version-pr-case-h5/app.js', 'w') as f:
    f.write(js)
