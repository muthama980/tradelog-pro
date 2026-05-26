import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface AffiliateApplicationData {
  name: string;
  email: string;
  platform: string;
  channel_url: string;
  audience_size: string | null;
  niche: string | null;
  country: string | null;
  message: string | null;
}

const EMAIL_HEADER = `
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="font-size:24px;font-weight:700;margin:0;">Trade<span style="color:#22C55E;">Log</span> Pro</h1>
    <p style="color:#A1A1AA;font-size:14px;margin-top:4px;">Journal smarter. Trade better.</p>
  </div>`;

const EMAIL_FOOTER = `
  <hr style="border:none;border-top:1px solid #1F1F23;margin:32px 0;">
  <p style="color:#71717A;font-size:12px;text-align:center;">TradeLog Pro · tradelogpro.xyz<br>Journal smarter. Trade better.</p>`;

const EMAIL_WRAP = (inner: string) =>
  `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background-color:#0A0A0B;color:#FAFAFA;padding:40px 24px;">
    ${EMAIL_HEADER}${inner}${EMAIL_FOOTER}
  </div>`;

export async function sendAffiliateApplicationNotification(
  adminEmail: string,
  data: AffiliateApplicationData,
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  try {
    await resend.emails.send({
      from: 'TradeLog Pro <hello@tradelogpro.xyz>',
      to: adminEmail,
      subject: `New Affiliate Application — ${data.name} (${data.platform})`,
      html: EMAIL_WRAP(`
        <h2 style="font-size:20px;font-weight:600;margin-bottom:16px;">New Affiliate Application</h2>
        <div style="background-color:#111113;border:1px solid #1F1F23;border-radius:12px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 10px 0;font-size:14px;"><strong style="color:#A1A1AA;">Name:</strong> <span style="color:#FAFAFA;">${data.name}</span></p>
          <p style="margin:0 0 10px 0;font-size:14px;"><strong style="color:#A1A1AA;">Email:</strong> <span style="color:#FAFAFA;">${data.email}</span></p>
          <p style="margin:0 0 10px 0;font-size:14px;"><strong style="color:#A1A1AA;">Platform:</strong> <span style="color:#FAFAFA;">${data.platform}</span></p>
          <p style="margin:0 0 10px 0;font-size:14px;"><strong style="color:#A1A1AA;">Channel:</strong> <a href="${data.channel_url}" style="color:#00D9FF;">${data.channel_url}</a></p>
          <p style="margin:0 0 10px 0;font-size:14px;"><strong style="color:#A1A1AA;">Audience:</strong> <span style="color:#FAFAFA;">${data.audience_size ?? '—'}</span></p>
          <p style="margin:0 0 10px 0;font-size:14px;"><strong style="color:#A1A1AA;">Niche:</strong> <span style="color:#FAFAFA;">${data.niche ?? '—'}</span></p>
          <p style="margin:0 0 10px 0;font-size:14px;"><strong style="color:#A1A1AA;">Country:</strong> <span style="color:#FAFAFA;">${data.country ?? '—'}</span></p>
          ${data.message ? `<p style="margin:0;font-size:14px;"><strong style="color:#A1A1AA;">Message:</strong> <span style="color:#A1A1AA;">${data.message}</span></p>` : ''}
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="https://tradelogpro.xyz/dashboard/admin/affiliates"
             style="display:inline-block;background-color:#00D9FF;color:#000000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">
            Review Application
          </a>
        </div>
      `),
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send affiliate notification email:', error);
    return { success: false, error };
  }
}

export async function sendAffiliateConfirmation(applicantEmail: string, applicantName: string) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  try {
    await resend.emails.send({
      from: 'TradeLog Pro <hello@tradelogpro.xyz>',
      to: applicantEmail,
      subject: 'We received your affiliate application!',
      html: EMAIL_WRAP(`
        <h2 style="font-size:20px;font-weight:600;margin-bottom:12px;">Application received! 🎉</h2>
        <p style="color:#A1A1AA;font-size:15px;line-height:1.6;">Hi ${applicantName},</p>
        <p style="color:#A1A1AA;font-size:15px;line-height:1.6;">
          Thanks for applying to the TradeLog Pro affiliate program. We're excited to hear about your audience!
        </p>
        <div style="background-color:#111113;border:1px solid #1F1F23;border-radius:12px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 10px 0;font-size:14px;color:#FAFAFA;font-weight:600;">What happens next:</p>
          <p style="margin:0 0 8px 0;font-size:14px;color:#A1A1AA;"><strong style="color:#00D9FF;">1.</strong> We'll review your application within 48 hours</p>
          <p style="margin:0 0 8px 0;font-size:14px;color:#A1A1AA;"><strong style="color:#00D9FF;">2.</strong> You'll receive an email with our decision</p>
          <p style="margin:0;font-size:14px;color:#A1A1AA;"><strong style="color:#00D9FF;">3.</strong> If approved, you'll get your custom referral link and marketing kit</p>
        </div>
        <p style="color:#A1A1AA;font-size:14px;line-height:1.6;">
          Questions? Reply to this email or visit <a href="https://tradelogpro.xyz/contact" style="color:#00D9FF;text-decoration:none;">tradelogpro.xyz/contact</a>.
        </p>
      `),
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send affiliate confirmation email:', error);
    return { success: false, error };
  }
}

export async function sendAffiliateApproval(applicantEmail: string, applicantName: string, referralCode = '') {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const fullLink = referralCode ? `https://tradelogpro.xyz/signup?ref=${referralCode}` : '';
  try {
    await resend.emails.send({
      from: 'TradeLog Pro <hello@tradelogpro.xyz>',
      to: applicantEmail,
      subject: `You're approved! Welcome to the TradeLog Pro Affiliate Program`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0A0B; color: #FAFAFA; padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0;">Trade<span style="color: #22C55E;">Log</span> Pro</h1>
            <p style="color: #A1A1AA; font-size: 14px; margin-top: 4px;">Affiliate Program</p>
          </div>

          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Welcome aboard, ${applicantName}! 🎉</h2>

          <p style="color: #A1A1AA; font-size: 15px; line-height: 1.6;">Your affiliate application has been approved. Here's everything you need to start earning.</p>

          ${fullLink ? `
          <div style="background-color: #111113; border: 1px solid #1F1F23; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #A1A1AA; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Your Referral Link</p>
            <p style="font-size: 16px; font-weight: 600; margin: 0; word-break: break-all;">
              <a href="${fullLink}" style="color: #00D9FF; text-decoration: none;">${fullLink}</a>
            </p>
          </div>
          ` : ''}

          <div style="background-color: #111113; border: 1px solid #1F1F23; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="font-size: 14px; margin: 0 0 12px 0;"><strong style="color: #00D9FF;">Commission:</strong> 36% recurring for 12 months per referral</p>
            <p style="font-size: 14px; margin: 0 0 12px 0;"><strong style="color: #00D9FF;">How it works:</strong> Share your link → they sign up → they subscribe → you earn 36% every month for 12 months</p>
            <p style="font-size: 14px; margin: 0;"><strong style="color: #00D9FF;">Trial:</strong> Your referrals get an 8-day free trial (extended from the standard 4 days)</p>
          </div>

          <h3 style="font-size: 16px; font-weight: 600; margin: 24px 0 12px;">Quick Start:</h3>
          <div style="background-color: #111113; border: 1px solid #1F1F23; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
            <p style="font-size: 14px; margin: 0 0 12px 0;"><strong>1.</strong> Share your link with your audience</p>
            <p style="font-size: 14px; margin: 0 0 12px 0;"><strong>2.</strong> They get 8 days free to try TradeLog Pro</p>
            <p style="font-size: 14px; margin: 0 0 12px 0;"><strong>3.</strong> When they subscribe, you earn 36% monthly for 12 months</p>
            <p style="font-size: 14px; margin: 0;"><strong>4.</strong> Track your earnings in real-time at tradelogpro.xyz/dashboard/referrals</p>
          </div>

          ${fullLink ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${fullLink}" style="display: inline-block; background-color: #00D9FF; color: #000000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 15px;">Start Sharing Your Link</a>
          </div>
          ` : `<p style="color: #A1A1AA; font-size: 14px; line-height: 1.6;">You'll receive your custom referral link shortly.</p>`}

          <p style="color: #A1A1AA; font-size: 14px;">Need marketing assets or have questions? Reply to this email — we're here to help you succeed.</p>

          <hr style="border: none; border-top: 1px solid #1F1F23; margin: 32px 0;">
          <p style="color: #71717A; font-size: 12px; text-align: center;">TradeLog Pro Affiliate Program · tradelogpro.xyz</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send affiliate approval email:', error);
    return { success: false, error };
  }
}

export async function sendNotificationEmail(
  email: string,
  firstName: string,
  title: string,
  message: string,
  link?: string,
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  try {
    const ctaHtml = link
      ? `<div style="text-align:center;margin:28px 0;">
           <a href="https://tradelogpro.xyz${link}"
              style="display:inline-block;background-color:#00D9FF;color:#000000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">
             Open Dashboard
           </a>
         </div>`
      : '';
    await resend.emails.send({
      from: 'TradeLog Pro <hello@tradelogpro.xyz>',
      to: email,
      subject: title,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background-color:#0A0A0B;color:#FAFAFA;padding:40px 24px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:24px;font-weight:700;margin:0;">Trade<span style="color:#22C55E;">Log</span> Pro</h1>
            <p style="color:#A1A1AA;font-size:14px;margin-top:4px;">Journal smarter. Trade better.</p>
          </div>
          <h2 style="font-size:20px;font-weight:600;margin-bottom:12px;">${title}</h2>
          <p style="color:#A1A1AA;font-size:15px;line-height:1.6;">Hi ${firstName},</p>
          <p style="color:#A1A1AA;font-size:15px;line-height:1.6;">${message}</p>
          ${ctaHtml}
          <hr style="border:none;border-top:1px solid #1F1F23;margin:32px 0;">
          <p style="color:#71717A;font-size:12px;text-align:center;">TradeLog Pro · tradelogpro.xyz<br>Journal smarter. Trade better.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return { success: false, error };
  }
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  try {
    await resend.emails.send({
      from: 'TradeLog Pro <hello@tradelogpro.xyz>',
      to: email,
      subject: `Welcome to TradeLog Pro, ${firstName}! Your 4-day trial starts now`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0A0B; color: #FAFAFA; padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0;">Trade<span style="color: #22C55E;">Log</span> Pro</h1>
            <p style="color: #A1A1AA; font-size: 14px; margin-top: 4px;">Journal smarter. Trade better.</p>
          </div>

          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Welcome, ${firstName}! 👋</h2>

          <p style="color: #A1A1AA; font-size: 15px; line-height: 1.6;">Your 4-day free trial is now active. Here's how to get the most out of it:</p>

          <div style="background-color: #111113; border: 1px solid #1F1F23; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px;"><strong style="color: #00D9FF;">1.</strong> Log your first trade in the Journal</p>
            <p style="margin: 0 0 12px 0; font-size: 14px;"><strong style="color: #00D9FF;">2.</strong> Tag your emotions and strategy on each trade</p>
            <p style="margin: 0 0 12px 0; font-size: 14px;"><strong style="color: #00D9FF;">3.</strong> Check Analytics after 5+ trades to see your patterns</p>
            <p style="margin: 0; font-size: 14px;"><strong style="color: #00D9FF;">4.</strong> Connect your exchange for auto-import</p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://tradelogpro.xyz/dashboard" style="display: inline-block; background-color: #00D9FF; color: #000000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 15px;">Open Your Dashboard</a>
          </div>

          <p style="color: #A1A1AA; font-size: 14px; line-height: 1.6;">Your trial gives you full access to all Core features. After 4 days, subscribe from $19/month to keep trading smarter.</p>

          <p style="color: #A1A1AA; font-size: 14px;">Need help? Reply to this email or visit our <a href="https://tradelogpro.xyz/contact" style="color: #00D9FF; text-decoration: none;">contact page</a>.</p>

          <hr style="border: none; border-top: 1px solid #1F1F23; margin: 32px 0;">

          <p style="color: #71717A; font-size: 12px; text-align: center;">TradeLog Pro · tradelogpro.xyz<br>Journal smarter. Trade better.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error };
  }
}
