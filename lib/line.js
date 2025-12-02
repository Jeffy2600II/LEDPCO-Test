import crypto from 'crypto';

/**
 * ตัวอย่าง memory cache สำหรับเก็บสถานะล่าสุด
 */
const memoryStatus = {
  lastWebhookAt: null,
};

export function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  // timingSafeEqual ไม่ block event loop
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

/**
 * คำนวณเร็ว: ไม่ทำใน loop, regex/switch ครบ
 */
export function handleTextMessage(text) {
  const t = String(text ?? "").trim();
  const lower = t.toLowerCase();

  // กลุ่มคำสั่งที่ใช้บ่อย (จับบนสุด)
  if (/^ping$/.test(lower)) return 'pong';
  if (/^help$|^ช่วย$/.test(lower)) {
    return [
      'คำสั่งที่ใช้ได้:',
      '- help/ช่วย: ดูรายการคำสั่ง',
      '- ping: ตอบ pong',
      '- สวัสดี: ทักทาย',
      '- echo <ข้อความ>: ส่งข้อความกลับ',
      '- 2 + 3 หรือ 2 บวก 3: คำนวณ',
      '- status/สถานะ: เวลาการเชื่อมต่อล่าสุด'
    ].join('\n');
  }
  if (/สวัสดี|สวัสดีครับ|สวัสดีค่ะ/.test(t)) return 'สวัสดีครับ/ค่ะ 👋 มีอะไรให้ช่วยไหม?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');

  // status จะถูก handle ใน api layer ดีที่สุด (แยก process)
  if (/^สถานะ$|^status$/.test(lower)) return null;

  // คำนวณแบบไทย/สัญลักษณ์ (เร็ว, ไม่ใช้ await)
  let match = t.match(/^\s*([-]?\d+(?:\.\d+)?)\s*(บวก|ลบ|คูณ|หาร)\s*([-]?\d+(?:\.\d+)?)\s*$/);
  if (match) {
    const [ , a, op, b ] = match;
    const numA = parseFloat(a), numB = parseFloat(b);
    if (op === 'บวก') return String(numA + numB);
    if (op === 'ลบ') return String(numA - numB);
    if (op === 'คูณ') return String(numA * numB);
    if (op === 'หาร') return numB === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(numA / numB);
  }
  match = t.match(/^\s*([-]?\d+(?:\.\d+)?)\s*([\+\-\*\/xX])\s*([-]?\d+(?:\.\d+)?)\s*$/);
  if (match) {
    const [ , a, op, b ] = match;
    const numA = parseFloat(a), numB = parseFloat(b);
    switch(op) {
      case '+': return String(numA + numB);
      case '-': return String(numA - numB);
      case '*':
      case 'x': case 'X': return String(numA * numB);
      case '/': return numB === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(numA / numB);
    }
  }

  // ข้อความ fallback เร็ว (no await)
  return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" เพื่อดูคำสั่งที่รองรับ 👍';
}