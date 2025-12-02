import { Router } from 'itty-router';

interface Env {
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
}

// เก็บ User IDs ไว้ในหน่วยความจำ
const userIds = new Set<string>();

// HTML สำหรับเว็บ
const HTML_CONTENT = `<! DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Line Bot Broadcaster</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 40px;
      max-width: 600px;
      width: 100%;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }

    . header p {
      color: #666;
      font-size: 14px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }

    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      min-height: 100px;
      transition: border-color 0.3s;
    }

    textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    button:active {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .status {
      margin-top: 20px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 6px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }

    .status.success {
      background: #d4edda;
      color: #155724;
    }

    .status.error {
      background: #f8d7da;
      color: #721c24;
    }

    .status.loading {
      background: #d1ecf1;
      color: #0c5460;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #0c5460;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .info-box {
      margin-top: 20px;
      padding: 15px;
      background: #e7f3ff;
      border-left: 4px solid #2196F3;
      border-radius: 4px;
      font-size: 12px;
      color: #1565c0;
      line-height: 1.6;
    }

    .command-list {
      margin-top: 20px;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
      font-size: 12px;
      color: #856404;
      line-height: 1.8;
    }

    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }

    .command-list strong {
      display: block;
      margin-top: 8px;
    }

    .command-list strong:first-child {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📱 Line Bot Broadcaster</h1>
      <p>ส่งข้อความ Broadcast ผ่านระบบคำสั่ง</p>
    </div>

    <form id="broadcastForm">
      <div class="form-group">
        <label for="message">ข้อความที่ต้องการส่ง:</label>
        <textarea
          id="message"
          name="message"
          placeholder="พิมพ์ข้อความที่ต้องการส่งไปยังผู้ใช้ทั้งหมด..."
          required
        ></textarea>
      </div>

      <button type="submit" id="sendBtn">ส่งข้อความ Broadcast</button>
    </form>

    <div id="status"></div>

    <div class="command-list">
      <strong>📝 คำสั่ง Line Bot:</strong>
      <code>/help</code> - ดูรายการคำสั่ง<br>
      <code>/status</code> - ดูจำนวนผู้ใช้<br>
      <code>/broadcast ข้อความ</code> - ส่งข้อความ Broadcast<br>
      <code>/echo ข้อความ</code> - ตอบกลับข้อความที่ส่ง
    </div>

    <div class="info-box">
      <strong>📝 หมายเหตุ:</strong><br>
      • ผู้ใช้ต้อง follow บอทก่อน<br>
      • ส่วนเว็บนี้ใช้สำหรับส่ง Broadcast เฉพาะ<br>
      • ที่ Line Chat ใช้คำสั่ง /help เพื่อดูรายการคำสั่ง<br>
      • นี่เป็นระบบทดสอบเท่านั้น
    </div>
  </div>

  <script>
    const form = document.getElementById('broadcastForm');
    const messageInput = document.getElementById('message');
    const sendBtn = document. getElementById('sendBtn');
    const statusDiv = document.getElementById('status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const message = messageInput.value.trim();

      if (!message) {
        showStatus('กรุณาพิมพ์ข้อความก่อน', 'error');
        return;
      }

      sendBtn.disabled = true;
      showStatus('<span class="spinner"></span>กำลังส่งข้อความ...', 'loading');

      try {
        const response = await fetch('/api/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (response.ok) {
          showStatus(
            \`✅ ส่งข้อความสำเร็จ!  (ส่งไปให้ \${data.sentTo} คน)\`,
            'success'
          );
          messageInput.value = '';
        } else {
          showStatus(\`❌ เกิดข้อผิดพลาด: \${data.error}\`, 'error');
        }
      } catch (error) {
        showStatus(\`❌ เกิดข้อผิดพลาด: \${error.message}\`, 'error');
      } finally {
        sendBtn.disabled = false;
      }
    });

    function showStatus(message, type) {
      statusDiv.className = \`status \${type}\`;
      statusDiv.innerHTML = message;
    }
  </script>
</body>
</html>`;

const router = Router();

// ✅ Serve HTML สำหรับ root path
router.get('/', () => {
  return new Response(HTML_CONTENT, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

// ✅ Webhook endpoint for Line Bot - จัดการคำสั่ง
router.post('/webhook', async (request: Request, env: Env) => {
  try {
    const body = await request.json() as any;
    
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        // เก็บ User ID เมื่อ follow
        if (event.type === 'follow') {
          userIds.add(event.source. userId);
          console.log('User followed:', event.source.userId);
          
          // ตอบกลับการ follow
          await sendMessage(event.source.userId, 'สวัสดี! 👋\nพิมพ์ /help เพื่อดูคำสั่ง', env);
        } 
        // ลบ User ID เมื่อ unfollow
        else if (event.type === 'unfollow') {
          userIds.delete(event.source.userId);
          console.log('User unfollowed:', event.source. userId);
        } 
        // จัดการคำสั่งจากข้อความ
        else if (event.type === 'message' && event.message.type === 'text') {
          const userId = event.source.userId;
          const text = event.message.text. trim();

          userIds.add(userId);

          // ✅ /help - ดูรายการคำสั่ง
          if (text === '/help') {
            const helpMessage = `📋 รายการคำสั่ง:\n\n/help - ดูรายการคำสั่ง\n/status - ดูจำนวนผู้ใช้\n/broadcast ข้อความ - ส่ง Broadcast\n/echo ข้อความ - ตอบกลับข้อความ`;
            await sendMessage(userId, helpMessage, env);
          }
          // ✅ /status - ดูจำนวนผู้ใช้
          else if (text === '/status') {
            const statusMessage = `👥 จำนวนผู้ใช้ที่เชื่อมต่อ: ${userIds.size} คน`;
            await sendMessage(userId, statusMessage, env);
          }
          // ✅ /broadcast ข้อความ - ส่ง broadcast
          else if (text. startsWith('/broadcast ')) {
            const broadcastText = text.substring('/broadcast '.length);
            if (broadcastText.trim(). length === 0) {
              await sendMessage(userId, '❌ กรุณาระบุข้อความ เช่น: /broadcast สวัสดี', env);
            } else {
              // ส่ง broadcast ไปทุกคน
              const promises = Array.from(userIds). map(uid =>
                sendMessage(uid, `📢 Broadcast: ${broadcastText}`, env)
              );
              await Promise.all(promises);
              await sendMessage(userId, `✅ ส่ง Broadcast ไปให้ ${userIds.size} คนแล้ว! `, env);
            }
          }
          // ✅ /echo ข้อความ - ตอบกลับข้อความ
          else if (text.startsWith('/echo ')) {
            const echoText = text.substring('/echo '. length);
            if (echoText.trim().length === 0) {
              await sendMessage(userId, '❌ กรุณาระบุข้อความ เช่น: /echo สวัสดี', env);
            } else {
              await sendMessage(userId, `🔄 Echo: ${echoText}`, env);
            }
          }
          // ❌ คำสั่งไม่ถูกต้อง
          else if (text. startsWith('/')) {
            await sendMessage(userId, `❌ คำสั่งไม่ถูกต้อง\nพิมพ์ /help เพื่อดูรายการคำสั่ง`, env);
          }
          // ข้อความธรรมดา - ไม่ตอบกลับ
          else {
            console.log(`Regular message from ${userId}: ${text}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// ✅ API endpoint for broadcasting messages from web
router.post('/api/broadcast', async (request: Request, env: Env) => {
  try {
    const { message } = await request.json() as { message: string };

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ส่งข้อความไปทุกคน
    const promises = Array.from(userIds).map(userId =>
      sendMessage(userId, `📢 Broadcast: ${message}`, env)
    );

    await Promise.all(promises);

    return new Response(
      JSON.stringify({
        status: 'success',
        sentTo: userIds.size,
        message: 'Message broadcasted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Broadcast error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// ✅ Get active users count
router.get('/api/status', () => {
  return new Response(
    JSON.stringify({
      activeUsers: userIds.size,
      userIds: Array.from(userIds)
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
});

// ✅ Helper function - ส่งข้อความไป Line
async function sendMessage(userId: string, text: string, env: Env): Promise<void> {
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: text
          }
        ]
      })
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Fallback
router.all('*', () => new Response('Not Found', { status: 404 }));

export default router;