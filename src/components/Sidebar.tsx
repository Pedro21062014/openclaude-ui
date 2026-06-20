import { useStore } from '@/hooks/useStore';
import { useOpenClaude } from '@/hooks/useOpenClaude';
import { Settings, Plus, MessageSquare, Trash2, Github, Terminal, X, PanelLeftClose } from 'lucide-react';

const CLAUDE_LOGO =
  'https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light/claude-color.png';

export function Sidebar() {
  const {
    settings,
    setSettings,
    clearMessages,
    setShowSettings,
    currentMessages,
    conversations,
    currentConversationId,
    startNewConversation,
    loadConversation,
    deleteConversation,
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
    startNewConversation();
  };

  const handleLoadConversation = (id: string) => {
    resetConversation();
    loadConversation(id);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Excluir esta conversa?')) {
      deleteConversation(id);
    }
  };

  // Format relative time
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    const hours = Math.floor(min / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (min > 0) return `${min}min atrás`;
    return 'agora';
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-14 flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--sidebar-bg)] py-4">
        <div className="flex flex-col items-center gap-4">
          {/* Click the Claude logo to expand the sidebar */}
          <button
            onClick={() => setSettings({ sidebarCollapsed: false })}
            title="Expandir barra lateral"
            className="group flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-[var(--bg-secondary)]"
          >
            <img
              src={CLAUDE_LOGO}
              alt="Claude"
              className="h-8 w-8 transition-transform group-hover:scale-110"
              draggable={false}
            />
          </button>
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
        {/* Close (collapse) sidebar button — X icon, always visible */}
        <button
          onClick={() => setSettings({ sidebarCollapsed: true })}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          title="Fechar barra lateral"
          aria-label="Fechar barra lateral"
        >
          <PanelLeftClose className="h-4 w-4" />
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
        {/* Current conversation indicator (if any) */}
        {currentMessages.length > 0 && !currentConversationId && (
          <>
            <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Conversa atual (não salva)
            </div>
            <div className="mb-4 rounded-md bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]">
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--accent)]" />
                <span className="line-clamp-2">
                  {currentMessages.find((m) => m.role === 'user')?.content.slice(0, 60) ||
                    'Nova conversa'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Conversation history */}
        <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Histórico ({conversations.length})
        </div>
        {conversations.length === 0 ? (
          <div className="px-2 py-1 text-xs text-[var(--text-secondary)]/60">
            Nenhuma conversa salva ainda. Comece a conversar!
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleLoadConversation(conv.id)}
                  className={`group flex cursor-pointer items-start gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <MessageSquare
                    className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                      isActive ? 'text-[var(--accent)]' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="line-clamp-1 font-medium">
                      {conv.title || 'Sem título'}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]/70">
                      {formatTime(conv.updatedAt)} · {conv.messages.length} msg
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[var(--text-secondary)] hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Dicas
        </div>
        <div className="space-y-1.5 px-2 text-xs text-[var(--text-secondary)]">
          <p>• Enter para enviar · Shift+Enter nova linha</p>
          <p>• Digite / para ver comandos</p>
          <p>• Passe o mouse sobre uma resposta para copiar/regenerar</p>
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
