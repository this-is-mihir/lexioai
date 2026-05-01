const { Resend } = require("resend");
const {
  getSMTPIntegrationConfig,
  getGeneralSettings,
} = require("./platformSettings.utils");

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || "re_cbL7ebqD_CcQU8HTSVyKkurhFZcEtDsDF");

// ----------------------------------------------------------------
// GENERATE OTP — 6 digit
// ----------------------------------------------------------------
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ----------------------------------------------------------------
// BASE EMAIL TEMPLATE
// ----------------------------------------------------------------
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lexioai</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #7F77DD; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .body { padding: 40px; }
    .body h2 { color: #1a1a1a; font-size: 20px; margin: 0 0 16px; }
    .body p { color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .otp-box { background: #EEEDFE; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 700; color: #534AB7; letter-spacing: 8px; }
    .otp-expiry { color: #7F77DD; font-size: 13px; margin-top: 8px; }
    .btn { display: inline-block; background: #7F77DD; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 500; margin: 16px 0; }
    .divider { border: none; border-top: 1px solid #f0f0f0; margin: 24px 0; }
    .footer { background: #f9f9f9; padding: 24px 40px; text-align: center; }
    .footer p { color: #999999; font-size: 13px; margin: 0; }
    .warning { background: #FFF3CD; border-left: 4px solid #FFC107; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
    .warning p { color: #856404; font-size: 13px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lexioai</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Lexioai. All rights reserved.</p>
      <p style="margin-top: 8px;">Smart conversations for your website</p>
    </div>
  </div>
</body>
</html>
`;

// ----------------------------------------------------------------
// SEND EMAIL — Base function (Using Resend API)
// ----------------------------------------------------------------
const sendEmail = async ({ to, subject, html }) => {
  try {
    const general = await getGeneralSettings();

    // Resend free tier usually requires "onboarding@resend.dev" 
    // unless you have a custom domain verified.
    // For now, we will use a fallback logic or the domain provided in env.
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = process.env.EMAIL_FROM_NAME || general.siteName || "Lexioai";

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error(`❌ Resend failed to ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`📧 Email sent to ${to} via Resend: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ----------------------------------------------------------------
// 1. WELCOME EMAIL
// ----------------------------------------------------------------
const sendWelcomeEmail = async (user) => {
  const content = `
    <h2>Welcome to Lexioai, ${user.name}! 🎉</h2>
    <p>We're excited to have you on board. Your account is ready to go!</p>
    <p>With Lexioai, you can create AI-powered chatbots for your website in minutes — no coding required.</p>
    <a href="${process.env.CLIENT_URL}/dashboard" class="btn">Go to Dashboard</a>
    <hr class="divider">
    <p style="font-size: 13px; color: #999;">If you have any questions, just reply to this email.</p>
  `;

  return await sendEmail({
    to: user.email,
    subject: "Welcome to Lexioai! 🚀",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 2. OTP VERIFICATION EMAIL
// ----------------------------------------------------------------
const sendOTPEmail = async (user, otp) => {
  try {
    const content = `
    <h2>Verify Your Email</h2>
    <p>Hi ${user.name}, please use the OTP below to verify your email address.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">⏱ Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes</div>
    </div>
    <div class="warning">
      <p>⚠️ Never share this OTP with anyone. Lexioai will never ask for your OTP.</p>
    </div>
    <p style="font-size: 13px; color: #999;">If you didn't create an account, please ignore this email.</p>
  `;

    const result = await sendEmail({
      to: user.email,
      subject: "Your Lexioai Verification Code",
      html: baseTemplate(content),
    });
    return result;
  } catch (err) {
    console.error(`Error sending OTP email to ${user.email}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ----------------------------------------------------------------
// 3. PASSWORD RESET EMAIL
// ----------------------------------------------------------------
const sendPasswordResetEmail = async (user, otp) => {
  try {
    const content = `
    <h2>Reset Your Password</h2>
    <p>Hi ${user.name}, we received a request to reset your password.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">⏱ Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes</div>
    </div>
    <div class="warning">
      <p>⚠️ If you didn't request a password reset, please secure your account immediately.</p>
    </div>
    <p style="font-size: 13px; color: #999;">This OTP will expire in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</p>
  `;

    const result = await sendEmail({
      to: user.email,
      subject: "Reset Your Lexioai Password",
      html: baseTemplate(content),
    });
    return result;
  } catch (err) {
    console.error(`Error sending password reset email to ${user.email}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ----------------------------------------------------------------
// 4. PASSWORD CHANGED EMAIL
// ----------------------------------------------------------------
const sendPasswordChangedEmail = async (user) => {
  const content = `
    <h2>Password Changed Successfully</h2>
    <p>Hi ${user.name}, your password has been changed successfully.</p>
    <p>If you made this change, no action is needed.</p>
    <div class="warning">
      <p>⚠️ If you did NOT change your password, please reset it immediately and contact support.</p>
    </div>
    <a href="${process.env.CLIENT_URL}/login" class="btn">Login Now</a>
  `;

  return await sendEmail({
    to: user.email,
    subject: "Your Lexioai Password Was Changed",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// ADMIN PASSWORD CHANGED BY SUPERADMIN EMAIL
// ----------------------------------------------------------------
const sendAdminPasswordChangedEmail = async (admin, newPassword, superAdminName) => {
  const loginUrl = `${process.env.CLIENT_URL}/login`;
  const content = `
    <h2>Your Admin Password Has Been Changed</h2>
    <p>Hi ${admin.name},</p>
    
    <p>Your account administrator, <strong>${superAdminName}</strong>, has updated your password for security purposes.</p>
    
    <p><strong>Your new login credentials:</strong></p>
    <div style="background: #EEEDFE; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #7F77DD;">
      <p style="margin: 8px 0;"><strong>Email:</strong></p>
      <p style="margin: 4px 0 16px; font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px;">${admin.email}</p>
      
      <p style="margin: 8px 0;"><strong>New Password:</strong></p>
      <p style="margin: 4px 0 16px; font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px; word-break: break-all;">${newPassword}</p>
    </div>

    <a href="${loginUrl}" class="btn">Login to Admin Panel</a>

    <div class="warning">
      <p>⚠️ <strong>Important:</strong></p>
      <ul style="margin: 8px 0; padding-left: 20px; color: #555; font-size: 13px;">
        <li>Save your new password in a secure location</li>
        <li>For your security, consider changing this password after your first login</li>
        <li>Do not share this password with anyone</li>
        <li>If you didn't expect this change, contact your administrator immediately</li>
      </ul>
    </div>

    <hr class="divider">
    <p style="font-size: 13px; color: #999; margin-top: 24px;">If you have any questions, please contact <strong>${superAdminName}</strong>.</p>
  `;

  return await sendEmail({
    to: admin.email,
    subject: "Your Admin Password Has Been Updated — Lexioai",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 5. NEW LOGIN ALERT EMAIL
// ----------------------------------------------------------------
const sendNewLoginEmail = async (user, loginInfo) => {
  const content = `
    <h2>New Login Detected</h2>
    <p>Hi ${user.name}, a new login was detected on your account.</p>
    <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p style="margin: 4px 0;"><strong>IP Address:</strong> ${loginInfo.ip || "Unknown"}</p>
      <p style="margin: 4px 0;"><strong>Device:</strong> ${loginInfo.device || "Unknown"}</p>
    </div>
    <div class="warning">
      <p>⚠️ If this wasn't you, please change your password immediately.</p>
    </div>
    <a href="${process.env.CLIENT_URL}/settings/security" class="btn">Secure My Account</a>
  `;

  return await sendEmail({
    to: user.email,
    subject: "New Login to Your Lexioai Account",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 6. PAYMENT SUCCESS EMAIL
// ----------------------------------------------------------------
const sendPaymentSuccessEmail = async (user, payment) => {
  const content = `
    <h2>Payment Successful! 🎉</h2>
    <p>Hi ${user.name}, your payment was processed successfully.</p>
    <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Plan:</strong> ${payment.plan}</p>
      <p style="margin: 4px 0;"><strong>Amount:</strong> ${payment.currency === "INR" ? "₹" : "$"}${payment.amount}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${payment.transactionId}</p>
    </div>
    <a href="${process.env.CLIENT_URL}/billing" class="btn">View Invoice</a>
  `;

  return await sendEmail({
    to: user.email,
    subject: "Payment Confirmed — Lexioai",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 7. PLAN EXPIRY WARNING EMAIL
// ----------------------------------------------------------------
const sendPlanExpiryEmail = async (user, daysLeft) => {
  const content = `
    <h2>Your Plan Expires in ${daysLeft} Day${daysLeft > 1 ? "s" : ""}</h2>
    <p>Hi ${user.name}, your <strong>${user.plan}</strong> plan is expiring soon.</p>
    <p>Renew now to avoid any interruption to your bots and services.</p>
    <a href="${process.env.CLIENT_URL}/billing" class="btn">Renew Now</a>
    <p style="font-size: 13px; color: #999; margin-top: 16px;">After expiry, your account will be downgraded to the free plan.</p>
  `;

  return await sendEmail({
    to: user.email,
    subject: `⚠️ Your Lexioai Plan Expires in ${daysLeft} Day${daysLeft > 1 ? "s" : ""}`,
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 8. BOT LIMIT WARNING EMAIL
// ----------------------------------------------------------------
const sendBotLimitWarningEmail = async (user, chatsUsed, chatsTotal) => {
  const percentage = Math.round((chatsUsed / chatsTotal) * 100);
  const content = `
    <h2>Chat Limit Warning ⚠️</h2>
    <p>Hi ${user.name}, you've used <strong>${chatsUsed} out of ${chatsTotal}</strong> chats this month (${percentage}%).</p>
    <p>Upgrade your plan or buy extra credits to keep your bots running.</p>
    <a href="${process.env.CLIENT_URL}/billing" class="btn">Upgrade Plan</a>
  `;

  return await sendEmail({
    to: user.email,
    subject: "⚠️ You're Almost at Your Chat Limit — Lexioai",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 9. EMAIL CHANGE OTP
// ----------------------------------------------------------------
const sendEmailChangeOTP = async (email, name, otp, isOldEmail = false) => {
  const content = isOldEmail
    ? `
    <h2>Email Change Request</h2>
    <p>Hi ${name}, someone requested to change the email on your account.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">⏱ Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes</div>
    </div>
    <div class="warning">
      <p>⚠️ If you didn't request this, please secure your account immediately.</p>
    </div>
  `
    : `
    <h2>Verify Your New Email</h2>
    <p>Hi ${name}, please verify your new email address.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">⏱ Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes</div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: isOldEmail
      ? "Email Change Requested — Lexioai"
      : "Verify Your New Email — Lexioai",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 11. ADMIN CREDENTIALS EMAIL
// ----------------------------------------------------------------
const sendAdminCredentialsEmail = async (adminEmail, adminName, temporaryPassword) => {
  const loginUrl = `${process.env.CLIENT_URL}/login`;
  const content = `
    <h2>Welcome to Lexioai Admin Panel! 🔑</h2>
    <p>Hi ${adminName}, you've been granted admin access to Lexioai.</p>
    
    <p><strong>Here are your login credentials:</strong></p>
    <div style="background: #EEEDFE; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #7F77DD;">
      <p style="margin: 8px 0;"><strong>Email:</strong></p>
      <p style="margin: 4px 0 16px; font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px;">${adminEmail}</p>
      
      <p style="margin: 8px 0;"><strong>Temporary Password:</strong></p>
      <p style="margin: 4px 0; font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px; word-break: break-all;">${temporaryPassword}</p>
    </div>

    <div class="warning">
      <p>⚠️ <strong>Important:</strong> Please change your password immediately after first login for security purposes.</p>
    </div>

    <a href="${loginUrl}" class="btn">Login to Admin Panel</a>

    <hr class="divider">
    <h3 style="margin-top: 24px; font-size: 14px; color: #555;">What's Next?</h3>
    <ul style="color: #555; font-size: 14px; line-height: 1.8;">
      <li>Create and manage multiple AI bots</li>
      <li>Monitor user activities and analytics</li>
      <li>Manage payment subscriptions and plans</li>
      <li>Track support tickets and conversations</li>
      <li>Configure platform-wide settings</li>
    </ul>

    <p style="font-size: 13px; color: #999; margin-top: 24px;">If you didn't request admin access or have any questions, please contact the administrator immediately.</p>
  `;

  return await sendEmail({
    to: adminEmail,
    subject: "Your Admin Access Credentials — Lexioai",
    html: baseTemplate(content),
  });
};

// ----------------------------------------------------------------
// 12. FORCED PASSWORD RESET EMAIL (FOR ADMIN)
// ----------------------------------------------------------------
const sendForcedPasswordResetEmail = async (admin, superAdminName) => {
  const profileUrl = `${process.env.CLIENT_URL}/profile`;
  const content = `
    <h2>Security Alert: Password Reset Required</h2>
    <p>Hi ${admin.name},</p>
    
    <p>Your account administrator, <strong>${superAdminName}</strong>, has requested that you reset your password for security reasons.</p>
    
    <p><strong>To reset your password, please follow these steps:</strong></p>
    <ol style="color: #555; font-size: 14px; line-height: 1.8;">
      <li>Log in to your admin panel</li>
      <li>Go to your <strong>Profile</strong> page</li>
      <li>Click on <strong>"Reset Password"</strong> or <strong>"Change Password"</strong></li>
      <li>You will receive a verification code on your email</li>
      <li>Enter the code and create a new strong password</li>
      <li>Confirm your new password</li>
    </ol>

    <a href="${profileUrl}" class="btn" style="margin-top: 24px;">Go to Profile</a>

    <hr class="divider">
    <div class="warning">
      <p>⚠️ <strong>Security Information:</strong></p>
      <ul style="margin: 8px 0; padding-left: 20px; color: #555; font-size: 13px;">
        <li>This is a mandatory security requirement</li>
        <li>Your old password will no longer work after this reset</li>
        <li>Make sure to create a strong, unique password</li>
        <li>If you have any questions, contact your administrator immediately</li>
      </ul>
    </div>

    <p style="font-size: 13px; color: #999; margin-top: 24px;">For assistance, please reach out to <strong>${superAdminName}</strong> or your IT support team.</p>
  `;

  return await sendEmail({
    to: admin.email,
    subject: "Action Required: Reset Your Admin Password — Lexioai",
    html: baseTemplate(content),
  });
};

module.exports = {
  generateOTP,
  sendEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAdminPasswordChangedEmail,
  sendNewLoginEmail,
  sendPaymentSuccessEmail,
  sendPlanExpiryEmail,
  sendBotLimitWarningEmail,
  sendEmailChangeOTP,
  sendAdminCredentialsEmail,
  sendForcedPasswordResetEmail,
};