// services/mailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const BRAND_NAME = process.env.MAIL_FROM_NAME || "Quora Tutorial System";
const BRAND_COLOR = "#07278f";

const isSmtpConfigured = () => Boolean(process.env.SMTP_HOST);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587/STARTTLS
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Sends an email, or logs it to the console when SMTP isn't configured
 * (so local dev works without real credentials). Never throws.
 * Returns true if the email was sent (or logged), false on SMTP failure.
 */
const sendMail = async ({ to, subject, html, text }) => {
  if (!isSmtpConfigured()) {
    console.log(
      [
        "",
        "================ [mailService] SMTP not configured - email logged instead ================",
        `To:      ${to}`,
        `Subject: ${subject}`,
        "",
        text,
        "==========================================================================================",
        "",
      ].join("\n")
    );
    return true;
  }

  try {
    const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
    await getTransporter().sendMail({
      from: `"${BRAND_NAME}" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("sendMail error:", error);
    return false;
  }
};

// Simple branded layout shared by all transactional emails.
const renderLayout = ({ heading, intro, buttonLabel, link, footnote }) => `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND_COLOR};padding:20px 32px;color:#ffffff;font-size:20px;font-weight:bold;">
                ${escapeHtml(BRAND_NAME)}
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND_COLOR};">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${intro}</p>
                <p style="margin:0 0 24px;">
                  <a href="${escapeHtml(link)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;">${escapeHtml(buttonLabel)}</a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#555;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${escapeHtml(link)}" style="color:${BRAND_COLOR};">${escapeHtml(link)}</a></p>
                <p style="margin:0;font-size:13px;color:#777;">${footnote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const sendVerificationEmail = async ({ to, firstName, link }) => {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const subject = `Verify your email address - ${BRAND_NAME}`;

  const html = renderLayout({
    heading: "Verify your email address",
    intro: `${escapeHtml(greeting)}<br /><br />Thanks for creating an account. Please confirm your email address to activate your account.`,
    buttonLabel: "Verify email",
    link,
    footnote: "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.",
  });

  const text = [
    greeting,
    "",
    `Thanks for creating an account with ${BRAND_NAME}. Please confirm your email address by opening this link:`,
    "",
    link,
    "",
    "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.",
  ].join("\n");

  return sendMail({ to, subject, html, text });
};

export const sendPasswordResetEmail = async ({ to, firstName, link }) => {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const subject = `Reset your password - ${BRAND_NAME}`;

  const html = renderLayout({
    heading: "Reset your password",
    intro: `${escapeHtml(greeting)}<br /><br />We received a request to reset the password for your account. Click the button below to choose a new one.`,
    buttonLabel: "Reset password",
    link,
    footnote: "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will not change.",
  });

  const text = [
    greeting,
    "",
    `We received a request to reset the password for your ${BRAND_NAME} account. Open this link to choose a new one:`,
    "",
    link,
    "",
    "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will not change.",
  ].join("\n");

  return sendMail({ to, subject, html, text });
};
