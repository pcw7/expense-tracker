// Thin wrapper around the OpenRouter chat completions API.
//
// Design notes:
// - The API key is read from process.env.OPENROUTER_API_KEY only. It must
//   never be hardcoded or logged (not even on error paths below).
// - Retries are capped and use exponential backoff so a flaky upstream can't
//   cause runaway cost/latency. Only transient failures (429, 5xx, timeout,
//   empty response, network errors) are retried; auth/config errors (401/403
//   or missing key) fail fast since retrying them can't help.
// - Callers should catch the specific error classes below to produce
//   user-facing messages instead of a generic "something went wrong".

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free OpenRouter model. Originally planned to use "thinkingmachines/inkling:free"
// (confirmed free via GET https://openrouter.ai/api/v1/models on 2026-08-22),
// but a real call returned HTTP 403: "thinkingmachines/inkling:free is only
// available on agentic harnesses" — OpenRouter restricts it to recognized
// coding-agent/productivity-app integrations, so it can't be used from a
// generic server-side API route. Re-checked the models list for other
// pricing.prompt === "0" && pricing.completion === "0" options and verified
// several with real calls; "nvidia/nemotron-3-super-120b-a12b:free" produced
// clean, instruction-following Korean markdown output (it stuck strictly to
// the provided numbers, unlike a couple of alternatives that embellished
// with unstated details) and responded in ~150-200ms.
export const OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

// Total attempts = 1 + MAX_RETRIES. Kept small to bound latency/cost even
// though the model itself is free (rate limits and hangs still cost time).
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Missing/invalid API key or an auth rejection from OpenRouter. Not retried. */
export class OpenRouterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterConfigError";
  }
}

/** 429 Too Many Requests after exhausting retries. */
export class OpenRouterRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterRateLimitError";
  }
}

/** The request did not complete within REQUEST_TIMEOUT_MS, even after retries. */
export class OpenRouterTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterTimeoutError";
  }
}

/** OpenRouter returned 200 but with no usable message content, after retries. */
export class OpenRouterEmptyResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterEmptyResponseError";
  }
}

/** Any other non-2xx response (e.g. 5xx) after exhausting retries. */
export class OpenRouterUpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterUpstreamError";
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AttemptResult =
  | { ok: true; content: string }
  | { ok: false; retryable: boolean; error: Error };

async function attemptOnce(
  messages: ChatMessage[],
  apiKey: string,
): Promise<AttemptResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Optional but recommended by OpenRouter for attribution/rankings.
        // Must be ASCII: fetch() headers are ByteString, so non-Latin1
        // characters (e.g. Korean) throw a TypeError at request time.
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Expense Tracker AI Report",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        retryable: false,
        error: new OpenRouterConfigError(
          `OpenRouter API 인증에 실패했습니다 (HTTP ${res.status}). API 키를 확인하세요. ${text.slice(0, 200)}`,
        ),
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        retryable: true,
        error: new OpenRouterRateLimitError(
          "OpenRouter API 요청 한도를 초과했습니다 (429 Too Many Requests).",
        ),
      };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        retryable: res.status >= 500,
        error: new OpenRouterUpstreamError(
          `OpenRouter API 오류가 발생했습니다 (HTTP ${res.status}). ${text.slice(0, 200)}`,
          res.status,
        ),
      };
    }

    const data: unknown = await res.json().catch(() => null);
    const content =
      data &&
      typeof data === "object" &&
      "choices" in data &&
      Array.isArray((data as { choices?: unknown }).choices)
        ? (data as { choices: Array<{ message?: { content?: unknown } }> })
            .choices[0]?.message?.content
        : undefined;

    if (typeof content !== "string" || content.trim().length === 0) {
      return {
        ok: false,
        retryable: true,
        error: new OpenRouterEmptyResponseError(
          "OpenRouter API가 빈 응답을 반환했습니다.",
        ),
      };
    }

    return { ok: true, content: content.trim() };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        retryable: true,
        error: new OpenRouterTimeoutError(
          `OpenRouter API 요청이 ${REQUEST_TIMEOUT_MS / 1000}초 내에 응답하지 않았습니다.`,
        ),
      };
    }
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls the OpenRouter chat completions API and returns the assistant's
 * message content, retrying transient failures with exponential backoff.
 *
 * Throws one of the OpenRouter*Error classes above on failure so callers can
 * map each case to a specific user-facing message.
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterConfigError(
      "OPENROUTER_API_KEY 환경 변수가 설정되어 있지 않습니다. .env 파일을 확인하세요.",
    );
  }

  let lastError: Error = new Error("OpenRouter API 호출에 실패했습니다.");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await attemptOnce(messages, apiKey);
    if (result.ok) return result.content;

    lastError = result.error;

    if (!result.retryable || attempt === MAX_RETRIES) {
      throw lastError;
    }

    await sleep(BASE_BACKOFF_MS * 2 ** attempt);
  }

  // Unreachable, but keeps TypeScript happy about always returning/throwing.
  throw lastError;
}
