import { answerOf, type Answer, type Body } from "./api";

/**
 * AN ANSWER IN LINES (NDJSON), read as the lines arrive: /api/resolve sends
 * a found coin at once and its sniff when the verdict is in. Kept apart
 * from the fetch (resolve.ts) so it can be tested in Node.
 */

/** The lines of a byte stream, one per call, and null once it has ended. */
export function lineReader(stream: ReadableStream<Uint8Array>): () => Promise<string | null> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let ended = false;
  return async () => {
    for (;;) {
      const at = buffer.indexOf("\n");
      if (at >= 0) {
        const line = buffer.slice(0, at);
        buffer = buffer.slice(at + 1);
        if (line.trim()) return line;
        continue;
      }
      if (ended) {
        const rest = buffer.trim() ? buffer : null;
        buffer = "";
        return rest;
      }
      const chunk = await reader.read();
      if (chunk.done) {
        ended = true;
        buffer += decoder.decode();
      } else {
        buffer += decoder.decode(chunk.value, { stream: true });
      }
    }
  };
}

const parse = (line: string | null): Body | null => {
  if (!line) return null;
  try {
    const v: unknown = JSON.parse(line);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Body) : null;
  } catch {
    return null;
  }
};

/**
 * The first line is the answer, as any other call's would be (an answer not
 * in lines is all first line); `then` is the line after it, once it comes,
 * or null when none does or the stream breaks off.
 */
export async function firstThen<T>(res: Response): Promise<{ answer: Answer<T>; then: Promise<Body | null> }> {
  if (!res.body) return { answer: answerOf<T>(res, (await res.json().catch(() => null)) as Body | null), then: Promise.resolve(null) };
  const read = lineReader(res.body);
  const answer = answerOf<T>(res, parse(await read()));
  return { answer, then: answer.ok ? read().then(parse, () => null) : Promise.resolve(null) };
}
