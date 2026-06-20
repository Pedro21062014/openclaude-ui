import { useState } from 'react';
import { Terminal, ChevronDown, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import type { BashCommand } from '@/types';

interface BashCommandCardProps {
  command: BashCommand;
}

/**
 * Renders a single bash command executed by the assistant.
 *
 * States:
 *   - running: shows a gradient-animated border + spinner
 *   - done:    shows a green check + (optionally) expandable output
 *   - error:   shows a red X + expandable error output
 *
 * Clicking the card toggles the output visibility (when there's output).
 */
export function BashCommandCard({ command }: BashCommandCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = command.output && command.output.trim().length > 0;
  const isRunning = command.status === 'running';
  const isError = command.status === 'error';

  // Truncate long commands for the collapsed view
  const shortCmd = command.command.length > 80
    ? command.command.slice(0, 80) + '…'
    : command.command;

  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        isRunning
          ? 'border-transparent bg-[var(--surface)]'
          : isError
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
      style={
        isRunning
          ? {
              // Animated gradient border while the command is running.
              // Uses background-clip with padding-box to create a border
              // effect from a moving gradient.
              background:
                'linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(90deg, #d97757, #e9a857, #d97757, #b8946a, #d97757) border-box',
              backgroundSize: '100% 100%, 200% 100%',
              border: '1.5px solid transparent',
              animation: 'gradient-shift 2s linear infinite',
            }
          : undefined
      }
    >
      {/* Command header (clickable) */}
      <button
        onClick={() => hasOutput && setExpanded(!expanded)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
          hasOutput ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : 'cursor-default'
        }`}
      >
        {/* Status icon */}
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-[var(--accent)]" />
        ) : isError ? (
          <X className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
        ) : (
          <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
        )}

        <Terminal className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)]" />

        {/* Command text */}
        <code className={`flex-1 truncate font-mono text-xs ${
          isError ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-primary)]'
        }`}>
          {shortCmd}
        </code>

        {/* Status badge */}
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isRunning
              ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
              : isError
                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                : 'bg-green-500/15 text-green-600 dark:text-green-400'
          }`}
        >
          {isRunning ? 'Executando...' : isError ? 'Erro' : 'Concluído'}
        </span>

        {/* Expand/collapse chevron (only if there's output) */}
        {hasOutput && (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
          )
        )}
      </button>

      {/* Output (expandable) */}
      {expanded && hasOutput && (
        <div className="border-t border-[var(--border)]">
          <div className="bg-[var(--bg-secondary)] px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            Saída do comando
            {command.exitCode !== undefined && (
              <span className="ml-2">
                (exit code: {command.exitCode})
              </span>
            )}
          </div>
          <pre className="selectable max-h-64 overflow-auto bg-[var(--surface)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
            {command.output}
          </pre>
        </div>
      )}
    </div>
  );
}
