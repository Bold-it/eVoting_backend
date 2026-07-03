import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS?.replace(/\s/g, ''); // Google App Passwords often have spaces, which breaks nodemailer

    if (user && pass) {
      // Real SMTP Mode (e.g., Google Workspace / Gmail)
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`MailService initialized with SMTP user: ${user}`);
    } else {
      // Hackathon Test Mode (Fallback if no credentials)
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      });
      this.logger.warn('MailService initialized in HACKATHON TEST MODE (No SMTP credentials found in .env)');
    }
  }

  async sendTokenEmail(to: string, studentName: string, rawToken: string) {
    const sender = process.env.SMTP_USER || 'no-reply@htu.edu.gh';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const mailOptions = {
      from: `"COMPSSA HTU Electoral Commission" <${sender}>`,
      to,
      subject: 'Your Secure Voting Token',
      text: `Dear ${studentName},\n\nYour secure voting token for the upcoming election is: ${rawToken}\n\nYou can cast your vote at the voting portal here: ${frontendUrl}\n\nPlease do not share this token with anyone.\n\nRegards,\nCOMPSSA HTU Electoral Commission`,
      html: `<p>Dear ${studentName},</p>
             <p>Your secure voting token for the upcoming election is: <strong style="font-size: 1.2em; padding: 4px 8px; background: #f0f0f0; border-radius: 4px;">${rawToken}</strong></p>
             <p>You can cast your vote at the voting portal here: <a href="${frontendUrl}">${frontendUrl}</a></p>
             <p>Please do not share this token with anyone.</p>
             <br>
             <p>Regards,<br><strong>COMPSSA HTU Electoral Commission</strong></p>`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to} (Message ID: ${info.messageId})`);
      
      if (!process.env.SMTP_USER) {
        // HACKATHON MODE: Print the token to the terminal so the admin can test voting
        console.log(`\n======================================================`);
        console.log(`🔔 HACKATHON TEST EMAIL INTERCEPTED`);
        console.log(`To: ${to}`);
        console.log(`Token: ${rawToken}`);
        console.log(`======================================================\n`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }

  async sendAdminTokenEmail(to: string, rawToken: string) {
    const sender = process.env.SMTP_USER || 'no-reply@htu.edu.gh';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const mailOptions = {
      from: `"COMPSSA HTU Electoral Commission" <${sender}>`,
      to,
      subject: 'Electoral Officer Access Token',
      text: `Hello,\n\nYou have been authorized as an Electoral Officer.\nYour secure admin token is: ${rawToken}\n\nYou can log into the Admin Console here: ${frontendUrl}/admin-login\n\nPlease do not share this token.\n\nRegards,\nCOMPSSA HTU Electoral Commission`,
      html: `<p>Hello,</p>
             <p>You have been authorized as an Electoral Officer.</p>
             <p>Your secure admin token is: <strong style="font-size: 1.2em; padding: 4px 8px; background: #f0f0f0; border-radius: 4px; color: #b91c1c;">${rawToken}</strong></p>
             <p>You can log into the Admin Console here: <a href="${frontendUrl}/admin-login">${frontendUrl}/admin-login</a></p>
             <p>Please do not share this token.</p>
             <br>
             <p>Regards,<br><strong>COMPSSA HTU Electoral Commission</strong></p>`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Admin Token Email sent to ${to} (Message ID: ${info.messageId})`);
      
      if (!process.env.SMTP_USER) {
        console.log(`\n======================================================`);
        console.log(`🔔 HACKATHON TEST EMAIL (ADMIN) INTERCEPTED`);
        console.log(`To: ${to}`);
        console.log(`Token: ${rawToken}`);
        console.log(`======================================================\n`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send admin token email to ${to}`, error);
      return false;
    }
  }
}
