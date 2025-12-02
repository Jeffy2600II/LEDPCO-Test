// api/webhook.js (สำหรับรับ event จาก LINE)
// ตัวแปรสถานะใน memory (shared ภายในเซสชั่น) แต่จะหายไปเมื่อ serverless รีสตาร์ท
let botStatus = {
  online: false,
  lastConnected: null,
};

export default function handler(req, res) {
  if (req.method === "POST") {
    botStatus.online = true;
    botStatus.lastConnected = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    
    // ตัวอย่าง simple command (ไม่ตอบกลับจริง, mock เฉย ๆ)
    if (Array.isArray(req.body?.events)) {
      // สามารถเพิ่ม logic ตรงนี้สำหรับตอบกลับ LINE Messaging API (ถ้าต้องการ)
    }
    res.status(200).json({ success: true });
  } else {
    res.status(405).send("Method Not Allowed");
  }
}

// สำหรับ status API
export { botStatus };