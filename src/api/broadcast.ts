import type { VercelRequest, VercelResponse } from '@vercel/node';

// เก็บ User IDs (shared state)
// ⚠️ หมายเหตุ: ใน Serverless ไม่ควรเก็บ state ที่ persistent
// แต่สำหรับทดสอบก็ยังใช้ได้
const userIds = new Set<string>();

// Helper function - ส่งข้อความไป Line
async function sendMessage(userId: string, text: string, accessToken: string): Promise<void> {
  try {
    await fetch('https://api. line.me/v2/bot/message/push', {
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

// ✅ POST /api/broadcast - ส่ง Broadcast จากเว็บ
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({ error: 'Missing LINE_CHANNEL_ACCESS_TOKEN' });
    }

    const { message } = req.body as { message: string };

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // ส่องข้อความไปทุกคน
    const promises = Array.from(userIds).map(userId =>
      sendMessage(userId, `📢 Broadcast: ${message}`, accessToken)
    );

    await Promise.all(promises);

    return res.status(200).json({
      status: 'success',
      sentTo: userIds.size,
      message: 'Message broadcasted successfully'
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}