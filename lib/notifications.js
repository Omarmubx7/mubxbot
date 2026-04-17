import nodemailer from 'nodemailer';

const ALERT_EMAIL = process.env.NOTIFY_EMAIL || 'omarmubaidincs@gmail.com';
const MAIL_USER = process.env.GMAIL_USER || '';
const MAIL_PASS = process.env.GMAIL_APP_PASSWORD || '';

let transport = null;

function getTransport() {
  if (transport) return transport;

  if (!MAIL_USER || !MAIL_PASS) {
    throw new Error('Missing Gmail notification credentials');
  }

  transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS
    }
  });

  return transport;
}

async function sendNotificationEmail({ subject, text, html }) {
  return getTransport().sendMail({
    from: MAIL_USER,
    to: ALERT_EMAIL,
    subject,
    text,
    html
  });
}

function formatFeedbackEmail(record) {
  return [
    'A new feedback submission was received.',
    '',
    `Category: ${record.category || 'general'}`,
    `Message: ${record.message || '-'}`,
    `Missing name: ${record.missing_name || '-'}`,
    `User query: ${record.user_query || '-'}`,
    `Request label: ${record.request_label || '-'}`,
    `Conversation ID: ${record.conversation_id || '-'}`,
    `User ID: ${record.user_id || '-'}`,
    `Source path: ${record.source_path || '-'}`,
    `Created at: ${record.created_at || new Date().toISOString()}`
  ].join('\n');
}

function formatErrorEmail(payload) {
  return [
    'A chat error or no-result event was detected.',
    '',
    `Type: ${payload.type || 'error'}`,
    `Word/query: ${payload.query || '-'}`,
    `Normalized query: ${payload.normalizedQuery || '-'}`,
    `Reason: ${payload.reason || '-'}`,
    `Conversation ID: ${payload.conversationId || '-'}`,
    `User ID: ${payload.userId || '-'}`,
    `Source path: ${payload.sourcePath || '-'}`,
    `Created at: ${payload.createdAt || new Date().toISOString()}`
  ].join('\n');
}

export async function notifyFeedbackSubmission(record) {
  await sendNotificationEmail({
    subject: 'MubxBot feedback submitted',
    text: formatFeedbackEmail(record)
  });
}

export async function notifyChatIssue(payload) {
  await sendNotificationEmail({
    subject: `MubxBot chat issue: ${payload.type || 'error'}`,
    text: formatErrorEmail(payload)
  });
}
