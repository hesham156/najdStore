import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

/**
 * Transactional email over SMTP (works with any provider — Gmail, a domain
 * mailbox, SendGrid SMTP, Mailgun SMTP …). Configured from Settings (group
 * "email"), with environment-variable fallback so it can also be set on the host.
 */

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

export const EMAIL_SETTING_KEYS = [
  "email_enabled", "smtp_host", "smtp_port", "smtp_secure",
  "smtp_user", "smtp_pass", "email_from", "email_from_name",
];

export async function getEmailConfig(): Promise<EmailConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: EMAIL_SETTING_KEYS } },
    select: { key: true, value: true },
  });
  const c: Record<string, string> = {};
  rows.forEach((r) => { c[r.key] = r.value; });

  const host = c["smtp_host"] || process.env.SMTP_HOST || "";
  const user = c["smtp_user"] || process.env.SMTP_USER || "";
  return {
    enabled: (c["email_enabled"] || process.env.EMAIL_ENABLED) === "true" && !!host,
    host,
    port: parseInt(c["smtp_port"] || process.env.SMTP_PORT || "587", 10) || 587,
    secure: (c["smtp_secure"] || process.env.SMTP_SECURE) === "true",
    user,
    pass: c["smtp_pass"] || process.env.SMTP_PASS || "",
    from: c["email_from"] || process.env.EMAIL_FROM || user,
    fromName: c["email_from_name"] || process.env.EMAIL_FROM_NAME || "نجد برنت",
  };
}

const siteUrl = () => (process.env.NEXTAUTH_URL || "https://najdstore-production.up.railway.app").replace(/\/$/, "");

interface SendArgs { to: string; subject: string; html: string; text?: string }

/** Send one email. Returns true on success; false when disabled/misconfigured or on error. */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const config = await getEmailConfig();
  if (!config.enabled || !config.host || !config.user) return false;

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for 587/STARTTLS
      auth: { user: config.user, pass: config.pass },
    });
    await transport.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

/* ── Branded RTL shell ─────────────────────────────────────────────────────── */

function shell(title: string, bodyHtml: string): string {
  const url = siteUrl();
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#0f172a;font-family:Tahoma,Arial,sans-serif;color:#e5e7eb;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="text-align:center;padding:20px 0;">
        <span style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#244da0,#ec205f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">نجد برنت</span>
      </div>
      <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#fff;">${title}</h1>
        ${bodyHtml}
      </div>
      <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:20px;">
        <a href="${url}" style="color:#8b5cf6;text-decoration:none;">${url.replace(/^https?:\/\//, "")}</a>
      </p>
    </div>
  </body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#244da0,#ec205f);color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:12px;">${label}</a>`;

/* ── Templates ─────────────────────────────────────────────────────────────── */

export function orderConfirmationEmail(args: {
  orderNumber: string;
  customerName: string;
  total: number;
  items: { nameAr: string; quantity: number; price: number }[];
}): { subject: string; html: string } {
  const rows = args.items.map((i) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #1f2937;">${i.nameAr} <span style="color:#6b7280;">×${i.quantity}</span></td>
     <td style="padding:8px 0;border-bottom:1px solid #1f2937;text-align:left;white-space:nowrap;">${(i.price * i.quantity).toFixed(2)} ر.س</td></tr>`
  ).join("");
  const orderUrl = `${siteUrl()}/dashboard/orders`;
  const body = `
    <p style="margin:0 0 16px;line-height:1.9;">مرحباً ${args.customerName}، شكراً لطلبك من نجد برنت. تم استلام طلبك بنجاح.</p>
    <p style="margin:0 0 8px;color:#9ca3af;">رقم الطلب: <strong style="color:#fff;font-family:monospace;">${args.orderNumber}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">${rows}
      <tr><td style="padding:12px 0;font-weight:800;color:#fff;">الإجمالي</td>
      <td style="padding:12px 0;text-align:left;font-weight:800;color:#fff;">${args.total.toFixed(2)} ر.س</td></tr>
    </table>
    <div style="text-align:center;margin-top:20px;">${button(orderUrl, "متابعة الطلب")}</div>`;
  return { subject: `تأكيد طلبك ${args.orderNumber} — نجد برنت`, html: shell("تم استلام طلبك ✅", body) };
}

export function passwordResetEmail(args: { name: string; resetUrl: string; minutes: number }): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;line-height:1.9;">مرحباً ${args.name}، وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اضغط الزر أدناه لتعيين كلمة مرور جديدة.</p>
    <div style="text-align:center;margin:20px 0;">${button(args.resetUrl, "إعادة تعيين كلمة المرور")}</div>
    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.8;">الرابط صالح لمدة ${args.minutes} دقيقة. إذا لم تطلب ذلك، تجاهل هذه الرسالة ولن يتغيّر شيء.</p>`;
  return { subject: "إعادة تعيين كلمة المرور — نجد برنت", html: shell("إعادة تعيين كلمة المرور", body) };
}
