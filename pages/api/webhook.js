import { getStatus, setLastWebhook } from '../../lib/storage';
import { verifySignature, replyMessage, handleTextMessage } from '../../lib/line';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }
  
  let raw;
  try {
    raw = await getRawBody(req);
  } catch (err) {
    res.status(400).send('Cannot read request body');
    return;
  }
  
  const signature = req.headers['x-line-signature'] || '';
  if (!verifySignature(raw, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }
  
  if (body?.events?.length) {
    const nowIso = new Date().toISOString();
    await setLastWebhook(nowIso);
    
    // Prepare tasks for all incoming LINE events (batch)
    const replyTasks = body.events.map(async (ev) => {
      if (ev.type === 'message' && ev.message?.type === 'text') {
        const userText = ev.message.text;
        const replyToken = ev.replyToken;
        let replyText = handleTextMessage(userText);
        // Fast status check, cache used
        if (/^สถานะ$|^status$/i.test(String(userText).trim().toLowerCase())) {
          const statusObj = await getStatus();
          replyText = statusObj.lastWebhookAt ?
            `Webhook ล่าสุด: ${statusObj.lastWebhookAt}` :
            'ยังไม่พบการเชื่อมต่อจาก LINE';
        }
        if (replyToken && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
          return replyMessage(replyToken, [{ type: 'text', text: String(replyText) }]);
        }
      }
    });
    // ใช้ Promise.all เพื่อให้ทุก task ส่งตอบ LINE ได้เร็วสุดใน parallel
    await Promise.all(replyTasks);
  }
  // ตอบ HTTP เร็วที่สุด (LINE รอ response นี้เท่านั้น ไม่ต้องรอ reply API)
  res.status(200).send('OK');
}