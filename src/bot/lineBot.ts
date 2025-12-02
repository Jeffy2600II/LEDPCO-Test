import { middleware, MiddlewareConfig, MessageEvent, ClientConfig, Client } from '@line/bot-sdk';
import { CommandRegistry } from '../commands/commandRegistry.js';
import { config } from '../config/index.js';

export class LineBot {
  private client: Client;
  private commandRegistry: CommandRegistry;
  
  constructor(commandRegistry: CommandRegistry) {
    const clientConfig: ClientConfig = {
      channelAccessToken: config.line.channelAccessToken ?? '',
      channelSecret: config.line.channelSecret ?? ''
    };
    this.client = new Client(clientConfig);
    this.commandRegistry = commandRegistry;
  }
  
  async handleMessage(event: MessageEvent): Promise < void > {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }
    const userMessage = event.message.text;
    const userId = event.source.userId as string;
    
    console.log(`📨 Message from ${userId}: ${userMessage}`);
    
    if (userMessage.startsWith('/')) {
      await this.handleCommand(event, userMessage, userId);
    } else {
      await this.handleNormalMessage(event, userMessage, userId);
    }
  }
  
  private async handleCommand(event: MessageEvent, userMessage: string, userId: string): Promise < void > {
    const parts = userMessage.slice(1).split(' ');
    const commandName = parts[0];
    const args = parts.slice(1);
    const result = await this.commandRegistry.execute(commandName, args);
    try {
      await this.client.replyMessage(event.replyToken, {
        type: 'text',
        text: result.message
      });
    } catch (error) {
      console.error('Error replying message:', error);
    }
  }
  
  private async handleNormalMessage(event: MessageEvent, userMessage: string, userId: string): Promise < void > {
    const responseMessage = `
🤖 *Smart Command Bot*

เพื่อใช้บอท กรุณาพิมพ์คำสั่งด้วย "/" เช่น:
├─ /help - ดูรายชื่อคำสั่ง
├─ /time - ดูเวลา
├─ /date - ดูวันที่
├─ /dice - สุ่มเลข
├─ /hello - ทักทาย

หรือพิมพ์ "/help" เพื่อดูรายชื่อคำสั่งทั้งหมด ✨
    `.trim();
    try {
      await this.client.replyMessage(event.replyToken, {
        type: 'text',
        text: responseMessage
      });
    } catch (error) {
      console.error('Error replying message:', error);
    }
  }
  
  getMiddleware() {
    const middlewareConfig: MiddlewareConfig = {
      channelAccessToken: config.line.channelAccessToken ?? '',
      channelSecret: config.line.channelSecret ?? ''
    };
    return middleware(middlewareConfig);
  }
}