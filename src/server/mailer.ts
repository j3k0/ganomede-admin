import nodemailer, { type Transporter } from "nodemailer";
import type { Config } from "./config.js";
import { logger } from "./logger.js";

export interface Mailer {
  sendMail(options: MailOptions): Promise<void>;
  enabled: boolean;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function createMailer(config: Config): Mailer {
  if (!config.MAILER_HOST) {
    return {
      enabled: false,
      async sendMail() {
        throw new Error("Mailer is not configured (MAILER_HOST is missing)");
      },
    };
  }

  const transport: Transporter = nodemailer.createTransport({
    host: config.MAILER_HOST,
    port: config.MAILER_PORT,
    secure: config.MAILER_SECURE,
    ...(config.MAILER_USER && {
      auth: { user: config.MAILER_USER, pass: config.MAILER_PASSWORD },
    }),
  });

  const log = logger.child({ module: "mailer" });

  return {
    enabled: true,
    async sendMail(options: MailOptions) {
      const info = await transport.sendMail({
        from: config.MAILER_SEND_FROM,
        ...options,
      });
      log.info({ messageId: info.messageId }, "Email sent");
    },
  };
}
