import { useEffect, useState } from 'react';

interface ThinkingAnimationProps {
  size?: number;
  showText?: boolean;
  text?: string;
}

/**
 * The "boitinha" thinking animation with animated gradient.
 * Combines a pulsing gradient orb (Claude-orange palette) with bouncing dots.
 */
export function ThinkingAnimation({
  size = 28,
  showText = true,
  text = 'Pensando',
}: ThinkingAnimationProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const i = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Gradient orb */}
      <div
        className="thinking-orb flex-shrink-0"
        style={{ width: size, height: size }}
      />

      {/* Bouncing dots alternative */}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
            style={{
              animation: `bounce-dot 1.4s ease-in-out ${i * 0.16}s infinite both`,
            }}
          />
        ))}
      </div>

      {showText && (
        <span className="text-sm text-[var(--text-secondary)]">
          {text}
          <span className="inline-block w-4 text-left">{dots}</span>
        </span>
      )}
    </div>
  );
}
