import crypto from 'crypto';

// Pre-compile regexes to avoid recompiling on each message (faster)
const HELP_RE = /^(?:help|ช่วย)$/i;
const PING_RE = /^ping$/i;
const HELLO_RE = /สวัสดี/;
const ECHO_RE = /^echo\s+/i;
const STATUS_RE = /^(?:status|สถานะ)$/i;
const CAL_THAI_RE = /([-]?\d+(?:\.\d+)?)\s*(บวก|ลบ|คูณ|หาร)\s*([-]?\d+(?:\.\d+)?)/;
const CAL_RE = /([-]?\d+(?:\.\d+)?)\s*([+\-*/xX])\s*([-]?\d+(?:\.\d+)?)/;

export function verifySignature(rawBodyBuffer, signature) {
  // signature should be a string (base64 text) from header
  if (!signature || !rawBodyBuffer) return false;
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');

  try {
    // Compare base64 string bytes in a timing-safe manner
    const a = Buffer.from(hash, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

export async function replyMessage(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not set');

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        // keep-alive may help latency between subsequent calls
        'Connection': 'keep-alive'
      },
      // keepalive is non-standard in some runtimes but Node's fetch supports it in recent versions
      keepalive: true,
      body: JSON.stringify({ replyToken, messages })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<no-body>');
      console.warn('LINE reply failed:', res.status, text);
    }
    return res;
  } catch (err) {
    // Bubble up so caller can handle, but also log here
    console.error('replyMessage error:', err);
    throw err;
  }
}

// Rule-based handler with precompiled regex and minimal allocations
export function handleTextMessage(text) {
  const t = (text ?? '').trim();
  if (!t) return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่ง';

  if (HELP_RE.test(t)) {
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

  if (PING_RE.test(t)) return 'pong';
  if (HELLO_RE.test(t)) return 'สวัสดีครับ/ค่ะ 👋 มีอะไรให้ช่วยไหม?';
  if (ECHO_RE.test(t)) return t.replace(ECHO_RE, '');

  // Calculation (ไทย)
  const calThai = CAL_THAI_RE.exec(t);
  if (calThai) {
    const a = Number(calThai[1]), op = calThai[2], b = Number(calThai[3]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 'ตัวเลขไม่ถูกต้อง';
    if (op === 'บวก') return String(a + b);
    if (op === 'ลบ') return String(a - b);
    if (op === 'คูณ') return String(a * b);
    if (op === 'หาร') return b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(a / b);
  }

  // Calculation (symbols)
  const cal = CAL_RE.exec(t);
  if (cal) {
    const a = Number(cal[1]), op = cal[2], b = Number(cal[3]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 'ตัวเลขไม่ถูกต้อง';
    if (op === '+') return String(a + b);
    if (op === '-') return String(a - b);
    if (op === '*' || op.toLowerCase() === 'x') return String(a * b);
    if (op === '/') return b === 0 ? 'ไม่สามารถหารด้วยศูนย์' : String(a / b);
  }

  if (STATUS_RE.test(t)) return null; // caller may handle status separately
  return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่ง';
}