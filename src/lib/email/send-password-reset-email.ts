import { Resend } from "resend";

import { env } from "@/env";

type SendPasswordResetEmailInput = {
  to: string;
  name: string | null;
  resetUrl: string;
};

function requireResendConfig() {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required to send password reset emails.");
  }

  if (!env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is required to send password reset emails.");
  }

  return {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
  };
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput) {
  const { apiKey, from } = requireResendConfig();
  const resend = new Resend(apiKey);
  const greeting = input.name?.trim() || "bạn";
  const siteName = env.NEXT_PUBLIC_SITE_NAME;
  const safeGreeting = escapeHtml(greeting);
  const safeSiteName = escapeHtml(siteName);
  const safeResetUrl = escapeHtml(input.resetUrl);

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Đặt lại mật khẩu — ${siteName}`,
    text: [
      `Xin chào ${greeting},`,
      "",
      `Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản ${siteName}.`,
      "Nhấn link sau để đặt mật khẩu mới (hiệu lực 1 giờ):",
      input.resetUrl,
      "",
      "Nếu bạn không yêu cầu, hãy bỏ qua email này.",
    ].join("\n"),
    html: buildPasswordResetEmailHtml({
      greeting: safeGreeting,
      siteName: safeSiteName,
      resetUrl: safeResetUrl,
    }),
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Email-safe HTML: inline CSS + tables (clients strip most <style>). */
function buildPasswordResetEmailHtml(input: {
  greeting: string;
  siteName: string;
  resetUrl: string;
}) {
  // Matches site primary (oklch green ~155°) — hex for email clients.
  const brand = "#0d8f5b";
  const ink = "#18181b";
  const muted = "#71717a";
  const border = "#e4e4e7";
  const canvas = "#f4f4f5";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin:0;padding:0;background-color:${canvas};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${canvas};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border:1px solid ${border};border-radius:12px;">
          <tr>
            <td style="padding:28px 28px 8px;border-bottom:1px solid ${border};">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${ink};font-weight:700;">
                ${input.siteName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${ink};">
              <p style="margin:0 0 16px;">Xin chào ${input.greeting},</p>
              <p style="margin:0 0 24px;">
                Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>${input.siteName}</strong>.
                Nhấn nút bên dưới để đặt mật khẩu mới — link có hiệu lực <strong>1 giờ</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" bgcolor="${brand}" style="border-radius:8px;">
                    <a href="${input.resetUrl}"
                       style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${muted};">
                Nếu nút không hoạt động, copy link sau vào trình duyệt:
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;">
                <a href="${input.resetUrl}" style="color:${brand};text-decoration:underline;">${input.resetUrl}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:${muted};">
                Nếu bạn không yêu cầu, hãy bỏ qua email này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
