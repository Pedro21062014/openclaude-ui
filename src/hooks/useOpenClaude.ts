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
        if (!evt || typeof evt !== 'object') return;

        // ----- Error events -----
        if (evt.type === 'error') {
          updateMessage(assistantId, {
            error: true,
            content: `❌ ${evt.message || evt.error || 'Erro desconhecido'}`,
            thinking: false,
          });
          setIsThinking(false);
          pendingAssistantRef.current = null;
          return;
        }

        // ----- System events (init info) — ignore -----
        if (evt.type === 'system') {
          // Just mark that we're no longer "thinking" placeholder
          updateMessage(assistantId, { thinking: false });
          return;
        }

        // ----- Determine event category -----
        // openclaude's stream-json output emits multiple events per turn:
        //   1. system/init         — metadata, no text content
        //   2. assistant           — FULL assistant message with content array
        //   3. result              — final result with the SAME text in `result`
        //   (with --include-partial-messages, also:)
        //   2a. partial_message    — incremental text deltas (token by token)
        //
        // BUG WE'RE FIXING:
        // The old code APPENDED text from every event. So if we got the
        // partial deltas (summing to "Olá!"), then the full `assistant`
        // message ("Olá!"), then the `result` event ("Olá!" again), the
        // final content would be "Olá!Olá!Olá!" — tripled.
        //
        // FIX:
        // - Partial events (delta/partial_message/content_block_delta/text):
        //     APPEND to existing content (these are incremental chunks)
        // - Final events (assistant/message/result):
        //     REPLACE the entire content (these contain the complete text)
        // - system events: ignored

        let partialText = ''; // text to APPEND
        let finalText: string | null = null; // text to REPLACE with

        if (typeof evt === 'string') {
          // Raw string event — treat as partial
          partialText = evt;
        } else if (
          evt.type === 'text' ||
          evt.type === 'delta' ||
          evt.type === 'content' ||
          evt.type === 'partial' ||
          evt.type === 'partial_message' ||
          evt.type === 'content_block_delta'
        ) {
          // ----- Partial / delta events → APPEND -----
          if (evt.type === 'content_block_delta') {
            partialText = evt.delta?.text || evt.text || '';
          } else {
            partialText =
              evt.text || evt.content || evt.delta || evt.message || '';
          }
        } else if (evt.type === 'assistant' || evt.type === 'message') {
          // ----- Full assistant message → REPLACE -----
          // Extract text from message.content (array of {type:'text', text})
          let text = '';
          if (typeof evt.message === 'string') {
            text = evt.message;
          } else if (evt.message?.content) {
            if (typeof evt.message.content === 'string') {
              text = evt.message.content;
            } else if (Array.isArray(evt.message.content)) {
              for (const c of evt.message.content) {
                if (typeof c === 'string') text += c;
                else if (c?.text) text += c.text;
              }
            }
          }
          if (!text && evt.text) text = evt.text;
          finalText = text;
        } else if (evt.type === 'result') {
          // ----- Final result event → REPLACE -----
          // Only set if we don't already have content from the assistant
          // event (avoid redundant overwrite, though it would be the same
          // text anyway).
          finalText = evt.result || evt.text || evt.content || '';
        }

        // Apply the text update
        if (finalText !== null) {
          // REPLACE — but only if we actually have non-empty text AND
          // the new text is different from what we already have (avoid
          // flickering on identical re-renders).
          const current = useStore.getState().currentMessages;
          const msg = current.find((m) => m.id === assistantId);
          if (finalText && (!msg || msg.content !== finalText)) {
            updateMessage(assistantId, {
              content: finalText,
              thinking: false,
            });
          } else if (finalText && msg?.thinking) {
            // Just clear the thinking state
            updateMessage(assistantId, { thinking: false });
          }
        } else if (partialText) {
          // APPEND
          updateMessage(assistantId, (prev: ChatMessage) => ({
            content: (prev.content || '') + partialText,
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
