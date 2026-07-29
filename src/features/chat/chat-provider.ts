"use client";

import type { ReactNode } from "react";
import React, { createContext, useCallback, useMemo, useRef, useState } from "react";

import { requestChatResponse } from "./chat-service";
import type {
  ChatAssistantResponse,
  ChatHistoryItem,
  ChatMessage,
  ChatPanelStatus,
  ChatRole,
} from "./types";

export type ChatProviderProps = {
  storagePath: string;
  fileName: string;
  children: ReactNode;
};

export type ChatContextValue = {
  messages: ChatMessage[];
  status: ChatPanelStatus;
  error: string | null;
  sendMessage: (question: string) => Promise<void>;
  stopGenerating: () => void;
  clearConversation: () => void;
};

export const ChatContext = createContext<ChatContextValue | null>(null);

function createChatMessage(
  role: ChatRole,
  content: string,
  pages?: number[],
): ChatMessage {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    id,
    role,
    content,
    ...(role === "assistant" && pages && pages.length > 0 ? { pages } : {}),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Client-side in-memory conversation store.
 * Conversation is not persisted anywhere (Phase 7F requirement).
 */
export function ChatProvider({
  storagePath,
  fileName,
  children,
}: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatPanelStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // UI-only stop: we ignore the response when stop is pressed.
  const cancelTokenRef = useRef(0);

  const stopGenerating = useCallback(() => {
    cancelTokenRef.current += 1;
    setStatus("idle");
    setError(null);
  }, []);

  const clearConversation = useCallback(() => {
    cancelTokenRef.current += 1;
    setMessages([]);
    setStatus("idle");
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      if (status === "loading") return;

      setError(null);
      setStatus("loading");

      const userMessage = createChatMessage("user", trimmed);
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      const historyForRequest: ChatHistoryItem[] = nextMessages.map(
        (m) => ({ role: m.role, content: m.content }),
      );

      const requestToken = cancelTokenRef.current;

      let assistant: ChatAssistantResponse | null = null;

      try {
        const result = await requestChatResponse({
          storagePath,
          question: trimmed,
          history: historyForRequest,
          originalFileName: fileName,
        });

        if (cancelTokenRef.current !== requestToken) {
          // A stop/clear happened; ignore late responses.
          return;
        }

        if (!result.ok) {
          setStatus("error");
          setError(result.error);
          return;
        }

        assistant = result.data;
      } catch (e) {
        if (cancelTokenRef.current !== requestToken) {
          return;
        }

        setStatus("error");
        setError(e instanceof Error ? e.message : "Unable to generate a reply.");
        return;
      } finally {
        if (cancelTokenRef.current === requestToken) {
          setStatus(assistant ? "idle" : "idle");
        }
      }

      if (!assistant) return;

      setMessages((current) => {
        // If messages were cleared after request, ignore.
        if (cancelTokenRef.current !== requestToken) return current;
        const assistantMessage = createChatMessage(
          "assistant",
          assistant.content,
          assistant.pages,
        );
        return [...nextMessages, assistantMessage];
      });
    },
    [fileName, messages, status, storagePath],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      status,
      error,
      sendMessage,
      stopGenerating,
      clearConversation,
    }),
    [
      messages,
      status,
      error,
      sendMessage,
      stopGenerating,
      clearConversation,
    ],
  );

  return React.createElement(
    ChatContext.Provider,
    { value },
    children,
  );
}

