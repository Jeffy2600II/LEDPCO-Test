// สำหรับ Vercel serverless function
export default async function handler(req, res) {
  if (req.method === "POST") {
    // รับ event จาก LINE
    global.lastLineEvent = Date.now();
    // ตอบกลับได้ตามต้องการ (เช่น echo, คำสั่งพื้นฐาน)
    const events = req.body.events || [];
    const replyMessages = [];
    
    events.forEach(event => {
      if (event.type === "message") {
        const text = event.message.text;
        if (text === "สวัสดี") {
          replyMessages.push({ type: "text", text: "สวัสดีครับ" });
        } else if (text === "เวลา") {
          replyMessages.push({ type: "text", text: "ขณะนี้เวลา: " + new Date().toLocaleString() });
        } else {
          replyMessages.push({ type: "text", text: "คำสั่งไม่ถูกต้อง" });
        }
      }
    });
    // ไม่ต้องตอบกับ LINE server (reply ให้ดูตัวอย่างเท่านั้น)
    res.status(200).json({ status: "ok", replyMessages });
  } else {
    res.status(405).send("Method Not Allowed");
  }
}