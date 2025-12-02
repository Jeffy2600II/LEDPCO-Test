import crypto from 'crypto';

// ตรวจสอบ LINE signature
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

// ส่งข้อความไปที่ LINE
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

// สร้าง Flex Message ตัวอย่าง (GUI)
export function createFlexWindow(title = "Flex GUI", desc = "นี่คือหน้าต่างตัวอย่างจาก LINE Bot") {
  return {
    type: "flex",
    altText: title,
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://static.line-scdn.net/flex/img/baseImage.png",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: title, weight: "bold", size: "xl", margin: "md" },
          { type: "text", text: desc, size: "sm", color: "#666666", wrap: true }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "uri",
              label: "ดูรายละเอียด",
              uri: "https://developers.line.biz/en/docs/messaging-api/using-flex-messages/"
            }
          }
        ],
        flex: 0
      }
    }
  };
}

// สร้างข้อความช่วยเหลือและ quick reply
export function createHelpQuickReply() {
  const commands = [
    { label: "help/ช่วย", text: "help" },
    { label: "ping", text: "ping" },
    { label: "สวัสดี", text: "สวัสดี" },
    { label: "echo <ข้อความ>", text: "echo " },
    { label: "2 + 3", text: "2 + 3" },
    { label: "status/สถานะ", text: "status" },
    { label: "gui", text: "gui" },
    { label: "หน้าต่าง", text: "หน้าต่าง" }
  ];
  const quickReply = {
    items: commands.map(cmd => ({
      type: "action",
      action: {
        type: "message",
        label: cmd.label,
        text: cmd.text
      }
    }))
  };
  return {
    type: "text",
    text: [
      'คำสั่งที่ใช้ได้:',
      ...commands.map(c => `- ${c.label}`)
    ].join('\n'),
    quickReply
  };
}

// จัดการคำสั่งข้อความ
export function handleTextMessage(text) {
  const t = String(text).trim();
  const lower = t.toLowerCase();

  // ส่งช่วยเหลือแบบ quick reply
  if (/^help$|^ช่วย$/.test(lower)) {
    return createHelpQuickReply();
  }
  if (/^ping$/.test(lower)) return 'pong';
  if (/สวัสดี/.test(t)) return 'สวัสดีครับ/ค่ะ 👋 มีอะไรให้ช่วยไหม?';
  if (/^echo\s+/i.test(t)) return t.replace(/^echo\s+/i, '');
  if (/^สถานะ$|^status$/.test(lower)) return null;

  // Flex Message สำหรับ gui หรือ หน้าต่าง
  if (/^(gui|หน้าต่าง)$/i.test(lower)) {
    return createFlexWindow("ตัวอย่าง GUI", "นี่คือหน้าต่างตัวอย่าง Flex Message ออกแบบได้หลากหลาย");
  }

  // Calculation (ไทย/สัญลักษณ์)
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
  return 'ขออภัย ระบบยังไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ "help" หรือ "ช่วย" เพื่อดูคำสั่งทั้งหมด';
}