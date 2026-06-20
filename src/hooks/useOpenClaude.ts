import { useEffect, useRef, useCallback } from 'react';
import { useStore } from './useStore';
import { findModel } from '@/data/models';
import type { ChatMessage, FileOperation, BashCommand } from '@/types';

const SESSION_ID = 'main-session';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Extract file operations from a stream event.
 *
 * openclaude emits 'assistant' events with message.content as an array
 * that may contain tool_use blocks. We look for:
 *   - Write        → file created (content has the new file content)
 *   - Edit         → file edited (old_string + new_string for diff)
 *   - NotebookEdit → notebook cell edited
 *   - MultiEdit    → multiple edits to one file
 *
 * Returns an array of FileOperation objects (may be empty).
 */
function extractFileOperations(evt: any): FileOperation[] {
  const ops: FileOperation[] = [];
  if (!evt || typeof evt !== 'object') return ops;

  // Look at message.content array for tool_use blocks
  const content = evt?.message?.content;
  if (!Array.isArray(content)) return ops;

  for (const block of content) {
    if (block?.type !== 'tool_use') continue;
    const toolName = block.name || '';
    const input = block.input || {};
    const filePath = input.file_path || input.path || input.notebook_path || '';
    if (!filePath) continue;

    if (toolName === 'Write') {
      ops.push({
        id: uid(),
        type: 'create',
        tool: toolName,
        filePath,
        content: input.content,
        timestamp: Date.now(),
      });
    } else if (toolName === 'Edit') {
      ops.push({
        id: uid(),
        type: 'edit',
        tool: toolName,
        filePath,
        oldString: input.old_string,
        newString: input.new_string,
        timestamp: Date.now(),
      });
    } else if (toolName === 'MultiEdit') {
      // MultiEdit has an array of edits — create one op per edit
      const edits = input.edits || [];
      for (const edit of edits) {
        ops.push({
          id: uid(),
          type: 'edit',
          tool: toolName,
          filePath,
          oldString: edit.old_string,
          newString: edit.new_string,
          timestamp: Date.now(),
        });
      }
    } else if (toolName === 'NotebookEdit') {
      ops.push({
        id: uid(),
        type: 'notebook',
        tool: toolName,
        filePath,
        oldString: input.old_text,
        newString: input.new_text,
        timestamp: Date.now(),
      });
    } else if (toolName === 'Bash' && input.command) {
      // Detect file creation/deletion via bash commands
      const cmd = input.command as string;
      // rm/mv/cp/touch/mkdir
      const rmMatch = cmd.match(/\brm\s+(?:-[rf]+\s+)*([^\s&|;]+)/);
      const mvMatch = cmd.match(/\bmv\s+([^\s&|;]+)\s+([^\s&|;]+)/);
      if (rmMatch) {
        ops.push({
          id: uid(),
          type: 'delete',
          tool: 'Bash',
          filePath: rmMatch[1],
          timestamp: Date.now(),
        });
      }
      if (mvMatch) {
        ops.push({
          id: uid(),
          type: 'edit',
          tool: 'Bash',
          filePath: mvMatch[2],
          timestamp: Date.now(),
        });
      }
    }
  }
  return ops;
}

/**
 * Extract bash commands from a stream event.
 *
 * Looks for tool_use blocks with name 'Bash' (or 'BashOutput', 'KillShell',
 * 'Task' — which spawn sub-processes). Each bash command becomes a
 * BashCommand object with status 'running' initially.
 *
 * When we later see a 'user' event with tool_result content matching the
 * same tool_use_id, we update the command status to 'done' (or 'error' if
 * the result indicates failure) and capture the output.
 */
function extractBashCommands(evt: any): BashCommand[] {
  const cmds: BashCommand[] = [];
  if (!evt || typeof evt !== 'object') return cmds;

  const content = evt?.message?.content;
  if (!Array.isArray(content)) return cmds;

  for (const block of content) {
    if (block?.type !== 'tool_use') continue;
    const toolName = block.name || '';
    const input = block.input || {};

    if (toolName === 'Bash' && input.command) {
      cmds.push({
        id: block.id || uid(),
        command: input.command,
        status: 'running',
        tool: toolName,
        timestamp: Date.now(),
      });
    }
  }
  return cmds;
}

/**
 * Extract tool results (outputs) from 'user' events.
 *
 * When openclaude finishes running a tool, it emits a 'user' event with
 * message.content as an array of tool_result blocks. Each tool_result has
 * a tool_use_id (matching the original tool_use block) and content (the
 * output). We match these to update the corresponding BashCommand's
 * output and status.
 *
 * Returns a map of tool_use_id → { output, is_error }.
 */
function extractToolResults(evt: any): Map<string, { output: string; isError: boolean }> {
  const results = new Map<string, { output: string; isError: boolean }>();
  if (!evt || typeof evt !== 'object') return results;

  // 'user' events have role: 'user' and message.content with tool_result blocks
  const content = evt?.message?.content;
  if (!Array.isArray(content)) return results;

  for (const block of content) {
    if (block?.type !== 'tool_result') continue;
    const toolUseId = block.tool_use_id;
    if (!toolUseId) continue;
    let output = '';
    if (typeof block.content === 'string') {
      output = block.content;
    } else if (Array.isArray(block.content)) {
      for (const c of block.content) {
        if (typeof c === 'string') output += c;
        else if (c?.text) output += c.text;
      }
    }
    results.set(toolUseId, {
      output,
      isError: !!block.is_error,
    });
  }
  return results;
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

        // ----- Extract file operations from assistant events -----
        // When openclaude calls Write/Edit/NotebookEdit/MultiEdit, the
        // assistant event contains tool_use blocks with the file path and
        // (for Edit) the old/new strings. We capture these so the UI can
        // show "Created X" / "Edited Y" indicators and a diff button.
        if (evt.type === 'assistant' || evt.type === 'message') {
          const fileOps = extractFileOperations(evt);
          if (fileOps.length > 0) {
            updateMessage(assistantId, (prev: ChatMessage) => ({
              fileOperations: [
                ...(prev.fileOperations || []),
                ...fileOps,
              ],
            }));
          }

          // ----- Extract bash commands -----
          // When openclaude calls the Bash tool, capture the command so
          // the UI can show "▶ Executou comando" with expandable output.
          const bashCmds = extractBashCommands(evt);
          if (bashCmds.length > 0) {
            updateMessage(assistantId, (prev: ChatMessage) => ({
              bashCommands: [
                ...(prev.bashCommands || []),
                ...bashCmds,
              ],
            }));
          }
        }

        // ----- Process tool results (outputs) from user events -----
        // openclaude emits 'user' events with tool_result blocks when tools
        // finish. We match these to the bash commands we captured earlier
        // (by tool_use_id) and update their output + status.
        if (evt.type === 'user') {
          const results = extractToolResults(evt);
          if (results.size > 0) {
            // Get current bash commands for this message
            const current = useStore.getState().currentMessages;
            const msg = current.find((m) => m.id === assistantId);
            if (msg?.bashCommands && msg.bashCommands.length > 0) {
              const updatedCmds = msg.bashCommands.map((cmd) => {
                const result = results.get(cmd.id);
                if (result) {
                  return {
                    ...cmd,
                    output: result.output,
                    status: result.isError ? ('error' as const) : ('done' as const),
                    exitCode: result.isError ? 1 : 0,
                  };
                }
                return cmd;
              });
              updateMessage(assistantId, { bashCommands: updatedCmds });
            }
          }
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
          // Mark the message as done — this shows the action buttons
          // (Copy, Regenerate, Edit) and the diff button (if file ops exist).
          updateMessage(assistantId, { thinking: false, done: true });
          pendingAssistantRef.current = null;
        }
        // Persist the conversation to localStorage so the sidebar
        // history updates and the conversation survives app restart.
        setTimeout(() => {
          useStore.getState().persistCurrentConversation();
        }, 100);
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
      const provider = modelInfo?.provider.id || 'openai';
      // Look up the API key for THIS provider (each provider has its own).
      // Falls back to legacy single apiKey field if apiKeys map is empty.
      const apiKey =
        settings.apiKeys?.[provider] ||
        settings.apiKey || // legacy migration
        '';
      // Look up the base URL for THIS provider (per-provider override).
      // Falls back to the provider's default base URL.
      const baseUrl =
        settings.baseUrls?.[provider] ||
        modelInfo?.provider.defaultBaseUrl ||
        '';

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

  // Regenerate a response: find the user message BEFORE the given assistant
  // message ID, remove the assistant message, and re-send the user's prompt.
  const regenerate = useCallback(
    (assistantMessageId: string) => {
      if (isThinking) return;
      const messages = useStore.getState().currentMessages;
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      if (idx < 0) return;
      // Find the most recent user message before this assistant message
      let userIdx = idx - 1;
      while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx--;
      if (userIdx < 0) return;
      const userMsg = messages[userIdx];

      // Remove all messages from the assistant message onwards (so we can
      // re-send the user's prompt and get a fresh response).
      useStore.getState().clearMessages;
      // We can't partially clear via the store API easily — instead, we
      // set currentMessages to everything before the assistant message.
      const { setMessages } = useStore.getState() as any;
      if (typeof setMessages === 'function') {
        setMessages(messages.slice(0, idx));
      }

      // Re-send the user's prompt
      sendMessage(userMsg.content);
    },
    [isThinking, sendMessage],
  );

  // Edit a user message: replace its content and re-send (which removes
  // all subsequent messages and starts a new response).
  const editAndResend = useCallback(
    (userMessageId: string, newContent: string) => {
      if (isThinking) return;
      if (!newContent.trim()) return;
      const messages = useStore.getState().currentMessages;
      const idx = messages.findIndex((m) => m.id === userMessageId);
      if (idx < 0) return;
      // Update the user message content
      updateMessage(userMessageId, { content: newContent });
      // Truncate everything after the user message
      const { setMessages } = useStore.getState() as any;
      if (typeof setMessages === 'function') {
        setMessages(messages.slice(0, idx + 1));
      }
      // Re-send (this will spawn a new openclaude process for the new content)
      sendMessage(newContent);
    },
    [isThinking, sendMessage, updateMessage],
  );

  // Reset conversation state (called when user starts a new chat)
  const resetConversation = useCallback(() => {
    hasPriorMessageRef.current = false;
    pendingAssistantRef.current = null;
  }, []);

  return { sendMessage, stop, isThinking, resetConversation, regenerate, editAndResend };
}
