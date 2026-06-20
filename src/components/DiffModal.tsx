import { useState } from 'react';
import { X, FilePlus, FileEdit, FileX, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import type { FileOperation } from '@/types';

interface DiffModalProps {
  operations: FileOperation[];
  onClose: () => void;
}

/**
 * Render a simple unified-diff-like view of file operations.
 *
 * For Edit operations: shows old_string lines (red, with '-') and
 * new_string lines (green, with '+').
 * For Write (create) operations: shows the full new content as additions.
 * For Delete operations: shows the file path with a delete indicator.
 */
export function DiffModal({ operations, onClose }: DiffModalProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(operations.map((_, i) => String(i))), // expand all by default
  );

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fileName = (path: string) => path.split(/[\\/]/).pop() || path;
  const fileExt = (path: string) => {
    const m = path.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : '';
  };

  // File-type icon based on extension
  const fileIcon = (path: string, type: string) => {
    const ext = fileExt(path);
    const colorMap: Record<string, string> = {
      ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
      py: '#3776ab', go: '#00add8', rs: '#dea584', java: '#ed8b00',
      cpp: '#00599c', c: '#a8b9cc', cs: '#178600', rb: '#cc342d',
      php: '#777bb4', swift: '#f05138', kt: '#7f52ff',
      html: '#e34c26', css: '#1572b6', scss: '#cc6699',
      json: '#cbcb41', yml: '#cb171e', yaml: '#cb171e', toml: '#9c4221',
      md: '#083fa1', txt: '#6b6760', sh: '#89e051',
      png: '#a87bc6', jpg: '#a87bc6', jpeg: '#a87bc6', gif: '#a87bc6',
      svg: '#ffb13b', webp: '#a87bc6',
      sql: '#e38c00',
    };
    const color = colorMap[ext] || '#6b6760';

    if (type === 'create') return <FilePlus style={{ color }} className="h-4 w-4" />;
    if (type === 'delete') return <FileX style={{ color: '#dc2626' }} className="h-4 w-4" />;
    if (type === 'edit') return <FileEdit style={{ color }} className="h-4 w-4" />;
    if (type === 'notebook') return <FileText style={{ color }} className="h-4 w-4" />;
    return <FileText style={{ color }} className="h-4 w-4" />;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Alterações de arquivos
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {operations.length} {operations.length === 1 ? 'operação' : 'operações'}{' '}
              nesta mensagem
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {operations.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
              Nenhuma alteração de arquivo nesta mensagem.
            </div>
          ) : (
            <div className="space-y-3">
              {operations.map((op, idx) => {
                const key = String(idx);
                const isExpanded = expanded.has(key);
                const oldLines = (op.oldString || '').split('\n');
                const newLines = (op.newString || op.content || '').split('\n');
                return (
                  <div
                    key={op.id}
                    className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                  >
                    {/* Operation header */}
                    <button
                      onClick={() => toggle(key)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)]"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
                      )}
                      {fileIcon(op.filePath, op.type)}
                      <span className="font-mono text-sm text-[var(--text-primary)]">
                        {fileName(op.filePath)}
                      </span>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          op.type === 'create'
                            ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                            : op.type === 'delete'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                              : op.type === 'notebook'
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {op.type === 'create'
                          ? 'Criado'
                          : op.type === 'delete'
                            ? 'Excluído'
                            : op.type === 'notebook'
                              ? 'Notebook'
                              : 'Editado'}
                      </span>
                    </button>

                    {/* Diff content */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border)]">
                        {/* File path */}
                        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-1.5 font-mono text-[11px] text-[var(--text-secondary)]">
                          {op.filePath}
                        </div>

                        {/* Diff lines */}
                        <pre className="selectable overflow-x-auto bg-[var(--surface)] p-2 font-mono text-[12px] leading-relaxed">
                          {op.type === 'create' && op.content && (
                            <>
                              {op.content.split('\n').map((line, i) => (
                                <div key={i} className="bg-green-500/10 text-green-700 dark:text-green-300">
                                  <span className="select-none px-2 text-green-500/60">+</span>
                                  {line || ' '}
                                </div>
                              ))}
                            </>
                          )}
                          {op.type === 'edit' && op.oldString && op.newString && (
                            <>
                              {oldLines.map((line, i) => (
                                <div key={`o${i}`} className="bg-red-500/10 text-red-700 dark:text-red-300">
                                  <span className="select-none px-2 text-red-500/60">-</span>
                                  {line || ' '}
                                </div>
                              ))}
                              <div className="border-l-2 border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-center text-[10px] text-[var(--text-secondary)]">
                                ↓ substituído por ↓
                              </div>
                              {newLines.map((line, i) => (
                                <div key={`n${i}`} className="bg-green-500/10 text-green-700 dark:text-green-300">
                                  <span className="select-none px-2 text-green-500/60">+</span>
                                  {line || ' '}
                                </div>
                              ))}
                            </>
                          )}
                          {op.type === 'delete' && (
                            <div className="px-2 py-2 text-red-600 dark:text-red-400">
                              Arquivo excluído
                            </div>
                          )}
                          {op.type === 'notebook' && op.oldString && op.newString && (
                            <>
                              {oldLines.map((line, i) => (
                                <div key={`o${i}`} className="bg-red-500/10 text-red-700 dark:text-red-300">
                                  <span className="select-none px-2 text-red-500/60">-</span>
                                  {line || ' '}
                                </div>
                              ))}
                              {newLines.map((line, i) => (
                                <div key={`n${i}`} className="bg-green-500/10 text-green-700 dark:text-green-300">
                                  <span className="select-none px-2 text-green-500/60">+</span>
                                  {line || ' '}
                                </div>
                              ))}
                            </>
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-3 text-center text-xs text-[var(--text-secondary)]">
          Use <kbd className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono">Esc</kbd> ou clique fora para fechar
        </div>
      </div>
    </div>
  );
}
