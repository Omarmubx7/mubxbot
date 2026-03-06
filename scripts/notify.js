const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  }
});

async function sendNotification(newFiles, updatedFiles) {
  const fileList = [
    ...newFiles.map(f => `🆕 NEW: ${f}`),
    ...updatedFiles.map(f => `✏️ UPDATED: ${f}`)
  ].join('\n');

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: '🔔 MubxBot: Office Hours Data Changed!',
    text: `
The following files were changed in the Office Hours folder:

${fileList}

👉 Go download them manually and drop into /data/raw:
https://hatuniversity-my.sharepoint.com/personal/hanan_beno_htu_edu_jo/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fhanan%5Fbeno%5Fhtu%5Fedu%5Fjo%2FDocuments%2FDesktop%2FOH24%2D25%2FOffice%20Hours%2024%2D25

After dropping files, run:
npm run parse
    `
  });

  console.log('Notification email sent!');
}

module.exports = { sendNotification };
