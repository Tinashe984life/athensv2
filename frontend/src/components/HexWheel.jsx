import React, { useMemo, useState } from 'react';

/* Axial hex-grid ring directions */
const DIRS = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Hexagonal colour gradient picker — a honeycomb wheel where hue follows the
 * angle and saturation grows outward from the centre, plus a lightness slider.
 */
const HexWheel = ({ value, onChange, rings = 6, cellRadius = 13 }) => {
  const [lightness, setLightness] = useState(50);

  const cells = useMemo(() => {
    const out = [{ q: 0, r: 0, ring: 0 }];
    for (let ring = 1; ring <= rings; ring++) {
      let q = DIRS[4][0] * ring;
      let r = DIRS[4][1] * ring;
      for (let d = 0; d < 6; d++) {
        for (let i = 0; i < ring; i++) {
          out.push({ q, r, ring });
          q += DIRS[d][0];
          r += DIRS[d][1];
        }
      }
    }
    return out;
  }, [rings]);

  const sqrt3 = Math.sqrt(3);
  const extent = cellRadius * sqrt3 * (rings + 1);
  const corners = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const ang = ((60 * i - 30) * Math.PI) / 180;
      pts.push([cellRadius * Math.cos(ang), cellRadius * Math.sin(ang)]);
    }
    return pts;
  }, [cellRadius]);

  const colorOf = (cell) => {
    if (cell.ring === 0) return hslToHex(0, 0, lightness);
    const x = cellRadius * sqrt3 * (cell.q + cell.r / 2);
    const y = cellRadius * 1.5 * cell.r;
    const hue = (Math.atan2(y, x) * 180) / Math.PI;
    const sat = (cell.ring / rings) * 100;
    return hslToHex(hue, sat, lightness);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
        className="h-56 w-56 select-none"
        role="listbox"
        aria-label="Colour wheel"
      >
        {cells.map((cell) => {
          const cx = cellRadius * sqrt3 * (cell.q + cell.r / 2);
          const cy = cellRadius * 1.5 * cell.r;
          const color = colorOf(cell);
          const selected = value && value.toLowerCase() === color.toLowerCase();
          return (
            <polygon
              key={`${cell.q},${cell.r}`}
              points={corners.map(([px, py]) => `${cx + px},${cy + py}`).join(' ')}
              fill={color}
              stroke={selected ? '#111827' : 'rgba(255,255,255,0.65)'}
              strokeWidth={selected ? 2.5 : 1}
              className="cursor-pointer transition-opacity hover:opacity-80"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(color)}
            >
              <title>{color}</title>
            </polygon>
          );
        })}
      </svg>
      <div className="flex w-full max-w-[14rem] items-center gap-3">
        <span className="micro-label">Dark</span>
        <input
          type="range"
          min="22"
          max="78"
          value={lightness}
          onChange={(e) => setLightness(Number(e.target.value))}
          className="flex-1 accent-gray-900 dark:accent-white"
          aria-label="Lightness"
        />
        <span className="micro-label">Light</span>
      </div>
    </div>
  );
};

export default HexWheel;
