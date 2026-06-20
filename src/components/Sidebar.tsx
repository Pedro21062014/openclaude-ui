import { useStore } from '@/hooks/useStore';
import { useOpenClaude } from '@/hooks/useOpenClaude';
import { Settings, Plus, MessageSquare, Trash2, Github, Terminal } from 'lucide-react';

const CLAUDE_LOGO =
  'https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light/claude-color.png';

export function Sidebar() {
  const {
    settings,
    setSettings,
    clearMessages,
    setShowSettings,
    currentMessages,
    setShowInstallScreen,
    setUserSkippedInstall,
    ocStatus,
  } = useStore();
  // Pull resetConversation from the hook so the "New chat" button actually
  // resets openclaude's --continue state — otherwise subsequent messages
  // would still be appended to the previous (now-cleared) conversation.
  const { resetConversation } = useOpenClaude();

  const collapsed = settings.sidebarCollapsed;

  const handleNewChat = () => {
    resetConversation();
    clearMessages();
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-14 flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--sidebar-bg)] py-4">
        <div className="flex flex-col items-center gap-4">
          <img src={CLAUDE_LOGO} alt="Claude" className="h-8 w-8" draggable={false} />
          <button
            onClick={handleNewChat}
            title="Nova conversa"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setSettings({ sidebarCollapsed: false })}
            title="Expandir"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          title="Configurações"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2.5">
          <img
            src={CLAUDE_LOGO}
            alt="Claude"
            className="h-7 w-7"
            draggable={false}
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              OpenClaude UI
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Desktop Client
            </span>
          </div>
        </div>
        <button
          onClick={() => setSettings({ sidebarCollapsed: true })}
          className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
          title="Recolher"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-2">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-[var(--accent)]/40 hover:shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova conversa
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Conversa atual
        </div>
        {currentMessages.length === 0 ? (
          <div className="px-2 py-1 text-xs text-[var(--text-secondary)]/60">
            Nenhuma mensagem ainda. Comece uma conversa!
          </div>
        ) : (
          <div className="rounded-md bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <div className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
              <span className="line-clamp-2">
                {currentMessages.find((m) => m.role === 'user')?.content.slice(0, 60) ||
                  'Nova conversa'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Dicas
        </div>
        <div className="space-y-1.5 px-2 text-xs text-[var(--text-secondary)]">
          <p>• Use Ctrl/Cmd+Enter para enviar</p>
          <p>• Shift+Enter para nova linha</p>
          <p>• Selecione o modelo no topo</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-3">
        {/* OpenClaude status indicator + reinstall option */}
        <button
          onClick={() => {
            // Re-open the install screen (also clears any previous skip)
            setUserSkippedInstall(false);
            setShowInstallScreen(true);
          }}
          className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-secondary)] ${
            ocStatus.installed
              ? 'text-[var(--text-secondary)]'
              : 'text-amber-500'
          }`}
          title={
            ocStatus.installed
              ? `OpenClaude ${ocStatus.version} instalado em ${ocStatus.path}`
              : 'OpenClaude não instalado — clique para instalar'
          }
        >
          <span className="flex items-center gap-2.5">
            <Terminal className="h-4 w-4" />
            OpenClaude CLI
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              ocStatus.installed ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </button>
        <a
          href="https://github.com/Gitlawb/openclaude"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        >
          <Github className="h-4 w-4" />
          OpenClaude no GitHub
        </a>
      </div>
    </div>
  );
}
