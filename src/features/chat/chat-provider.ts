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

import { requestChatResponseStream } from "./chat-service";
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
  streaming = false,
): ChatMessage {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    id,
    role,
    content,
    streaming,
    ...(role === "assistant" && pages && pages.length > 0 ? { pages } : {}),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Client-side in-memory conversation store with streaming replies.
 */
export function ChatProvider({
  storagePath,
  fileName,
  children,
}: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatPanelStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setError(null);
    setMessages((current) =>
      current.map((message) =>
        message.streaming
          ? {
              ...message,
              streaming: false,
              content:
                message.content.trim() ||
                "Generation stopped. You can retry.",
            }
          : message,
      ),
    );
  }, []);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const streamingMessage = createChatMessage("assistant", "", undefined, true);
      setMessages([...historyMessages, streamingMessage]);

      let assistant: ChatAssistantResponse | null = null;

      try {
        const result = await requestChatResponseStream(
          {
            storagePath,
            question,
            history: historyForRequest,
            originalFileName: fileName,
          },
          {
            signal: controller.signal,
            onDisplayText: (text) => {
              setMessages((current) =>
                current.map((message) =>
                  message.id === streamingMessage.id
                    ? { ...message, content: text, streaming: true }
                    : message,
                ),
              );
            },
          },
        );

        if (controller.signal.aborted) {
          return;
        }

        if (!result.ok) {
          if (result.aborted) {
            setStatus("idle");
            return;
          }

          const partial = result.partialText?.trim();
          if (partial) {
            setMessages((current) =>
              current.map((message) =>
                message.id === streamingMessage.id
                  ? {
                      ...message,
                      content: partial,
                      streaming: false,
                    }
                  : message,
              ),
            );
          } else {
            setMessages(historyMessages);
          }
          setStatus("error");
          setError(result.error);
          return;
        }

        assistant = result.data;
      } catch (e) {
        if (controller.signal.aborted) {
          return;
        }
        setMessages(historyMessages);
        setStatus("error");
        setError(
          e instanceof Error ? e.message : "Unable to generate a reply.",
        );
        return;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }

      if (!assistant) {
        return;
      }

      setStatus("idle");
      setMessages([
        ...historyMessages,
        createChatMessage("assistant", assistant.content, assistant.pages),
      ]);
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
