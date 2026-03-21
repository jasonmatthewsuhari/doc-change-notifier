import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function sendConfirmationEmail(email: string, token: string) {
  const confirmUrl = `${BASE_URL}/api/confirm?token=${token}`;
  await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? 'notify@yourdomain.com',
    to: email,
    subject: 'Confirm your subscription',
    html: `
      <p>Hey,</p>
      <p>Click below to confirm you want to be notified when the doc changes.</p>
      <p><a href="${confirmUrl}">Confirm subscription →</a></p>
      <p style="color:#888;font-size:12px">If you didn't request this, just ignore this email.</p>
    `,
  });
}

export async function sendUpdateEmail(emails: string[], docUrl: string, unsubscribeTokens: Record<string, string>) {
  if (emails.length === 0) return;

  await Promise.all(
    emails.map((email) => {
      const unsubUrl = `${BASE_URL}/api/unsubscribe?token=${unsubscribeTokens[email]}`;
      return getResend().emails.send({
        from: process.env.FROM_EMAIL ?? 'notify@yourdomain.com',
        to: email,
        subject: '📄 The doc just changed',
        html: `
          <p>Hey,</p>
          <p>The Google Doc you're watching just changed.</p>
          <p><a href="${docUrl}">View the updated doc →</a></p>
          <hr />
          <p style="color:#888;font-size:12px">
            <a href="${unsubUrl}">Unsubscribe</a>
          </p>
        `,
      });
    })
  );
}
