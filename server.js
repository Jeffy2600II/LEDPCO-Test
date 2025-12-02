// server.js - ใช้สำหรับรัน local ด้วย Express
// สำหรับการทดสอบในเครื่อง (เช่น ngrok -> ให้ LINE webhook ชี้ไปที่ http://<ngrok-id>.ngrok.io/webhook)
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// เพื่อให้สามารถคำนวณ signature ได้อย่างถูกต้อง เราใช้ express.raw สำหรับ path /webhook
app.use('/webhook', express.raw({ type: '*/*' }));
// หน้าอื่นๆ ใช้ body parser ปกติ
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ตัวแปรเก็บสถานะการเชื่อมต่อ (in-memory)
let lastWebhookAt = null;

// ฟังก์ชันช่วย: ตรวจสอบ signature ของ LINE
function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  return hash === signature;
}

// ฟังก์ชันช่วย: ตีความข้อความแบบ rule-based
function handleTextMessage(text) {
  const t = text.trim();
  
  // ชุดคำสั่งพื้นฐาน
  const lower = t.toLowerCase();
  
  // HELP
  if (/^help$|^ช่วย$/.test(lower)) {
    return [
      'คำสั่งที่รองรับแบบเบื้องต้น:',
      '- help หรือ ช่วย -> รายการคำสั่ง',
      "- ping -> pong",
      "- สวัสดี -> ทักทาย",
      "- echo <ข้อความ> -> ส่งข้อความกลับตามที่พิมพ์",
      "- <a> บวก|ลบ|คูณ|หาร <b> หรือ ใช้ + - * / -> คำนวณพื้นฐาน",
      "- สถานะ หรือ status -> เวลา last webhook ที่รับจาก LINE"
    ].join('\n');
  }
  
  if (/^ping$/.test(lower)) {
    return 'pong';
  }
  
  if (/สวัสดี|สวัสดีครับ|สวัสดีค่ะ/.test(t)) {
    return 'สวัสดีครับ/ค่ะ! มีอะไรให้ช่วยไหมครับ?';
  }
  
  if (/^echo\s+/i.test(t)) {
    return t.replace(/^echo\s+/i, '');
  }
  
  if (/^สถานะ$|^status$/i.test(lower)) {
    return lastWebhookAt ? `Last webhook received at: ${lastWebhookAt}` : 'ยังไม่พบการเชื่อมต่อจาก LINE';
  }
  
  // การคำนวณ: รองรับรูปแบบ "2 บวก 3", "5 * 6", "10 / 2"
  // ตรวจจับภาษาไทย
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
  
  // สัญลักษณ์คำนวณ
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
  
  // ค่าเริ่มต้น: ถ้าไม่รู้จักจะส่งข้อความแนะนำ
  return 'ขอโทษครับ ผมยังไม่เข้าใจคำสั่งนั้น พิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่งที่รองรับ';
}

// Webhook endpoint for local testing
app.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'] || '';
    const rawBody = req.body; // express.raw set earlier
    
    if (!verifySignature(rawBody, signature)) {
      console.warn('Invalid signature');
      return res.status(401).send('Invalid signature');
    }
    
    const bodyJson = JSON.parse(rawBody.toString('utf8'));
    if (bodyJson && Array.isArray(bodyJson.events)) {
      // อัพเดตสถานะ last webhook
      lastWebhookAt = new Date().toISOString();
      
      // ประมวลผล events อย่างง่าย: เฉพาะ message text
      for (const ev of bodyJson.events) {
        if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
          const userText = ev.message.text;
          const replyToken = ev.replyToken;
          const replyText = handleTextMessage(userText);
          
          // ส่ง reply กลับไปที่ LINE
          const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          if (token && replyToken) {
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                replyToken,
                messages: [{ type: 'text', text: replyText }]
              })
            });
          }
        }
      }
    }
    
    return res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// หน้าเว็บหลัก (HTML ปกติ ไม่มี JS)
app.get('/', (req, res) => {
  const last = lastWebhookAt ? lastWebhookAt : 'ยังไม่เคยได้รับ webhook จาก LINE';
  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>LINE Bot Status</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 2rem; }
    .card { border: 1px solid #ddd; padding: 1rem; border-radius: 6px; max-width: 800px; }
    h1 { margin-top: 0; }
    pre { background:#f8f8f8; padding:1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>สถานะ LINE Bot</h1>
    <p>Last webhook: <strong>${last}</strong></p>
    <h2>วิธีใช้</h2>
    <p>ตั้งค่า webhook URL ให้ชี้มาที่:</p>
    <pre>(ตัวอย่าง) https://YOUR_DOMAIN_OR_NGROK/api/webhook  หรือ  http://localhost:3000/webhook (สำหรับทดสอบ local)</pre>
    <h3>คำสั่งพื้นฐานที่รองรับ</h3>
    <ul>
      <li>help / ช่วย</li>
      <li>ping -> pong</li>
      <li>สวัสดี -> ทักทาย</li>
      <li>echo &lt;ข้อความ&gt; -> ส่งข้อความกลับ</li>
      <li>2 บวก 3  หรือ  2 + 3 -> คำนวณพื้นฐาน</li>
      <li>สถานะ / status -> เวลาการเชื่อมต่อล่าสุด</li>
    </ul>
    <p>หมายเหตุ: หน่วยความจำสถานะเป็นแบบชั่วคราว (in-memory) บนเครื่องที่รันโปรเซสนี้ ถ้าต้องการเก็บถาวรให้เชื่อมต่อฐานข้อมูล</p>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

// สำหรับ convenience: สร้าง route /status (json)
app.get('/status', (req, res) => {
  res.json({ lastWebhookAt });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Webhook endpoint (local): http://localhost:${PORT}/webhook`);
});