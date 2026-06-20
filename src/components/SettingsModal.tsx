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
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { AppSettings } from '@/types';

interface SettingsModalProps {}

export function SettingsModal({}: SettingsModalProps) {
  const { settings, setSettings, setShowSettings, ocStatus, setOcStatus } =
    useStore();
  const [local, setLocal] = useState<AppSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);

  // Local UI state for the OpenClaude tab buttons.
  // The global ocStatus is updated by IPC pushes from the main process,
  // but we also track local "is busy" flags so the buttons show a spinner
  // immediately on click (before the next IPC status push arrives).
  const [verifying, setVerifying] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [localMessage, setLocalMessage] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);

  // Subscribe to OpenClaude status pushes from the main process so the
  // modal updates in real-time while install/detect is running.
  useEffect(() => {
    const off = window.openclaude?.onOpenClaudeStatus((s: any) => {
      setOcStatus(s);
      // Sync local busy flags with global status
      if (s.installing) {
        setInstalling(true);
        setLocalMessage({ type: 'info', text: 'Instalando OpenClaude CLI...' });
      } else if (s.detecting) {
        setVerifying(true);
        setLocalMessage({ type: 'info', text: 'Verificando...' });
      } else {
        setVerifying(false);
        setInstalling(false);
        if (s.error) {
          setLocalMessage({ type: 'error', text: s.error });
        } else if (s.installed) {
          setLocalMessage({
            type: 'success',
            text: `OpenClaude ${s.version} está pronto para uso.`,
          });
        } else {
          setLocalMessage(null);
        }
      }
    });
    return () => {
      off?.();
    };
  }, [setOcStatus]);
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

  // Verify OpenClaude installation (runs `openclaude --version` via main process)
  const handleVerify = async () => {
    if (verifying || installing) return;
    setVerifying(true);
    setLocalMessage({ type: 'info', text: 'Verificando instalação...' });
    try {
      const status = await window.openclaude?.detectOpenClaude();
      if (status) {
        setOcStatus(status);
        if (status.installed) {
          setLocalMessage({
            type: 'success',
            text: `OpenClaude ${status.version} detectado em ${status.path}.`,
          });
        } else {
          setLocalMessage({
            type: 'error',
            text: 'OpenClaude não encontrado. Clique em "Instalar agora".',
          });
        }
      }
    } catch (e: any) {
      setLocalMessage({
        type: 'error',
        text: `Erro ao verificar: ${e?.message || e}`,
      });
    } finally {
      setVerifying(false);
    }
  };

  // Install OpenClaude globally via npm
  const handleInstall = async () => {
    if (installing) return;
    setInstalling(true);
    setLocalMessage({
      type: 'info',
      text: 'Iniciando instalação via npm install -g openclaude...',
    });
    try {
      await window.openclaude?.installOpenClaude();
      // The IPC status pushes will keep updating localMessage as install
      // progresses. We don't need to do anything else here — the
      // useEffect subscription handles the rest.
    } catch (e: any) {
      setLocalMessage({
        type: 'error',
        text: `Erro ao iniciar instalação: ${e?.message || e}`,
      });
      setInstalling(false);
    }
  };

  const handleSave = () => {
    setSettings(local);
    setShowSettings(false);
  };

  const handleReset = () => {
    if (confirm('Restaurar configurações padrão?')) {
      const defaults: AppSettings = {
        defaultModel: 'sonnet',
        apiKeys: {},
        baseUrls: {},
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

                {/* Per-provider API keys */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Key className="h-4 w-4 text-[var(--text-secondary)]" />
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Chaves de API por provedor
                    </label>
                  </div>
                  <p className="mb-3 text-xs text-[var(--text-secondary)]">
                    Cada provedor tem sua própria chave de API. Configure apenas
                    os provedores que você quer usar. A chave correta é enviada
                    automaticamente conforme o modelo selecionado.
                  </p>

                  <div className="space-y-2">
                    {PROVIDERS.filter((p) => p.requiresApiKey).map((provider) => {
                      const keyValue = local.apiKeys[provider.id] || '';
                      const hasKey = keyValue.length > 0;
                      return (
                        <div
                          key={provider.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            hasKey
                              ? 'border-green-500/30 bg-green-500/5'
                              : 'border-[var(--border)] bg-[var(--surface)]'
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <img
                              src={provider.logo}
                              alt={provider.name}
                              className="h-5 w-5 object-contain"
                              draggable={false}
                            />
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {provider.name}
                            </span>
                            {hasKey ? (
                              <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                                <Check className="h-3 w-3" />
                                Configurado
                              </span>
                            ) : (
                              <span className="ml-auto rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                                Não configurado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type={showApiKey && hasKey ? 'text' : 'password'}
                              value={keyValue}
                              onChange={(e) => {
                                const next = {
                                  ...local.apiKeys,
                                  [provider.id]: e.target.value,
                                };
                                update({ apiKeys: next });
                              }}
                              placeholder={`Cole aqui sua API key da ${provider.name}`}
                              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                            />
                            {hasKey && (
                              <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="rounded-md border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                                title={showApiKey ? 'Ocultar' : 'Mostrar'}
                              >
                                {showApiKey ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          {provider.envVar && (
                            <p className="mt-1.5 text-[10px] text-[var(--text-secondary)]/70">
                              Variável de ambiente alternativa:{' '}
                              <code className="font-mono">{provider.envVar}</code>
                              {' · '}
                              Base URL padrão:{' '}
                              <code className="font-mono">
                                {provider.defaultBaseUrl}
                              </code>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Base URL override (per provider, advanced) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    URL base personalizada por provedor (avançado)
                  </summary>
                  <p className="mt-2 mb-3 text-xs text-[var(--text-secondary)]">
                    Útil para proxies ou gateways. Deixe em branco para usar a URL padrão.
                  </p>
                  <div className="space-y-2">
                    {PROVIDERS.filter((p) => p.requiresApiKey).map((provider) => {
                      const urlValue = local.baseUrls[provider.id] || '';
                      return (
                        <div key={provider.id} className="flex items-center gap-2">
                          <img
                            src={provider.logo}
                            alt=""
                            className="h-4 w-4 flex-shrink-0 object-contain"
                            draggable={false}
                          />
                          <input
                            type="text"
                            value={urlValue}
                            onChange={(e) => {
                              const next = {
                                ...local.baseUrls,
                                [provider.id]: e.target.value,
                              };
                              update({ baseUrls: next });
                            }}
                            placeholder={provider.defaultBaseUrl || 'https://...'}
                            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </details>

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
                {/* OpenClaude status card */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-[var(--accent)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Status do OpenClaude CLI
                    </h3>
                    {/* Status pill */}
                    <span
                      className={`ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        ocStatus.installed
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : ocStatus.installing || ocStatus.detecting
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          ocStatus.installed
                            ? 'bg-green-500'
                            : ocStatus.installing || ocStatus.detecting
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-red-500'
                        }`}
                      />
                      {ocStatus.installed
                        ? 'Instalado'
                        : ocStatus.installing
                          ? 'Instalando...'
                          : ocStatus.detecting
                            ? 'Verificando...'
                            : 'Não instalado'}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Versão
                      </div>
                      <div className="font-mono text-[var(--text-primary)]">
                        {ocStatus.version || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Progresso
                      </div>
                      <div className="font-mono text-[var(--text-primary)]">
                        {ocStatus.installing
                          ? `${Math.round(ocStatus.installProgress)}%`
                          : '—'}
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

                  {/* Progress bar during install */}
                  {ocStatus.installing && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="thinking-bar h-full transition-all duration-300"
                          style={{ width: `${ocStatus.installProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Local feedback message */}
                  {localMessage && (
                    <div
                      className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                        localMessage.type === 'success'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : localMessage.type === 'error'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {localMessage.type === 'error' ? (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      ) : localMessage.type === 'success' ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <Loader2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                      )}
                      <span>{localMessage.text}</span>
                    </div>
                  )}

                  {/* Install log (collapsible during install) */}
                  {ocStatus.installLog && (
                    <details className="mt-3 group">
                      <summary className="cursor-pointer text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        Ver log de instalação ({ocStatus.installLog.split('\n').length} linhas)
                      </summary>
                      <pre className="selectable mt-2 max-h-40 overflow-auto rounded-md bg-[var(--bg-secondary)] p-2 font-mono text-[10px] leading-relaxed text-[var(--text-secondary)]">
                        {ocStatus.installLog}
                        {ocStatus.error && (
                          <span className="text-red-500">{ocStatus.error}</span>
                        )}
                      </pre>
                    </details>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleVerify}
                      disabled={verifying || installing}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {verifying ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      {verifying ? 'Verificando...' : 'Verificar novamente'}
                    </button>

                    {!ocStatus.installed && (
                      <button
                        onClick={handleInstall}
                        disabled={installing}
                        className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {installing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {installing ? 'Instalando...' : 'Instalar agora'}
                      </button>
                    )}

                    {ocStatus.installed && (
                      <button
                        onClick={handleInstall}
                        disabled={installing}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                        title="Reinstala/atualiza o OpenClaude CLI"
                      >
                        {installing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {installing ? 'Atualizando...' : 'Atualizar'}
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
  // Track dimensions: container is w-11 (44px) h-6 (24px).
  // Knob is h-5 w-5 (20px). With p-0.5 (2px) padding on the container,
  // the knob slides between left (translate-x-0) and right (translate-x-5).
  // Using padding instead of absolute positioning keeps the knob perfectly
  // centered vertically and symmetric horizontally.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
