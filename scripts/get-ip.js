/**
 * Script to get Local Wi-Fi IP & Mobile HTTPS URL
 * Run with: node scripts/get-ip.js (or npm run tunnel:ip)
 */

import os from 'os';

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, ip: iface.address });
      }
    }
  }
  return addresses;
}

async function showConnectionInfo() {
  const localIPs = getLocalIPs();
  const primaryIP = localIPs.find(i => i.ip.startsWith('192.168.'))?.ip || localIPs[0]?.ip || 'localhost';

  console.log('====================================================');
  console.log('🏀 Hoop Shot Counter — Local HTTPS Connection Info');
  console.log('====================================================\n');

  console.log('📱 URL สำหรับเปิดบนมือถือ (ต่อ Wi-Fi เดียวกัน):');
  console.log(`👉 https://${primaryIP}:5173/\n`);

  if (localIPs.length > 1) {
    console.log('🌐 IP ทั้งหมดในเครื่องนี้:');
    localIPs.forEach(item => {
      console.log(`  • ${item.name}: https://${item.ip}:5173/`);
    });
    console.log('');
  }

  console.log('💡 วิธีใช้งาน:');
  console.log('1. มือถือและคอมต้องต่อ Wi-Fi เดียวกัน');
  console.log(`2. เปิด https://${primaryIP}:5173/ บน Safari / Chrome ในมือถือ`);
  console.log('3. หากมีเตือน SSL ให้กด ขั้นสูง (Advanced) -> ดำเนินการต่อ (Proceed)');
  console.log('4. กดอนุญาตกล้อง เพื่อเริ่มใช้งานได้ทันที!\n');
}

showConnectionInfo();
