import React from 'react';

type Series = {
  label: string;
  values: number[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pointsFor(values: number[], width: number, height: number, padding = 6) {
  const max = Math.max(1, ...values.map((v) => (Number.isFinite(v) ? v : 0)));
  const min = 0;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const step = values.length <= 1 ? usableW : usableW / (values.length - 1);

  return values.map((v, i) => {
    const vv = Number.isFinite(v) ? v : 0;
    const x = padding + i * step;
    const y = padding + usableH * (1 - (vv - min) / (max - min));
    return { x, y: clamp(y, padding, height - padding) };
  });
}

function pathFrom(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

export function MiniLineChart({
  series,
  height = 120,
}: {
  series: Series[];
  height?: number;
}) {
  const width = 560;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues.map((v) => (Number.isFinite(v) ? v : 0)));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[560px]">
        <line
          x1="6"
          y1={height - 6}
          x2={width - 6}
          y2={height - 6}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
        <line
          x1="6"
          y1="6"
          x2="6"
          y2={height - 6}
          stroke="currentColor"
          strokeOpacity="0.15"
        />

        {series.map((s, idx) => {
          const pts = pointsFor(s.values, width, height);
          const path = pathFrom(pts);
          const color =
            idx === 0
              ? 'rgba(96,165,250,0.9)' // blue
              : idx === 1
              ? 'rgba(34,197,94,0.9)' // green
              : 'rgba(244,114,182,0.9)'; // pink

          return (
            <g key={s.label}>
              <path d={path} fill="none" stroke={color} strokeWidth="2.25" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
              ))}
            </g>
          );
        })}

        <text x={width - 6} y="14" textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">
          max {Math.round(max / 100) / 10}k
        </text>
      </svg>
    </div>
  );
}
