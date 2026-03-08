// Pure render – no client hooks needed, so this is a Server Component by default.

const DECORATIONS = [
  { emoji: '💕', x: 4,  y: 8,  delay: 0,   dur: 4.2 },
  { emoji: '⭐', x: 14, y: 72, delay: 1.1, dur: 5.0 },
  { emoji: '🌸', x: 24, y: 18, delay: 0.5, dur: 3.7 },
  { emoji: '✨', x: 34, y: 87, delay: 2.0, dur: 4.6 },
  { emoji: '💫', x: 44, y: 12, delay: 1.5, dur: 3.2 },
  { emoji: '🎀', x: 56, y: 78, delay: 0.8, dur: 5.1 },
  { emoji: '🌺', x: 66, y: 32, delay: 2.5, dur: 4.0 },
  { emoji: '💖', x: 76, y: 62, delay: 1.0, dur: 3.6 },
  { emoji: '⭐', x: 86, y: 9,  delay: 3.0, dur: 4.9 },
  { emoji: '🌸', x: 93, y: 54, delay: 0.3, dur: 4.1 },
  { emoji: '💕', x: 7,  y: 48, delay: 2.8, dur: 3.9 },
  { emoji: '🎀', x: 71, y: 92, delay: 1.2, dur: 4.4 },
  { emoji: '✨', x: 50, y: 40, delay: 1.7, dur: 5.3 },
  { emoji: '💫', x: 20, y: 60, delay: 3.3, dur: 3.4 },
];

export default function FloatingDecorations() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {DECORATIONS.map((d, i) => (
        <span
          key={i}
          className="absolute select-none text-2xl opacity-[0.14]"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            animation: `float ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }}
        >
          {d.emoji}
        </span>
      ))}
    </div>
  );
}
