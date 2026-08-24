import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, passwordResetEmail } from "@/lib/email";

export const TOKEN_TTL_MINUTES = 30;

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const siteUrl = () =>
  (process.env.NEXTAUTH_URL || "https://najdstore-production.up.railway.app").replace(/\/$/, "");

/**
 * Issues a fresh password-reset link and emails it to the customer.
 *
 * Shared by the public "forgot password" form and the admin's "send reset
 * link" action so both mint identical tokens — the token is stored hashed,
 * any earlier unused token is revoked first, and only the raw value ever
 * reaches the customer's inbox.
 *
 * Returns whether the mail was accepted for delivery; callers on the public
 * path must ignore this so they do not leak whether an account exists.
 */
export async function issuePasswordReset(user: { id: string; name: string | null; email: string }) {
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      token: sha256(rawToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  const mail = passwordResetEmail({
    name: user.name || "عميلنا",
    resetUrl: `${siteUrl()}/reset-password?token=${rawToken}`,
    minutes: TOKEN_TTL_MINUTES,
  });

  return sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
}
