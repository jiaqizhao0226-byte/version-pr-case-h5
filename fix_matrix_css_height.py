import re

with open('/tmp/version-pr-case-h5/style.css', 'r') as f:
    css = f.read()

# Make the matrix strictly fit in the viewport and handle bubbles cleanly
css_patch = """
/* 2x2 Matrix Chart Styles */
.matrix-chart-wrap {
  display: flex;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px 24px 12px 12px;
  box-shadow: var(--shadow);
  height: calc(100vh - 280px); /* Fit within screen */
  min-height: 400px;
}
.matrix-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding-right: 12px;
  width: 40px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  position: relative;
}
.matrix-y-axis::after {
  content: "";
  position: absolute;
  right: 0;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: var(--line);
}
.matrix-y-axis::before {
  content: "▲";
  position: absolute;
  right: -5px;
  top: -4px;
  color: var(--line);
  font-size: 12px;
}
.matrix-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.matrix-chart {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  background: var(--line);
  border: 2px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  flex: 1;
}
.matrix-quad {
  background: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  position: relative;
  overflow-y: auto;
}
"""

css = re.sub(r'/\* 2x2 Matrix Chart Styles \*/[\s\S]*?\.matrix-quad \{[\s\S]*?\}', css_patch.strip(), css)

with open('/tmp/version-pr-case-h5/style.css', 'w') as f:
    f.write(css)
