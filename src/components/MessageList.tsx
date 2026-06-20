import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '@/hooks/useStore';
import { findModel } from '@/data/models';
import type { ChatMessage, FileOperation } from '@/types';
import { ThinkingAnimation } from './ThinkingAnimation';
import { DiffModal } from './DiffModal';
import { BashCommandCard } from './BashCommandCard';
import {
  Copy,
  RefreshCw,
  Edit,
  User,
  FilePlus,
  FileEdit,
  FileX,
  FileText,
  GitCompare,
  Check,
} from 'lucide-react';
import { useState } from 'react';

interface MessageListProps {
  messages: ChatMessage[];
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
}

export function MessageList({ messages, onRegenerate, onEdit }: MessageListProps) {
  const { settings } = useStore();
  const isDark = settings.theme === 'dark';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isDark={isDark}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function fileIconForOp(op: FileOperation) {
  const path = op.filePath;
  const ext = (path.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
  const colorMap: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
    py: '#3776ab', go: '#00add8', rs: '#dea584', java: '#ed8b00',
    cpp: '#00599c', c: '#a8b9cc', cs: '#178600', rb: '#cc342d',
    php: '#777bb4', swift: '#f05138', kt: '#7f52ff',
    html: '#e34c26', css: '#1572b6', scss: '#cc6699',
    json: '#cbcb41', yml: '#cb171e', yaml: '#cb171e', toml: '#9c4221',
    md: '#083fa1', txt: '#6b6760', sh: '#89e051',
    sql: '#e38c00',
  };
  const color = colorMap[ext] || '#6b6760';

  if (op.type === 'create') {
    return <FilePlus style={{ color }} className="h-3.5 w-3.5" />;
  }
  if (op.type === 'delete') {
    return <FileX style={{ color: '#dc2626' }} className="h-3.5 w-3.5" />;
  }
  if (op.type === 'notebook') {
    return <FileText style={{ color }} className="h-3.5 w-3.5" />;
  }
  return <FileEdit style={{ color }} className="h-3.5 w-3.5" />;
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function MessageItem({
  message,
  isDark,
  onRegenerate,
  onEdit,
}: {
  message: ChatMessage;
  isDark: boolean;
  onRegenerate?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const modelInfo = message.model ? findModel(message.model) : null;
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRegenerate = () => {
    onRegenerate?.(message.id);
  };

  const handleEdit = () => {
    onEdit?.(message.id, message.content);
  };

  if (isUser) {
    return (
      <div className="group mb-8 animate-slide-up">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <User className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">Você</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {/* Action buttons for user messages (shown on hover) */}
          {message.done !== false && (
            <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleCopy}
                title={copied ? 'Copiado!' : 'Copiar'}
                className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleEdit}
                title="Editar"
                className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="selectable ml-9 whitespace-pre-wrap rounded-2xl rounded-tl-md bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)]">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  const hasFileOps = (message.fileOperations?.length || 0) > 0;
  const hasBashCmds = (message.bashCommands?.length || 0) > 0;
  const showActionButtons = message.done && !message.thinking && !message.error;

  return (
    <div className="group mb-8 animate-slide-up">
      {/* Assistant header */}
      <div className="mb-2 flex items-center gap-2">
        {modelInfo?.provider.logo && (
          <img
            src={modelInfo.provider.logo}
            alt={modelInfo.provider.name}
            className="h-7 w-7 object-contain"
            draggable={false}
          />
        )}
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {modelInfo?.model.name || 'Assistant'}
        </span>
        <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
          {modelInfo?.provider.name}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Content */}
      <div className="selectable ml-9 min-h-[28px]">
        {message.thinking && !message.content ? (
          <ThinkingAnimation size={88} />
        ) : (
          <>
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !className;
                    return !isInline && match ? (
                      <SyntaxHighlighter
                        style={isDark ? oneDark : oneLight}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content || ''}
              </ReactMarkdown>
            </div>

            {message.thinking && message.content && (
              <div className="mt-2">
                <ThinkingAnimation size={56} showText={false} />
              </div>
            )}

            {message.error && (
              <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {message.content}
              </div>
            )}

            {/* Bash command indicators */}
            {hasBashCmds && !message.thinking && (
              <div className="mt-3 space-y-1.5">
                <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {message.bashCommands!.length === 1
                    ? 'Comando executado'
                    : `${message.bashCommands!.length} comandos executados`}
                </div>
                {message.bashCommands!.map((cmd) => (
                  <BashCommandCard key={cmd.id} command={cmd} />
                ))}
              </div>
            )}

            {/* File operations indicators */}
            {hasFileOps && !message.thinking && (
              <div className="mt-3 space-y-1.5">
                {message.fileOperations!.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs"
                  >
                    {fileIconForOp(op)}
                    <span className="text-[var(--text-secondary)]">
                      {op.type === 'create' && 'Criou '}
                      {op.type === 'edit' && 'Editou '}
                      {op.type === 'delete' && 'Excluiu '}
                      {op.type === 'notebook' && 'Editou notebook '}
                      {op.type === 'read' && 'Leu '}
                    </span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      {fileName(op.filePath)}
                    </span>
                    <span className="ml-auto text-[10px] text-[var(--text-secondary)]/60">
                      {op.tool}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons (Copy / Regenerate / Edit / Diff) */}
            {showActionButtons && message.content && (
              <div className="mt-3 flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={handleCopy}
                  title={copied ? 'Copiado!' : 'Copiar'}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  onClick={handleRegenerate}
                  title="Regenerar resposta"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerar
                </button>
                <button
                  onClick={handleEdit}
                  title="Editar pergunta anterior"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </button>

                {/* Diff button — only show if there are file operations */}
                {hasFileOps && (
                  <button
                    onClick={() => setShowDiff(true)}
                    className="ml-auto flex items-center gap-1.5 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
                    title="Ver alterações de arquivos"
                  >
                    <GitCompare className="h-3 w-3" />
                    Ver diff ({message.fileOperations!.length})
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Diff modal */}
      {showDiff && hasFileOps && (
        <DiffModal
          operations={message.fileOperations!}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}
