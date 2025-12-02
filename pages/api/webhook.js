import { getStatus, setLastWebhook } from '../../lib/storage';
import { verifySignature, replyMessage, handleTextMessage } from '../../lib/line';

export const config = { api: { bodyParser: false } };

// รับ body แบบ raw ไม่ block
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
  
  try {
    const raw = await getRawBody(req);
    
    const signature = req.headers['x-line-signature'] || '';
    if (!verifySignature(raw, signature)) {
      return res.status(401).send('Invalid signature');
    }
    
    const body = JSON.parse(raw.toString('utf8'));
    if (!body || !Array.isArray(body.events)) return res.status(200).send('OK');
    
    // setLastWebhook ไม่ block I/O ถ้าซ้ำ
    const nowIso = new Date().toISOString();
    setLastWebhook(nowIso);
    
    // ทำ parallel task ทั้งหมด
    await Promise.all(body.events.map(async (ev) => {
      if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
        const userText = ev.message.text;
        const replyToken = ev.replyToken;
        let replyText = handleTextMessage(userText);
        
        // status/สถานะ ดึงสถานะ memory ก่อน หรือ จัดการแบบเร็ว
        if (/^สถานะ$|^status$/i.test(String(userText).trim().toLowerCase())) {
          const statusObj = await getStatus();
          replyText = statusObj.lastWebhookAt ?
            `ระบบได้รับ Webhook ล่าสุดเมื่อ: ${statusObj.lastWebhookAt}` :
            'ยังไม่พบการเชื่อมต่อกับ LINE';
        }
        
        if (replyToken && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
          // ส่ง reply non-blocking
          replyMessage(replyToken, [{ type: 'text', text: String(replyText) }]);
        }
      }
    }));
    return res.status(200).send('OK');
  } catch (err) {
    return res.status(500).send('Server error: ' + (err?.message || 'unknown'));
  }
}