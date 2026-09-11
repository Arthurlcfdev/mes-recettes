// Session cookie sign/verify built on Web Crypto so it works both in the
// Edge runtime (middleware.js) and the Node runtime (API routes) without
// duplicating the implementation.

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 jours

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function importKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SESSION_SECRET || ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionCookieValue() {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const key = await importKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(expiresAt)));
  return `${expiresAt}.${bufToHex(sig)}`;
}

export async function verifySessionCookieValue(value) {
  if (!value) return false;
  const [expiresAtStr, sigHex] = value.split(".");
  if (!expiresAtStr || !sigHex) return false;
  if (Number(expiresAtStr) < Date.now()) return false;

  const key = await importKey();
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBuf(sigHex),
      new TextEncoder().encode(expiresAtStr),
    );
  } catch {
    return false;
  }
}
