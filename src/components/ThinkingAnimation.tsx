import { useEffect, useState } from 'react';

// Type declaration for the custom <dotlottie-wc> element.
// The actual element is registered by the script loaded in index.html:
//   https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-wc': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          autoplay?: boolean;
          loop?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

interface ThinkingAnimationProps {
  /** Size in px of the Lottie animation (the text size is fixed at 15px). */
  size?: number;
  /** Show the "Pensando..." text next to the animation. Default: true. */
  showText?: boolean;
  /** Override the text label. Default: "Pensando". */
  text?: string;
}

/**
 * Thinking animation using the user-provided HTML design.
 *
 * Renders the Lottie animation from lottie.host (loaded via the
 * dotlottie-wc Web Component) at the requested size, with the
 * "Pensando..." text next to it using a gradient shine animation
 * (gray → white → gray shifting across the text in a 12s loop).
 *
 * The dotlottie-wc script is loaded once in index.html so it's
 * available across the whole app.
 */
export function ThinkingAnimation({
  size = 68,
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
    <div
      className="thinking-wrapper"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        overflow: 'visible',
      }}
    >
      {/* Lottie animation via dotlottie-wc Web Component */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <dotlottie-wc
        src="https://lottie.host/8db46587-6835-44d6-a755-f660ea2c33c0/yED2rcsFfA.lottie"
        autoplay
        loop
        style={{
          width: `${size}px`,
          height: `${size}px`,
          flexShrink: 0,
          marginRight: '-10px',
          transform: 'translateY(-3px)',
        }}
      />

      {showText && (
        <span
          className="thinking-text-shine"
          style={{
            fontSize: '15px',
            fontWeight: 500,
            letterSpacing: '.2px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {text}
          <span style={{ display: 'inline-block', width: '1ch' }}>{dots}</span>
        </span>
      )}
    </div>
  );
}
