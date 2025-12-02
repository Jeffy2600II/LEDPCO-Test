// api/webhook.js - Vercel Serverless function for LINE webhook
// ใช้กับ Vercel: ให้ตั้ง Environment Variables LINE_CHANNEL_SECRET และ LINE_CHANNEL_ACCESS_TOKEN
const { buffer } = require('micro'); // ใช้เพื่ออ่าน raw body สำหรับตรวจ signature
const crypto = require('crypto');

let lastWebhookAt = null; // เก็บสถานะในหน่วยความจำ (ไม่ถาวร ใน serverless อาจหายได้)

// ตรวจสอบ signature ด้วย HMAC SHA256
function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  return hash === signature;
}

function handleTextMessage(text) {
  const t = text.trim();
  const lower = t.toLowerCase();
  
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
  
  if (/^ping$/.test(lower)) return 'pong';
  if (/สวัสดี|สวัสดีครับ|สวัสดีค่ะ/.test(t)) return 'สวัสดีครับ/ค่ะ! มีอะไรให้ช่วยไหมครับ?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');
  if (/^สถานะ$|^status$/i.test(lower)) {
    return lastWebhookAt ? `Last webhook received at: ${lastWebhookAt}` : 'ยังไม่พบการเชื่อมต่อจาก LINE';
  }
  
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
    const raw = await buffer(req); // Buffer
    if (!verifySignature(raw, sig)) {
      console.warn('Invalid signature');
      return res.status(401).send('Invalid signature');
    }
    
    const bodyText = raw.toString('utf8');
    const body = JSON.parse(bodyText);
    
    // อัพเดตสถานะ last webhook
    lastWebhookAt = new Date().toISOString();
    
    // ประมวลผล events
    if (body && Array.isArray(body.events)) {
      for (const ev of body.events) {
        if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
          const replyToken = ev.replyToken;
          const userText = ev.message.text;
          const replyText = handleTextMessage(userText);
          
          const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          if (token && replyToken) {
            // ส่ง reply
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
    console.error('Webhook error:', err);
    return res.status(500).send('Server error');
  }
};