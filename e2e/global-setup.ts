/**
 * Global setup — chạy 1 lần trước toàn bộ test suite.
 * Đăng nhập grader lamtung và lưu storageState vào e2e/.auth/grader.json
 * để các test trong grader-scoring.spec.ts tái sử dụng mà không cần login lại.
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_DIR = path.join(__dirname, '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'grader.json');
const BASE_URL = 'https://hcqtc.vn';

export default async function globalSetup() {
    // Tạo thư mục .auth nếu chưa có
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();

    await page.goto('/login');
    await page.waitForSelector('#username', { state: 'visible' });
    await page.fill('#username', 'lamtung');
    await page.fill('#password', 'LAM@123');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL('**/dashboard-grader/**', { timeout: 15_000 });

    // Lưu cookies + localStorage (token_kolla, user_kolla, expiration_kolla_token)
    await context.storageState({ path: AUTH_FILE });
    console.log('[global-setup] Grader auth state saved to', AUTH_FILE);

    await browser.close();
}
