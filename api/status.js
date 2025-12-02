// api/status.js
import { botStatus } from "./webhook";

export default function handler(req, res) {
  res.status(200).json({
    online: botStatus.online,
    lastConnected: botStatus.lastConnected,
  });
}