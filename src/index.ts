import { Router } from 'itty-router';

interface Env {
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
}

const userIds = new Set<string>();
const router = Router();

// ✅ เพิ่มบรรทัดนี้ให้ serve HTML จาก static files
router.get('/', async () => {
  try {
    // Cloudflare Workers Site จะเก็บ static files ที่ `__STATIC_CONTENT`
    const response = await fetch(new URL('/index.html', 'https://workers. cloudflare.com'), {
      cf: { cacheTtl: 3600 }
    } as any);
    
    if (response.ok) {
      return response;
    }
  } catch (e) {
    console.error('Static file error:', e);
  }
  
  return new Response('Not Found', { status: 404 });
});

// Webhook endpoint
router.post('/webhook', async (request: Request, env: Env) => {
  try {
    const body = await request.json() as any;
    
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        if (event.type === 'follow') {
          userIds.add(event.source.userId);
          console.log('User followed:', event.source.userId);
          
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON. stringify({
              to: event.source.userId,
              messages: [{
                type: 'text',
                text: 'ยินดีต้อนรับ!  👋\nพิมพ์ /help เพื่อดูคำสั่งที่ใช้ได้'
              }]
            })
          });
          
        } else if (event.type === 'unfollow') {
          userIds.delete(event. source.userId);
          console. log('User unfollowed:', event.source.userId);
          
        } else if (event.type === 'message' && event.message.type === 'text') {
          const userId = event.source.userId;
          const messageText = event.message.text. trim();
          
          userIds.add(userId);
          
          if (messageText. startsWith('/')) {
            const commands: Record<string, string> = {
              '/help': `📋 คำสั่งที่ใช้ได้:
/help - ดูคำสั่งทั้งหมด
/status - ดูสถานะปัจจุบัน
/ping - เช็ค connection
/users - ดูจำนวนผู้ใช้ที่ connect`,
              '/status': `✅ ระบบปกติการใช้งาน
🤖 Bot: Online
🌐 API: Active`,
              '/ping': `🏓 Pong!  ⏱️ ${Date.now()}ms`,
              '/users': `👥 ผู้ใช้ที่ connect ทั้งสิ้น: ${userIds.size} คน`
            };

            const command = messageText.toLowerCase();
            
            if (commands[command]) {
              await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${env. LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                  to: userId,
                  messages: [{
                    type: 'text',
                    text: commands[command]
                  }]
                })
              });
            } else {
              await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                  to: userId,
                  messages: [{
                    type: 'text',
                    text: `❌ ไม่รู้จักคำสั่ง "${messageText}"\nพิมพ์ /help เพื่อดูคำสั่ง`
                  }]
                })
              });
            }
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

// API broadcast
router.post('/api/broadcast', async (request: Request, env: Env) => {
  try {
    const { message } = await request.json() as { message: string };

    if (! message || message.trim(). length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const promises = Array.from(userIds).map(userId =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON. stringify({
          to: userId,
          messages: [{ type: 'text', text: message }]
        })
      })
    );

    await Promise.all(promises);

    return new Response(JSON.stringify({
      status: 'success',
      sentTo: userIds.size,
      message: 'Message broadcasted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Status
router.get('/api/status', () => {
  return new Response(JSON.stringify({
    activeUsers: userIds.size,
    userIds: Array.from(userIds)
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

router.all('*', () => new Response('Not Found', { status: 404 }));

export default router;