/**
 * @fileoverview All-in-One Runner: Auto-starts Vite Dev Server + Cloudflare Quick Tunnel
 * Run with: npm run tunnel:cf (or node scripts/start-tunnel-cf.js)
 */

import https from 'node:https';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { startTunnel } from 'untun';

let viteProcess = null;
let cloudflareTunnel = null;

/**
 * Check if a local server is responding on port 5173
 */
function checkLocalServer(port = 5173) {
  return new Promise((resolve) => {
    const req = https.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/',
        rejectUnauthorized: false,
        timeout: 1000,
      },
      () => resolve({ running: true, protocol: 'https' })
    );

    req.on('error', () => {
      const httpReq = http.get(
        {
          hostname: '127.0.0.1',
          port,
          path: '/',
          timeout: 1000,
        },
        () => resolve({ running: true, protocol: 'http' })
      );
      httpReq.on('error', () => resolve({ running: false, protocol: null }));
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ running: false, protocol: null });
    });
  });
}

/**
 * Automatically start Vite Dev Server in the background
 */
async function startViteDevServer() {
  console.log('⚡ Starting Vite Dev Server...');
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  viteProcess = spawn(npmCmd, ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  viteProcess.on('error', (err) => {
    console.error('❌ Failed to spawn Vite dev server:', err.message);
  });

  // Wait up to 15 seconds for Vite to be ready
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const check = await checkLocalServer(5173);
    if (check.running) {
      console.log(`\n✅ Vite Dev Server is ready on ${check.protocol}://127.0.0.1:5173\n`);
      return check;
    }
  }

  throw new Error('Vite dev server failed to start within 15 seconds.');
}

async function launchCloudflareTunnel() {
  console.log('====================================================');
  console.log('☁️  Starting Hoop Shot Counter (Dev Server + Tunnel)...');
  console.log('====================================================\n');

  try {
    // 1. Check if Vite is already running; if not, auto-start it
    let serverStatus = await checkLocalServer(5173);
    if (!serverStatus.running) {
      serverStatus = await startViteDevServer();
    } else {
      console.log(`✅ พบ Vite Dev Server ทำงานอยู่แล้วที่ ${serverStatus.protocol}://127.0.0.1:5173\n`);
    }

    // 2. Start Cloudflare Tunnel pointing to 127.0.0.1:5173
    console.log('🌐 Connecting to Cloudflare Network...');
    const targetUrl = `${serverStatus.protocol}://127.0.0.1:5173`;

    cloudflareTunnel = await startTunnel({
      url: targetUrl,
      verifyTLS: false, // Allows self-signed Vite basic-ssl cert
      acceptCloudflareNotice: true,
    });

    if (!cloudflareTunnel) {
      throw new Error('Could not initialize Cloudflare tunnel.');
    }

    const tunnelUrl = await cloudflareTunnel.getURL();

    console.log('\n====================================================');
    console.log('🎉 Cloudflare Tunnel Ready! (เข้าใช้งานได้จากทุกที่ทั่วโลก)');
    console.log('====================================================');
    console.log(`\n📱 Mobile HTTPS URL:`);
    console.log(`👉 \x1b[32m\x1b[1m${tunnelUrl}\x1b[0m\n`);
    console.log('💡 วิธีใช้งาน:');
    console.log('1. เปิด URL สีเขียวด้านบนในมือถือ (iOS Safari / Android Chrome)');
    console.log('2. ใช้งานได้ทั้ง 4G, 5G และ Wi-Fi (ไม่ต้องต่อวง LAN เดียวกัน)');
    console.log('3. อนุญาตการใช้งานกล้อง เพื่อเริ่มเล่นและนับแต้มได้ทันที!\n');
    console.log('====================================================');
    console.log('กด Ctrl+C เพื่อหยุดการทำงานทั้งหมด (Vite + Tunnel)\n');

    // 3. Graceful shutdown handler for Ctrl+C
    const cleanup = async () => {
      console.log('\n🛑 Shutting down Dev Server & Cloudflare Tunnel...');
      if (cloudflareTunnel) {
        try {
          await cloudflareTunnel.close();
        } catch { }
      }
      if (viteProcess) {
        try {
          viteProcess.kill();
        } catch { }
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (viteProcess) {
      viteProcess.kill();
    }
    process.exit(1);
  }
}

launchCloudflareTunnel();
// node scripts/start-tunnel-cf.js
// npm run tunnel:cf