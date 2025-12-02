import { getStatus } from '../lib/storage';
import Head from 'next/head';

export async function getServerSideProps() {
  const status = await getStatus();
  return { props: { lastWebhookAt: status.lastWebhookAt || null } };
}

export default function Home({ lastWebhookAt }) {
  return (
    <>
      <Head>
        <title>LINE Bot Status</title>
      </Head>
      <div style={{fontFamily:"sans-serif",background:"#f7f7f7",minHeight:"100vh",padding:"2rem"}}>
        <div style={{
          background:"#fff",border:"1px solid #e0e0e0",padding:"1.2rem",
          borderRadius:"6px",maxWidth:"900px",margin:"0 auto"
        }}>
          <h1>LINE Bot — หน้าแสดงสถานะ (พื้นฐาน)</h1>
          <p>Last webhook: <strong>{lastWebhookAt ? lastWebhookAt : "ยังไม่เคยได้รับ webhook จาก LINE"}</strong></p>

          <h2>วิธีตรวจสอบการเชื่อมต่อ</h2>
          <ol>
            <li>ตั้งค่า Webhook URL ใน LINE Developer Console ให้ชี้ที่:<br/>
              <pre style={{background:"#fafafa",padding:"0.5rem"}}>https://YOUR_PROJECT_URL/api/webhook</pre>
            </li>
            <li>ส่งข้อความมาที่ bot แล้วตรวจดู Reply ใน LINE หรือดู Logs</li>
          </ol>

          <h3>คำสั่งพื้นฐาน</h3>
          <ul>
            <li>help / ช่วย</li>
            <li>ping</li>
            <li>สวัสดี</li>
            <li>echo &lt;ข้อความ&gt;</li>
            <li>2 + 3 หรือ 2 บวก 3</li>
            <li>status / สถานะ</li>
          </ul>

          <p style={{color:"#666"}}>หมายเหตุ: สถานะในนี้ถูกเก็บแบบไฟล์ (ไม่ใช่ฐานข้อมูล)</p>
        </div>
      </div>
    </>
  );
}