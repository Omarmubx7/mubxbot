'use strict';

// jest.mock factories may reference variables prefixed with "mock" (case-insensitive)
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockAxiosGet = jest.fn();
const mockSendNotification = jest.fn();

jest.mock('fs/promises', () => ({ readFile: mockReadFile, writeFile: mockWriteFile }));
jest.mock('axios', () => ({ get: mockAxiosGet }));
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../notify', () => ({ sendNotification: mockSendNotification }));

const { loadSnapshot, saveSnapshot, checkForChanges, getFileList } = require('../watcher');

beforeEach(() => {
  mockReadFile.mockReset();
  mockWriteFile.mockReset();
  mockAxiosGet.mockReset();
  mockSendNotification.mockReset();
});

// ── loadSnapshot ───────────────────────────────────────────────────────────────
describe('loadSnapshot', () => {
  test('returns parsed JSON when snapshot file exists', async () => {
    const snapshot = [{ name: 'OH.docx', modified: '2024-01-01T00:00:00Z' }];
    mockReadFile.mockResolvedValue(JSON.stringify(snapshot));

    const result = await loadSnapshot();
    expect(result).toEqual(snapshot);
  });

  test('returns empty array when snapshot file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

    const result = await loadSnapshot();
    expect(result).toEqual([]);
  });
});

// ── saveSnapshot ───────────────────────────────────────────────────────────────
describe('saveSnapshot', () => {
  test('writes pretty-printed JSON to the snapshot file', async () => {
    mockWriteFile.mockResolvedValue();
    const files = [{ name: 'A.docx', modified: '2024-01-01' }];

    await saveSnapshot(files);

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const [, writtenContent] = mockWriteFile.mock.calls[0];
    expect(JSON.parse(writtenContent)).toEqual(files);
  });
});

// ── getFileList ────────────────────────────────────────────────────────────────
describe('getFileList', () => {
  test('maps SharePoint API response to { name, modified } objects', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        d: {
          results: [
            { Name: 'OH_CS.docx', TimeLastModified: '2024-01-01T00:00:00Z' },
            { Name: 'OH_EE.docx', TimeLastModified: '2024-02-01T00:00:00Z' },
          ],
        },
      },
    });

    const files = await getFileList();
    expect(files).toEqual([
      { name: 'OH_CS.docx', modified: '2024-01-01T00:00:00Z' },
      { name: 'OH_EE.docx', modified: '2024-02-01T00:00:00Z' },
    ]);
  });
});

// ── checkForChanges ────────────────────────────────────────────────────────────
describe('checkForChanges', () => {
  const currentFiles = [
    { name: 'OH_CS.docx', modified: '2024-01-01T00:00:00Z' },
    { name: 'OH_EE.docx', modified: '2024-01-01T00:00:00Z' },
  ];

  function mockSharePoint(files) {
    mockAxiosGet.mockResolvedValue({
      data: {
        d: {
          results: files.map(f => ({
            Name: f.name,
            TimeLastModified: f.modified,
          })),
        },
      },
    });
  }

  test('sends no notification when nothing changed', async () => {
    mockSharePoint(currentFiles);
    mockReadFile.mockResolvedValue(JSON.stringify(currentFiles));
    mockWriteFile.mockResolvedValue();

    await checkForChanges();

    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
  });

  test('sends notification and saves snapshot when a new file appears', async () => {
    const newFile = { name: 'OH_NEW.docx', modified: '2024-03-01T00:00:00Z' };
    mockSharePoint([...currentFiles, newFile]);
    mockReadFile.mockResolvedValue(JSON.stringify(currentFiles));
    mockWriteFile.mockResolvedValue();
    mockSendNotification.mockResolvedValue();

    await checkForChanges();

    expect(mockSendNotification).toHaveBeenCalledWith(['OH_NEW.docx'], []);
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
  });

  test('sends notification when an existing file is modified', async () => {
    const updated = currentFiles.map((f, i) =>
      i === 0 ? { ...f, modified: '2025-01-01T00:00:00Z' } : f
    );
    mockSharePoint(updated);
    mockReadFile.mockResolvedValue(JSON.stringify(currentFiles));
    mockWriteFile.mockResolvedValue();
    mockSendNotification.mockResolvedValue();

    await checkForChanges();

    expect(mockSendNotification).toHaveBeenCalledWith([], ['OH_CS.docx']);
  });

  test('sends notification with both new and updated files', async () => {
    const updatedFiles = [
      { name: 'OH_CS.docx', modified: '2025-01-01T00:00:00Z' }, // updated
      { name: 'OH_EE.docx', modified: '2024-01-01T00:00:00Z' }, // unchanged
      { name: 'OH_NEW.docx', modified: '2024-03-01T00:00:00Z' }, // new
    ];
    mockSharePoint(updatedFiles);
    mockReadFile.mockResolvedValue(JSON.stringify(currentFiles));
    mockWriteFile.mockResolvedValue();
    mockSendNotification.mockResolvedValue();

    await checkForChanges();

    expect(mockSendNotification).toHaveBeenCalledWith(['OH_NEW.docx'], ['OH_CS.docx']);
  });

  test('handles SharePoint errors gracefully without throwing', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network failure'));
    mockReadFile.mockResolvedValue(JSON.stringify(currentFiles));

    await expect(checkForChanges()).resolves.toBeUndefined();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  test('treats first run (empty snapshot) as all-new files', async () => {
    mockSharePoint(currentFiles);
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockWriteFile.mockResolvedValue();
    mockSendNotification.mockResolvedValue();

    await checkForChanges();

    expect(mockSendNotification).toHaveBeenCalledWith(
      currentFiles.map(f => f.name),
      []
    );
  });
});
