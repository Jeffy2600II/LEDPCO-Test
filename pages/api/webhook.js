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
  
  try {
    const raw = await getRawBody(req);
    const signature = req.headers['x-line-signature'] || '';
    if (!verifySignature(raw, signature)) {
      return res.status(401).send('Invalid signature');
    }
    
    const bodyText = raw.toString('utf8');
    const body = JSON.parse(bodyText);
    
    if (body && Array.isArray(body.events)) {
      const nowIso = new Date().toISOString();
      await setLastWebhook(nowIso);
      
      for (const ev of body.events) {
        if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
          const userText = ev.message.text;
          const replyToken = ev.replyToken;
          let replyText = handleTextMessage(userText);
          if (/^สถานะ$|^status$/i.test(String(userText).trim().toLowerCase())) {
            const statusObj = await getStatus();
            replyText = statusObj.lastWebhookAt ? `Last webhook received at: ${statusObj.lastWebhookAt}` : 'ยังไม่พบการเชื่อมต่อจาก LINE';
          }
          if (replyToken && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
            await replyMessage(replyToken, [{ type: 'text', text: String(replyText) }]);
          }
        }
      }
    }
    return res.status(200).send('OK');
  } catch (err) {
    return res.status(500).send('Server error');
  }
}