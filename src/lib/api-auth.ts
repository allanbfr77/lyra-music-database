/** Constant-time compare. Avoids leaking the key length through an early return. */
function timingSafeEqualString(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const length = Math.max(left.length, right.length, 1);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Machine clients (Lyra, and Tom Louvores if it calls this API) send
 * `Authorization: Bearer <LYRA_API_KEY>`. The key is server-only.
 */
export function hasValidApiKey(authorization: string | null | undefined): boolean {
  const expected = process.env.LYRA_API_KEY?.trim() ?? '';
  if (!expected || !authorization) return false;
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  if (!match) return false;
  return timingSafeEqualString(match[1], expected);
}
