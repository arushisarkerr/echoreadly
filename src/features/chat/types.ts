export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Supporting source pages for assistant messages. */
  pages?: number[];
  createdAt: string;
};

/** Payload shape sent to the chat API. */
export type ChatHistoryItem = {
  role: ChatRole;
  content: string;
};

export type ChatPanelStatus = "idle" | "loading" | "error";

export type ChatAssistantResponse = {
  content: string;
  pages: number[];
  generatedAt: string;
  model: string;
};
