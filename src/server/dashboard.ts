import express, { Request, Response } from 'express';
import { CommandRegistry } from '../commands/commandRegistry.js';
import { BotConnection } from '../types/index.js';

/**
 * สร้างเว็บแดชบอร์ด
 */
export function createDashboardRouter(
  commandRegistry: CommandRegistry,
  botConnection: BotConnection,
) {
  const router = express.Router();

  /**
   * API: ดึงข้อมูลการเชื่อมต่อ
   */
  router.get('/api/status', (req: Request, res: Response) => {
    res.json({
      isConnected: botConnection.isConnected,
      lastConnectedAt: botConnection.lastConnectedAt,
      botId: botConnection.botId,
      uptime: botConnection.uptime,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * API: รายชื่อคำสั่งทั้งหมด
   */
  router.get('/api/commands', (req: Request, res: Response) => {
    const commands = commandRegistry.getCommands(). map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
    }));

    res.json({
      total: commands.length,
      commands,
    });
  });

  /**
   * Serve Dashboard HTML
   */
  router.get('/', (req: Request, res: Response) => {
    const htmlContent = getDashboardHTML(botConnection);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  });

  return router;
}

/**
 * HTML Dashboard
 */
function getDashboardHTML(botConnection: BotConnection): string {
  const statusColor = botConnection.isConnected ?  '#22c55e' : '#ef4444';
  const statusText = botConnection.isConnected ?  'เชื่อมต่อ ✅' : 'ไม่เชื่อมต่อ ❌';
  const uptime = Math.floor(botConnection.uptime / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  return `
<! DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Line Bot Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            width: 100%;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        . card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        .card h2 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-card {
            grid-column: 1 / -1;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            margin-top: 10px;
        }

        .status-dot {
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background-color: ${statusColor};
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .stat-item {
            margin: 12px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .stat-label {
            color: #666;
            font-weight: 500;
        }

        .stat-value {
            color: #667eea;
            font-weight: 700;
            font-size: 1.1em;
        }

        . commands-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .command-item {
            padding: 12px;
            margin: 8px 0;
            background: #f9f9f9;
            border-left: 4px solid #667eea;
            border-radius: 5px;
            transition: background 0.3s ease;
        }

        .command-item:hover {
            background: #f0f0f0;
        }

        .command-name {
            font-weight: 700;
            color: #667eea;
            font-size: 0.95em;
        }

        . command-desc {
            color: #666;
            font-size: 0.85em;
            margin-top: 5px;
        }

        .footer {
            text-align: center;
            color: white;
            margin-top: 30px;
            opacity: 0.8;
        }

        .loading {
            text-align: center;
            color: #999;
            font-style: italic;
        }

        @media (max-width: 600px) {
            .grid {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Line Bot Dashboard</h1>
            <p>ระบบจัดการบอท Line อัจฉริยะ</p>
        </div>

        <div class="grid">
            <!-- Status Card -->
            <div class="card status-card">
                <h2>📊 สถานะการเชื่อมต่อ</h2>
                <div class="status-indicator">
                    <div class="status-dot"></div>
                    <span>${statusText}</span>
                </div>
                <div class="stat-item" style="background: rgba(255,255,255,0.1); margin-top: 15px;">
                    <span class="stat-label" style="color: white;">Uptime</span>
                    <span class="stat-value" style="color: #4ade80;">${hours}h ${minutes}m ${seconds}s</span>
                </div>
                <div class="stat-item" style="background: rgba(255,255,255,0.1);">
                    <span class="stat-label" style="color: white;">เวลาเชื่อมต่อล่าสุด</span>
                    <span class="stat-value" style="color: #60a5fa;">${
                      botConnection.lastConnectedAt || 'ยังไม่เชื่อมต่อ'
                    }</span>
                </div>
            </div>

            <!-- Info Card -->
            <div class="card">
                <h2>ℹ️ ข้อมูลบอท</h2>
                <div class="stat-item">
                    <span class="stat-label">ชื่อบอท</span>
                    <span class="stat-value">Smart Bot</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Version</span>
                    <span class="stat-value">1. 0.0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Platform</span>
                    <span class="stat-value">Line</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Environment</span>
                    <span class="stat-value">Production</span>
                </div>
            </div>

            <!-- Statistics -->
            <div class="card">
                <h2>📈 สถิติ</h2>
                <div class="stat-item">
                    <span class="stat-label">จำนวนคำสั่ง</span>
                    <span class="stat-value" id="commandCount">กำลังโหลด... </span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">API Status</span>
                    <span class="stat-value" style="color: #22c55e;">Active</span>
                </div>
            </div>

            <!-- Commands Card -->
            <div class="card">
                <h2>⚙️ คำสั่งทั้งหมด</h2>
                <div class="commands-list" id="commandsList">
                    <div class="loading">กำลังโหลดรายชื่อคำสั่ง...</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🚀 Smart Command Bot Dashboard • Built with ❤️</p>
        </div>
    </div>

    <script>
        // ดึงข้อมูลสถานะ
        async function updateStatus() {
            try {
                const response = await fetch('/dashboard/api/status');
                const data = await response. json();
                console.log('Status:', data);
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        }

        // ดึงรายชื่อคำสั่ง
        async function loadCommands() {
            try {
                const response = await fetch('/dashboard/api/commands');
                const data = await response.json();
                const commandsList = document.getElementById('commandsList');
                document.getElementById('commandCount').textContent = data.total;

                commandsList.innerHTML = data.commands
                    .map(
                        (cmd) => \`
                    <div class="command-item">
                        <div class="command-name">/ \${cmd.name}</div>
                        <div class="command-desc">\${cmd.description}</div>
                    </div>
                \`,
                    )
                    .join('');
            } catch (error) {
                console.error('Error loading commands:', error);
                document.getElementById('commandsList').innerHTML =
                    '<div class="loading">ไม่สามารถโหลดรายชื่อคำสั่ง</div>';
            }
        }

        // อัปเดตข้อมูลเมื่อหน้าโหลด
        document.addEventListener('DOMContentLoaded', () => {
            updateStatus();
            loadCommands();

            // อัปเดตทุก 5 วินาที
            setInterval(updateStatus, 5000);
        });
    </script>
</body>
</html>
  `;
}