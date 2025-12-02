// api/index.js - Vercel Serverless function that serves plain HTML and shows lastWebhook from storage
const storage = require('../storage');

module.exports = async (req, res) => {
  // Read last webhook
  const status = await storage.getStatus();
  const last = status.lastWebhookAt ? status.lastWebhookAt : 'ยังไม่เคยได้รับ webhook จาก LINE';

  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>LINE Bot Status (Vercel)</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 2rem; background:#f7f7f7; color:#222; }
    .card { background:white; border: 1px solid #e0e0e0; padding: 1.2rem; border-radius: 6px; max-width: 900px; margin: 0 auto; }
    h1 { margin-top: 0; }
    pre { background:#fafafa; padding:0.8rem; border-radius:4px; overflow:auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>LINE Bot — หน้าแสดงสถานะ (พื้นฐาน)</h1>
    <p>Last webhook: <strong>${last}</strong></p>

    <h2>วิธีตรวจสอบการเชื่อมต่อ</h2>
    <ol>
      <li>ตั้งค่า Webhook URL ใน LINE Developer Console ให้ชี้ไปที่:
        <pre>https://YOUR_PROJECT.vercel.app/api/webhook</pre>
      </li>
      <li>ส่งข้อความมาที่ bot แล้วตรวจดู Reply ใน LINE หรือดู Logs ใน Vercel</li>
      <li>ถ้าต้องการสถานะถาวร ให้เชื่อมฐานข้อมูล (เช่น Supabase, Redis ฯลฯ)</li>
    </ol>

    <h3>คำสั่งพื้นฐาน</h3>
    <ul>
      <li>help / ช่วย</li>
      <li>ping</li>
      <li>สวัสดี</li>
      <li>echo &lt;ข้อความ&gt;</li>
      <li>การคำนวณ เช่น 2 + 3 หรือ 2 บวก 3</li>
      <li>status / สถานะ</li>
    </ul>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};