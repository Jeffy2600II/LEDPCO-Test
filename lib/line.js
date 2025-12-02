// lib/line.js
import crypto from 'crypto';

export function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  return hash === signature;
}

export async function replyMessage(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not set');
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ replyToken, messages })
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn('LINE reply failed:', res.status, text);
  }
  return res;
}

// Rule-based
export function handleTextMessage(text) {
  const t = String(text).trim();
  const lower = t.toLowerCase();
  
  if (/^help$|^ช่วย$/.test(lower)) {
    return [
      'คำสั่งที่ใช้ได้:',
      '- help/ช่วย: รายการคำสั่ง',
      '- ping: pong',
      '- สวัสดี: ทักทาย',
      '- echo <ข้อความ>: ส่งกลับ',
      '- 2 + 3 หรือ 2 บวก 3: คำนวณ',
      '- status/สถานะ: เวลาการเชื่อมต่อล่าสุด'
    ].join('\n');
  }
  if (/^ping$/.test(lower)) return 'pong';
  if (/สวัสดี|สวัสดีครับ|สวัสดีค่ะ/.test(t)) return 'สวัสดีครับ/ค่ะ! มีอะไรให้ช่วยไหมครับ?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');
  if (/^สถานะ$|^status$/.test(lower)) return null;
  
  // ไทย
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
  
  // สัญลักษณ์
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