import re

with open('/tmp/version-pr-case-h5/style.css', 'r') as f:
    css = f.read()

# Make navigation bar styles
nav_style = """
/* Top Navigation Bar */
.mainNav {
  display: flex;
  gap: 16px;
  background: var(--panel);
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  margin-bottom: 24px;
  overflow-x: auto;
}
.mainNav button {
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: 0.2s all;
}
.mainNav button:hover {
  background: var(--soft);
  color: var(--text);
}
.mainNav button.active {
  background: var(--blueBg);
  color: var(--blue);
}

/* Beautiful card touches */
.card, .panel, .block {
  transition: box-shadow 0.3s ease;
}
.card:hover, .panel:hover {
  box-shadow: 0 12px 40px rgba(44,44,42,0.12);
}
"""

css += nav_style

with open('/tmp/version-pr-case-h5/style.css', 'w') as f:
    f.write(css)

