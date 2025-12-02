import express, { Request, Response } from 'express';
import { CommandRegistry } from '../commands/commandRegistry.js';
import { BotConnection } from '../types/index.js';

export function createDashboardRouter(
    commandRegistry: CommandRegistry,
    botConnection: BotConnection
) {
    const router = express.Router();
    
    // API: Bot Status
    router.get('/api/status', (req: Request, res: Response) => {
        res.json({
            isConnected: botConnection.isConnected,
            lastConnectedAt: botConnection.lastConnectedAt,
            botId: botConnection.botId,
            uptime: botConnection.uptime,
            timestamp: new Date().toISOString()
        });
    });
    
    // API: Commands List
    router.get('/api/commands', (req: Request, res: Response) => {
        const commands = commandRegistry.getCommands().map((cmd) => ({
            name: cmd.name,
            description: cmd.description
        }));
        res.json({
            total: commands.length,
            commands
        });
    });
    
    // Dashboard HTML
    router.get('/', (req: Request, res: Response) => {
        const htmlContent = getDashboardHTML(botConnection);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);
    });
    
    return router;
}

function getDashboardHTML(botConnection: BotConnection): string {
    const statusColor = botConnection.isConnected ? '#22c55e' : '#ef4444';
    const statusText = botConnection.isConnected ? 'เชื่อมต่อ ✅' : 'ไม่เชื่อมต่อ ❌';
    const uptime = Math.floor(botConnection.uptime / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Line Bot Dashboard</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
        .container { max-width: 700px; margin: 2rem auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.09); padding: 2rem; }
        h1 { font-size: 2.1rem; color: #444; }
        .status { display: flex; align-items: center; margin-bottom: 1.2rem; }
        .status-dot { width: 18px; height: 18px; border-radius: 50%; margin-right: .7rem; background: ${statusColor}; box-shadow: 0 0 6px ${statusColor}; }
        .status-label { font-weight: bold; }
        .meta { margin-bottom: 1rem; }
        .meta span { display: inline-block; min-width: 120px; }
        .card { margin-bottom: 1.7rem; background: #f9fafb; border-radius: 9px; padding: 1.3rem 1.1rem; }
        table { border-collapse: collapse; width: 100%; background: #fff; }
        th, td { text-align: left; padding: 8px 12px; }
        th { background: #e0e7ef; }
        tr { border-bottom: 1px solid #eee; }
        tr:last-child { border-bottom: none; }
        .footer { margin-top: 2.5rem; text-align: center; color: #888; font-size: 0.93em; }
        @media (max-width: 650px) {
            .container { padding: 1.2rem; }
            h1 { font-size: 1.45rem; }
        }
    </style>
    <script>
      async function loadCommands() {
        try {
          const resp = await fetch('/dashboard/api/commands');
          const data = await resp.json();
          const table = document.getElementById('cmd-table');
          table.innerHTML = '<tr><th>คำสั่ง</th><th>รายละเอียด</th></tr>' +
            data.commands.map(cmd => '<tr><td>/' + cmd.name + '</td><td>' + cmd.description + '</td></tr>').join('');
          document.getElementById('cmd-total').textContent = data.total;
        } catch(err) { }
      }
      async function updateStatus() {
        try {
          const resp = await fetch('/dashboard/api/status');
          const data = await resp.json();
          document.getElementById('stat-uptime').textContent = formatUptime(Math.floor((data.uptime || 0)/1000));
          document.getElementById('stat-status').textContent = data.isConnected ? "เชื่อมต่อ ✅" : "ไม่เชื่อมต่อ ❌";
        } catch(err) { }
      }
      function formatUptime(total) {
        let h=Math.floor(total/3600), m=Math.floor((total%3600)/60), s=total%60;
        return h+'h '+m+'m '+s+'s';
      }
      document.addEventListener('DOMContentLoaded', () => {
        loadCommands();
        updateStatus();
        setInterval(updateStatus, 5000);
      });
    </script>
</head>
<body>
    <div class="container">
        <h1>🤖 Line Bot Dashboard</h1>
        <div class="status">
            <span class="status-dot"></span>
            <span class="status-label" id="stat-status">${statusText}</span>
        </div>
        <div class="meta">
            <span>Uptime:</span>
            <span id="stat-uptime">${hours}h ${minutes}m ${seconds}s</span>
        </div>
        <div class="meta">
            <span>เชื่อมต่อล่าสุด:</span>
            <span>${botConnection.lastConnectedAt || 'ยังไม่เชื่อมต่อ'}</span>
        </div>
        <div class="card">
            <b>รายชื่อคำสั่ง <span style="color:#324">(<span id="cmd-total">...</span>)</span></b>
            <table id="cmd-table"><tr><td colspan="2">กำลังโหลด...</td></tr></table>
        </div>
        <div class="footer">
            🚀 Smart Command Bot Dashboard • Built with ❤️
        </div>
    </div>
</body>
</html>
  `;
}