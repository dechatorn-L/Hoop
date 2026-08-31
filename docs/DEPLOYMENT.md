# 🚀 Hoop Shot Counter — Deployment & Remote Testing Guide

> **Version:** 1.1  
> **Last Updated:** 2026-08-31  
> **Application Type:** Static Web Application (Vite + Vanilla JS + Web Audio + WebRTC + Roboflow inferencejs)

---

## ⚠️ ข้อกำหนดสำคัญที่สุดก่อนใช้งานบนมือถือ (Critical Requirement)

> [!IMPORTANT]
> **ต้องใช้งานผ่าน HTTPS เท่านั้น (Mandatory HTTPS)**  
> เบราว์เซอร์บนมือถือ (iOS Safari, Android Chrome) จะ **บล็อกการเข้าถึงกล้อง (`getUserMedia`) ทันทีหากไม่ใช่ HTTPS หรือ localhost**

---

## ☁️ 1. ทดสอบบนมือถือผ่าน Cloudflare Tunnel (แนะนำที่สุดสำหรับทดสอบ) ⚡

**จุดเด่น**: เข้าได้จากทุกที่ทั่วโลก (คนละ Wi-Fi หรือเน็ต 4G/5G มือถือ), ไม่ต้องสมัครบัญชี, ไม่มี Bad Gateway, เสถียรสูง และ **ไม่ต้องกรอก Password**

### วิธีใช้งาน:
1. เปิดเซิร์ฟเวอร์หลัก:
   ```bash
   npm run dev
   ```
2. เปิด Cloudflare Tunnel:
   ```bash
   npm run tunnel:cf
   ```
   *(หรือใช้คำสั่ง: `npx -y untun tunnel https://localhost:5173`)*
3. นำ URL ที่ได้ (เช่น `https://xxxx.trycloudflare.com`) ไปเปิดบน Safari/Chrome ในมือถือได้ทันที

---

## 📱 2. ทดสอบบนมือถือในวง Wi-Fi เดียวกัน (Local HTTPS)

สำหรับทดสอบความเร็วสูงสุดในบ้าน/สนามที่มี Wi-Fi วงเดียวกัน:

1. รันเซิร์ฟเวอร์ Vite (รองรับ Native SSL ผ่าน `@vitejs/plugin-basic-ssl`):
   ```bash
   npm run dev
   ```
2. ดู IP Address ของเครื่อง:
   ```bash
   npm run ip
   ```
3. เปิด URL ที่ได้ (เช่น `https://192.168.1.4:5173/`) บนมือถือ
4. หากมีหน้าต่างเตือน Certificate ให้กด **ขั้นสูง (Advanced) -> ดำเนินการต่อ (Proceed)**

---

## 🌐 3. Deploy ถาวรขึ้น Cloud (ฟรี 100% & เปิดได้ตลอดเวลา)

เมื่อต้องการนำไปใช้งานจริงโดยไม่ต้องเปิดคอมพิวเตอร์ทิ้งไว้:

### ตัวเลือกที่ 1: Vercel (เร็วและสะดวกที่สุด) ⚡
1. รันคำสั่งใน Terminal:
   ```bash
   npx vercel
   ```
2. หรือเชื่อมต่อผ่าน [vercel.com](https://vercel.com) นำเข้าจาก GitHub Repository
3. ได้โดเมนถาวรทันที เช่น `https://hoop-shot-counter.vercel.app`

---

### ตัวเลือกที่ 2: Cloudflare Pages ☁️
1. สร้าง Production Bundle:
   ```bash
   npm run build
   ```
2. ลากโฟลเดอร์ `dist/` ไปวางที่ [pages.cloudflare.com](https://pages.cloudflare.com)
3. หรือเชื่อมต่อผ่าน GitHub Repo (Build command: `npm run build`, Output directory: `dist`)
4. ได้ CDN ความเร็วสูงทั่วโลกฟรีพร้อม HTTPS อัตโนมัติ

---

### ตัวเลือกที่ 3: Netlify 💧
1. สร้าง Production Bundle:
   ```bash
   npm run build
   ```
2. ลากโฟลเดอร์ `dist/` ไปวางที่ [app.netlify.com/drop](https://app.netlify.com/drop)

---

## 📋 Checklist ตรวจสอบการใช้งานบนมือถือ

- [ ] เปิดผ่าน URL ที่เป็น **`https://`**
- [ ] กด **อนุญาต (Allow)** สิทธิ์กล้องบนมือถือ
- [ ] โมเดล AI `people_basketball_hoops/4` โหลดสำเร็จ
- [ ] สลับกล้องหน้า/หลัง (เลือกกล้องหลัง `environment` เพื่อความคมชัด)
- [ ] วางมือถือให้เห็นห่วงบาสและระยะเหนือห่วง 1–2 เมตร
