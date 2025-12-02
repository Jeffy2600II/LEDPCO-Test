export interface BotConnection {
  isConnected: boolean;
  lastConnectedAt: string | null;
  botId: string;
  uptime: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data ? : any;
  timestamp: string;
}

export interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => Promise < CommandResult > ;
}

export interface UserMessage {
  userId: string;
  message: string;
  timestamp: string;
  type: 'text' | 'command';
}