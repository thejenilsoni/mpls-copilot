interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
  label: string;
  showArea?: boolean;
}

function pointsFor(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  color = "var(--cyan)",
  height = 56,
  label,
  showArea = true,
}: SparklineProps) {
  const width = 240;
  const points = pointsFor(values, width, height);
  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      aria-label={label}
      className="sparkline"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={`fill-${label.replaceAll(" ", "-")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea ? (
        <polygon
          fill={`url(#fill-${label.replaceAll(" ", "-")})`}
          points={area}
        />
      ) : null}
      <polyline
        fill="none"
        points={points}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
