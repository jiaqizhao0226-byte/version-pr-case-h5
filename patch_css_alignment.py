import re

with open('/tmp/version-pr-case-h5/style.css', 'r') as f:
    css = f.read()

# Fix .caseHead alignment (prevent badge from stretching)
css = css.replace('.caseHead{display:flex;justify-content:space-between;gap:12px}', 
                  '.caseHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}')

# Fix .caseCard flex layout for footer alignment
css = css.replace('.caseCard{padding:17px;cursor:pointer;transition:.16s transform,.16s border-color}',
                  '.caseCard{padding:17px;cursor:pointer;transition:.16s transform,.16s border-color;display:flex;flex-direction:column;height:100%}')

# Fix .foot margin-top to auto to push it to the bottom
css = css.replace('.foot{display:flex;justify-content:space-between;margin-top:14px;color:var(--muted);font-size:12px}',
                  '.foot{display:flex;justify-content:space-between;margin-top:auto;padding-top:14px;color:var(--muted);font-size:12px}')

# Just in case the format slightly differs, let's do a regex replace as fallback
css = re.sub(r'\.caseHead\{([^}]*?)\}', lambda m: '.caseHead{' + m.group(1) + (';align-items:flex-start' if 'align-items' not in m.group(1) else '') + '}', css)
css = re.sub(r'\.caseCard\{([^}]*?)\}', lambda m: '.caseCard{' + m.group(1) + (';display:flex;flex-direction:column;height:100%' if 'flex-direction' not in m.group(1) else '') + '}', css)
css = re.sub(r'\.foot\{([^}]*?)margin-top:14px([^}]*?)\}', r'.foot{\1margin-top:auto;padding-top:14px\2}', css)

with open('/tmp/version-pr-case-h5/style.css', 'w') as f:
    f.write(css)
