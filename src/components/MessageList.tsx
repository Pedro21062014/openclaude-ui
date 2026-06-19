import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '@/hooks/useStore';
import { findModel } from '@/data/models';
import type { ChatMessage } from '@/types';
import { ThinkingAnimation } from './ThinkingAnimation';
import { Copy, RefreshCw, Edit, User } from 'lucide-react';
import { useState } from 'react';

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const { settings } = useStore();
  const isDark = settings.theme === 'dark';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} isDark={isDark} />
      ))}
    </div>
  );
}

function MessageItem({ message, isDark }: { message: ChatMessage; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  const modelInfo = message.model ? findModel(message.model) : null;
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        </div>
        <div className="selectable ml-9 whitespace-pre-wrap rounded-2xl rounded-tl-md bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)]">
          {message.content}
        </div>
      </div>
    );
  }

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
          <ThinkingAnimation />
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
                <ThinkingAnimation size={18} showText={false} />
              </div>
            )}

            {message.error && (
              <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {message.content}
              </div>
            )}

            {/* Action buttons */}
            {!message.thinking && message.content && !message.error && (
              <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={handleCopy}
                  title={copied ? 'Copiado!' : 'Copiar'}
                  className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Regenerar"
                  className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Editar"
                  className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
