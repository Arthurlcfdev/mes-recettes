import crypto from "node:crypto";
import {
  createSessionCookieValue,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const expected = process.env.APP_PASSWORD || "";
  const provided = String(req.body?.password || "");
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const match =
    expected.length > 0 &&
    expectedBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!match) return res.status(401).json({ error: "Mot de passe incorrect." });

  const cookieValue = await createSessionCookieValue();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${cookieValue}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax${secure}`,
  );
  return res.status(200).json({ ok: true });
}
