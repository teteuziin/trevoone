import nodemailer, { type Transporter } from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  appUrl: string;
};

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey: string | null = null;

export function getSmtpConfig(): SmtpConfig | null {
  const host = (process.env.SMTP_HOST || "smtp.hostinger.com").trim();
  const rawPort = process.env.SMTP_PORT?.trim();
  const port = rawPort ? parseInt(rawPort, 10) : 465;

  const rawSecure = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure = rawSecure !== undefined && rawSecure !== "" ? rawSecure === "true" || rawSecure === "1" : port === 465;

  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASSWORD || "").trim();
  const from = (process.env.MAIL_FROM || `Trevo One <${user || "no-reply@trevoone.com"}>`).trim();
  const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");

  if (!host || isNaN(port) || port <= 0 || !user || !pass || !appUrl) {
    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    appUrl,
  };
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

export function getSmtpTransporter(): { transporter: Transporter; config: SmtpConfig } | null {
  const config = getSmtpConfig();
  if (!config) {
    return null;
  }

  const key = `${config.host}:${config.port}:${config.secure}:${config.user}`;
  if (!cachedTransporter || cachedTransporterKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    cachedTransporterKey = key;
  }

  return { transporter: cachedTransporter, config };
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendSmtpEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const transportContext = getSmtpTransporter();
  if (!transportContext) {
    return {
      success: false,
      error: "SMTP_NOT_CONFIGURED",
    };
  }

  const { transporter, config } = transportContext;

  try {
    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return { success: true };
  } catch {
    // Sanitized server error log: never log credentials, tokens, or recipient email addresses
    console.error("[Email Delivery] Failed to dispatch transactional email via SMTP.");
    return {
      success: false,
      error: "SMTP_DISPATCH_FAILED",
    };
  }
}
