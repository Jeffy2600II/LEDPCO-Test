import type { VercelRequest, VercelResponse } from '@vercel/node';

// เก็บ User IDs ไว้ในหน่วยความจำ
const userIds = new Set<string>();

// เก็บข้อมูลบอท
let botInfo: { displayName: string; userId: string } | null = null;

// Helper function - ดึงข้อมูลบอท
async function getBotInfo(accessToken: string): Promise<{ displayName: string; userId: string } | null> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const data = await response.json() as any;
      return {
        displayName: data.displayName,
        userId: data.userId
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting bot info:', error);
    return null;
  }
}

// Helper function - ส่งข้อความไป Line
async function sendMessage(userId: string, text: string, accessToken: string): Promise<void> {
  try {
    await fetch('https://api.line. me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
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

// ✅ POST /api/webhook - จัดการ webhook จาก Line
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!accessToken) {
    return res.status(500).json({ error: 'Missing LINE_CHANNEL_ACCESS_TOKEN' });
  }

  // ✅ GET /api/webhook - เช็คสถานะการเชื่อมต่อ
  if (req. method === 'GET') {
    try {
      if (! botInfo) {
        botInfo = await getBotInfo(accessToken);
      }

      return res.status(200).json({
        connected: botInfo !== null,
        botInfo: botInfo,
        activeUsers: userIds.size,
        userIds: Array.from(userIds)
      });
    } catch (error) {
      console.error('Status error:', error);
      return res.status(500).json({
        connected: false,
        error: 'Failed to get status'
      });
    }
  }

  // ✅ POST /api/webhook - Webhook จาก Line Platform
  if (req.method === 'POST') {
    try {
      const body = req.body as any;

      // ดึงข้อมูลบอทครั้งแรก
      if (! botInfo) {
        botInfo = await getBotInfo(accessToken);
        console.log('Bot Info loaded:', botInfo);
      }

      if (body.events && Array.isArray(body.events)) {
        for (const event of body.events) {
          // เก็บ User ID เมื่อ follow
          if (event.type === 'follow') {
            userIds.add(event.source.userId);
            console.log('User followed:', event.source.userId);

            // ตอบกลับการ follow
            await sendMessage(event.source.userId, 'สวัสดี! 👋\nพิมพ์ /help เพื่อดูคำสั่ง', accessToken);
          }
          // ลบ User ID เมื่อ unfollow
          else if (event.type === 'unfollow') {
            userIds.delete(event.source.userId);
            console.log('User unfollowed:', event.source. userId);
          }
          // จัดการคำสั่งจากข้อความ
          else if (event. type === 'message' && event.message.type === 'text') {
            const userId = event.source.userId;
            const text = event.message.text. trim();

            userIds.add(userId);

            // ✅ /help - ดูรายการคำสั่ง
            if (text === '/help') {
              const helpMessage = `📋 รายการคำสั่ง:\n\n/help - ดูรายการคำสั่ง\n/status - ดูจำนวนผู้ใช้\n/broadcast ข้อความ - ส่ง Broadcast\n/echo ข้อความ - ตอบกลับข้อความ`;
              await sendMessage(userId, helpMessage, accessToken);
            }
            // ✅ /status - ดูจำนวนผู้ใช้
            else if (text === '/status') {
              const statusMessage = `👥 จำนวนผู้ใช้ที่เชื่อมต่อ: ${userIds.size} คน`;
              await sendMessage(userId, statusMessage, accessToken);
            }
            // ✅ /broadcast ข้อความ - ส่ง broadcast
            else if (text. startsWith('/broadcast ')) {
              const broadcastText = text.substring('/broadcast '.length);
              if (broadcastText.trim(). length === 0) {
                await sendMessage(userId, '❌ กรุณาระบุข้อความ เช่น: /broadcast สวัสดี', accessToken);
              } else {
                // ส่ง broadcast ไปทุกคน
                const promises = Array.from(userIds).map(uid =>
                  sendMessage(uid, `📢 Broadcast: ${broadcastText}`, accessToken)
                );
                await Promise.all(promises);
                await sendMessage(userId, `✅ ส่ง Broadcast ไปให้ ${userIds.size} คนแล้ว! `, accessToken);
              }
            }
            // ✅ /echo ข้อความ - ตอบกลับข้อความ
            else if (text.startsWith('/echo ')) {
              const echoText = text.substring('/echo '.length);
              if (echoText.trim().length === 0) {
                await sendMessage(userId, '❌ กรุณาระบุข้อความ เช่น: /echo สวัสดี', accessToken);
              } else {
                await sendMessage(userId, `🔄 Echo: ${echoText}`, accessToken);
              }
            }
            // ❌ คำสั่งไม่ถูกต้อง
            else if (text.startsWith('/')) {
              await sendMessage(userId, `❌ คำสั่งไม่ถูกต้อง\nพิมพ์ /help เพื่อดูรายการคำสั่ง`, accessToken);
            }
            // ข้อความธรรมดา - ไม่ตอบกลับ
            else {
              console.log(`Regular message from ${userId}: ${text}`);
            }
          }
        }
      }

      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}