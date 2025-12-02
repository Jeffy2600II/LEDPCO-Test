import { Command } from '../types/index.js';

export const helpCommand: Command = {
  name: 'help',
  description: 'แสดงรายชื่อคำสั่งทั้งหมด',
  execute: async () => {
    const commandList = `
📋 *รายชื่อคำสั่ง:*

/help - แสดงรายชื่อคำสั่งทั้งหมด
/time - แสดงเวลาปัจจุบัน
/date - แสดงวันที่ปัจจุบัน
/dice [num] - สุ่มเลข (ค่าเริ่มต้น 6)
/calc [expression] - คำนวณสูตร เช่น /calc 2+2
/echo [text] - ทำซ้ำข้อความ
/status - แสดงสถานะบอท
/weather [city] - แสดงสภาพอากาศ (ทดลอง)
/quote - แสดงสุดค่ำพิงค์
/hello - ทักทาย
    `.trim();
    return {
      success: true,
      message: commandList,
      timestamp: new Date().toISOString()
    };
  }
};

export const timeCommand: Command = {
  name: 'time',
  description: 'แสดงเวลาปัจจุบัน',
  execute: async () => {
    const now = new Date();
    const time = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return {
      success: true,
      message: `🕐 เวลาปัจจุบัน: ${time}`,
      timestamp: new Date().toISOString()
    };
  }
};

export const dateCommand: Command = {
  name: 'date',
  description: 'แสดงวันที่ปัจจุบัน',
  execute: async () => {
    const now = new Date();
    const date = now.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return {
      success: true,
      message: `📅 วันที่ปัจจุบัน: ${date}`,
      timestamp: new Date().toISOString()
    };
  }
};

export const diceCommand: Command = {
  name: 'dice',
  description: 'สุ่มเลข',
  execute: async (args: string[]) => {
    const maxNum = parseInt(args[0]) || 6;
    if (maxNum < 1 || maxNum > 1000) {
      return {
        success: false,
        message: '❌ กรุณาใส่เลขระหว่าง 1 - 1000',
        timestamp: new Date().toISOString()
      };
    }
    const result = Math.floor(Math.random() * maxNum) + 1;
    return {
      success: true,
      message: `🎲 ผลการสุ่ม (1-${maxNum}): ${result}`,
      timestamp: new Date().toISOString()
    };
  }
};

export const calcCommand: Command = {
  name: 'calc',
  description: 'คำนวณสูตร',
  execute: async (args: string[]) => {
    const expression = args.join('');
    if (!expression) {
      return {
        success: false,
        message: '❌ กรุณาใส่สูตรที่ต้องการคำนวณ เช่น /calc 2+2*3',
        timestamp: new Date().toISOString()
      };
    }
    const safeExpression = expression.replace(/[^0-9+\-*/. ()]/g, '');
    if (safeExpression !== expression) {
      return {
        success: false,
        message: '❌ สูตรมีตัวอักษรไม่ถูกต้อง กรุณาใช้เฉพาะตัวเลขและ +, -, *, /, ()',
        timestamp: new Date().toISOString()
      };
    }
    try {
      const result = eval(safeExpression);
      return {
        success: true,
        message: `🧮 ${expression} = ${result}`,
        data: { expression, result },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `❌ สูตรไม่ถูกต้อง: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

export const echoCommand: Command = {
  name: 'echo',
  description: 'ทำซ้ำข้อความ',
  execute: async (args: string[]) => {
    const text = args.join(' ');
    if (!text) {
      return {
        success: false,
        message: '❌ กรุณาใส่ข้อความที่ต้องการทำซ้ำ เช่น /echo สวัสดี',
        timestamp: new Date().toISOString()
      };
    }
    return {
      success: true,
      message: `📢 ${text}`,
      timestamp: new Date().toISOString()
    };
  }
};

export const helloCommand: Command = {
  name: 'hello',
  description: 'ทักทาย',
  execute: async () => {
    const greetings = [
      '👋 สวัสดีครับ!',
      '😊 สวัสดีจ้า!',
      '🤖 เฮลโลว์ค่ะ!',
      '✨ ยินดีต้อนรับจ้า!',
      '🎉 สวัสดีนะครับ!'
    ];
    const message = greetings[Math.floor(Math.random() * greetings.length)];
    return {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };
  }
};

export const statusCommand: Command = {
  name: 'status',
  description: 'แสดงสถานะบอท',
  execute: async () => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const statusMessage = `
✅ *สถานะบอท*
├─ 🤖 บอท: กำลังทำงาน
├─ ⏱️  Uptime: ${hours}h ${minutes}m ${seconds}s
├─ 💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
├─ 📍 Version: 1.0.0
└─ ✨ สถานะ: Ready
    `.trim();
    return {
      success: true,
      message: statusMessage,
      timestamp: new Date().toISOString()
    };
  }
};

export const quoteCommand: Command = {
  name: 'quote',
  description: 'แสดงคำคมสุ่ม',
  execute: async () => {
    const quotes = [
      '💡 \"ความสำเร็จไม่ใช่จุดสิ้นสุด ความล้มเหลวไม่ใช่อันตรายร้ายแรง\" - Winston Churchill',
      '🌟 \"ถ้าคุณคิดว่าคุณทำได้ หรือ คิดว่าคุณทำไม่ได้ คุณก็พูดถูก\" - Henry Ford',
      '🚀 \"อนาคตจะสัมพอกับผู้ที่เชื่อในความสวยงามของฝัน\" - Eleanor Roosevelt',
      '💪 \"ไม่มีสิ่งที่เป็นไปไม่ได้สำหรับผู้ที่มีความตั้งใจ\"',
      '✨ \"การบินเหมือนพยายาม กว่าจะสำเร็จนั้นต้องมีความพยายาม\"'
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    return {
      success: true,
      message: quote,
      timestamp: new Date().toISOString()
    };
  }
};

export const weatherCommand: Command = {
  name: 'weather',
  description: 'แสดงสภาพอากาศ',
  execute: async (args: string[]) => {
    const city = args.join(' ') || 'Bangkok';
    const weatherData = {
      Bangkok: { temp: 28, humidity: 75, condition: 'ร่มเงา' },
      'Chiang Mai': { temp: 22, humidity: 60, condition: 'แจ่มใส' },
      Phuket: { temp: 30, humidity: 85, condition: 'มีฝนเล็กน้อย' }
    };
    const data =
      weatherData[city as keyof typeof weatherData] ||
      { temp: 25, humidity: 70, condition: 'ไม่ทราบ' };
    const message = `
🌤️ *สภาพอากาศ ${city}*
├─ 🌡️  อุณหภูมิ: ${data.temp}°C
├─ 💧 ความชื้น: ${data.humidity}%
└─ 🌦️  สภาพ: ${data.condition}
    `.trim();
    return {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };
  }
};