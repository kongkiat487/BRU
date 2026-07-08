# 🎓 BRU - ข้อมูลการสมัครเรียน มหาวิทยาลัยราชภัฏบุรีรัมย์

[![Real-time Fetch API](https://img.shields.io/badge/Data%20Source-Google%20Sheets%20Live-00C853?style=for-the-badge&logo=google-sheets&logoColor=white)](https://docs.google.com/spreadsheets/d/e/2PACX-1vRV9_mpDA5cuhzG700dNNwD54BvOqBILqZkAlygrNNw9EW7L4N175UiAWwzBNF7TkWIpLJWJh6P-Tu4/pub?gid=1269439941&single=true&output=csv)
[![Tailwind CSS v3](https://img.shields.io/badge/Style-Tailwind%20CSS%20v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Chart.js](https://img.shields.io/badge/Charts-Chart.js-FF6384?style=for-the-badge&logo=chart.dot.js&logoColor=white)](https://www.chartjs.org/)
[![Node.js Proxy](https://img.shields.io/badge/Backend-Node.js%20Proxy-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**Web Dashboard หน้าเดียว (Single-Page Dashboard)** สำหรับวิเคราะห์และติดตามข้อมูลการรับสมัครนักศึกษา มหาวิทยาลัยราชภัฏบุรีรัมย์ (Buriram Rajabhat University) แบบ Real-time ดึงข้อมูลตรงจากฐานข้อมูล Google Sheets CSV

---

## ✨ คุณสมบัติเด่น (Features)

* 📡 **Real-time 100% Fetch API**: ดึงข้อมูลสดจาก Google Sheets CSV ทุกครั้งที่เปิดหน้าเว็บ พร้อมสถานะ Live Connection
* 🚀 **Node.js Backend Proxy (`local-server.js`)**: แก้ปัญหา CORS และข้อจำกัดความปลอดภัยของเบราว์เซอร์อย่างสมบูรณ์แบบโดยไม่ต้องใช้ external dependencies (ใช้ built-in `http`, `https`, `fs`)
* 🌓 **Dark / Light Theme Toggle**: รองรับโหมดมืด (Dark Slate & Neon Glow) และโหมดสว่าง (Light Theme) สไตล์ Modern Glassmorphism
* 🔍 **Interactive Filters**: ตัวกรองข้อมูลแบบเรียลไทม์ (ปีการศึกษา, คณะ/หน่วยงาน, ประเภทการสมัคร, ช่องค้นหาชื่อคณะ)
* 📊 **4 กราฟวิเคราะห์ด้วย Chart.js**:
  1. กราฟแนวโน้มรายปี (Bar + Line Combo Chart) ตั้งแต่ปี 2564-2567
  2. กราฟสัดส่วนตามประเภท (Doughnut Chart: Admission vs Quota)
  3. กราฟจัดอันดับยอดสมัครรายคณะ (Horizontal Bar Chart)
  4. กราฟอัตราการสอบผ่านแต่ละคณะ (%) (Horizontal Bar Chart พร้อม Dynamic Color Scale)
* 📑 **ตารางข้อมูลเชิงลึก (Sortable & Paginated Table)**: เรียงลำดับคอลัมน์ได้ทันที พร้อมระบบแบ่งหน้า (10, 20, 50, 100 แถว/หน้า)

---

## 🛠️ วิธีติดตั้งและเปิดใช้งาน (How to Run)

### วิธีที่ 1: เปิดผ่าน Node.js Server (แนะนำที่สุด ⭐)
วิธีนี้ทำให้การดึงข้อมูล CSV ราบรื่น 100% ไม่ติดบล็อก CORS ใดๆ จากเบราว์เซอร์:

1. เปิด Terminal หรือ Command Prompt ในโฟลเดอร์นี้
2. รันคำสั่งเปิดเซิร์ฟเวอร์ (ไม่ต้องติดตั้ง npm install ใดๆ เพิ่ม):
   ```bash
   node local-server.js
   ```
3. เปิดเว็บเบราว์เซอร์ไปที่:
   👉 **`http://localhost:3001`**

---

### วิธีที่ 2: เปิดผ่าน Live Server ใน VS Code
1. เปิดโปรเจกต์ใน Visual Studio Code
2. คลิกขวาที่ไฟล์ `index.html` แล้วเลือก **"Open with Live Server"**
