export default function AuthIllustration() {
  return (
    <svg viewBox="0 0 500 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="500" height="800" fill="url(#glow)" />

      {/* track rings */}
      <ellipse cx="250" cy="360" rx="210" ry="210" fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="1.5" />
      <ellipse cx="250" cy="360" rx="160" ry="160" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.5" />
      <ellipse cx="250" cy="360" rx="112" ry="112" fill="none" stroke="#e9c65a" strokeOpacity="0.5" strokeWidth="2" />

      {/* laurel wreath, left branch */}
      <g fill="#e9c65a" fillOpacity="0.9">
        {[...Array(7)].map((_, i) => {
          const t = i / 6;
          const angle = 200 - t * 95;
          const rad = (angle * Math.PI) / 180;
          const r = 118 - t * 6;
          const cx = 250 + r * Math.cos(rad);
          const cy = 360 + r * Math.sin(rad) * 1.15;
          return (
            <ellipse
              key={`l${i}`}
              cx={cx}
              cy={cy}
              rx="13"
              ry="6.5"
              transform={`rotate(${angle + 90} ${cx} ${cy})`}
            />
          );
        })}
      </g>
      {/* laurel wreath, right branch */}
      <g fill="#e9c65a" fillOpacity="0.9">
        {[...Array(7)].map((_, i) => {
          const t = i / 6;
          const angle = -20 + t * 95;
          const rad = (angle * Math.PI) / 180;
          const r = 118 - t * 6;
          const cx = 250 + r * Math.cos(rad);
          const cy = 360 + r * Math.sin(rad) * 1.15;
          return (
            <ellipse
              key={`r${i}`}
              cx={cx}
              cy={cy}
              rx="13"
              ry="6.5"
              transform={`rotate(${angle - 90} ${cx} ${cy})`}
            />
          );
        })}
      </g>

      {/* trophy */}
      <g transform="translate(250 360)">
        <path
          d="M-30 -55 h60 v18 c0 26 -14 40 -30 40 s-30 -14 -30 -40 z"
          fill="#fff"
          fillOpacity="0.95"
        />
        <path d="M-30 -50 c-22 0 -30 12 -30 24 c0 14 12 22 24 24 l2 -14 c-8 -2 -12 -6 -12 -12 c0 -8 6 -14 16 -16 z" fill="#fff" fillOpacity="0.8" />
        <path d="M30 -50 c22 0 30 12 30 24 c0 14 -12 22 -24 24 l-2 -14 c8 -2 12 -6 12 -12 c0 -8 -6 -14 -16 -16 z" fill="#fff" fillOpacity="0.8" />
        <rect x="-6" y="3" width="12" height="18" fill="#fff" fillOpacity="0.95" />
        <rect x="-26" y="21" width="52" height="10" rx="3" fill="#fff" fillOpacity="0.95" />
        <rect x="-34" y="31" width="68" height="9" rx="3" fill="#e9c65a" />
      </g>

      {/* sparkles */}
      {[
        [95, 150, 5], [400, 120, 4], [70, 520, 4], [430, 560, 5],
        [130, 640, 3], [370, 660, 3], [250, 90, 4], [60, 330, 3], [440, 330, 3],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#ffffff" fillOpacity="0.55" />
      ))}
    </svg>
  );
}
