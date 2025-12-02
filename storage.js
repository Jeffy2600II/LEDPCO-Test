// storage.js
// โมดูลช่วยอ่าน/เขียนสถานะ (lastWebhookAt) ไปยังไฟล์ JSON
// เลือก path อัตโนมัติ: ถ้าเป็น Vercel (process.env.VERCEL) จะใช้ /tmp/status.json
// ถ้าไม่ใช่จะใช้ ./data/status.json

const fs = require('fs').promises;
const path = require('path');

function getStatusFilePath() {
  if (process.env.VERCEL) {
    return '/tmp/status.json';
  }
  // local development: เก็บในโฟลเดอร์ data/
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'status.json');
  return filePath;
}

async function ensureDataDirExists() {
  const filePath = getStatusFilePath();
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

async function getStatus() {
  try {
    const filePath = getStatusFilePath();
    const content = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(content);
    return json;
  } catch (err) {
    return { lastWebhookAt: null };
  }
}

async function setLastWebhook(dateIsoString) {
  try {
    await ensureDataDirExists();
    const filePath = getStatusFilePath();
    const data = { lastWebhookAt: dateIsoString };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('Failed to write status file:', err && err.message);
    return false;
  }
}

module.exports = {
  getStatus,
  setLastWebhook
};