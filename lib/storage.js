import fs from 'fs/promises';
import path from 'path';

let statusCache = null; // In-memory cache
let cacheWriteTime = null;

function getStatusFilePath() {
  if (process.env.VERCEL) return '/tmp/line_status.json';
  return path.join(process.cwd(), 'data', 'status.json');
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // ignore if already exists, otherwise rethrow
    if (err && err.code !== 'EEXIST') {
      console.warn('ensureDir error:', err);
    }
  }
}

export async function getStatus() {
  // Return cache if recent (<10s)
  if (statusCache && cacheWriteTime && (Date.now() - cacheWriteTime < 10000)) {
    return statusCache;
  }
  try {
    const filePath = getStatusFilePath();
    const content = await fs.readFile(filePath, 'utf8');
    statusCache = JSON.parse(content);
    cacheWriteTime = Date.now();
    return statusCache;
  } catch (err) {
    // If file missing or invalid, return default
    return { lastWebhookAt: null };
  }
}

export async function setLastWebhook(dateIsoString) {
  try {
    const filePath = getStatusFilePath();
    await ensureDir(filePath);
    
    // If equal to cached value, skip write
    if (statusCache && statusCache.lastWebhookAt === dateIsoString) {
      cacheWriteTime = Date.now();
      return true;
    }
    
    const data = { lastWebhookAt: dateIsoString };
    const tmpPath = `${filePath}.tmp`;
    
    // Write atomic: write to tmp then rename
    await fs.writeFile(tmpPath, JSON.stringify(data), 'utf8');
    await fs.rename(tmpPath, filePath);
    
    statusCache = data;
    cacheWriteTime = Date.now();
    return true;
  } catch (err) {
    console.warn('setLastWebhook failed:', err);
    return false;
  }
}