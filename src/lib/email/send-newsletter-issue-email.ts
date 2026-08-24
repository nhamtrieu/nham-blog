import { Resend } from "resend";

import { env } from "@/env";

type SendNewsletterIssueEmailInput = {
  to: string;
  subject: string;
  postTitle: string;
  postExcerpt: string | null;
  postUrl: string;
  coverImageUrl: string | null;
  unsubscribeUrl: string;
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

export async function sendNewsletterIssueEmail(input: SendNewsletterIssueEmailInput) {
  const { apiKey, from } = requireResendConfig();
  const resend = new Resend(apiKey);
  const siteName = env.NEXT_PUBLIC_SITE_NAME;
  const excerpt = input.postExcerpt?.trim() || "Bài viết mới vừa được xuất bản.";

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    headers: {
      "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
    },
    text: [
      `Bài mới trên ${siteName}: ${input.postTitle}`,
      "",
      excerpt,
      "",
      `Đọc bài: ${input.postUrl}`,
      "",
      `Hủy đăng ký: ${input.unsubscribeUrl}`,
    ].join("\n"),
    html: buildIssueEmailHtml({
      siteName: escapeHtml(siteName),
      postTitle: escapeHtml(input.postTitle),
      excerpt: escapeHtml(excerpt),
      postUrl: escapeHtml(input.postUrl),
      coverImageUrl: input.coverImageUrl ? escapeHtml(input.coverImageUrl) : null,
      unsubscribeUrl: escapeHtml(input.unsubscribeUrl),
    }),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { providerMessageId: data?.id ?? null };
}

function buildIssueEmailHtml(input: {
  siteName: string;
  postTitle: string;
  excerpt: string;
  postUrl: string;
  coverImageUrl: string | null;
  unsubscribeUrl: string;
}) {
  const brand = "#0d8f5b";
  const ink = "#18181b";
  const muted = "#71717a";
  const border = "#e4e4e7";
  const canvas = "#f4f4f5";

  const coverBlock = input.coverImageUrl
    ? `<tr>
        <td style="padding:0 28px 16px;">
          <img src="${input.coverImageUrl}" alt="" width="464" style="display:block;width:100%;max-width:464px;height:auto;border-radius:8px;border:1px solid ${border};" />
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${input.postTitle}</title>
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
            <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${muted};">Bài viết mới</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.35;color:${ink};font-weight:700;">${input.postTitle}</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:${ink};">${input.excerpt}</p>
            </td>
          </tr>
          ${coverBlock}
          <tr>
            <td style="padding:8px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" bgcolor="${brand}" style="border-radius:8px;">
                    <a href="${input.postUrl}"
                       style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Đọc bài viết
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${muted};">
                Bạn nhận email này vì đã đăng ký newsletter ${input.siteName}.
                <a href="${input.unsubscribeUrl}" style="color:${muted};text-decoration:underline;">Hủy đăng ký</a>
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
