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
  
  // If no events, respond OK quickly
  if (!body?.events?.length) {
    res.status(200).send('OK');
    return;
  }
  
  const nowIso = new Date().toISOString();
  
  // Respond to LINE as soon as possible — schedule background processing afterwards
  res.status(200).send('OK');
  
  // Background processing: update status and send replies.
  // We use an async IIFE but do NOT await it here (fire-and-forget).
  (async () => {
    try {
      await setLastWebhook(nowIso);
      
      // Prepare reply tasks
      const replyTasks = body.events.map(async (ev) => {
        try {
          if (ev.type === 'message' && ev.message?.type === 'text') {
            const userText = ev.message.text;
            const replyToken = ev.replyToken;
            
            // Fast status check overrides handler if status command
            let replyText = handleTextMessage(userText);
            if (/^สถานะ$|^status$/i.test(String(userText).trim())) {
              const statusObj = await getStatus();
              replyText = statusObj.lastWebhookAt ?
                `Webhook ล่าสุด: ${statusObj.lastWebhookAt}` :
                'ยังไม่พบการเชื่อมต่อจาก LINE';
            }
            
            if (replyToken && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
              // Fire-and-forget the reply; still await here so we can catch per-message errors
              await replyMessage(replyToken, [{ type: 'text', text: String(replyText) }]);
            }
          }
        } catch (err) {
          console.error('Error handling event:', err, ev && ev.type ? `event:${ev.type}` : '');
        }
      });
      
      // Wait for scheduled replyTasks to finish in this background worker
      await Promise.all(replyTasks);
    } catch (err) {
      console.error('Background processing failed:', err);
    }
  })();
  
  // Handler returns immediately (we already sent response)
  return;
}