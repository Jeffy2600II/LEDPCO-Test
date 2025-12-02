import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    fetch("/api/botStatus")
      .then(res => res.json())
      .then(setStatus);
    const interval = setInterval(() => {
      fetch("/api/botStatus")
        .then(res => res.json())
        .then(setStatus);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2em' }}>
      <h1>LINE Bot สถานะการเชื่อมต่อ</h1>
      {!status ? <p>กำลังโหลด...</p> : (
        <div>
          <p>สถานะ: <b style={{ color: status.connected ? "green" : "red" }}>{status.connected ? "เชื่อมต่อ" : "ไม่เชื่อมต่อ"}</b></p>
          <p>เวลา Event จาก LINE: {status.lastLineEvent ? new Date(status.lastLineEvent).toLocaleTimeString() : "ไม่มีข้อมูล"}</p>
        </div>
      )}
      <h2>คำสั่งใน LINE ที่รองรับ:</h2>
      <ul>
        <li>"สวัสดี" - บอทตอบว่า "สวัสดีครับ"</li>
        <li>"เวลา" - บอทตอบว่า "ขณะนี้เวลา:"</li>
      </ul>
    </div>
  );
}