import crypto from 'crypto';

export function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  let isMatch = false;
  try {
    isMatch =
      signature.length === hash.length &&
      crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch { isMatch = false; }
  return isMatch;
}

export async function replyMessage(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
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

// คำนวณ regex/logic แบบ single-pass, deterministic branch
export function handleTextMessage(text) {
  const t = String(text).trim();
  const lower = t.toLowerCase();
  if (/^help$|^ช่วย$/.test(lower))
    return [
      'คำสั่งที่ใช้ได้:',
      '- help/ช่วย: รายการคำสั่ง',
      '- ping: pong',
      '- สวัสดี: ทักทาย',
      '- echo <ข้อความ>: ส่งกลับข้อความเดิม',
      '- 2 + 3 หรือ 2 บวก 3: คำนวณ',
      '- status/สถานะ: ดูเวลาล่าสุด'
    ].join('\n');
  if (/^ping$/.test(lower)) return 'pong';
  if (/สวัสดี/.test(t)) return 'สวัสดีครับ/ค่ะ 👋 มีอะไรให้ช่วยไหม?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');
  if (/^สถานะ$|^status$/.test(lower)) return null;

  let match = t.match(/^([-]?\d+(?:\.\d+)?)\s*(บวก|ลบ|คูณ|หาร|[+\-*/xX])\s*([-]?\d+(?:\.\d+)?)$/);
  if (match) {
    const a = parseFloat(match[1]), op = match[2], b = parseFloat(match[3]);
    switch(op) {
      case 'บวก':
      case '+': return String(a+b);
      case 'ลบ':
      case '-': return String(a-b);
      case 'คูณ':
      case '*':
      case 'x':
      case 'X': return String(a*b);
      case 'หาร':
      case '/': return b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(a/b);
    }
  }
  return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่งที่รองรับ 👍';
}