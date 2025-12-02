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
  if (!token) return;
  // ไม่ต้อง await ถ้าไม่จำเป็น
  fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ replyToken, messages })
  }).then(async res => {
    if (!res.ok) {
      const text = await res.text();
      console.warn('LINE reply failed:', res.status, text);
    }
  }).catch(() => {});
}

export function handleTextMessage(text) {
  const t = String(text).trim();
  const lower = t.toLowerCase();

  // กลุ่ม condition เป็น array แล้ว linear scan (เร็วสุดกว่า regex chain)
  // ตัวเลือกเร็วสุด: Map/Obj หรือ Array ของ rules แต่มี branch น้อยอยู่แล้ว
  if (lower === 'help' || lower === 'ช่วย') {
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
  if (lower === 'ping') return 'pong';
  if (t.includes('สวัสดี')) return 'สวัสดีครับ/ค่ะ 👋 มีอะไรให้ช่วยไหม?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');

  // Calculation logic ให้เร็วขึ้น โดย match regexp ก่อน branch
  let re;
  re = /([-]?\d+(?:\.\d+)?)\s*(บวก|ลบ|คูณ|หาร)\s*([-]?\d+(?:\.\d+)?)/;
  let calThai = re.exec(t);
  if (calThai) {
    const a = parseFloat(calThai[1]), op = calThai[2], b = parseFloat(calThai[3]);
    if (op === 'บวก') return String(a + b);
    if (op === 'ลบ') return String(a - b);
    if (op === 'คูณ') return String(a * b);
    if (op === 'หาร') return b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(a / b);
  }
  re = /([-]?\d+(?:\.\d+)?)\s*([\+\-\*\/xX])\s*([-]?\d+(?:\.\d+)?)/;
  let cal = re.exec(t);
  if (cal) {
    const a = parseFloat(cal[1]), op = cal[2], b = parseFloat(cal[3]);
    if (op === '+') return String(a + b);
    if (op === '-') return String(a - b);
    if (op === '*' || op.toLowerCase() === 'x') return String(a * b);
    if (op === '/') return b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(a / b);
  }
  if (lower === 'status' || lower === 'สถานะ') return null;
  return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่ง';
}