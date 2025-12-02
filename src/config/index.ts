import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Line Configuration
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  },
  
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  
  // App Configuration
  app: {
    botName: 'Smart Command Bot',
    version: '1.0.0',
  },
};

export const validateConfig = (): boolean => {
  const required = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Bot may not work properly. Please set these variables.');
  }
  
  return missing.length === 0;
};