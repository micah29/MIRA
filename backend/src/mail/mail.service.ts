import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private log = new Logger('Mail');
  private transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
    : null;

  /** Sends an email. Without SMTP_HOST (development) the email is printed to the console instead. */
  async send(to: string | string[], subject: string, html: string, cc?: string) {
    const rcpt = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (!rcpt.length) { this.log.warn(`No recipient for "${subject}", skipped`); return; }
    if (!this.transport) { this.log.log(`[DEV EMAIL] to=${rcpt.join(',')} cc=${cc || '-'} | ${subject}`); return; }
    try { await this.transport.sendMail({ from: process.env.MAIL_FROM, to: rcpt, cc, subject, html }); }
    catch (e) { this.log.error(`Failed to send "${subject}": ${e.message}`); }
  }

  /** Instant alert to the storekeeper (damaged / broken / lost). */
  notifyStorekeeper(subject: string, html: string) {
    return this.send(process.env.STOREKEEPER_EMAIL || '', subject, html);
  }
}
