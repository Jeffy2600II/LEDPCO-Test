import { Router } from 'itty-router';

interface Env {
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
}

// เก็บ User IDs ไว้ในหน่วยความจำ
const userIds = new Set<string>();

const router = Router();

// ✅ System คำสั่ง
const commands: Record<string, string> = {
  '/help': `📋 คำสั่งที่ใช้ได้:
/help - ดูคำสั่งทั้งหมด
/status - ดูสถานะปัจจุบัน
/ping - เช็ค connection
/users - ดูจำนวนผู้ใช้ที่ connect
/clear - ล้างข้อมูลผู้ใช้ทั้งหมด`,

  '/status': `✅ ระบบปกติการใช้งาน
🤖 Bot: Online
🌐 API: Active
📊 Status: Ready`,

  '/ping': `🏓 Pong! ⏱️ ${Date.now()}ms`,

  '/users': `👥 ผู้ใช้ที่ connect ทั้งสิ้น: ${userIds.size} คน`,

  '/clear': `🗑️ ล้างข้อมูลผู้ใช้ทั้งหมด (Admin only)`
};

// Webhook endpoint for Line Bot
router.post('/webhook', async (request: Request, env: Env) => {
  try {
    const body = await request.json() as any;
    
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        if (event.type === 'follow') {
          userIds.add(event.source. userId);
          console.log('User followed:', event.source.userId);
          
          // ✅ ส่งข้อความต้อนรับให้ผู้ใช้
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env. LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              to: event.source.userId,
              messages: [
                {
                  type: 'text',
                  text: 'ยินดีต้อนรับ! 👋\nพิมพ์ /help เพื่อดูคำสั่งที่ใช้ได้'
                }
              ]
            })
          });
          
        } else if (event.type === 'unfollow') {
          userIds.delete(event.source.userId);
          console.log('User unfollowed:', event.source. userId);
          
        } else if (event.type === 'message' && event.message.type === 'text') {
          const userId = event.source.userId;
          const messageText = event.message.text. trim();
          
          // ✅ เพิ่ม User ID
          userIds.add(userId);
          
          // ✅ เช็คว่าเป็นคำสั่งหรือไม่
          if (messageText. startsWith('/')) {
            const command = messageText.toLowerCase();
            
            // ตอบกลับตามคำสั่ง
            if (commands[command]) {
              await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${env. LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                  to: userId,
                  messages: [
                    {
                      type: 'text',
                      text: commands[command]
                    }
                  ]
                })
              });
            } else {
              // ถ้าคำสั่งไม่ถูก ก็ตอบว่าไม่รู้จัก
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
                      text: `❌ ไม่รู้จักคำสั่ง "${messageText}"\nพิมพ์ /help เพื่อดูคำสั่งที่ใช้ได้`
                    }
                  ]
                })
              });
            }
          } else {
            // ถ้าไม่ใช่คำสั่ง ก็เพิ่งเก็บข้อความ
            console.log('User sent message:', userId, messageText);
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

// API endpoint for broadcasting messages (จากเว็บ)
router.post('/api/broadcast', async (request: Request, env: Env) => {
  try {
    const { message } = await request.json() as { message: string };

    if (!  message || message.trim(). length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ส่งข้อความไปทุกคน
    const promises = Array.from(userIds).map(userId =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON. stringify({
          to: userId,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        })
      })
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

// Get active users count
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

// Fallback
router.all('*', () => new Response('Not Found', { status: 404 }));

export default router;