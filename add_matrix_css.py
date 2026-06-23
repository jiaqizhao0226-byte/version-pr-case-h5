with open('/tmp/version-pr-case-h5/style.css', 'r') as f:
    css = f.read()

matrix_css = """
/* 2x2 Matrix Chart Styles */
.matrix-chart-wrap {
  display: flex;
  margin-top: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 24px 24px 12px 12px;
  box-shadow: var(--shadow);
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
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 10px;
  position: relative;
  min-height: 220px;
}
.q-bg-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: 800;
  color: rgba(0,0,0,0.03);
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 0.1em;
}
.matrix-x-axis {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  position: relative;
  margin-top: 4px;
}
.matrix-x-axis::after {
  content: "";
  position: absolute;
  top: 0;
  left: 10px;
  right: 10px;
  height: 2px;
  background: var(--line);
}
.matrix-x-axis::before {
  content: "▶";
  position: absolute;
  right: -4px;
  top: -6px;
  color: var(--line);
  font-size: 12px;
}
.matrix-bubble {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 2;
}
.matrix-bubble:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 6px 12px rgba(0,0,0,0.12);
}
.b-red { background: #fff5f5; color: #c53030; border-color: #feb2b2; }
.b-red:hover { background: #c53030; color: #fff; }
.b-amber { background: #fffaf0; color: #c05621; border-color: #fbd38d; }
.b-amber:hover { background: #dd6b20; color: #fff; }
.b-blue { background: #ebf8ff; color: #2b6cb0; border-color: #90cdf4; }
.b-blue:hover { background: #3182ce; color: #fff; }
.b-gray { background: #f7fafc; color: #4a5568; border-color: #e2e8f0; }
.b-gray:hover { background: #718096; color: #fff; }

@media(max-width:760px){
  .matrix-chart { display: flex; flex-direction: column; }
  .matrix-quad { min-height: 120px; }
  .matrix-x-axis, .matrix-y-axis { display: none; }
  .matrix-chart-wrap { padding: 12px; }
}
"""

css += matrix_css

with open('/tmp/version-pr-case-h5/style.css', 'w') as f:
    f.write(css)
