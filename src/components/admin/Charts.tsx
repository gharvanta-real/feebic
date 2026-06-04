"use client";

/**
 * SparkLine — Minimal SVG sparkline for trend charts.
 * Usage: <SparkLine data={[12, 45, 32, 68, 90]} color="cyan" height={40} />
 */
type SparkLineProps = {
  data: number[];
  color?: "cyan" | "violet" | "emerald" | "amber" | "red";
  height?: number;
  width?: number;
  filled?: boolean;
};

const colorStroke: Record<NonNullable<SparkLineProps["color"]>, string> = {
  cyan:    "#06b6d4",
  violet:  "#8b5cf6",
  emerald: "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
};

export function SparkLine({ data, color = "cyan", height = 50, width = 300, filled = true }: SparkLineProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 4;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const stroke = colorStroke[color];

  // Close path for fill area - using virtual width/height coordinates
  const fillPath = `M${points[0]} L${points.join(" L")} L${width - pad},${height} L${pad},${height} Z`;

  // Generate a safe unique key for gradient ID
  const gradientId = `sparkline-grad-${color}`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      {filled && (
        <path
          d={fillPath}
          fill={`url(#${gradientId})`}
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point glowing dot */}
      {points[points.length - 1] && (
        <g>
          <circle
            cx={parseFloat(points[points.length - 1].split(",")[0])}
            cy={parseFloat(points[points.length - 1].split(",")[1])}
            r="5"
            fill={stroke}
            fillOpacity="0.3"
          />
          <circle
            cx={parseFloat(points[points.length - 1].split(",")[0])}
            cy={parseFloat(points[points.length - 1].split(",")[1])}
            r="2.5"
            fill={stroke}
          />
        </g>
      )}
    </svg>
  );
}

/**
 * BarChart — Minimal SVG bar chart.
 * Usage: <BarChart data={[100, 200, 150]} labels={["Mon", "Tue", "Wed"]} color="violet" />
 */
type BarChartProps = {
  data: number[];
  labels?: string[];
  color?: "cyan" | "violet" | "emerald" | "amber" | "red";
  height?: number;
};

export function BarChart({ data, labels, color = "violet", height = 120 }: BarChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data) || 1;
  const barWidth = 100 / data.length;
  const gap = 1;
  const stroke = colorStroke[color];

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((v, i) => {
          const barH = (v / max) * (height - 20);
          const x = i * barWidth + gap;
          const y = height - 20 - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth - gap * 2}
                height={barH}
                fill={stroke}
                fillOpacity="0.7"
                rx="1"
              />
            </g>
          );
        })}
      </svg>
      {labels && (
        <div className="flex justify-between mt-1">
          {labels.map((l, i) => (
            <span key={i} className="text-[8px] text-[var(--color-text-muted)] font-medium">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
