import { requestPasswordReset, revokePasswordResetToken } from "../auth/password-reset";
import { getSmtpConfig, sendSmtpEmail } from "./smtp";

export type PasswordRecoveryDispatchResult =
  | { status: "COMPLETED" }
  | { status: "UNAVAILABLE" };

export function buildPasswordResetUrl(appUrl: string, rawToken: string): string {
  const url = new URL("/redefinir-senha", appUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function generatePasswordResetEmailTemplate(resetLink: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Redefina sua senha do Trevo One";

  const text = `Olá,

Recebemos uma solicitação para redefinir a senha da sua conta no Trevo One.

Para criar uma nova senha, acesse o link abaixo:
${resetLink}

Este link é válido por 30 minutos e de uso único.

Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua senha atual permanecerá inalterada.

Atenciosamente,
Equipe Trevo One`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefina sua senha do Trevo One</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding-bottom: 24px;">
              <div style="font-size: 20px; font-weight: 700; color: #059669; letter-spacing: -0.025em;">
                Trevo One
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size: 16px; line-height: 24px; color: #334155; padding-bottom: 16px;">
              Olá,
            </td>
          </tr>
          <tr>
            <td style="font-size: 15px; line-height: 24px; color: #334155; padding-bottom: 24px;">
              Recebemos uma solicitação para redefinir a senha da sua conta no Trevo One. Clique no botão abaixo para escolher uma nova senha:
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${resetLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px;">
                Redefinir minha senha
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size: 13px; line-height: 20px; color: #64748b; padding-bottom: 20px;">
              Este link é válido por <strong>30 minutos</strong> e pode ser usado apenas uma vez.
            </td>
          </tr>
          <tr>
            <td style="font-size: 13px; line-height: 20px; color: #64748b; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
              Se você não solicitou esta redefinição, fique tranquilo: nenhuma alteração foi feita e você pode ignorar este e-mail.
            </td>
          </tr>
          <tr>
            <td style="font-size: 12px; line-height: 18px; color: #94a3b8; padding-top: 16px;">
              Caso o botão acima não funcione, copie e cole o link abaixo em seu navegador:<br>
              <span style="color: #64748b; word-break: break-all;">${resetLink}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Orchestrates password reset request:
 * 1. Checks if SMTP delivery is configured in environment.
 * 2. If configured, generates/persists token via requestPasswordReset.
 * 3. If token is issued, dispatches email via SMTP.
 * 4. If SMTP dispatch fails, revokes the newly issued token as a compensating action.
 */
export async function dispatchPasswordResetRecovery(
  rawEmail: string
): Promise<PasswordRecoveryDispatchResult> {
  const config = getSmtpConfig();
  if (!config) {
    return { status: "UNAVAILABLE" };
  }

  // Issue token if account is eligible
  const issueResult = await requestPasswordReset(rawEmail);

  // If no token was issued (e.g. account nonexistent or inactive), return completed without sending email (anti-enumeration)
  if (!issueResult.rawTokenForDelivery || !issueResult.userEmail) {
    return { status: "COMPLETED" };
  }

  const { rawTokenForDelivery, userEmail } = issueResult;
  const resetLink = buildPasswordResetUrl(config.appUrl, rawTokenForDelivery);
  const { subject, text, html } = generatePasswordResetEmailTemplate(resetLink);

  const sendResult = await sendSmtpEmail({
    to: userEmail,
    subject,
    text,
    html,
  });

  if (!sendResult.success) {
    // Compensating action: revoke the exact token that could not be delivered
    await revokePasswordResetToken(rawTokenForDelivery);
  }

  return { status: "COMPLETED" };
}
