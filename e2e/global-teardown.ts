/**
 * RelancePro Africa - E2E Global Teardown
 * Cleans up test data after running E2E tests
 */

import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up test database
  console.log('🗑️ Cleaning test database...');
  try {
    // Reset database to clean state
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    console.log('✅ Database cleaned');
  } catch (error) {
    console.warn('⚠️ Database cleanup failed:', error);
  }

  // Remove authentication state files
  console.log('🧽 Removing authentication state...');
  const authFiles = ['.auth/user.json', '.auth/admin.json'];
  
  for (const file of authFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`  Removed: ${file}`);
    }
  }

  // Remove test artifacts older than retention period
  const testResultsDir = 'test-results';
  if (fs.existsSync(testResultsDir)) {
    const retentionDays = 7;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    
    const files = fs.readdirSync(testResultsDir);
    for (const file of files) {
      const filePath = `${testResultsDir}/${file}`;
      const stats = fs.statSync(filePath);
      
      if (stats.mtimeMs < cutoff) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`  Removed old artifact: ${file}`);
      }
    }
  }

  console.log('✅ E2E test environment cleanup complete');
}

export default globalTeardown;
