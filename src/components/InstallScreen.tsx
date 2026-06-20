import { useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { ThinkingAnimation } from './ThinkingAnimation';

// App version (kept in sync with package.json via Vite's define plugin would be ideal,
// but hardcoding here is simpler and matches the release tag)
const APP_VERSION = '1.0.15';

const CLAUDE_CODE_LOGO =
  'https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light/claudecode-color.png';

export function InstallScreen() {
  const {
    ocStatus,
    setOcStatus,
    setShowInstallScreen,
    setUserSkippedInstall,
    userSkippedInstall,
  } = useStore();
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [ocStatus.installLog]);

  // Kick off install (called automatically when detection says not-installed,
  // OR when user clicks the "Instalar OpenClaude" button)
  const startInstall = async () => {
    try {
      await window.openclaude?.installOpenClaude();
    } catch (e) {
      console.error(e);
    }
  };

  // AUTO-INSTALL: when detection completes and openclaude is NOT installed
  // (and we're not already installing, and there's no error), automatically
  // trigger the install. This is what the user asked for:
  //   "se ele reconhecer ta baixado senao ele baixa de novo"
  // Skip auto-install if user already chose to skip.
  useEffect(() => {
    if (userSkippedInstall) return;
    if (
      !ocStatus.installed &&
      !ocStatus.installing &&
      !ocStatus.detecting &&
      !ocStatus.error
    ) {
      const t = setTimeout(startInstall, 600);
      return () => clearTimeout(t);
    }
  }, [
    ocStatus.installed,
    ocStatus.installing,
    ocStatus.detecting,
    ocStatus.error,
    userSkippedInstall,
  ]);

  // STUCK-DETECTION: if status stays "detecting" for more than 12 seconds
  // (which happens when the preload script failed to load and IPC calls
  // silently hang), surface an error so the user isn't stuck on a
  // spinner forever.
  useEffect(() => {
    if (!ocStatus.detecting || ocStatus.installed || ocStatus.installing) return;
    const t = setTimeout(() => {
      const cur = useStore.getState().ocStatus;
      if (cur.detecting && !cur.installed && !cur.installing) {
        setOcStatus({
          ...cur,
          detecting: false,
          error:
            'A verificação demorou demais. Provavelmente o script de preload não carregou corretamente. Tente reiniciar o app.',
        });
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [ocStatus.detecting, ocStatus.installed, ocStatus.installing, setOcStatus]);

  const handleContinue = () => {
    setShowInstallScreen(false);
    setOcStatus({ ...ocStatus, installed: true });
  };

  const handleSkip = () => {
    // Mark that the user explicitly chose to skip the install screen.
    // This prevents App.tsx from re-showing it on the next render (which
    // would otherwise happen because openclaude is not installed).
    setUserSkippedInstall(true);
    setShowInstallScreen(false);
  };

  const handleRetry = () => {
    setOcStatus({ ...ocStatus, error: null, installLog: '', installProgress: 0 });
    setTimeout(startInstall, 200);
  };

  // ----- Determine which "mode" the install screen is in -----
  // 1. detecting   → "Checking if OpenClaude is installed..." (spinner, no auto-install)
  // 2. installing  → "Installing OpenClaude..." (progress bar)
  // 3. error       → "Installation failed" (retry button)
  // 4. not-installed (after detection) → "OpenClaude not found" (install button)
  // 5. installed   → "Ready!" (continue button)
  const isDetecting = ocStatus.detecting && !ocStatus.installed && !ocStatus.installing;
  const isInstalling = ocStatus.installing;
  const isError = !!ocStatus.error && !ocStatus.installing;
  const isInstalled = ocStatus.installed;
  const isNotInstalled =
    !ocStatus.installed && !ocStatus.detecting && !ocStatus.installing && !ocStatus.error;

  const title = isDetecting
    ? 'Verificando ambiente'
    : isInstalling
      ? 'Instalando OpenClaude'
      : isError
        ? 'Falha na instalação'
        : isInstalled
          ? 'Pronto!'
          : 'OpenClaude não encontrado';

  const subtitle = isDetecting
    ? 'Verificando se o OpenClaude CLI já está instalado na sua máquina...'
    : isInstalling
      ? 'Baixando e configurando o OpenClaude CLI. Isso pode levar alguns minutos.'
      : isError
        ? 'Não foi possível instalar o OpenClaude automaticamente. Verifique o log abaixo.'
        : isInstalled
          ? `OpenClaude ${ocStatus.version} está pronto para uso.`
          : 'O OpenClaude CLI não foi encontrado. Clique abaixo para instalá-lo automaticamente.';

  // Show the animated gradient ring when detecting OR installing
  const showRing = isDetecting || isInstalling;

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-8">
      {/* Floating logo with glow */}
      <div className="relative mb-12 flex flex-col items-center">
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div
            className="h-64 w-64 rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle, rgba(217,119,87,0.6) 0%, transparent 70%)',
            }}
          />
        </div>
        <img
          src={CLAUDE_CODE_LOGO}
          alt="Claude Code"
          className="logo-glow h-32 w-32 object-contain"
          draggable={false}
        />

        {/* Animated gradient ring around logo while detecting/installing */}
        {showRing && (
          <div className="absolute inset-0 -m-4">
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0%, #d97757 25%, #e9a857 50%, #d97757 75%, transparent 100%)',
                animation: 'spin 3s linear infinite',
                mask: 'radial-gradient(transparent 60%, black 62%)',
                WebkitMask: 'radial-gradient(transparent 60%, black 62%)',
              }}
            />
          </div>
        )}
      </div>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
      </h1>

      <p className="mb-8 max-w-md text-center text-sm text-[var(--text-secondary)]">
        {subtitle}
      </p>

      {/* Detecting spinner (subtle, fast) */}
      {isDetecting && (
        <div className="mb-6">
          <ThinkingAnimation size={88} text="Verificando" />
        </div>
      )}

      {/* Progress bar (only during install) */}
      {isInstalling && (
        <div className="mb-6 w-full max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Progresso</span>
            <span>{Math.round(ocStatus.installProgress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="thinking-bar h-full transition-all duration-300"
              style={{ width: `${ocStatus.installProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Install log */}
      {ocStatus.installLog && (
        <div
          ref={logRef}
          className="selectable mb-6 h-40 w-full max-w-md overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]"
        >
          <pre className="whitespace-pre-wrap break-words">{ocStatus.installLog}</pre>
          {ocStatus.error && (
            <pre className="mt-2 whitespace-pre-wrap break-words text-red-500">
              {ocStatus.error}
            </pre>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {isInstalled && (
          <button
            onClick={handleContinue}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Começar a conversar
          </button>
        )}

        {isNotInstalled && (
          <button
            onClick={startInstall}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Instalar OpenClaude
          </button>
        )}

        {isError && (
          <>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Tentar novamente
            </button>
            <button
              onClick={handleSkip}
              className="rounded-lg border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              Continuar mesmo assim
            </button>
          </>
        )}

        {isInstalling && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <div className="thinking-orb !h-4 !w-4" />
            <span>Instalando...</span>
          </div>
        )}

        {/* Skip button — lets user bypass detection/install and go to chat UI */}
        {(isDetecting || isNotInstalled) && (
          <button
            onClick={handleSkip}
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            Pular
          </button>
        )}
      </div>

      <p className="absolute bottom-6 text-xs text-[var(--text-secondary)]">
        OpenClaude UI v{APP_VERSION} ·{' '}
        <a
          href="https://github.com/Gitlawb/openclaude"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          github.com/Gitlawb/openclaude
        </a>
      </p>
    </div>
  );
}
