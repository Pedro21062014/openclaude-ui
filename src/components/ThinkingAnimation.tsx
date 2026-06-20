import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import claudeAnimation from '@/assets/claude-animation.json';

interface ThinkingAnimationProps {
  size?: number;
  showText?: boolean;
  text?: string;
}

/**
 * Thinking animation using the user-provided Lottie file (claude.json).
 *
 * The Lottie file is the "Clawd-Laptop" animation — a small Claude-like
 * character that appears to be "working" on a laptop. We render it at the
 * requested size and loop it.
 *
 * Default size is 80px — small enough to fit inline in chat messages
 * without dominating the screen, but large enough to see the animation
 * detail. Callers can override with the `size` prop.
 *
 * A subtle pulsing text indicator ("Pensando...") appears next to it when
 * showText is true.
 */
export function ThinkingAnimation({
  size = 80,
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
      <div
        style={{ width: size, height: size }}
        className="flex-shrink-0"
      >
        <Lottie
          animationData={claudeAnimation}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid meet',
          }}
        />
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
