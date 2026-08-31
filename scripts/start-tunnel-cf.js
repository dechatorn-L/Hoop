/**
 * @fileoverview Script to start Cloudflare Quick Tunnel for Hoop Shot Counter
 * Run with: npm run tunnel:cf (or node scripts/start-tunnel-cf.js)
 */

import { startTunnel } from 'untun';

async function launchCloudflareTunnel() {
  console.log('====================================================');
  console.log('☁️  Starting Cloudflare Quick Tunnel...');
  console.log('====================================================\n');

  try {
    const tunnel = await startTunnel({
      url: 'https://localhost:5173',
      verifyTLS: false, // Allows self-signed Vite basic-ssl cert
      acceptCloudflareNotice: true,
    });

    if (!tunnel) {
      throw new Error('Could not initialize Cloudflare tunnel.');
    }

    const tunnelUrl = await tunnel.getURL();

    console.log('====================================================');
    console.log('🎉 Cloudflare Tunnel Ready! (ใช้ได้จากทุกที่ทั่วโลก)');
    console.log('====================================================');
    console.log(`\n📱 Mobile HTTPS URL:`);
    console.log(`👉 \x1b[32m\x1b[1m${tunnelUrl}\x1b[0m\n`);
    console.log('💡 วิธีใช้งาน:');
    console.log('1. เปิด URL ด้านบนใน Safari (iOS) หรือ Chrome (Android)');
    console.log('2. ใช้งานได้ทั้ง 4G, 5G และ Wi-Fi ทุกที่ทั่วโลก');
    console.log('3. ไม่ต้องกรอก Password และไม่มี Bad Gateway');
    console.log('4. กดอนุญาตกล้อง เพื่อเริ่มนับคะแนนชู้ตบาสได้ทันที!\n');
    console.log('====================================================');
    console.log('กด Ctrl+C เพื่อหยุดการทำงานของ Tunnel\n');

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('\nStopping Cloudflare Tunnel...');
      await tunnel.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Failed to start Cloudflare tunnel:', err.message);
  }
}

launchCloudflareTunnel();