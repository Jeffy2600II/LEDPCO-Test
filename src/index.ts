import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/index.js';
import { CommandRegistry } from './commands/commandRegistry.js';
import {
  helpCommand,
  timeCommand,
  dateCommand,
  diceCommand,
  calcCommand,
  echoCommand,
  helloCommand,
  statusCommand,
  quoteCommand,
  weatherCommand,
} from './commands/builtinCommands.js';
import { LineBot } from './bot/lineBot.js';
import { createDashboardRouter } from './server/dashboard.js';
import type { BotConnection } from './types/index.js';
import { WebhookRequestBody } from '@line/bot-sdk';

// ตรวจสอบการตั้งค่า
const isConfigValid = validateConfig();

// สร้าง Express App
const app: Express = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(cors());
app.use(express.json());

// สร้างการลงทะเบียนคำสั่ง
const commandRegistry = new CommandRegistry();

// ลงทะเบียนคำสั่งทั้งหมด
commandRegistry.register(helpCommand);
commandRegistry.register(timeCommand);
commandRegistry.register(dateCommand);
commandRegistry.register(diceCommand);
commandRegistry.register(calcCommand);
commandRegistry.register(echoCommand);
commandRegistry.register(helloCommand);
commandRegistry.register(statusCommand);
commandRegistry.register(quoteCommand);
commandRegistry.register(weatherCommand);

console.log('📋 Commands registered:');
commandRegistry.getCommands().forEach((cmd) => {
  console.log(`   - /${cmd.name}: ${cmd.description}`);
});

// ข้อมูลการเชื่อมต่อ
const botConnection: BotConnection = {
  isConnected: isConfigValid,
  lastConnectedAt: isConfigValid ? new Date().toISOString() : null,
  botId: 'LINE_BOT_ID',
  uptime: 0,
};

// สร้าง Line Bot
const lineBot = new LineBot(commandRegistry);

// API สำหรับทดสอบ
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Webhook สำหรับ Line Bot
app.post('/webhook', lineBot.getMiddleware(), (req: Request, res: Response) => {
  const events = (req.body as WebhookRequestBody).events;
  
  console.log('📦 Webhook received:', events.length, 'events');
  
  Promise.all(
    events.map(async (event) => {
      try {
        if (event.type === 'message') {
          await lineBot.handleMessage(event);
        } else if (event.type === 'follow') {
          console.log('✅ User followed bot');
        } else if (event.type === 'unfollow') {
          console.log('❌ User unfollowed bot');
        }
      } catch (error) {
        console.error('Error handling event:', error);
      }
    }),
  ).then(() => {
    res.json({ ok: true });
  });
});

// Dashboard Routes
app.use('/dashboard', createDashboardRouter(commandRegistry, botConnection));

// Redirect root to dashboard
app.get('/', (req: Request, res: Response) => {
  res.redirect('/dashboard');
});

// Error handling
app.use((err: any, req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// อัปเดต uptime
setInterval(() => {
  botConnection.uptime = process.uptime() * 1000;
}, 1000);

// Start Server (for local development)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🤖 Line Bot Dashboard Server         ║
╠════════════════════════════════════════╣
║   ✅ Server started on port ${port}     ║
║   📊 Dashboard: http://localhost:${port}/dashboard
║   🔌 Webhook: http://localhost:${port}/webhook
║   ❤️  Health: http://localhost:${port}/health
╠════════════════════════════════════════╣
║   Status: ${botConnection.isConnected ? '🟢 Connected' : '🔴 Not Connected'}
║   Config Valid: ${isConfigValid ? '✅ Yes' : '❌ No'}
╚════════════════════════════════════════╝
    `);
  });
}

export { app };