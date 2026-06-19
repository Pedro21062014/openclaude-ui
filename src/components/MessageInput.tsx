import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square, Paperclip } from 'lucide-react';
import { ThinkingAnimation } from './ThinkingAnimation';

interface MessageInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isThinking: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  onStop,
  isThinking,
  disabled,
  placeholder,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 240) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isThinking) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      // Only enter sends if not multi-line preference
      // Default: Shift+Enter for new line, Enter to send
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Auto-paste files? For now just text.
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4">
      <div className="mx-auto max-w-3xl">
        {isThinking && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] px-3 py-1.5">
            <ThinkingAnimation size={16} />
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            >
              <Square className="h-3 w-3 fill-current" />
              Parar
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm transition-all focus-within:border-[var(--accent)]/40 focus-within:shadow-md">
          <button
            title="Anexar arquivo"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
            placeholder={placeholder || 'Conversar com OpenClaude...'}
            rows={1}
            className="flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] disabled:opacity-50"
            style={{ maxHeight: '240px' }}
          />

          <button
            onClick={handleSend}
            disabled={!text.trim() || isThinking}
            title="Enviar (Enter)"
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
              text.trim() && !isThinking
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-[var(--text-secondary)]/70">
          Enter para enviar · Shift+Enter para nova linha · O OpenClaude pode cometer erros.
        </p>
      </div>
    </div>
  );
}
