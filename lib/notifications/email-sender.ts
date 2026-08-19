import { sendSmtpEmail, getSmtpConfig } from "@/lib/email/smtp";
import type { NotificationDeliveryStatus } from "@/types/notifications";

export interface SendFallbackEmailResult {
  success: boolean;
  status: NotificationDeliveryStatus;
  error?: string;
}

/**
 * Sends a generic fallback email for CRITICAL notifications when Web Push is unavailable or unaccepted.
 */
export async function sendNotificationFallbackEmail(options: {
  toEmail: string;
  recipientName?: string;
  notificationTitle: string;
}): Promise<SendFallbackEmailResult> {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    return {
      success: false,
      status: "FAILED",
      error: "SMTP_NOT_CONFIGURED",
    };
  }

  const appUrl = smtpConfig.appUrl;
  const notificationsUrl = `${appUrl}/notificacoes`;
  const name = options.recipientName?.trim() || "Usuário";

  const subject = "Notificação importante no Trevo One";

  const textBody = `Olá, ${name}.\n\nVocê tem uma notificação importante no Trevo One:\n\n"${options.notificationTitle}"\n\nAcesse sua conta para ver os detalhes completos:\n${notificationsUrl}\n\nAtenciosamente,\nEquipe Trevo One`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificação importante</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden;">
    <tr>
      <td style="padding: 28px 28px 16px 28px;">
        <div style="font-size: 20px; font-weight: bold; color: #00a859; letter-spacing: -0.5px;">
          Trevo One
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 28px 24px 28px;">
        <h1 style="font-size: 17px; font-weight: 700; color: #09090b; margin: 0 0 12px 0;">
          Notificação importante
        </h1>
        <p style="font-size: 14px; line-height: 1.5; color: #3f3f46; margin: 0 0 16px 0;">
          Olá, <strong>${name}</strong>.
        </p>
        <div style="background-color: #f4fdf7; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
          <p style="font-size: 14px; font-weight: 600; color: #166534; margin: 0;">
            ${options.notificationTitle}
          </p>
        </div>
        <p style="font-size: 13px; line-height: 1.5; color: #71717a; margin: 0 0 24px 0;">
          Acesse sua conta no Trevo One para conferir todos os detalhes e orientações desta notificação.
        </p>
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="border-radius: 10px; background-color: #00a859;">
              <a href="${notificationsUrl}" style="font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; display: inline-block; border-radius: 10px;">
                Ver Notificação
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 28px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
        <p style="font-size: 11px; color: #a1a1aa; margin: 0;">
          Trevo One — Plataforma de Saúde e Performance
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const dispatchResult = await sendSmtpEmail({
    to: options.toEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });

  if (!dispatchResult.success) {
    return {
      success: false,
      status: "FAILED",
      error: dispatchResult.error || "SMTP_DISPATCH_FAILED",
    };
  }

  return {
    success: true,
    status: "ACCEPTED",
  };
}
