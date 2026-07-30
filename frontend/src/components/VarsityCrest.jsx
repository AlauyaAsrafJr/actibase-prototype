const SHIELD_PATH =
  "M110,28 C88,8 58,6 34,16 C10,26 2,52 8,78 C14,128 24,158 48,183 " +
  "C68,203 90,218 110,233 C130,218 152,203 172,183 C196,158 206,128 212,78 " +
  "C218,52 210,26 186,16 C162,6 132,8 110,28 Z";

// Simplified silhouette for tiny (sidebar-mark) contexts — the sunburst,
// laurel, and ribbon don't survive rendering below ~50px, so this drops
// straight to shield + monogram, the two things that still read at 30px.
const SHIELD_PATH_COMPACT =
  "M110,18 C92,4 66,2 46,10 C24,18 14,38 18,58 C24,100 40,130 70,150 " +
  "C85,160 98,166 110,172 C122,166 135,160 150,150 C180,130 196,100 202,58 " +
  "C206,38 196,18 174,10 C154,2 128,4 110,18 Z";

const RAY_ANGLES = [-52, -26, 0, 26, 52];
const MEDALLION_CENTER = { x: 110, y: 132 };
const MEDALLION_R = 36;

function sunburstRays() {
  const rayCenter = { x: 110, y: 98 };
  return RAY_ANGLES.map((a) => {
    const tipR = 46;
    const baseR = 9;
    const toXY = (deg, r) => {
      const rad = (deg * Math.PI) / 180;
      return [rayCenter.x + r * Math.sin(rad), rayCenter.y - r * Math.cos(rad)];
    };
    const [tx, ty] = toXY(a, tipR);
    const [lx, ly] = toXY(a - 7, baseR);
    const [rx, ry] = toXY(a + 7, baseR);
    return `M${lx},${ly} L${tx},${ty} L${rx},${ry} Z`;
  });
}

function laurelLeaves(side) {
  const start = side === "left" ? 205 : -25;
  const sweep = side === "left" ? -100 : 100;
  return [...Array(6)].map((_, i) => {
    const t = i / 5;
    const angle = start + sweep * t;
    const rad = (angle * Math.PI) / 180;
    const r = MEDALLION_R + 10 - t * 4;
    const cx = MEDALLION_CENTER.x + r * Math.cos(rad);
    const cy = MEDALLION_CENTER.y + r * Math.sin(rad) * 1.05;
    const rot = side === "left" ? angle + 90 : angle - 90;
    return { key: `${side}${i}`, cx, cy, rot };
  });
}

/** Original Actibase varsity crest — shield, sunburst, laurel-wrapped
 * monogram, and a ribbon banner, in the app's own maroon/gold palette.
 * Same heraldic structure as a collegiate seal, not a copy of any
 * specific institution's mark.
 *
 * `compact` swaps in a reduced shield + monogram only, for contexts
 * under ~50px where the sunburst/laurel/ribbon detail would just be noise. */
export default function VarsityCrest({ size = 40, className, compact = false }) {
  const viewHeight = compact ? 190 : 258;
  return (
    <svg
      viewBox={`0 0 220 ${viewHeight}`}
      width={size}
      height={(size * viewHeight) / 220}
      role="img"
      aria-label="Actibase varsity crest"
      className={className}
    >
      <defs>
        <linearGradient id="crestShieldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c2294f" />
          <stop offset="100%" stopColor="#5c0a24" />
        </linearGradient>
      </defs>

      {compact ? (
        <>
          <path d={SHIELD_PATH_COMPACT} fill="url(#crestShieldFill)" stroke="#eab53c" strokeWidth="4" />
          <text
            x="110"
            y="118"
            textAnchor="middle"
            fontFamily="Georgia, 'Iowan Old Style', 'Palatino Linotype', serif"
            fontWeight="800"
            fontSize="76"
            fill="#eab53c"
          >
            A
          </text>
        </>
      ) : (
        <>
          <path d={SHIELD_PATH} fill="url(#crestShieldFill)" stroke="#eab53c" strokeWidth="3" />

          <g fill="#eab53c">
            {sunburstRays().map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          <g fill="#eab53c" fillOpacity="0.95">
            {laurelLeaves("left").map(({ key, cx, cy, rot }) => (
              <ellipse key={key} cx={cx} cy={cy} rx="10" ry="5" transform={`rotate(${rot} ${cx} ${cy})`} />
            ))}
            {laurelLeaves("right").map(({ key, cx, cy, rot }) => (
              <ellipse key={key} cx={cx} cy={cy} rx="10" ry="5" transform={`rotate(${rot} ${cx} ${cy})`} />
            ))}
          </g>

          <circle cx={MEDALLION_CENTER.x} cy={MEDALLION_CENTER.y} r={MEDALLION_R} fill="#3d0818" stroke="#eab53c" strokeWidth="3" />
          <path d="M110,90 L117,102 L111,100 L110,104 L109,100 L103,102 Z" fill="#eab53c" />
          <text
            x={MEDALLION_CENTER.x}
            y={MEDALLION_CENTER.y + 16}
            textAnchor="middle"
            fontFamily="Georgia, 'Iowan Old Style', 'Palatino Linotype', serif"
            fontWeight="800"
            fontSize="42"
            fill="#eab53c"
          >
            A
          </text>

          <path d="M22,201 L6,214 L22,227 Z" fill="#c4931f" />
          <path d="M198,201 L214,214 L198,227 Z" fill="#c4931f" />
          <rect x="20" y="200" width="180" height="27" rx="4" fill="#eab53c" stroke="#5c0a24" strokeWidth="1.5" />
          <text
            x="110"
            y="219"
            textAnchor="middle"
            fontFamily="Georgia, 'Iowan Old Style', 'Palatino Linotype', serif"
            fontWeight="700"
            fontSize="17"
            letterSpacing="1"
            fill="#5c0a24"
          >
            ACTIBASE
          </text>

          <text
            x="110"
            y="246"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontWeight="600"
            fontSize="10"
            letterSpacing="3"
            fill="#eab53c"
          >
            VARSITY ATHLETICS
          </text>
        </>
      )}
    </svg>
  );
}
