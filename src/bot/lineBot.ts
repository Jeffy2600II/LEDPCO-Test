import { middleware, MiddlewareConfig, MessageEvent } from '@line/bot-sdk';
import { Client } from '@line/bot-sdk';
import { CommandRegistry } from '../commands/commandRegistry.js';
import { config } from '../config/index.js';

/**
 * คลาส Line Bot
 */
export class LineBot {
  private client: Client;
  private middlewareConfig: MiddlewareConfig;
  private commandRegistry: CommandRegistry;
  
  constructor(commandRegistry: CommandRegistry) {
    this.middlewareConfig = {
      channelAccessToken: config.line.channelAccessToken,
      channelSecret: config.line.channelSecret,
    };
    
    this.client = new Client(this.middlewareConfig);
    this.commandRegistry = commandRegistry;
  }
  
  /**
   * ประมวลผลข้อความจาก Line
   */
  async handleMessage(event: MessageEvent): Promise < void > {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }
    
    const userMessage = event.message.text;
    const userId = event.source.userId;
    
    console.log(`📨 Message from ${userId}: ${userMessage}`);
    
    // ตรวจสอบว่าเป็นคำสั่งหรือไม่
    if (userMessage.startsWith('/')) {
      await this.handleCommand(event, userMessage, userId);
    } else {
      // ส่งข้อความปกติ
      await this.handleNormalMessage(event, userMessage, userId);
    }
  }
  
  /**
   * จัดการคำสั่ง
   */
  private async handleCommand(
    event: MessageEvent,
    userMessage: string,
    userId: string,
  ): Promise < void > {
    // แยกคำสั่งและพารามิเตอร์
    const parts = userMessage.slice(1).split(' ');
    const commandName = parts[0];
    const args = parts.slice(1);
    
    // ดำเนินการคำสั่ง
    const result = await this.commandRegistry.execute(commandName, args);
    
    try {
      await this.client.replyMessage(event.replyToken, {
        type: 'text',
        text: result.message,
      });
    } catch (error) {
      console.error('Error replying message:', error);
    }
  }
  
  /**
   * จัดการข้อความปกติ
   */
  private async handleNormalMessage(
    event: MessageEvent,
    userMessage: string,
    userId: string,
  ): Promise < void > {
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
        text: responseMessage,
      });
    } catch (error) {
      console.error('Error replying message:', error);
    }
  }
  
  /**
   * รับ middleware ของ Line
   */
  getMiddleware(): any {
    return middleware(this.middlewareConfig);
  }
  
  /**
   * ส่งข้อความหมู่
   */
  async sendGroupMessage(groupId: string, message: string): Promise < void > {
    try {
      await this.client.pushMessage(groupId, {
        type: 'text',
        text: message,
      });
    } catch (error) {
      console.error('Error sending group message:', error);
    }
  }
  
  /**
   * ส่งข้อความส่วนตัว
   */
  async sendPrivateMessage(userId: string, message: string): Promise < void > {
    try {
      await this.client.pushMessage(userId, {
        type: 'text',
        text: message,
      });
    } catch (error) {
      console.error('Error sending private message:', error);
    }
  }
}