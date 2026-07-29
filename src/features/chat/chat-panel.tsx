"use client";

import { ChatHistory } from "./chat-history";
import { ChatInput } from "./chat-input";
import { ChatProvider } from "./chat-provider";

export type ChatPanelProps = {
  storagePath: string;
  fileName: string;
};

export function ChatPanel({ storagePath, fileName }: ChatPanelProps) {
  return (
    <ChatProvider storagePath={storagePath} fileName={fileName}>
      <div className="flex h-full min-h-0 flex-col">
        <ChatHistory />
        <ChatInput />
      </div>
    </ChatProvider>
  );
}

