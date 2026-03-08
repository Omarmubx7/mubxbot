'use strict';

// jest.mock factories may reference variables prefixed with "mock" (case-insensitive)
const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const { sendNotification } = require('../notify');

beforeEach(() => {
  mockSendMail.mockReset();
});

describe('notify – sendNotification', () => {
  test('sends email with new files listed', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });

    await sendNotification(['file1.docx', 'file2.docx'], []);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.subject).toBe('🔔 MubxBot: Office Hours Data Changed!');
    expect(mailOptions.text).toContain('🆕 NEW: file1.docx');
    expect(mailOptions.text).toContain('🆕 NEW: file2.docx');
    expect(mailOptions.text).not.toContain('✏️ UPDATED');
  });

  test('sends email with updated files listed', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });

    await sendNotification([], ['old_schedule.docx']);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.text).toContain('✏️ UPDATED: old_schedule.docx');
    expect(mailOptions.text).not.toContain('🆕 NEW');
  });

  test('sends email listing both new and updated files', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });

    await sendNotification(['new.docx'], ['changed.docx']);

    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.text).toContain('🆕 NEW: new.docx');
    expect(mailOptions.text).toContain('✏️ UPDATED: changed.docx');
  });

  test('email body contains the SharePoint download link and parse instruction', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });

    await sendNotification(['any.docx'], []);

    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.text).toContain('hatuniversity-my.sharepoint.com');
    expect(mailOptions.text).toContain('npm run parse');
  });

  test('propagates errors thrown by sendMail', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

    await expect(sendNotification(['f.docx'], [])).rejects.toThrow(
      'SMTP connection refused'
    );
  });
});
