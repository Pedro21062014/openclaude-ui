import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowUp, Square, Paperclip, X, ImageIcon } from 'lucide-react';
import { ThinkingAnimation } from './ThinkingAnimation';

interface AttachedImage {
  path: string;
  name: string;
  dataUrl: string;
}

interface MessageInputProps {
  onSend: (text: string, images?: AttachedImage[]) => void;
  onStop: () => void;
  isThinking: boolean;
  disabled?: boolean;
  placeholder?: string;
}

// Common openclaude slash commands (from the README + CLI help).
// These are surfaced as autocomplete suggestions when the user types '/'.
const SLASH_COMMANDS: { cmd: string; description: string }[] = [
  { cmd: '/provider', description: 'Configurar provedor de IA (OpenAI, Anthropic, Gemini, Ollama...)' },
  { cmd: '/model', description: 'Trocar de modelo' },
  { cmd: '/help', description: 'Mostrar ajuda e comandos disponíveis' },
  { cmd: '/clear', description: 'Limpar a conversa atual' },
  { cmd: '/compact', description: 'Compactar histórico da conversa' },
  { cmd: '/resume', description: 'Retomar uma conversa anterior' },
  { cmd: '/cost', description: 'Mostrar custo acumulado de tokens' },
  { cmd: '/onboard-github', description: 'Configurar GitHub Models' },
  { cmd: '/agents', description: 'Listar agentes configurados' },
  { cmd: '/mcp', description: 'Configurar servidores MCP' },
  { cmd: '/install', description: 'Instalar OpenClaude native build' },
  { cmd: '/update', description: 'Verificar e instalar atualizações' },
  { cmd: '/doctor', description: 'Diagnosticar problemas de instalação' },
];

export function MessageInput({
  onSend,
  onStop,
  isThinking,
  disabled,
  placeholder,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 240) + 'px';
    }
  }, [text]);

  // Detect slash command at start of input
  const slashQuery = text.startsWith('/')
    ? text.slice(1).split(/\s/)[0].toLowerCase()
    : '';
  const slashMatches = text.startsWith('/')
    ? SLASH_COMMANDS.filter(
        (c) => !slashQuery || c.cmd.slice(1).toLowerCase().startsWith(slashQuery),
      )
    : [];

  useEffect(() => {
    setSlashOpen(text.startsWith('/') && slashMatches.length > 0);
    setSlashIndex(0);
  }, [text, slashMatches.length]);

  const handleSend = useCallback(() => {
    if (!text.trim() || isThinking) return;
    onSend(text.trim(), images.length > 0 ? images : undefined);
    setText('');
    setImages([]);
    setSlashOpen(false);
  }, [text, isThinking, images, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash command navigation
    if (slashOpen && slashMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const picked = slashMatches[slashIndex];
        if (picked) {
          setText(picked.cmd + ' ');
          setSlashOpen(false);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
    }

    // Normal send: Enter (without shift) OR Ctrl/Cmd+Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !slashOpen) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachImage = async () => {
    try {
      const result = await window.openclaude?.openFile({
        multiple: true,
        images: true,
      });
      if (!result) return;
      const paths: string[] = Array.isArray(result) ? result : [result];
      for (const p of paths) {
        const dataUrl = await window.openclaude?.readAsDataURL(p);
        if (dataUrl) {
          const name = p.split(/[\\/]/).pop() || 'image';
          setImages((prev) => [...prev, { path: p, name, dataUrl }]);
        }
      }
    } catch (e) {
      console.error('Failed to attach image:', e);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="relative border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4">
      {/* Slash command dropdown */}
      {slashOpen && slashMatches.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 z-50 mb-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="border-b border-[var(--border)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Comandos disponíveis
          </div>
          {slashMatches.map((c, i) => (
            <button
              key={c.cmd}
              onMouseEnter={() => setSlashIndex(i)}
              onClick={() => {
                setText(c.cmd + ' ');
                setSlashOpen(false);
                textareaRef.current?.focus();
              }}
              className={`flex w-full items-start gap-3 px-3 py-2 text-left transition-colors ${
                i === slashIndex ? 'bg-[var(--bg-secondary)]' : ''
              }`}
            >
              <span className="font-mono text-sm font-medium text-[var(--accent)]">
                {c.cmd}
              </span>
              <span className="flex-1 text-xs text-[var(--text-secondary)]">
                {c.description}
              </span>
            </button>
          ))}
          <div className="border-t border-[var(--border)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)]">
            ↑↓ navegar · Tab/Enter selecionar · Esc fechar
          </div>
        </div>
      )}

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

        {/* Image thumbnails */}
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                  {img.name}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm transition-all focus-within:border-[var(--accent)]/40 focus-within:shadow-md">
          <button
            onClick={handleAttachImage}
            title="Anexar imagem"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder || 'Conversar com OpenClaude...'}
            rows={1}
            className="flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] disabled:opacity-50"
            style={{ maxHeight: '240px' }}
          />

          <button
            onClick={handleSend}
            disabled={(!text.trim() && images.length === 0) || isThinking}
            title="Enviar (Enter)"
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
              (text.trim() || images.length > 0) && !isThinking
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 flex items-center justify-center gap-3 text-[11px] text-[var(--text-secondary)]/70">
          <span>Enter para enviar · Shift+Enter para nova linha</span>
          <span className="opacity-50">·</span>
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Digite / para comandos
          </span>
        </p>
      </div>
    </div>
  );
}
