"use client";

import type { ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  retryLast: () => Promise<void>;
  stopGenerating: () => void;
  clearConversation: () => void;
  clearError: () => void;
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
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const clearError = useCallback(() => {
    setError(null);
    setStatus((current) => (current === "error" ? "idle" : current));
  }, []);

  const requestAssistant = useCallback(
    async (historyMessages: ChatMessage[], question: string) => {
      setError(null);
      setStatus("loading");

      const historyForRequest: ChatHistoryItem[] = historyMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const requestToken = cancelTokenRef.current;
      let assistant: ChatAssistantResponse | null = null;

      try {
        const result = await requestChatResponse({
          storagePath,
          question,
          history: historyForRequest,
          originalFileName: fileName,
        });

        if (cancelTokenRef.current !== requestToken) {
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
        setError(
          e instanceof Error ? e.message : "Unable to generate a reply.",
        );
        return;
      }

      if (cancelTokenRef.current !== requestToken || !assistant) {
        return;
      }

      setStatus("idle");
      setMessages((current) => {
        if (cancelTokenRef.current !== requestToken) {
          return current;
        }
        return [
          ...historyMessages,
          createChatMessage("assistant", assistant.content, assistant.pages),
        ];
      });
    },
    [fileName, storagePath],
  );

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      if (status === "loading") return;

      const userMessage = createChatMessage("user", trimmed);
      const nextMessages = [...messagesRef.current, userMessage];
      setMessages(nextMessages);

      await requestAssistant(nextMessages, trimmed);
    },
    [requestAssistant, status],
  );

  const retryLast = useCallback(async () => {
    if (status === "loading") return;

    const current = messagesRef.current;
    const lastUser = [...current].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    // Keep conversation through the last user turn; drop a trailing failed gap.
    const lastUserIndex = current.map((m) => m.id).lastIndexOf(lastUser.id);
    const historyMessages = current.slice(0, lastUserIndex + 1);
    setMessages(historyMessages);

    await requestAssistant(historyMessages, lastUser.content);
  }, [requestAssistant, status]);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      status,
      error,
      sendMessage,
      retryLast,
      stopGenerating,
      clearConversation,
      clearError,
    }),
    [
      messages,
      status,
      error,
      sendMessage,
      retryLast,
      stopGenerating,
      clearConversation,
      clearError,
    ],
  );

  return React.createElement(ChatContext.Provider, { value }, children);
}
