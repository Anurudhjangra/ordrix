import type { CSSProperties, ReactElement } from 'react';

type Kind = 'burger' | 'fries' | 'wrap' | 'garlicbread' | 'noodles' | 'rice' | 'bowl' | 'pizza' | 'cup';

function classify(name: string): Kind {
  const n = name.toLowerCase();
  if (n.includes('pizza')) return 'pizza';
  if (n.includes('burger')) return 'burger';
  if (n.includes('garlic bread')) return 'garlicbread';
  if (n.includes('wrap')) return 'wrap';
  if (n.includes('fries') || n.includes('cheese chilly')) return 'fries';
  if (n.includes('maggie') || n.includes('maggi')) return 'noodles';
  if (n.includes('rice')) return 'rice';
  if (n.includes('manchurian') || n.includes('potato') || n.includes('mushroom')) return 'bowl';
  return 'cup';
}

const C = {
  bun: '#e8c48a',
  bunDark: '#d9a86a',
  crust: '#b9772e',
  patty: '#7b3f2e',
  pattyLight: '#9a5540',
  green: '#00b545',
  greenLight: '#22c55e',
  cheese: '#f2c14e',
  tomato: '#d94f4f',
  fry: '#f0b429',
  fryDark: '#d99a1f',
  bowl: '#fdfcf9',
  bowlRim: '#e9e2d4',
  cream: '#f3e7cc',
  brown: '#7a4a24',
  white: '#fdfcf9',
};

function Burger() {
  return (
    <g>
      <path d="M22 58c0-24 76-24 76 0Z" fill={C.bun} />
      <ellipse cx="48" cy="45" rx="3" ry="1.8" fill={C.white} opacity="0.85" />
      <ellipse cx="64" cy="41" rx="3" ry="1.8" fill={C.white} opacity="0.85" />
      <ellipse cx="75" cy="49" rx="3" ry="1.8" fill={C.white} opacity="0.85" />
      <rect x="24" y="57" width="72" height="7" fill={C.cheese} />
      <path d="M22 64q9 9 19 0t19 0 19 0 19 0v5H22Z" fill={C.green} />
      <path d="M20 71h80a6 6 0 0 1 0 12H20a6 6 0 0 1 0-12Z" fill={C.patty} />
      <path d="M22 85h76a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8Z" fill={C.bunDark} />
    </g>
  );
}

function Fries() {
  const sticks = [
    [37, 30],
    [50, 24],
    [63, 28],
    [75, 34],
    [44, 38],
    [69, 40],
  ];
  return (
    <g>
      {sticks.map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="9"
          height="42"
          rx="4"
          fill={i % 2 ? C.fryDark : C.fry}
          transform={`rotate(${(i - 2.5) * 5} ${x + 4.5} ${y + 21})`}
        />
      ))}
      <path d="M34 58h52l-6 42a10 10 0 0 1-10 9H50a10 10 0 0 1-10-9Z" fill={C.patty} />
      <path d="M42 68h36" stroke={C.white} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
    </g>
  );
}

function Wrap() {
  return (
    <g transform="rotate(-18 60 64)">
      <rect x="40" y="28" width="40" height="74" rx="20" fill={C.cream} />
      <rect x="40" y="28" width="40" height="20" rx="10" fill={C.bunDark} />
      <path d="M40 54h40" stroke={C.green} strokeWidth="6" />
      <path d="M40 64h40" stroke={C.tomato} strokeWidth="5" opacity="0.8" />
      <path d="M52 78c4-6 12-6 16 0" stroke={C.cheese} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function GarlicBread() {
  const crumbs = [
    [40, 50],
    [58, 47],
    [75, 52],
    [48, 74],
    [66, 71],
    [83, 76],
    [33, 62],
    [89, 60],
  ];
  return (
    <g>
      <rect x="24" y="42" width="72" height="20" rx="10" fill={C.bun} />
      <rect x="24" y="64" width="72" height="20" rx="10" fill={C.bunDark} />
      <rect x="24" y="42" width="72" height="20" rx="10" fill="none" stroke={C.crust} strokeWidth="2" opacity="0.35" />
      <rect x="24" y="64" width="72" height="20" rx="10" fill="none" stroke={C.crust} strokeWidth="2" opacity="0.35" />
      {crumbs.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill={C.green} />
      ))}
    </g>
  );
}

function Noodles() {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M32 ${42 + i * 6} q8 -10 16 0 t16 0 t16 0`}
          stroke={C.bun}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <circle cx="52" cy="45" r="4" fill={C.green} />
      <circle cx="74" cy="51" r="4" fill={C.tomato} />
      <path d="M24 66a36 36 0 0 0 72 0Z" fill={C.bowl} />
      <rect x="20" y="63" width="80" height="7" rx="3.5" fill={C.bowlRim} />
      <path d="M34 78a28 28 0 0 0 52 0" fill="none" stroke={C.bowlRim} strokeWidth="3" />
    </g>
  );
}

function Rice() {
  const grains = [
    [44, 54],
    [52, 50],
    [64, 51],
    [76, 55],
    [58, 59],
    [70, 61],
    [48, 61],
  ];
  return (
    <g>
      <ellipse cx="60" cy="60" rx="34" ry="14" fill={C.cream} />
      {grains.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4.5" ry="3" fill={C.white} stroke={C.bowlRim} strokeWidth="1" />
      ))}
      <circle cx="50" cy="54" r="3" fill={C.green} />
      <circle cx="70" cy="55" r="3" fill={C.greenLight} />
      <circle cx="62" cy="58" r="3" fill={C.tomato} />
      <path d="M24 66a36 36 0 0 0 72 0Z" fill={C.bowl} />
      <rect x="20" y="63" width="80" height="7" rx="3.5" fill={C.bowlRim} />
    </g>
  );
}

function Bowl() {
  const balls = [
    [46, 52],
    [60, 48],
    [74, 54],
    [52, 61],
    [68, 62],
  ];
  return (
    <g>
      {balls.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" fill={i % 2 ? C.brown : C.patty} />
      ))}
      <path d="M36 60q6 -6 12 0" stroke={C.green} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M24 66a36 36 0 0 0 72 0Z" fill={C.bowl} />
      <rect x="20" y="63" width="80" height="7" rx="3.5" fill={C.bowlRim} />
    </g>
  );
}

function Pizza() {
  return (
    <g>
      <path d="M60 20 96 98a128 128 0 0 1-72 0Z" fill={C.bun} />
      <path d="M60 33 88 92a112 112 0 0 1-56 0Z" fill={C.cheese} />
      <circle cx="60" cy="52" r="6" fill={C.tomato} />
      <circle cx="48" cy="71" r="5" fill={C.green} />
      <circle cx="72" cy="73" r="5" fill={C.greenLight} />
      <circle cx="60" cy="83" r="4" fill={C.tomato} opacity="0.85" />
      <path d="M60 20 96 98a128 128 0 0 1-72 0Z" fill="none" stroke={C.crust} strokeWidth="4" />
    </g>
  );
}

function Cup() {
  return (
    <g>
      <path d="M30 40h48v28a16 16 0 0 1-16 16H46a16 16 0 0 1-16-16Z" fill={C.bowl} stroke={C.bowlRim} strokeWidth="3" />
      <path d="M78 48h6a10 10 0 1 1 0 20h-6" fill="none" stroke={C.green} strokeWidth="4" strokeLinecap="round" />
      <path d="M50 26v8M60 22v10M70 26v8" stroke={C.green} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  );
}

const ART: Record<Kind, () => ReactElement> = {
  burger: Burger,
  fries: Fries,
  wrap: Wrap,
  garlicbread: GarlicBread,
  noodles: Noodles,
  rice: Rice,
  bowl: Bowl,
  pizza: Pizza,
  cup: Cup,
};

export function FoodArt({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  const Art = ART[classify(name)];
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} role="img" aria-label={name}>
      <Art />
    </svg>
  );
}
