const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const cron = require('node-cron');
const { sendNotification } = require('./notify');
require('dotenv').config();

const SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'snapshot.json');

const FOLDER_API_URL = `https://hatuniversity-my.sharepoint.com/personal/hanan_beno_htu_edu_jo/_api/web/GetFolderByServerRelativeUrl('/personal/hanan_beno_htu_edu_jo/Documents/Desktop/OH24-25/Office Hours 24-25')/Files`;

async function getFileList() {
  const res = await axios.get(FOLDER_API_URL, {
    headers: {
     'Cookie': `FedAuth=${process.env.SHAREPOINT_FEDAUTH}; rtFa=${process.env.SHAREPOINT_RTFA}`,

      'Accept': 'application/json;odata=verbose'
    }
  });

  return res.data.d.results.map(f => ({
    name: f.Name,
    modified: f.TimeLastModified
  }));
}

async function loadSnapshot() {
  try {
    const data = await fs.readFile(SNAPSHOT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSnapshot(files) {
  await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(files, null, 2));
}

async function checkForChanges() {
  console.log(`[${new Date().toISOString()}] Checking for changes...`);

  try {
    const currentFiles = await getFileList();
    const snapshot = await loadSnapshot();

    const snapshotMap = Object.fromEntries(snapshot.map(f => [f.name, f.modified]));

    const newFiles = currentFiles
      .filter(f => !snapshotMap[f.name])
      .map(f => f.name);

    const updatedFiles = currentFiles
      .filter(f => snapshotMap[f.name] && snapshotMap[f.name] !== f.modified)
      .map(f => f.name);

    if (newFiles.length > 0 || updatedFiles.length > 0) {
      console.log('Changes detected! Sending notification...');
      await sendNotification(newFiles, updatedFiles);
      await saveSnapshot(currentFiles);
    } else {
      console.log('No changes detected.');
      await saveSnapshot(currentFiles);
    }
  } catch (err) {
    console.error('Watcher error:', err.message);
  }
}

// Run every 6 hours
cron.schedule('0 */6 * * *', checkForChanges);

// Run once immediately on start
checkForChanges();
