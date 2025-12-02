// api/index.js (Vercel serverless function entrypoint)
// ตั้งค่า Line Bot Webhook + Dashboard ในไฟล์เดียว

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// ตัวแปรสำหรับสถานะบอท (เก็บในหน่วยความจำเท่านั้น ใช้ db จริงต้องเพิ่มเติม)
let botOnline = false;
let lastConnected = null;

// Line Webhook Route (เชื่อมต่อ LINE Platform)
app.post('/webhook', (req, res) => {
  botOnline = true;
  lastConnected = new Date();
  
  // ตัวอย่างการตอบกลับข้อความแบบไม่มี AI/DB
  const events = req.body.events;
  if (events && Array.isArray(events)) {
    events.forEach(event => {
      // เฉพาะ message type เท่านั้น
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        const replyToken = event.replyToken;
        let replyMsg = "สวัสดี! คำสั่งที่รองรับ:\n- สวัสดี\n- เวลา\n- สถานะ";
        
        // สั่งงานแบบไม่มี AI/DB (hard code)
        switch (event.message.text.trim()) {
          case 'สวัสดี':
            replyMsg = 'สวัสดีครับ!';
            break;
          case 'เวลา':
            replyMsg = 'ขณะนี้เวลา: ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
            break;
          case 'สถานะ':
            replyMsg = botOnline ?
              `บอทกำลังออนไลน์ (ล่าสุด: ${lastConnected.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })})` :
              'บอทออฟไลน์';
            break;
        }
        // ตอบกลับไปหา LINE (mock: ไม่ส่งจริง ให้ HTTP 200 ตอบพอ)
      }
    });
  }
  res.status(200).send({ success: true }); // LINE Platform ต้องการสถานะ 200 OK
});

// เว็บ Dashboard Report Status
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Line Bot Connection Dashboard</title>
        <style>
          body { font-family: sans-serif; background:#f2f2f2; padding:40px; }
          .card { background:#fff; border-radius:6px; padding:24px; box-shadow:0 2px 5px #ccc; }
          .statusOnline { color: green;}
          .statusOffline { color: red;}
        </style>
      </head>
      <body>
        <div class="card">
          <h2>สถานะบอท</h2>
          <p>
            สถานะเชื่อมต่อกับ LINE: 
            <span class="${botOnline ? 'statusOnline' : 'statusOffline'}">
              ${botOnline ? 'ออนไลน์ ✅' : 'ออฟไลน์ ❌'}
            </span>
          </p>
          <p>เชื่อมต่อล่าสุด: ${lastConnected ? lastConnected.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-'}</p>
          <hr/>
          <h4>วิธีเติมเชื่อมต่อ</h4>
          <ol>
            <li>สมัคร LINE Developer และสร้าง Channel</li>
            <li>ตั้ง Webhook URL ไปยัง <code>https://YOUR-VERCEL-NAME.vercel.app/api/webhook</code></li>
            <li>ทดลองส่งข้อความใน LINE จะรายงานที่หน้านี้</li>
          </ol>
        </div>
      </body>
    </html>
  `);
});

module.exports = app;