/**
 * Central structured logger for EchoReadly server code.
 * Never logs secrets or full stack traces to clients — stacks stay server-side only.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  code?: string;
  [key: string]: unknown;
};

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Keep stack server-side only for operators; never return to clients.
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "Unknown error" };
}

function write(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
    ...(error ? { error: serializeError(error) } : {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(line);
      }
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    write("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext, error?: unknown) {
    write("warn", message, context, error);
  },
  error(message: string, context?: LogContext, error?: unknown) {
    write("error", message, context, error);
  },
  uploadFailure(message: string, context?: LogContext, error?: unknown) {
    write("error", message, { ...context, area: "upload" }, error);
  },
  aiFailure(message: string, context?: LogContext, error?: unknown) {
    write("error", message, { ...context, area: "ai" }, error);
  },
  ttsFailure(message: string, context?: LogContext, error?: unknown) {
    write("error", message, { ...context, area: "tts" }, error);
  },
  processingFailure(message: string, context?: LogContext, error?: unknown) {
    write("error", message, { ...context, area: "processing" }, error);
  },
};
