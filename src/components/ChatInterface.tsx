import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useOpenClaude } from '@/hooks/useOpenClaude';
import { ModelSelector } from './ModelSelector';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { WelcomeScreen } from './WelcomeScreen';
import { findModel } from '@/data/models';
import { Settings, Square, Trash2, ChevronDown } from 'lucide-react';

export function ChatInterface() {
  const {
    selectedModel,
    setSelectedModel,
    settings,
    setShowSettings,
    clearMessages,
    currentMessages,
    isThinking,
  } = useStore();
  const { sendMessage, stop, regenerate, editAndResend } = useOpenClaude();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string } | null>(null);

  const selected = findModel(selectedModel);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [currentMessages]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      setShowScrollButton(
        el.scrollHeight - el.scrollTop - el.clientHeight > 400,
      );
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleSend = (text: string, images?: any[]) => {
    // For now we just send the text — openclaude's -p mode doesn't easily
    // support image attachments via CLI args. The image picker is still
    // useful for showing the user what they would attach, and we can
    // embed image filenames into the prompt as a hint to openclaude.
    let finalText = text;
    if (images && images.length > 0) {
      const imageList = images.map((i) => i.name).join(', ');
      finalText = `${text}\n\n[Imagens anexadas: ${imageList}]`;
    }
    sendMessage(finalText);
  };

  const handleStop = () => {
    stop();
  };

  // Regenerate an assistant response — finds the user message before it
  // and re-sends it (the hook handles truncating + respawning).
  const handleRegenerate = (assistantMessageId: string) => {
    regenerate(assistantMessageId);
  };

  // Edit a user message — opens a small inline editor above the input
  // where the user can tweak the text and re-send.
  const handleEditMessage = (messageId: string, content: string) => {
    setEditTarget({ id: messageId, content });
  };

  const handleEditSubmit = (newContent: string) => {
    if (editTarget) {
      editAndResend(editTarget.id, newContent);
      setEditTarget(null);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-[var(--bg-primary)]">
      {/* Top bar */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)] px-4">
        <ModelSelector value={selectedModel} onChange={setSelectedModel} />

        <div className="flex items-center gap-2">
          {currentMessages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Limpar todas as mensagens?')) {
                  clearMessages();
                }
              }}
              title="Limpar conversa"
              className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            title="Configurações"
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
      >
        {currentMessages.length === 0 ? (
          <WelcomeScreen onPickPrompt={handleSend} />
        ) : (
          <MessageList
            messages={currentMessages}
            onRegenerate={handleRegenerate}
            onEdit={handleEditMessage}
          />
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg transition-all hover:bg-[var(--bg-secondary)]"
            title="Rolar para baixo"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Input area */}
      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        isThinking={isThinking}
        disabled={
          selected?.provider.requiresApiKey && !settings.apiKey && selectedModel !== ''
            ? false
            : false
        }
        placeholder={`Conversar com ${selected?.model.name || 'OpenClaude'}...`}
        editTarget={editTarget}
        onEditSubmit={handleEditSubmit}
        onEditCancel={() => setEditTarget(null)}
      />
    </div>
  );
}
