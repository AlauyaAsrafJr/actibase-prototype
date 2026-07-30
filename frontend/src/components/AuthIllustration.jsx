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

      {/* crest */}
      <image href="/msu-logo.png" x="185" y="279" width="130" height="162" />

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
