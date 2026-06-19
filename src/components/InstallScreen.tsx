import { useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';

const CLAUDE_CODE_LOGO =
  'https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light/claudecode-color.png';

export function InstallScreen() {
  const { ocStatus, setOcStatus, setShowInstallScreen } = useStore();
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [ocStatus.installLog]);

  // Kick off install if not started
  const startInstall = async () => {
    try {
      await window.openclaude?.installOpenClaude();
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-start install if screen shown without install in progress
  useEffect(() => {
    if (!ocStatus.installed && !ocStatus.installing && !ocStatus.error) {
      // Give user a moment to see the logo, then auto-start
      const t = setTimeout(startInstall, 1500);
      return () => clearTimeout(t);
    }
  }, [ocStatus.installed, ocStatus.installing, ocStatus.error]);

  const handleContinue = () => {
    setShowInstallScreen(false);
    setOcStatus({ ...ocStatus, installed: true });
  };

  const handleRetry = () => {
    setOcStatus({ ...ocStatus, error: null, installLog: '', installProgress: 0 });
    setTimeout(startInstall, 200);
  };

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

        {/* Animated gradient ring around logo while installing */}
        {ocStatus.installing && (
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
        {ocStatus.installing
          ? 'Instalando OpenClaude'
          : ocStatus.error
            ? 'Falha na instalação'
            : ocStatus.installed
              ? 'Pronto!'
              : 'Configurando ambiente'}
      </h1>

      <p className="mb-8 max-w-md text-center text-sm text-[var(--text-secondary)]">
        {ocStatus.installing
          ? 'Baixando e configurando o OpenClaude CLI na sua máquina. Isso pode levar alguns minutos.'
          : ocStatus.error
            ? 'Não foi possível instalar o OpenClaude automaticamente. Verifique o log abaixo.'
            : ocStatus.installed
              ? `OpenClaude ${ocStatus.version} está pronto para uso.`
              : 'Verificando se o OpenClaude já está instalado...'}
      </p>

      {/* Progress bar */}
      {(ocStatus.installing || ocStatus.error) && (
        <div className="mb-6 w-full max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{ocStatus.installing ? 'Progresso' : 'Erro'}</span>
            <span>{Math.round(ocStatus.installProgress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            {ocStatus.installing && (
              <div
                className="thinking-bar h-full transition-all duration-300"
                style={{ width: `${ocStatus.installProgress}%` }}
              />
            )}
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
        {ocStatus.installed && (
          <button
            onClick={handleContinue}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Começar a conversar
          </button>
        )}
        {ocStatus.error && (
          <>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => setShowInstallScreen(false)}
              className="rounded-lg border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              Continuar mesmo assim
            </button>
          </>
        )}
        {ocStatus.installing && !ocStatus.error && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <div className="thinking-orb !h-4 !w-4" />
            <span>Instalando...</span>
          </div>
        )}
      </div>

      <p className="absolute bottom-6 text-xs text-[var(--text-secondary)]">
        OpenClaude UI ·{' '}
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
