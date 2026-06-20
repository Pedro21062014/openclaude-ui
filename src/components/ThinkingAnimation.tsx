import { useEffect, useRef, useState } from 'react';
import { DotLottie } from '@lottiefiles/dotlottie-web';

interface ThinkingAnimationProps {
  /** Size in px of the Lottie animation (the text size is fixed at 15px). */
  size?: number;
  /** Show the "Pensando..." text next to the animation. Default: true. */
  showText?: boolean;
  /** Override the text label. Default: "Pensando". */
  text?: string;
}

// Configure the WASM URL once at module load time.
// The .wasm file is copied to the build's public/ folder (see vite.config.ts
// and the public/dotlottie-player.wasm file). Without this, dotlottie-web
// tries to fetch from unpkg.com / jsdelivr.net which may be blocked by the
// app's Content-Security-Policy or by the user's network.
//
// In dev (Vite), files in public/ are served at the root URL.
// In production (Electron asar), the file is bundled alongside index.html
// and loadable via a relative path.
//
// We try multiple candidate paths to cover dev + production (asar / unpacked).
if (typeof window !== 'undefined') {
  // Use a relative URL — works in dev (Vite) and prod (Electron file://)
  try {
    DotLottie.setWasmUrl(new URL('dotlottie-player.wasm', (window.location.href || 'file:///') as string).toString());
  } catch {
    // Fallback: bare relative path
    DotLottie.setWasmUrl('./dotlottie-player.wasm');
  }
}

/**
 * Thinking animation using the user-provided HTML design.
 *
 * Renders the Lottie animation from lottie.host using the
 * @lottiefiles/dotlottie-web library (loaded via npm, not as an external
 * script). This avoids the Web Component timing issues we had with
 * dotlottie-wc — the WASM-powered renderer is initialized directly in
 * a useEffect, attached to a <canvas> ref.
 *
 * The "Pensando..." text next to the canvas uses a gradient shine
 * animation (gray → white → gray shifting across the text in 12s loop).
 */
export function ThinkingAnimation({
  size = 68,
  showText = true,
  text = 'Pensando',
}: ThinkingAnimationProps) {
  const [dots, setDots] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotLottieRef = useRef<DotLottie | null>(null);

  // Animated dots "..." after the text
  useEffect(() => {
    const i = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(i);
  }, []);

  // Initialize the DotLottie player on the canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    let cancelled = false;
    let instance: DotLottie | null = null;

    try {
      instance = new DotLottie({
        canvas: canvasRef.current,
        src: 'https://lottie.host/8db46587-6835-44d6-a755-f660ea2c33c0/yED2rcsFfA.lottie',
        autoplay: true,
        loop: true,
        backgroundColor: 'transparent',
        layout: {
          fit: 'contain',
          align: [0.5, 0.5],
        },
      });

      if (cancelled) {
        instance.destroy();
        return;
      }
      dotLottieRef.current = instance;
    } catch (e) {
      console.error('Failed to init DotLottie:', e);
    }

    return () => {
      cancelled = true;
      if (instance) {
        try {
          instance.destroy();
        } catch {
          /* ignore */
        }
      }
      dotLottieRef.current = null;
    };
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
      {/* Canvas where DotLottie renders the animation */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          flexShrink: 0,
          marginRight: '-10px',
          transform: 'translateY(-3px)',
          display: 'block',
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
