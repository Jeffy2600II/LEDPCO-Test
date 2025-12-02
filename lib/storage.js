// lib/storage.js
import fs from 'fs/promises';
import path from 'path';

function getStatusFilePath() {
  // Use /tmp for Vercel, ./data local
  if (process.env.VERCEL) {
    return '/tmp/line_status.json';
  }
  return path.join(process.cwd(), 'data', 'status.json');
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {}
}

export async function getStatus() {
  try {
    const filePath = getStatusFilePath();
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return { lastWebhookAt: null };
  }
}

export async function setLastWebhook(dateIsoString) {
  try {
    const filePath = getStatusFilePath();
    await ensureDir(filePath);
    await fs.writeFile(filePath, JSON.stringify({ lastWebhookAt: dateIsoString }), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}