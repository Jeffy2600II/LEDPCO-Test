import fs from 'fs/promises';
import path from 'path';

let statusCache = null;
let cacheWriteTime = null;
function getStatusFilePath() {
  if (process.env.VERCEL) return '/tmp/line_status.json';
  return path.join(process.cwd(), 'data', 'status.json');
}
async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}
export async function getStatus() {
  if (statusCache && cacheWriteTime && Date.now()-cacheWriteTime < 10000) return statusCache;
  try {
    const filePath = getStatusFilePath();
    statusCache = JSON.parse(await fs.readFile(filePath, 'utf8'));
    cacheWriteTime = Date.now();
    return statusCache;
  } catch { return { lastWebhookAt: null }; }
}
export async function setLastWebhook(dateIsoString) {
  try {
    const filePath = getStatusFilePath();
    await ensureDir(filePath);
    if (statusCache && statusCache.lastWebhookAt === dateIsoString) return true;
    await fs.writeFile(filePath, JSON.stringify({ lastWebhookAt: dateIsoString }), 'utf8');
    statusCache = { lastWebhookAt: dateIsoString };
    cacheWriteTime = Date.now();
    return true;
  } catch { return false; }
}