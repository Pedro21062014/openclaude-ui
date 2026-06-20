import { useEffect, useRef, useCallback } from 'react';
import { useStore } from './useStore';
import { findModel } from '@/data/models';
import type { ChatMessage } from '@/types';

const SESSION_ID = 'main-session';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useOpenClaude() {
  const {
    selectedModel,
    settings,
    currentMessages,
    addMessage,
    updateMessage,
    setIsThinking,
    isThinking,
  } = useStore();

  // Track whether we've sent at least one message in this conversation
  // (so subsequent messages pass --continue to openclaude for context).
  const hasPriorMessageRef = useRef(false);
  const pendingAssistantRef = useRef<string | null>(null);

  // Subscribe to streaming events
  useEffect(() => {
    const offStream = window.openclaude?.onStream(
      (data: { sessionId: string; event: any }) => {
        if (data.sessionId !== SESSION_ID) return;
        const assistantId = pendingAssistantRef.current;
        if (!assistantId) return;

        const evt = data.event;
        // Handle different stream-json event types from openclaude.
        // Common types: 'system', 'assistant', 'result', 'message', 'text',
        // 'content_block_delta', 'partial_message', etc.
        let textChunk = '';

        if (typeof evt === 'string') {
          textChunk = evt;
        } else if (evt.type === 'text' || evt.type === 'delta' || evt.type === 'content') {
          textChunk = evt.text || evt.content || evt.delta || '';
        } else if (evt.type === 'partial_message' || evt.type === 'partial') {
          textChunk = evt.text || evt.content || evt.delta || evt.message || '';
        } else if (evt.type === 'assistant' || evt.type === 'message') {
          // Full assistant message — extract text content
          if (typeof evt.message === 'string') {
            textChunk = evt.message;
          } else if (evt.message?.content) {
            if (typeof evt.message.content === 'string') {
              textChunk = evt.message.content;
            } else if (Array.isArray(evt.message.content)) {
              for (const c of evt.message.content) {
                if (typeof c === 'string') textChunk += c;
                else if (c?.text) textChunk += c.text;
              }
            }
          }
          if (evt.text) textChunk = evt.text;
        } else if (evt.type === 'result') {
          // Final result event — extract text
          textChunk = evt.result || evt.text || evt.content || '';
        } else if (evt.type === 'content_block_delta') {
          textChunk = evt.delta?.text || evt.text || '';
        } else if (evt.type === 'error') {
          updateMessage(assistantId, {
            error: true,
            content: `❌ ${evt.message || evt.error || 'Erro desconhecido'}`,
            thinking: false,
          });
          setIsThinking(false);
          pendingAssistantRef.current = null;
          return;
        }

        if (textChunk) {
          updateMessage(assistantId, (prev: ChatMessage) => ({
            content: (prev.content || '') + textChunk,
            thinking: false,
          }));
        }
      },
    );

    const offStderr = window.openclaude?.onStderr(
      (data: { sessionId: string; text: string }) => {
        if (data.sessionId !== SESSION_ID) return;
        const assistantId = pendingAssistantRef.current;
        // Only show stderr as an error if it actually looks like one
        if (assistantId && data.text && /error|fail|exception|invalid|required/i.test(data.text)) {
          updateMessage(assistantId, (prev: ChatMessage) => ({
            error: true,
            content: (prev.content || '') + `\n\n⚠️ ${data.text}`,
          }));
        }
      },
    );

    const offClose = window.openclaude?.onClose(
      (data: { sessionId: string; code: number }) => {
        if (data.sessionId !== SESSION_ID) return;
        setIsThinking(false);
        const assistantId = pendingAssistantRef.current;
        if (assistantId) {
          updateMessage(assistantId, { thinking: false });
          pendingAssistantRef.current = null;
        }
        // Non-zero exit code with no content → likely an error
        if (data.code !== 0 && data.code !== null && assistantId) {
          const current = useStore.getState().currentMessages;
          const msg = current.find((m) => m.id === assistantId);
          if (msg && !msg.content && !msg.error) {
            updateMessage(assistantId, {
              error: true,
              content: `❌ OpenClaude exited with code ${data.code}. Verifique as configurações (API key, modelo, provider).`,
            });
          }
        }
        // After a successful prompt, subsequent messages should use --continue
        if (data.code === 0) {
          hasPriorMessageRef.current = true;
        }
      },
    );

    const offError = window.openclaude?.onError(
      (data: { sessionId: string; error: string }) => {
        if (data.sessionId !== SESSION_ID) return;
        setIsThinking(false);
        const assistantId = pendingAssistantRef.current;
        if (assistantId) {
          updateMessage(assistantId, {
            error: true,
            content: `❌ ${data.error}`,
            thinking: false,
          });
          pendingAssistantRef.current = null;
        }
      },
    );

    return () => {
      offStream?.();
      offStderr?.();
      offClose?.();
      offError?.();
    };
  }, [updateMessage, setIsThinking]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text,
        model: selectedModel,
        timestamp: Date.now(),
      };
      addMessage(userMsg);

      // Add placeholder assistant message
      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        model: selectedModel,
        timestamp: Date.now(),
        thinking: true,
      };
      addMessage(assistantMsg);
      pendingAssistantRef.current = assistantId;
      setIsThinking(true);

      // Build options
      const modelInfo = findModel(selectedModel);
      const apiKey = settings.apiKey || '';
      const baseUrl = settings.baseUrl || modelInfo?.provider.defaultBaseUrl || '';
      const provider = modelInfo?.provider.id || 'openai';

      const options = {
        model: selectedModel,
        apiKey,
        baseUrl,
        provider,
        systemPrompt: settings.systemPrompt,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        customArgs: settings.customArgs,
        continueConversation: hasPriorMessageRef.current,
      };

      // Run the prompt — this spawns a new openclaude process with the
      // prompt as a CLI arg (no more stdin streaming, no more JSON errors).
      try {
        const result = await window.openclaude?.sendToSession(
          SESSION_ID,
          text,
          options,
        );
        if (!result?.ok) {
          updateMessage(assistantId, {
            error: true,
            content:
              '❌ Não foi possível iniciar o OpenClaude. Verifique se o CLI está instalado e tente novamente.',
            thinking: false,
          });
          setIsThinking(false);
          pendingAssistantRef.current = null;
        }
      } catch (e: any) {
        updateMessage(assistantId, {
          error: true,
          content: `❌ Erro ao enviar mensagem: ${e?.message || e}`,
          thinking: false,
        });
        setIsThinking(false);
        pendingAssistantRef.current = null;
      }
    },
    [addMessage, updateMessage, selectedModel, isThinking, setIsThinking, settings],
  );

  const stop = useCallback(() => {
    window.openclaude?.stopSession(SESSION_ID);
    setIsThinking(false);
    const assistantId = pendingAssistantRef.current;
    if (assistantId) {
      updateMessage(assistantId, { thinking: false });
      pendingAssistantRef.current = null;
    }
  }, [setIsThinking, updateMessage]);

  // Reset conversation state (called when user starts a new chat)
  const resetConversation = useCallback(() => {
    hasPriorMessageRef.current = false;
    pendingAssistantRef.current = null;
  }, []);

  return { sendMessage, stop, isThinking, resetConversation };
}
