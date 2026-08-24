import { Resend } from "resend";

import { env } from "@/env";

type SendNewsletterConfirmEmailInput = {
  to: string;
  confirmUrl: string;
};

function requireResendConfig() {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required to send newsletter emails.");
  }

  const from = env.NEWSLETTER_FROM?.trim() || env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM (or NEWSLETTER_FROM) is required to send newsletter emails.");
  }

  return {
    apiKey: env.RESEND_API_KEY,
    from,
  };
}

export async function sendNewsletterConfirmEmail(input: SendNewsletterConfirmEmailInput) {
  const { apiKey, from } = requireResendConfig();
  const resend = new Resend(apiKey);
  const siteName = env.NEXT_PUBLIC_SITE_NAME;
  const safeSiteName = escapeHtml(siteName);
  const safeConfirmUrl = escapeHtml(input.confirmUrl);

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Xác nhận đăng ký newsletter — ${siteName}`,
    text: [
      `Xin chào,`,
      "",
      `Bạn vừa đăng ký nhận bản tin từ ${siteName}.`,
      "Nhấn link sau để xác nhận (hiệu lực 2 ngày):",
      input.confirmUrl,
      "",
      "Nếu bạn không yêu cầu, hãy bỏ qua email này.",
    ].join("\n"),
    html: buildConfirmEmailHtml({
      siteName: safeSiteName,
      confirmUrl: safeConfirmUrl,
    }),
  });

  if (error) {
    throw new Error(error.message);
  }
}

function buildConfirmEmailHtml(input: { siteName: string; confirmUrl: string }) {
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
  <title>Xác nhận newsletter</title>
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
              <p style="margin:0 0 16px;">Xin chào,</p>
              <p style="margin:0 0 24px;">
                Bạn vừa đăng ký nhận bản tin từ <strong>${input.siteName}</strong>.
                Nhấn nút bên dưới để xác nhận — link có hiệu lực <strong>2 ngày</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" bgcolor="${brand}" style="border-radius:8px;">
                    <a href="${input.confirmUrl}"
                       style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Xác nhận đăng ký
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${muted};">
                Nếu nút không hoạt động, copy link sau vào trình duyệt:
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;">
                <a href="${input.confirmUrl}" style="color:${brand};text-decoration:underline;">${input.confirmUrl}</a>
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
