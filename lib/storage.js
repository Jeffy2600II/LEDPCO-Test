import fs from 'fs/promises';
import path from 'path';

let statusCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10000; // 10 seconds cache

function getStatusFilePath() {
  if (process.env.VERCEL) return '/tmp/line_status.json';
  return path.join(process.cwd(), 'data', 'status.json');
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Silent fail
  }
}

export async function getStatus() {
  const now = Date.now();
  
  // ⚡ ใช้ cache ถ้ายังสดใหม่ (< 10 วินาที)
  if (statusCache && (now - cacheTimestamp < CACHE_TTL)) {
    return statusCache;
  }
  
  try {
    const filePath = getStatusFilePath();
    const content = await fs.readFile(filePath, 'utf8');
    statusCache = JSON.parse(content);
    cacheTimestamp = now;
    return statusCache;
  } catch (err) {
    return { lastWebhookAt: null };
  }
}

export async function setLastWebhook(dateIsoString) {
  try {
    const filePath = getStatusFilePath();
    await ensureDir(filePath);
    
    // ⚡ ข้ามการเขียนหากค่าเดียวกัน
    if (statusCache?.lastWebhookAt === dateIsoString) {
      return true;
    }
    
    const data = { lastWebhookAt: dateIsoString };
    await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
    
    statusCache = data;
    cacheTimestamp = Date.now();
    return true;
  } catch (err) {
    console.warn('setLastWebhook error:', err.message);
    return false;
  }
}