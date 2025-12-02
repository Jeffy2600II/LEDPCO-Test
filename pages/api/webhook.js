import { setLastWebhook, getStatus } from '../../lib/storage';
import { verifySignature, replyMessage, handleTextMessage } from '../../lib/line';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ตอบ HTTP เร็วที่สุด (immediate), แล้ว background process LINE reply
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }
  
  let raw;
  try {
    raw = await getRawBody(req);
  } catch {
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
  
  // ตอบ HTTP กลับไปหา LINE 'OK' **ทันที** แบบไม่รอการคำนวณ/การ Reply 
  res.status(200).send('OK');
  
  // ส่วน reply คำนวณ และ call LINE API ทำใน background (ไม่บล็อก HTTP response)
  if (body?.events?.length) {
    const nowIso = new Date().toISOString();
    await setLastWebhook(nowIso);
    
    Promise.all(body.events.map(async (ev) => {
      if (ev.type === 'message' && ev.message?.type === 'text') {
        const userText = ev.message.text;
        const replyToken = ev.replyToken;
        let replyText = handleTextMessage(userText);
        if (/^สถานะ$|^status$/i.test(String(userText).trim().toLowerCase())) {
          const statusObj = await getStatus();
          replyText = statusObj.lastWebhookAt ?
            `Webhook ล่าสุด: ${statusObj.lastWebhookAt}` :
            'ยังไม่พบการเชื่อมต่อจาก LINE';
        }
        if (replyToken && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
          replyMessage(replyToken, [{ type: 'text', text: String(replyText) }]);
        }
      }
    }));
  }
}