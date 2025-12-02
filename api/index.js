// api/index.js - หน้าเว็บ HTML แบบ plain (ไม่มี JS) สำหรับ Vercel
// แสดงสถานะ last webhook ที่เก็บในหน่วยความจำของไฟล์ api/webhook.js
// NOTE: เนื่องจาก serverless แต่ละไฟล์เป็น module แยก การแชร์ตัวแปรข้ามไฟล์ไม่ตรงไปตรงมาบน Vercel.
// ดังนั้นในตัวอย่างนี้ เราจะให้หน้าเว็บรายงานว่าเป็น "หน้าแสดงสถานะแบบพื้นฐาน" และแนะนำวิธีดูสถานะจาก webhook logs หรือ /api/webhook (ผ่าน logs).
// หากต้องการสถานะจริง ควรเก็บลง DB หรือส่งไปที่ระบบ monitoring.

module.exports = (req, res) => {
  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>LINE Bot Status (Vercel)</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 2rem; }
    .card { border: 1px solid #ddd; padding: 1rem; border-radius: 6px; max-width: 800px; }
    h1 { margin-top: 0; }
    pre { background:#f8f8f8; padding:1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>LINE Bot — หน้าแสดงสถานะ (พื้นฐาน)</h1>
    <p>หน้านี้เป็น HTML แบบปกติ (ไม่มี JavaScript) สำหรับแสดงคำแนะนำและสถานะแบบเบื้องต้น</p>

    <h2>วิธีตรวจสอบการเชื่อมต่อ (แนะนำ)</h2>
    <ol>
      <li>ตั้งค่า Webhook URL ใน LINE Developer Console ให้ชี้ไปที่:
        <pre>https://YOUR_PROJECT.vercel.app/api/webhook</pre>
      </li>
      <li>ส่งข้อความมาที่ bot แล้วตรวจดู Logs ใน Vercel หรือดู Reply กลับใน LINE</li>
      <li>สถานะแบบถาวรต้องเก็บในฐานข้อมูล ถ้าต้องการแนะนำผมช่วยเพิ่มตัวอย่าง Supabase/Redis ได้</li>
    </ol>

    <h3>คำสั่งพื้นฐาน</h3>
    <ul>
      <li>help / ช่วย</li>
      <li>ping</li>
      <li>สวัสดี</li>
      <li>echo &lt;ข้อความ&gt;</li>
      <li>การคำนวณ เช่น 2 + 3 หรือ 2 บวก 3</li>
    </ul>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};