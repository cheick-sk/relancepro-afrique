/**
 * RelancePro Africa - E2E Global Setup
 * Sets up test database and test users before running E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');

  // Run database migrations
  console.log('📦 Running database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migrations complete');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }

  // Seed test data
  console.log('🌱 Seeding test data...');
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' });
    console.log('✅ Test data seeded');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    // Continue even if seeding fails - data might already exist
  }

  // Create authenticated browser state for tests
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login as test user and save state
    console.log('🔐 Creating authenticated browser state...');
    await page.goto(`${baseURL}/login`);
    
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Save authenticated state
    await context.storageState({ path: '.auth/user.json' });
    console.log('✅ Authenticated state saved');
  } catch (error) {
    console.warn('⚠️ Could not create authenticated state:', error);
  } finally {
    await browser.close();
  }

  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;
