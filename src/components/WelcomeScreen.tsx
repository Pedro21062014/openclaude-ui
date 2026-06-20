import { useStore } from '@/hooks/useStore';
import { findModel } from '@/data/models';
import { Code, Lightbulb, PenLine, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onPickPrompt: (text: string) => void;
}

const PROMPTS = [
  {
    icon: Code,
    title: 'Escrever código',
    prompt:
      'Escreva uma função em TypeScript que faz o debounce de uma função async, com tipagem genérica completa e testes unitários.',
  },
  {
    icon: Lightbulb,
    title: 'Brainstorm de ideias',
    prompt:
      'Me dê 5 ideias criativas para um projeto de fim de semana que envolva IA e produtividade pessoal.',
  },
  {
    icon: PenLine,
    title: 'Revisar texto',
    prompt:
      'Revise e melhore o seguinte texto, mantendo o tom profissional:\n\n"Obrigado pelo seu contato. Recebemos sua mensagem e vamos responder em breve."',
  },
  {
    icon: Sparkles,
    title: 'Explicar conceito',
    prompt:
      'Explique o que é uma rede neural transformer, como funciona o mecanismo de atenção, e por que ele revolucionou o NLP.',
  },
];

const CLAUDE_LOGO =
  'https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light/claude-color.png';

export function WelcomeScreen({ onPickPrompt }: WelcomeScreenProps) {
  const { selectedModel, settings, setShowSettings } = useStore();
  const modelInfo = findModel(selectedModel);
  const providerId = modelInfo?.provider.id || '';
  const hasKeyForProvider =
    !modelInfo?.provider.requiresApiKey ||
    !!(settings.apiKeys?.[providerId] || settings.apiKey);
  const needsApiKey = !hasKeyForProvider;

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-12">
      <div className="relative mb-6">
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div
            className="h-32 w-32 rounded-full opacity-30"
            style={{
              background:
                'radial-gradient(circle, rgba(217,119,87,0.6) 0%, transparent 70%)',
            }}
          />
        </div>
        <img
          src={CLAUDE_LOGO}
          alt="Claude"
          className="logo-glow h-20 w-20 object-contain"
          draggable={false}
        />
      </div>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        Como posso ajudar hoje?
      </h1>
      <p className="mb-2 text-sm text-[var(--text-secondary)]">
        Conversando com{' '}
        <span className="font-medium text-[var(--text-primary)]">
          {modelInfo?.model.name}
        </span>{' '}
        via OpenClaude
      </p>

      {needsApiKey && (
        <div className="mb-6 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-center text-sm text-amber-600 dark:text-amber-400">
          ⚠️ {modelInfo?.provider.name} requer uma API key.{' '}
          <button
            onClick={() => setShowSettings(true)}
            className="font-medium underline hover:opacity-80"
          >
            Configure nas Configurações
          </button>
          .
        </div>
      )}

      {/* Prompt suggestions */}
      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {PROMPTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <button
              key={i}
              onClick={() => onPickPrompt(p.prompt)}
              className="group flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-all hover:border-[var(--accent)]/40 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {p.title}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
                {p.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
