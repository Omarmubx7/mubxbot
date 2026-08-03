import nodemailer from 'nodemailer';
import { signSubmissionActionToken } from './adminAuth.js';

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

function formatDataSubmissionEmail(record) {
  const officeHours = formatOfficeHours(record);

  return [
    'A student/helper submitted new instructor office-hours data. Review it in the admin dashboard at /admin/missing-names and approve it to publish.',
    '',
    `Name: ${record.name || '-'}`,
    `Department: ${record.department || '-'}`,
    `Email: ${record.email || '-'}`,
    `Office: ${record.office || '-'}`,
    `Office hours:\n${officeHours || '-'}`,
    `Linked missing name: ${record.missing_name_link || '-'}`,
    `Submitted at: ${record.created_at || new Date().toISOString()}`
  ].join('\n');
}

function formatOfficeHours(record) {
  if (record.office_hours && typeof record.office_hours === 'object') {
    return Object.entries(record.office_hours)
      .map(([day, value]) => value ? `${day}: ${value}` : null)
      .filter(Boolean)
      .join('\n');
  }
  return (record.officeHoursText || '-');
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSubmissionActionUrls(record, baseUrl = '') {
  const id = String(record?.id || record?.submission_id || '').trim();
  if (!id || !baseUrl) return null;

  const approveToken = signSubmissionActionToken({ id, action: 'approve' });
  const rejectToken = signSubmissionActionToken({ id, action: 'reject' });
  if (!approveToken || !rejectToken) return null;

  return {
    approveUrl: `${baseUrl}/api/admin/submissions/action?token=${encodeURIComponent(approveToken)}`,
    rejectUrl: `${baseUrl}/api/admin/submissions/action?token=${encodeURIComponent(rejectToken)}`,
    reviewUrl: `${baseUrl}/admin/missing-names`
  };
}

function formatDataSubmissionHtml(record, urls) {
  const officeHours = Object.entries(record.office_hours || {})
    .filter(([, v]) => v)
    .map(([day, value]) => `<li style="padding:4px 0;color:#111827;font-size:14px;"><strong>${escapeHtml(day)}:</strong> ${escapeHtml(value)}</li>`)
    .join('');

  const reviewLink = urls?.reviewUrl
    ? `<div style="margin-top:24px;text-align:center;"><a href="${urls.reviewUrl}" style="color:#4b5563;font-size:13px;text-decoration:underline;">Review on site</a></div>`
    : '';

  return `
<div style="max-width:560px;margin:0 auto;padding:24px;background:#f8f8f8;">
  <div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
    <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;color:#DC2626;text-transform:uppercase;">MUBXBot · Data review</div>
    <div style="font-size:22px;font-weight:800;color:#111827;margin:8px 0 4px;">New office-hours data</div>
    <div style="font-size:14px;color:#6b7280;margin-bottom:20px;">A student submitted data for review — approve to publish it to the bot.</div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
      <tr><td style="padding:6px 0;color:#6b7280;width:120px;vertical-align:top;">Name</td><td style="padding:6px 0;font-weight:700;color:#111827;">${escapeHtml(record.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Department</td><td style="padding:6px 0;color:#111827;">${escapeHtml(record.department || '-')}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Email</td><td style="padding:6px 0;color:#111827;">${escapeHtml(record.email || '-')}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Office</td><td style="padding:6px 0;color:#111827;">${escapeHtml(record.office || '-')}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Office hours</td><td style="padding:6px 0;color:#111827;"><ul style="margin:0;padding-left:18px;list-style:disc;">${officeHours || '<li>-</li>'}</ul></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Linked missing</td><td style="padding:6px 0;color:#111827;">${escapeHtml(record.missing_name_link || '-')}</td></tr>
    </table>

    ${urls ? `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f3f4f6;">
      <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">Approve to write this data into the directory, or reject it.</div>
      <div style="margin-bottom:10px;">
        <a href="${urls.approveUrl}" style="display:block;width:100%;box-sizing:border-box;background:#16a34a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:13px 0;text-align:center;">✓ Approve</a>
      </div>
      <div style="margin-bottom:10px;">
        <a href="${urls.rejectUrl}" style="display:block;width:100%;box-sizing:border-box;background:#ffffff;color:#DC2626;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:13px 0;text-align:center;border:1px solid #DC2626;">✕ Reject</a>
      </div>
      ${reviewLink}
    </div>
    ` : ''}
  </div>
</div>`;
}

export async function notifyDataSubmission(record, options = {}) {
  const urls = buildSubmissionActionUrls(record, options.baseUrl);

  await sendNotificationEmail({
    subject: `New office-hours data submitted: ${record.name || 'Unknown instructor'}`,
    text: formatDataSubmissionEmail(record),
    html: formatDataSubmissionHtml(record, urls)
  });
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
