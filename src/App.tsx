import { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { InstallScreen } from '@/components/InstallScreen';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsModal } from '@/components/SettingsModal';

declare global {
  interface Window {
    openclaude: any;
  }
}

export default function App() {
  const {
    ocStatus,
    setOcStatus,
    settings,
    initSettings,
    showSettings,
    showInstallScreen,
    setShowInstallScreen,
    userSkippedInstall,
  } = useStore();

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    const apply = (theme: string) => {
      if (theme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };
    if (settings.theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      apply(dark ? 'dark' : 'light');
    } else {
      apply(settings.theme);
    }
  }, [settings.theme]);

  // Font family
  useEffect(() => {
    document.body.style.fontFamily = {
      sans: "'Inter', system-ui, sans-serif",
      serif: "'Source Serif 4', Georgia, serif",
      mono: "'JetBrains Mono', Menlo, monospace",
    }[settings.fontFamily];
  }, [settings.fontFamily]);

  // Font size
  useEffect(() => {
    document.documentElement.style.fontSize = {
      sm: '14px',
      md: '16px',
      lg: '18px',
    }[settings.fontSize];
  }, [settings.fontSize]);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await window.openclaude?.loadSettings();
        if (saved && Object.keys(saved).length > 0) {
          initSettings(saved);
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    })();
  }, [initSettings]);

  // Subscribe to OpenClaude status updates
  useEffect(() => {
    const off = window.openclaude?.onOpenClaudeStatus((s: any) => {
      setOcStatus(s);
      if (s.installed && showInstallScreen) {
        setShowInstallScreen(false);
      }
    });
    return () => {
      off?.();
    };
  }, [setOcStatus, showInstallScreen, setShowInstallScreen]);

  // Initial detection — main process already kicks this off in app.whenReady(),
  // but we trigger it again here so the UI gets a fresh status push. This call
  // is non-blocking (returns immediately, status flows through IPC).
  useEffect(() => {
    (async () => {
      try {
        // Just get current status (instant) — actual detection happens in main
        const status = await window.openclaude?.getOpenClaudeStatus();
        if (status) setOcStatus(status);
        // If main hasn't started detecting yet, nudge it
        if (!status.installed && !status.detecting && !status.installing) {
          await window.openclaude?.detectOpenClaude();
        }
      } catch (e) {
        console.error('Detection failed:', e);
      }
    })();
  }, [setOcStatus]);

  // Show install screen only when:
  //   - user hasn't explicitly skipped it (userSkippedInstall === false), AND
  //   - any of: user explicitly opened it (showInstallScreen=true), OR
  //             detection is in progress (and not installed yet), OR
  //             detection finished and openclaude is not installed (and not installing)
  const shouldShowInstallScreen =
    !userSkippedInstall &&
    (showInstallScreen ||
      (ocStatus.detecting && !ocStatus.installed) ||
      (!ocStatus.installed && !ocStatus.installing));

  if (shouldShowInstallScreen) {
    return <InstallScreen />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      <Sidebar />
      <ChatInterface />
      {showSettings && <SettingsModal />}
    </div>
  );
}
