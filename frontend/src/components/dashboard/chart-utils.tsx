// Custom X/Y Axis tick renderer for recharts (rotates, truncates, and adds tooltip)
export const renderCustomAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const label = payload.value?.toString() || '';
  const maxLen = 10;
  const displayLabel = label.length > maxLen ? label.slice(0, maxLen) + '…' : label;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#64748b"
        fontSize={11}
        transform="rotate(-60)"
        style={{ cursor: label.length > maxLen ? 'pointer' : 'default' }}
      >
        {displayLabel}
      </text>
    </g>
  );
}; 