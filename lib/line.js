import crypto from 'crypto';

// ==================== Pre-compiled Regex ====================
const REGEX_HELP = /^help$|^ช่วย$/i;
const REGEX_PING = /^ping$/i;
const REGEX_GREETING = /สวัสดี/;
const REGEX_ECHO = /^echo\s+/i;
const REGEX_STATUS = /^สถานะ$|^status$/i;
const REGEX_CALC_THAI = /([-]?\d+(? :\.\d+)?)\s*(บวก|ลบ|คูณ|หาร)\s*([-]?\d+(?:\.\d+)?)/;
const REGEX_CALC_SYMBOL = /([-]?\d+(?:\.\d+)? )\s*([\+\-\*\/xX])\s*([-]?\d+(?:\.\d+)? )/;

// ==================== Operation Lookup Tables ====================
const THAI_OPS = {
  'บวก': (a, b) => a + b,
  'ลบ': (a, b) => a - b,
  'คูณ': (a, b) => a * b,
  'หาร': (a, b) => b === 0 ? null : a / b
};

const SYMBOL_OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  'x': (a, b) => a * b,
  'X': (a, b) => a * b,
  '/': (a, b) => b === 0 ? null : a / b
};

// ==================== Signature Verification ====================
export function verifySignature(rawBodyBuffer, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('base64');
  
  let isMatch = false;
  try {
    isMatch =
      signature.length === hash.length &&
      crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    isMatch = false;
  }
  return isMatch;
}

// ==================== Non-blocking Reply (Fire-and-Forget) ====================
export function replyMessage(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN not set');
    return;
  }
  
  // ไม่ await - ตอบ HTTP ได้เร็วทันที
  fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ replyToken, messages })
  }).catch(err => {
    console.warn('LINE reply failed:', err.message);
  });
}

// ==================== Text Message Handler (Fast & Optimized) ====================
export function handleTextMessage(text) {
  const t = String(text).trim();
  const lower = t.toLowerCase();
  
  // ⚡ Fast returns - early exit
  if (REGEX_HELP.test(lower)) {
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
  
  if (REGEX_PING.test(lower)) return 'pong';
  if (REGEX_GREETING.test(t)) return 'สวัสดีครับ/ค่ะ 👋 มีอะไรให้ช่วยไหม?';
  if (REGEX_ECHO.test(t)) return t.replace(REGEX_ECHO, '');
  if (REGEX_STATUS.test(lower)) return null;
  
  // ⚡ Thai Calculation (บวก ลบ คูณ หาร)
  const matchThai = REGEX_CALC_THAI.exec(t);
  if (matchThai) {
    const a = parseFloat(matchThai[1]);
    const op = matchThai[2];
    const b = parseFloat(matchThai[3]);
    const fn = THAI_OPS[op];
    if (fn) {
      const result = fn(a, b);
      return result === null ? 'ไม่สามารถหารด้วยศูนย์' : String(result);
    }
  }
  
  // ⚡ Symbol Calculation (+ - * / x X)
  const matchSymbol = REGEX_CALC_SYMBOL.exec(t);
  if (matchSymbol) {
    const a = parseFloat(matchSymbol[1]);
    const op = matchSymbol[2];
    const b = parseFloat(matchSymbol[3]);
    const fn = SYMBOL_OPS[op];
    if (fn) {
      const result = fn(a, b);
      return result === null ? 'ไม่สามารถหารด้วยศูนย์' : String(result);
    }
  }
  
  return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่ง';
}