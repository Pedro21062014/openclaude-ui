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

  const sessionStartedRef = useRef(false);
  const pendingAssistantRef = useRef<string | null>(null);

  // Subscribe to streaming events
  useEffect(() => {
    const offStream = window.openclaude?.onStream(
      (data: { sessionId: string; event: any }) => {
        if (data.sessionId !== SESSION_ID) return;
        const assistantId = pendingAssistantRef.current;
        if (!assistantId) return;

        const evt = data.event;
        if (evt.type === 'text' || evt.type === 'delta' || evt.type === 'content') {
          const chunk = evt.text || evt.content || evt.delta || '';
          if (chunk) {
            updateMessage(assistantId, (prev: ChatMessage) => ({
              content: (prev.content || '') + chunk,
              thinking: false,
            }));
          }
        } else if (evt.type === 'message' || evt.type === 'complete') {
          const text = evt.text || evt.content || '';
          if (text) {
            updateMessage(assistantId, (prev: ChatMessage) => ({
              content: (prev.content || '') + text,
              thinking: false,
            }));
          }
        } else if (evt.type === 'error') {
          updateMessage(assistantId, {
            error: true,
            content: `❌ ${evt.message || evt.error || 'Erro desconhecido'}`,
            thinking: false,
          });
          setIsThinking(false);
          pendingAssistantRef.current = null;
        }
      },
    );

    const offStderr = window.openclaude?.onStderr((data: { sessionId: string; text: string }) => {
      if (data.sessionId !== SESSION_ID) return;
      // Append stderr to current assistant message if any
      const assistantId = pendingAssistantRef.current;
      if (assistantId && data.text) {
        // Only show if looks like an error
        if (/error|fail|exception/i.test(data.text)) {
          updateMessage(assistantId, {
            error: true,
            content: `⚠️ ${data.text}`,
          });
        }
      }
    });

    const offClose = window.openclaude?.onClose(
      (data: { sessionId: string; code: number }) => {
        if (data.sessionId !== SESSION_ID) return;
        setIsThinking(false);
        const assistantId = pendingAssistantRef.current;
        if (assistantId) {
          updateMessage(assistantId, { thinking: false });
          pendingAssistantRef.current = null;
        }
        sessionStartedRef.current = false;
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

  const ensureSession = useCallback(async () => {
    if (sessionStartedRef.current) return true;
    const modelInfo = findModel(selectedModel);
    const apiKey = settings.apiKey || '';
    const baseUrl = settings.baseUrl || modelInfo?.provider.defaultBaseUrl || '';

    const result = await window.openclaude?.startSession(SESSION_ID, {
      model: selectedModel,
      apiKey,
      baseUrl,
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    });

    if (result?.ok) {
      sessionStartedRef.current = true;
      return true;
    }
    return false;
  }, [selectedModel, settings]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (isThinking) return;

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

      // Ensure session is up
      const ok = await ensureSession();
      if (!ok) {
        updateMessage(assistantId, {
          error: true,
          content:
            '❌ Não foi possível iniciar a sessão do OpenClaude. Verifique se o CLI está instalado e tente novamente.',
          thinking: false,
        });
        setIsThinking(false);
        pendingAssistantRef.current = null;
        return;
      }

      // Send the text
      await window.openclaude?.sendToSession(SESSION_ID, text);
    },
    [addMessage, updateMessage, selectedModel, isThinking, ensureSession, setIsThinking],
  );

  const stop = useCallback(() => {
    window.openclaude?.stopSession(SESSION_ID);
    sessionStartedRef.current = false;
    setIsThinking(false);
    const assistantId = pendingAssistantRef.current;
    if (assistantId) {
      updateMessage(assistantId, { thinking: false });
      pendingAssistantRef.current = null;
    }
  }, [setIsThinking, updateMessage]);

  return { sendMessage, stop, isThinking };
}
