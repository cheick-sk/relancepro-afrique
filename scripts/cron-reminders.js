#!/usr/bin/env node
/**
 * RelancePro Africa - Cron Job: Automatic Reminders
 * This script is called by Render's cron service every hour
 */

const { exec } = require('child_process');
const https = require('https');
const http = require('http');

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function callCronEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, APP_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: JSON.parse(data || '{}') });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function main() {
  console.log(`[Cron] Starting reminders job at ${new Date().toISOString()}`);
  
  try {
    // Call the reminders endpoint
    const result = await callCronEndpoint('/api/cron/reminders');
    console.log('[Cron] Reminders job completed:', result);
    
    // Call the check-expired endpoint
    await callCronEndpoint('/api/cron/check-expired');
    console.log('[Cron] Expired check completed');
    
    process.exit(0);
  } catch (error) {
    console.error('[Cron] Error:', error.message);
    process.exit(1);
  }
}

main();
