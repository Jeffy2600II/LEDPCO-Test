import { Router } from 'itty-router';

interface Env {
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
}

// เก็บ User IDs ไว้ในหน่วยความจำ (ขอบเขต request)
const userIds = new Set<string>();

const router = Router();

// Webhook endpoint for Line Bot
router.post('/webhook', async (request: Request, env: Env) => {
  try {
    const body = await request.json() as any;
    
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        if (event.type === 'follow') {
          // ผู้ใช้ follow บอท
          userIds.add(event.source.userId);
          console.log('User followed:', event.source.userId);
        } else if (event.type === 'unfollow') {
          // ผู้ใช้ unfollow บอท
          userIds.delete(event.source.userId);
          console.log('User unfollowed:', event.source.userId);
        } else if (event. type === 'message' && event.message. type === 'text') {
          // เก็บ User ID เมื่อมีการส่งข้อความมา
          userIds.add(event.source.userId);
          console.log('User sent message:', event.source.userId);
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

// API endpoint for broadcasting messages
router.post('/api/broadcast', async (request: Request, env: Env) => {
  try {
    const { message } = await request.json() as { message: string };

    if (! message || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ส่งข้อความไปทุกคนที่เก็บ User ID ไว้
    const promises = Array.from(userIds).map(userId =>
      fetch('https://api.line.me/v2/bot/message/push', {
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

// Get active users count (for debugging)
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

// Fallback for 404
router.all('*', () => new Response('Not Found', { status: 404 }));

export default router;