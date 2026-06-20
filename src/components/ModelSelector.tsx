import { useEffect, useRef, useState } from 'react';
import { PROVIDERS, findModel } from '@/data/models';
import { useStore } from '@/hooks/useStore';
import { Check, ChevronDown, Search } from 'lucide-react';

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { settings, setSettings } = useStore();

  const selected = findModel(value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter models by query
  const filtered = PROVIDERS.map((p) => ({
    ...p,
    models: p.models.filter(
      (m) =>
        !query ||
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.id.toLowerCase().includes(query.toLowerCase()) ||
        p.name.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((p) => p.models.length > 0);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setSettings({ defaultModel: modelId });
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm transition-all hover:border-[var(--accent)]/40 hover:shadow-sm"
      >
        {selected?.provider.logo && (
          <img
            src={selected.provider.logo}
            alt={selected.provider.name}
            className="h-5 w-5 object-contain"
            draggable={false}
          />
        )}
        <span className="font-medium text-[var(--text-primary)]">
          {selected?.model.name || value}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[380px] max-h-[480px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          {/* Search */}
          <div className="border-b border-[var(--border)] p-2">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar modelo..."
                autoFocus
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>
          </div>

          {/* Model list */}
          <div className="max-h-[400px] overflow-y-auto">
            {filtered.map((provider) => (
              <div key={provider.id} className="py-1">
                {/* Provider header */}
                <div className="sticky top-0 flex items-center gap-2 bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <img
                    src={provider.logo}
                    alt={provider.name}
                    className="h-4 w-4 object-contain"
                    draggable={false}
                  />
                  {provider.name}
                </div>
                {/* Models */}
                {provider.models.map((model) => {
                  const isSelected = model.id === value;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleSelect(model.id)}
                      className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-secondary)] ${
                        isSelected ? 'bg-[var(--bg-secondary)]' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isSelected ? (
                          <Check className="h-4 w-4 text-[var(--accent)]" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {model.name}
                          </span>
                          {model.contextWindow && (
                            <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                              {(model.contextWindow / 1000).toFixed(0)}k
                            </span>
                          )}
                        </div>
                        {model.description && (
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            {model.description}
                          </p>
                        )}
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--text-secondary)]/70">
                          {model.id}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
                Nenhum modelo encontrado.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
            {filtered.length} provedores · {filtered.reduce((a, p) => a + p.models.length, 0)} modelos
          </div>
        </div>
      )}
    </div>
  );
}
