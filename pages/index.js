import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState({
    online: false,
    lastConnected: null,
  });
  
  // โหลดสถานะทุก 5 วินาที
  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch("/api/status");
      const json = await res.json();
      setStatus(json);
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <main style={{ fontFamily: "sans-serif", background: "#f2f2f2", minHeight: "100vh" }}>
      <div style={{
        background: "#fff", borderRadius: "6px", padding: 24,
        boxShadow: "0 2px 5px #ccc", maxWidth: 430, margin: "48px auto"
      }}>
        <h2>สถานะบอท LINE</h2>
        <p>
          สถานะเชื่อมต่อกับ LINE:&nbsp;
          <span style={{ color: status.online ? "green" : "red" }}>
            {status.online ? "ออนไลน์ ✅" : "ออฟไลน์ ❌"}
          </span>
        </p>
        <p>เชื่อมต่อล่าสุด: {status.lastConnected ? status.lastConnected : "-"}</p>
        <hr />
        <h4>ตั้งบอท LINE Webhook</h4>
        <ol>
          <li>สมัคร LINE Developer และสร้าง Channel</li>
          <li>ตั้ง Webhook URL ไปที่ <code>https://your-vercel-domain.vercel.app/api/webhook</code></li>
          <li>ทดลองส่งข้อความหา Channel</li>
        </ol>
        <p style={{ fontSize: "smaller", color: "#888" }}>
          * หน้าเว็บจะอัปเดตสถานะอัตโนมัติทุก 5 วินาที
        </p>
      </div>
    </main>
  );
}