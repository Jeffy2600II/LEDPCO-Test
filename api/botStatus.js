export default function handler(req, res) {
  const lastEvent = global.lastLineEvent || 0;
  const connected = (Date.now() - lastEvent < 60000); // ถ้า 1 นาทีมี event ถือว่าเชื่อมต่อ
  res.status(200).json({
    connected,
    lastLineEvent: lastEvent,
    now: Date.now()
  });
}