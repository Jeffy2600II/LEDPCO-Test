import crypto from 'crypto';

export function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  // timingSafeEqual ช่วยให้เร็วขึ้นและปลอดภัยขึ้นสำหรับ compare
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
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not set');
  // fetch ultra-fast mode, ตัด await ถ้าไม่จำเป็น
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

// Rule-based — ลด branch ให้น้อยลง, regex และ logic เร็วขึ้น
export function handleTextMessage(text) {
  const t = String(text).trim();
  const lower = t.toLowerCase();

  if (/^help$|^ช่วย$/.test(lower)) {
    return [
      'คำสั่งที่ใช้ได้:',
      '- help/ช่วย: ดูคำสั่ง',
      '- ping: ระบบตอบ pong',
      '- สวัสดี: ทักทาย',
      '- echo <ข้อความ>: ส่งกลับเดิม',
      '- 2 + 3 หรือ 2 บวก 3: คำนวณได้',
      '- status/สถานะ: เช็คเวลาล่าสุด'
    ].join('\n');
  }
  if (/^ping$/.test(lower)) return 'pong';
  if (/สวัสดี/.test(t)) return 'สวัสดีครับ/ค่ะ 👋 มีอะไรให้ช่วยไหม?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');
  if (/^สถานะ$|^status$/.test(lower)) return null;
  // Calculation (ไทย/สัญลักษณ์) — แยก logic เร็วขึ้น
  const calThai = /([-]?\d+(?:\.\d+)?)\s*(บวก|ลบ|คูณ|หาร)\s*([-]?\d+(?:\.\d+)?)/.exec(t);
  if (calThai) {
    const a = parseFloat(calThai[1]), op = calThai[2], b = parseFloat(calThai[3]);
    if (op === 'บวก') return String(a + b);
    if (op === 'ลบ') return String(a - b);
    if (op === 'คูณ') return String(a * b);
    if (op === 'หาร') return b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(a / b);
  }
  const cal = /([-]?\d+(?:\.\d+)?)\s*([\+\-\*\/xX])\s*([-]?\d+(?:\.\d+)?)/.exec(t);
  if (cal) {
    const a = parseFloat(cal[1]), op = cal[2], b = parseFloat(cal[3]);
    if (op === '+') return String(a + b);
    if (op === '-') return String(a - b);
    if (op === '*' || op.toLowerCase() === 'x') return String(a * b);
    if (op === '/') return b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(a / b);
  }
  return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่งที่รองรับ 👍';
}