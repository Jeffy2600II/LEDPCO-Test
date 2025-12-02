import { Command, CommandResult } from '../types/index.js';

export class CommandRegistry {
  private commands: Map < string, Command > = new Map();
  
  register(command: Command): void {
    this.commands.set(command.name.toLowerCase(), command);
    console.log(`✅ Registered command: ${command.name}`);
  }
  
  async execute(commandName: string, args: string[] = []): Promise < CommandResult > {
    const command = this.commands.get(commandName.toLowerCase());
    if (!command) {
      return {
        success: false,
        message: `❌ ไม่พบคำสั่ง: ${commandName}\nพิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`,
        timestamp: new Date().toISOString()
      };
    }
    try {
      return await command.execute(args);
    } catch (error: any) {
      return {
        success: false,
        message: `❌ เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }
  
  hasCommand(commandName: string): boolean {
    return this.commands.has(commandName.toLowerCase());
  }
}