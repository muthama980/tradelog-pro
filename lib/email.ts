import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
