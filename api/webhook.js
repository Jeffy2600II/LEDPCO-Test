// api/webhook.js - Vercel Serverless function for LINE webhook
const { buffer } = require('micro');
const crypto = require('crypto');

// Use node's global fetch (Vercel supports fetch), but include fallback for older Node
let fetcher = global.fetch;
if (!fetcher) {
  fetcher = require('node-fetch');
}

const storage = require('../storage');

function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  return hash === signature;
}

function handleTextMessage(text) {
  const t = String(text).trim();
  const lower = t.toLowerCase();
  
  if (/^help$|^ช่วย$/.test(lower)) {
    return [
      'รายการคำสั่ง:',
      '- help หรือ ช่วย',
      '- ping -> pong',
      '- สวัสดี -> ทักทาย',
      '- echo <ข้อความ> -> ส่งกลับ',
      '- 2 + 3 หรือ 2 บวก 3 -> คำนวณพื้นฐาน',
      '- status หรือ สถานะ -> เวลาการเชื่อมต่อล่าสุด'
    ].join('\n');
  }
  
  if (/^ping$/.test(lower)) return 'pong';
  if (/สวัสดี|สวัสดีครับ|สวัสดีค่ะ/.test(t)) return 'สวัสดีครับ/ค่ะ! มีอะไรให้ช่วยไหมครับ?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');
  if (/^สถานะ$|^status$/i.test(lower)) return null;
  
  // Thai calc
  const thaiCalc = t.match(/^\s*([-]?\d+(?:\.\d+)?)\s*(บวก|ลบ|คูณ|หาร)\s*([-]?\d+(?:\.\d+)?)\s*$/);
  if (thaiCalc) {
    const a = parseFloat(thaiCalc[1]);
    const op = thaiCalc[2];
    const b = parseFloat(thaiCalc[3]);
    let res;
    if (op === 'บวก') res = a + b;
    if (op === 'ลบ') res = a - b;
    if (op === 'คูณ') res = a * b;
    if (op === 'หาร') res = b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : a / b;
    return String(res);
  }
  
  const symbolCalc = t.match(/^\s*([-]?\d+(?:\.\d+)?)\s*([\+\-\*\/xX])\s*([-]?\d+(?:\.\d+)?)\s*$/);
  if (symbolCalc) {
    const a = parseFloat(symbolCalc[1]);
    const op = symbolCalc[2];
    const b = parseFloat(symbolCalc[3]);
    let res;
    if (op === '+') res = a + b;
    if (op === '-') res = a - b;
    if (op === '*' || op.toLowerCase() === 'x') res = a * b;
    if (op === '/') res = b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : a / b;
    return String(res);
  }
  
  return 'ขอโทษครับ ผมยังไม่เข้าใจคำสั่งนั้น พิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่งที่รองรับ';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }
  
  try {
    const sig = req.headers['x-line-signature'] || '';
    const raw = await buffer(req);
    if (!verifySignature(raw, sig)) {
      console.warn('Invalid signature');
      return res.status(401).send('Invalid signature');
    }
    
    const bodyText = raw.toString('utf8');
    const body = JSON.parse(bodyText);
    
    if (body && Array.isArray(body.events)) {
      const nowIso = new Date().toISOString();
      await storage.setLastWebhook(nowIso);
      
      for (const ev of body.events) {
        if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
          const userText = ev.message.text;
          const replyToken = ev.replyToken;
          
          let replyText = handleTextMessage(userText);
          if (/^สถานะ$|^status$/i.test(String(userText).trim().toLowerCase())) {
            const statusObj = await storage.getStatus();
            replyText = statusObj.lastWebhookAt ? `Last webhook received at: ${statusObj.lastWebhookAt}` : 'ยังไม่พบการเชื่อมต่อจาก LINE';
          }
          
          if (replyToken && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
            try {
              await fetcher('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                  replyToken,
                  messages: [{ type: 'text', text: replyText }]
                })
              });
            } catch (err) {
              console.warn('Failed to reply to LINE:', err && err.message);
            }
          }
        }
      }
    }
    
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err && err.stack ? err.stack : err);
    return res.status(500).send('Server error');
  }
};