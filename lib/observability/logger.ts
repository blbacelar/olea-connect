import { getOrCreateRequestId } from "./request-id";

type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

type LogContext = Record<string, unknown>;

const sensitiveKeyPattern =
  /token|secret|password|authorization|cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|signature|payload|document|content|html|text/i;

function redact(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }

  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : redact(item),
    ]),
  );
}

function safeContext(context: LogContext = {}) {
  return redact(context) as LogContext;
}

export function getRequestContext(
  request: Request,
  context: LogContext = {},
): LogContext {
  const url = new URL(request.url);

  return {
    method: request.method,
    path: url.pathname,
    requestId: getOrCreateRequestId(request.headers),
    ...context,
  };
}

export function logEvent(
  level: LogLevel,
  message: string,
  context: LogContext = {},
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "olea-connects",
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    ...safeContext(context),
  };
  const serialized = JSON.stringify(entry);

  if (level === "critical" || level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export function logInfo(message: string, context?: LogContext) {
  logEvent("info", message, context);
}

export function logWarn(message: string, context?: LogContext) {
  logEvent("warn", message, context);
}

export function logError(message: string, error: unknown, context?: LogContext) {
  logEvent("error", message, { ...context, error });
}

export function logCritical(
  message: string,
  error: unknown,
  context?: LogContext,
) {
  logEvent("critical", message, {
    alert: true,
    ...context,
    error,
  });
}
