/**
 * Email via Nodemailer (Gmail or any SMTP)
 * For production use Mailgun, SendGrid, or Resend — same interface.
 */
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"ZoeAfrica" <${process.env.SMTP_USER}>`;

// ─── Email templates ──────────────────────────────────────────────────────────
const baseHtml = (body) => `
<!DOCTYPE html><html><body style="font-family:DM Sans,Arial,sans-serif;background:#f4f5f6;margin:0;padding:20px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1a7a3c,#0f3d20);padding:28px 32px;text-align:center">
    <span style="font-size:28px;font-weight:900;color:#e63329">Zoe</span><span style="font-size:28px;font-weight:900;color:#f5a623">Africa</span>
  </div>
  <div style="padding:32px">${body}</div>
  <div style="background:#f9fafb;padding:16px 32px;font-size:11px;color:#9ca3af;text-align:center">
    © 2025 ZoeAfrica Ltd · Africa's Marketplace · <a href="${process.env.SERVER_URL}" style="color:#1a7a3c">zoeafrica.com</a>
  </div>
</div></body></html>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#1a7a3c;color:#fff;padding:12px 28px;border-radius:6px;font-weight:700;text-decoration:none;margin:16px 0">${text}</a>`;

// ─── Send helpers ─────────────────────────────────────────────────────────────
async function sendVerificationEmail(user, token) {
  const url = `${process.env.SERVER_URL}/api/auth/verify-email/${token}`;
  await transporter.sendMail({
    from: FROM, to: user.email,
    subject: "✅ Verify your ZoeAfrica email",
    html: baseHtml(`
      <h2 style="color:#111827">Welcome, ${user.name}! 🌍</h2>
      <p style="color:#374151">You're one step away from Africa's biggest marketplace.</p>
      <p>Click the button below to verify your email. The link expires in <strong>24 hours</strong>.</p>
      ${btn("Verify My Email", url)}
      <p style="font-size:12px;color:#6b7280">Or copy this link:<br><a href="${url}">${url}</a></p>
    `),
  });
}

async function sendWelcomeEmail(user) {
  await transporter.sendMail({
    from: FROM, to: user.email,
    subject: "🎉 You're in! Welcome to ZoeAfrica",
    html: baseHtml(`
      <h2 style="color:#111827">You're verified, ${user.name}! 🎊</h2>
      <p style="color:#374151">Your ZoeAfrica account is active. Start shopping or list your first product.</p>
      ${btn("Go to ZoeAfrica", process.env.SERVER_URL)}
    `),
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${process.env.SERVER_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM, to: user.email,
    subject: "🔑 Reset your ZoeAfrica password",
    html: baseHtml(`
      <h2 style="color:#111827">Password Reset Request</h2>
      <p style="color:#374151">Someone requested a password reset for your account. If this wasn't you, ignore this email.</p>
      <p>This link expires in <strong>30 minutes</strong>.</p>
      ${btn("Reset My Password", url)}
    `),
  });
}

async function sendOrderConfirmation(user, order) {
  const itemRows = order.items.map(i =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.title} × ${i.qty}</td>
     <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">${order.currency} ${(i.price * i.qty).toLocaleString()}</td></tr>`
  ).join("");

  await transporter.sendMail({
    from: FROM, to: user.email,
    subject: `📦 Order confirmed — ZA-${order._id}`,
    html: baseHtml(`
      <h2 style="color:#111827">Order Confirmed! 🎉</h2>
      <p style="color:#374151">Hi ${user.name}, your payment was successful.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemRows}
        <tr><td style="padding-top:12px;font-weight:700">Total</td>
            <td style="padding-top:12px;font-weight:700;text-align:right">${order.currency} ${order.totalAmount.toLocaleString()}</td></tr>
      </table>
      <p style="font-size:12px;color:#6b7280">Order ID: ${order._id}<br>Payment: ${order.paymentMethod}</p>
      ${btn("View My Orders", `${process.env.SERVER_URL}/orders`)}
    `),
  });
}

module.exports = { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendOrderConfirmation };
