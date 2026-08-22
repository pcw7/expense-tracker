"use client";

/** 실패한 fetch Response에서 API가 내려준 { error } 메시지를 읽는다. */
export async function readErrorMessage(
  response: Response,
  fallback = "요청을 처리하지 못했습니다.",
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}
