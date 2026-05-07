import { useRef, useCallback, useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (hours: number) => void;
  min?: number;
  max?: number;
}

const QUICK = [1, 2, 3, 4, 5, 6, 7, 8];
const EXTRA = [0.5, 1.5, 2.5, 9, 10];

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function snap(v: number): number {
  return Math.round(v * 2) / 2; // snap to 0.5
}

export default function TimeArcPicker({ value, onChange, min = 0.5, max = 10 }: Props) {
  const [showExtra, setShowExtra] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  // Arc params
  const cx = 110, cy = 110, r = 80;
  const startAngle = 200; // degrees
  const endAngle = 340;
  const totalAngle = endAngle - startAngle; // 140 degrees

  function hoursToAngle(h: number): number {
    const norm = (h - min) / (max - min);
    return startAngle + norm * totalAngle;
  }

  function angleToHours(angle: number): number {
    const norm = (angle - startAngle) / totalAngle;
    return clamp(snap(min + norm * (max - min)), min, max);
  }

  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function getAngleFromEvent(e: MouseEvent | TouchEvent): number {
    const svg = svgRef.current;
    if (!svg) return startAngle;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = 220 / rect.width;
    const scaleY = 220 / rect.height;
    const svgX = (clientX - rect.left) * scaleX;
    const svgY = (clientY - rect.top) * scaleY;
    let deg = (Math.atan2(svgY - cy, svgX - cx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return clamp(deg, startAngle, endAngle);
  }

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    const angle = getAngleFromEvent(e);
    onChange(angleToHours(angle));
  }, [min, max, onChange]);

  const handleUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [handleMove, handleUp]);

  const currentAngle = hoursToAngle(value);
  const thumbPos = polarToXY(currentAngle);
  const arcStart = polarToXY(startAngle);
  const arcFill = polarToXY(currentAngle);

  function describeArc(startDeg: number, endDeg: number) {
    const s = polarToXY(startDeg);
    const e = polarToXY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const hrs = Math.floor(value);
  const mins = Math.round((value - hrs) * 60);

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Hour display */}
      <div className="text-4xl font-bold text-gray-900 tabular-nums">
        {hrs}h {String(mins).padStart(2, '0')}m
      </div>

      {/* Arc SVG */}
      <svg
        ref={svgRef}
        width="220"
        height="140"
        viewBox="0 0 220 220"
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => { dragging.current = true; handleMove(e.nativeEvent); }}
        onTouchStart={(e) => { dragging.current = true; handleMove(e.nativeEvent); }}
        style={{ overflow: 'visible', marginBottom: '-80px' }}
      >
        {/* Track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Fill */}
        {value > min && (
          <path
            d={describeArc(startAngle, currentAngle)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        {/* Thumb */}
        <circle
          cx={thumbPos.x}
          cy={thumbPos.y}
          r="10"
          fill="white"
          stroke="#3b82f6"
          strokeWidth="3"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(59,130,246,0.3))' }}
        />
      </svg>

      {/* Quick select */}
      <div className="flex gap-1 flex-wrap justify-center">
        {QUICK.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onChange(h)}
            className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${
              value === h
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {h}h
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          className="px-2.5 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200"
        >
          {showExtra ? '−' : '＋'} custom
        </button>
      </div>

      {showExtra && (
        <div className="flex gap-1 flex-wrap justify-center">
          {EXTRA.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onChange(h)}
              className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${
                value === h
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {h < 1 ? `${h * 60}m` : `${h}h`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
