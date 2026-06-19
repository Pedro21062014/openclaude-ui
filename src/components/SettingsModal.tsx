import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { PROVIDERS, findModel } from '@/data/models';
import {
  X,
  Key,
  Globe,
  MessageSquare,
  Sliders,
  Palette,
  Terminal,
  Info,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
} from 'lucide-react';
import type { AppSettings } from '@/types';

interface SettingsModalProps {}

export function SettingsModal({}: SettingsModalProps) {
  const { settings, setSettings, setShowSettings, ocStatus } = useStore();
  const [local, setLocal] = useState<AppSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [tab, setTab] = useState<'model' | 'openclaude' | 'appearance' | 'advanced'>(
    'model',
  );

  // Sync local with store
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const update = (patch: Partial<AppSettings>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    setSettings(local);
    setShowSettings(false);
  };

  const handleReset = () => {
    if (confirm('Restaurar configurações padrão?')) {
      const defaults: AppSettings = {
        defaultModel: 'claude-sonnet-4-5',
        apiKey: '',
        baseUrl: '',
        systemPrompt: '',
        temperature: 0.7,
        maxTokens: 8192,
        streamOutput: true,
        theme: 'dark',
        fontFamily: 'sans',
        fontSize: 'md',
        sidebarCollapsed: false,
        customArgs: '',
        telemetry: false,
      };
      setLocal(defaults);
    }
  };

  const selectedModelInfo = findModel(local.defaultModel);

  const tabs = [
    { id: 'model', label: 'Modelo & API', icon: Key },
    { id: 'openclaude', label: 'OpenClaude', icon: Terminal },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'advanced', label: 'Avançado', icon: Sliders },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={() => setShowSettings(false)}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar tabs */}
        <div className="flex w-56 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] p-3">
          <div className="mb-4 px-2 text-sm font-semibold text-[var(--text-primary)]">
            Configurações
          </div>
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  tab === t.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}

          <div className="mt-auto space-y-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center justify-between">
              <span>OpenClaude:</span>
              <span className={ocStatus.installed ? 'text-green-500' : 'text-red-500'}>
                {ocStatus.installed ? 'Instalado' : 'Não instalado'}
              </span>
            </div>
            {ocStatus.version && (
              <div className="flex items-center justify-between">
                <span>Versão:</span>
                <span className="font-mono">{ocStatus.version}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {tabs.find((t) => t.id === tab)?.label}
            </h2>
            <button
              onClick={() => setShowSettings(false)}
              className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === 'model' && (
              <div className="space-y-5">
                {/* Default model */}
                <Field
                  icon={MessageSquare}
                  label="Modelo padrão"
                  hint="Modelo usado ao iniciar uma nova conversa"
                >
                  <select
                    value={local.defaultModel}
                    onChange={(e) => update({ defaultModel: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    {PROVIDERS.map((p) => (
                      <optgroup key={p.id} label={p.name}>
                        {p.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>

                {/* API Key */}
                {selectedModelInfo?.provider.requiresApiKey && (
                  <Field
                    icon={Key}
                    label={`API Key — ${selectedModelInfo.provider.name}`}
                    hint={
                      selectedModelInfo.provider.envVar
                        ? `Também pode ser definida via env var: ${selectedModelInfo.provider.envVar}`
                        : 'Defina sua chave de API'
                    }
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={local.apiKey}
                        onChange={(e) => update({ apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                )}

                {/* Base URL */}
                <Field
                  icon={Globe}
                  label="Base URL (opcional)"
                  hint="Deixe em branco para usar o padrão do provedor. Útil para proxies ou gateways."
                >
                  <input
                    type="text"
                    value={local.baseUrl}
                    onChange={(e) => update({ baseUrl: e.target.value })}
                    placeholder={
                      selectedModelInfo?.provider.defaultBaseUrl || 'https://...'
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </Field>

                {/* System prompt */}
                <Field
                  icon={MessageSquare}
                  label="System prompt (opcional)"
                  hint="Instruções iniciais enviadas ao modelo em cada conversa"
                >
                  <textarea
                    value={local.systemPrompt}
                    onChange={(e) => update({ systemPrompt: e.target.value })}
                    placeholder="Você é um assistente útil..."
                    rows={4}
                    className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </Field>
              </div>
            )}

            {tab === 'openclaude' && (
              <div className="space-y-5">
                {/* OpenClaude status */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-[var(--accent)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Status do OpenClaude CLI
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Status
                      </div>
                      <div
                        className={`font-medium ${
                          ocStatus.installed
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      >
                        {ocStatus.installed ? '✓ Instalado' : '✗ Não instalado'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Versão
                      </div>
                      <div className="font-mono text-[var(--text-primary)]">
                        {ocStatus.version || '—'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-[var(--text-secondary)]">
                        Caminho
                      </div>
                      <div className="break-all font-mono text-xs text-[var(--text-primary)]">
                        {ocStatus.path || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        await window.openclaude?.detectOpenClaude();
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Verificar novamente
                    </button>
                    {!ocStatus.installed && (
                      <button
                        onClick={() => window.openclaude?.installOpenClaude()}
                        className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                      >
                        Instalar agora
                      </button>
                    )}
                  </div>
                </div>

                {/* Stream output */}
                <Field
                  icon={Sliders}
                  label="Stream de saída"
                  hint="Receba tokens incrementalmente enquanto o modelo gera a resposta"
                >
                  <Toggle
                    checked={local.streamOutput}
                    onChange={(v) => update({ streamOutput: v })}
                  />
                </Field>

                {/* Temperature */}
                <Field
                  icon={Sliders}
                  label={`Temperature: ${local.temperature.toFixed(2)}`}
                  hint="0 = determinístico, 1 = criativo, 2 = caótico"
                >
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={local.temperature}
                    onChange={(e) =>
                      update({ temperature: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[var(--accent)]"
                  />
                </Field>

                {/* Max tokens */}
                <Field
                  icon={Sliders}
                  label="Max tokens"
                  hint="Número máximo de tokens na resposta"
                >
                  <input
                    type="number"
                    min={64}
                    max={200000}
                    step={64}
                    value={local.maxTokens}
                    onChange={(e) =>
                      update({ maxTokens: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </Field>

                {/* Custom args */}
                <Field
                  icon={Terminal}
                  label="Argumentos customizados do CLI"
                  hint="Adicionados ao comando openclaude (ex: --verbose --no-cache)"
                >
                  <input
                    type="text"
                    value={local.customArgs}
                    onChange={(e) => update({ customArgs: e.target.value })}
                    placeholder="--verbose"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </Field>
              </div>
            )}

            {tab === 'appearance' && (
              <div className="space-y-5">
                <Field
                  icon={Palette}
                  label="Tema"
                  hint="Escolha o tema da interface"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => update({ theme: t })}
                        className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                          local.theme === t
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        {t === 'light' ? '☀️ Claro' : t === 'dark' ? '🌙 Escuro' : '💻 Sistema'}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  icon={Palette}
                  label="Fonte"
                  hint="Família tipográfica da interface"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['sans', 'Sans-serif'],
                      ['serif', 'Serif'],
                      ['mono', 'Mono'],
                    ] as const).map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => update({ fontFamily: v })}
                        className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                          local.fontFamily === v
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                        style={{
                          fontFamily:
                            v === 'sans'
                              ? 'Inter, sans-serif'
                              : v === 'serif'
                                ? 'Source Serif 4, serif'
                                : 'JetBrains Mono, monospace',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  icon={Palette}
                  label="Tamanho da fonte"
                  hint="Tamanho base do texto na interface"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['sm', 'Pequeno'],
                      ['md', 'Médio'],
                      ['lg', 'Grande'],
                    ] as const).map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => update({ fontSize: v })}
                        className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                          local.fontSize === v
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {tab === 'advanced' && (
              <div className="space-y-5">
                <Field
                  icon={Info}
                  label="Telemetria"
                  hint="Envia dados anônimos de uso para melhorar o OpenClaude"
                >
                  <Toggle
                    checked={local.telemetry}
                    onChange={(v) => update({ telemetry: v })}
                  />
                </Field>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-[var(--text-secondary)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Sobre o OpenClaude UI
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    OpenClaude UI é um cliente desktop de código aberto para o
                    OpenClaude CLI. Ele fornece uma interface Claude/ChatGPT-like
                    com suporte a múltiplos provedores de LLM.
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
                    <div>Versão: 1.0.0</div>
                    <div>
                      Electron: {window.openclaude?.versions?.electron || '—'}
                    </div>
                    <div>Node: {window.openclaude?.versions?.node || '—'}</div>
                    <div>Plataforma: {window.openclaude?.platform || '—'}</div>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                >
                  Restaurar configurações padrão
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
            <button
              onClick={() => setShowSettings(false)}
              className="rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              <Check className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: any;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        <label className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
      </div>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
