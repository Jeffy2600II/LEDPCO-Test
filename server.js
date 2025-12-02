// server.js - รัน local ด้วย Express
// ใช้สำหรับทดสอบ local (เช่น ngrok -> LINE webhook ชี้ไปที่ http://<ngrok-id>.ngrok.io/webhook)
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const path = require('path');
const storage = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static index.html at root
app.use(express.static(path.join(__dirname)));

// Need raw body for signature verification
app.use('/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

// Verify LINE signature
function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  return hash === signature;
}

// Simple rule-based text handler
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
  if (/^สถานะ$|^status$/i.test(lower)) {
    return null; // handled separately to fetch live status
  }
  
  // Thai text calc
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
  
  // Symbol calc
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

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'] || '';
    const rawBody = req.body; // Buffer from express.raw
    if (!verifySignature(rawBody, signature)) {
      console.warn('Invalid signature');
      return res.status(401).send('Invalid signature');
    }
    
    const bodyJson = JSON.parse(rawBody.toString('utf8'));
    if (bodyJson && Array.isArray(bodyJson.events)) {
      const nowIso = new Date().toISOString();
      await storage.setLastWebhook(nowIso);
      
      for (const ev of bodyJson.events) {
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
              await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
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
});

// Simple status route (JSON)
app.get('/status', async (req, res) => {
  const status = await storage.getStatus();
  res.json(status);
});

// Default fallback: serve index.html from root static (handled by express.static)
// If not found, return 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Webhook endpoint (local): http://localhost:${PORT}/webhook`);
});