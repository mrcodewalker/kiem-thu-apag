/**
 * ============================================================
 * SETUP MOCK DATA — Chuẩn bị dữ liệu cho kiểm thử NỘP BÀI TẬP LỚN
 * URL: https://hcqtc.vn
 * Framework: Playwright (UI automation)
 * ============================================================
 *
 * LUỒNG THỰC HIỆN:
 *   SETUP-SS-01: Đăng nhập Secretary/Admin
 *   SETUP-SS-02: Tạo kế hoạch thi online (nếu chưa có)
 *   SETUP-SS-03: Tạo phòng thi cho kế hoạch
 *   SETUP-SS-04: Thêm thí sinh CT070218 vào phòng thi
 *
 * MỤC ĐÍCH:
 *   Sau khi chạy file này, sinh viên CT070218 sẽ có môn thi online
 *   trong danh sách → có thể nộp bài tập lớn ở subject-submission.spec.ts
 *
 * CHẠY:
 *   npx playwright test setup-subject-submission-data --headed
 * ============================================================
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsSecretary, TEST_DATA as AUTH_DATA } from './helpers/auth.helper';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, 'secretary-setup-ss-auth.json');

// ============================================================
// CẤU HÌNH DỮ LIỆU MOCK
// ============================================================
const DECISION_NAME = AUTH_DATA.existingDecisionName;

const SCHEDULE = {
    subjectName: 'Bài tập lớn Kiểm thử PM',
    clazz: 'CT07',
    subjectCodeUnique: 'BTLKTPM2025',
    subjectCredits: '3',
    format: 'Bài tập lớn',
    onlineExam: 'x', // Phải là online để sinh viên nộp bài được
    startTimeRaw: '01/05/2026 08:00 đến 30/06/2026 23:59',
    note: 'Mock data — dùng cho kiểm thử nộp bài tập lớn',
};

const ROOM = {
    roomName: 'Phòng BTL-CT07',
};

const STUDENT = {
    studentCode: 'CT070218',
    fullName: 'Huỳnh Ngọc Hải',
    dateOfBirth: '24/11/2004',
    clazz: 'CT07',
};

// ============================================================
// TESTS
// ============================================================

test.describe.serial('Setup Mock Data — Nộp bài tập lớn', () => {

    // ─── SETUP-SS-01 ─────────────────────────────────────────
    test('SETUP-SS-01: Đăng nhập Secretary', async ({ page }) => {
        await loginAsSecretary(page);
        await expect(page).toHaveURL(/dashboard/);

        if (!fs.existsSync(path.dirname(AUTH_FILE))) {
            fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
        }
        await page.context().storageState({ path: AUTH_FILE });
        console.log('✅ SETUP-SS-01: Đăng nhập Secretary thành công.');
    });

    test.describe('Tạo dữ liệu', () => {
        test.use({ storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined });

        // ─── SETUP-SS-02 ─────────────────────────────────────────
        test('SETUP-SS-02: Tạo kế hoạch thi online cho nộp bài', async ({ page }) => {
            await page.goto('/dashboard/exam-schedules');
            await page.waitForSelector('.esm-title', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(1000);

            // Mở dialog thêm kế hoạch
            await page.click('button:has-text("Thêm kế hoạch")');
            await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });

            // Chọn quyết định thi
            const modalInput = page.locator('.modal app-search-select input').first();
            await modalInput.click();
            await modalInput.fill(DECISION_NAME);
            await modalInput.press('Enter');
            await page.waitForTimeout(800);
            const opt = page.locator('.ss-opt, [class*="ss-option"]').first();
            if (await opt.isVisible({ timeout: 3000 })) await opt.click();
            await page.waitForTimeout(500);

            // Điền form
            await page.fill('input[formControlName="subjectName"]', SCHEDULE.subjectName);
            await page.fill('input[formControlName="clazz"]', SCHEDULE.clazz);
            await page.fill('input[formControlName="subjectCodeUnique"]', SCHEDULE.subjectCodeUnique);
            await page.fill('input[formControlName="subjectCredits"]', SCHEDULE.subjectCredits);
            await page.fill('input[formControlName="format"]', SCHEDULE.format);
            await page.fill('input[formControlName="onlineExam"]', SCHEDULE.onlineExam);
            await page.fill('input[formControlName="startTimeRaw"]', SCHEDULE.startTimeRaw);
            await page.locator('input[formControlName="startTimeRaw"]').blur();
            await page.waitForTimeout(300);
            await page.fill('textarea[formControlName="note"]', SCHEDULE.note);

            // Submit
            const submitBtn = page.locator('.ma-foot .ma-btn-save');
            await expect(submitBtn).not.toBeDisabled();
            await submitBtn.click();
            await page.waitForSelector('.modal', { state: 'hidden', timeout: 10_000 });
            await page.waitForTimeout(1000);

            console.log(`✅ SETUP-SS-02: Đã tạo kế hoạch thi "${SCHEDULE.subjectName}".`);
        });

        // ─── SETUP-SS-03 ─────────────────────────────────────────
        test('SETUP-SS-03: Tạo phòng thi cho kế hoạch', async ({ page }) => {
            await page.goto('/dashboard/exam-rooms');
            await page.waitForSelector('.erm-title', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(1000);

            // Click "Thêm phòng mới"
            await page.click('button:has-text("Thêm phòng mới")');
            await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });

            // Chọn quyết định thi trong modal
            const modalDecInput = page.locator('.modal app-search-select').first().locator('input');
            await modalDecInput.click();
            await modalDecInput.fill(DECISION_NAME);
            await modalDecInput.press('Enter');
            await page.waitForTimeout(800);
            const decOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
            if (await decOpt.isVisible({ timeout: 3000 })) await decOpt.click();
            await page.waitForTimeout(500);

            // Chọn kế hoạch thi trong modal
            const modalSchInput = page.locator('.modal app-search-select').nth(1).locator('input');
            await modalSchInput.click();
            await modalSchInput.fill(SCHEDULE.subjectName);
            await modalSchInput.press('Enter');
            await page.waitForTimeout(800);
            const schOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
            if (await schOpt.isVisible({ timeout: 3000 })) await schOpt.click();
            await page.waitForTimeout(500);

            // Điền tên phòng
            await page.fill('input[formControlName="roomName"]', ROOM.roomName);

            // Gen mã phách tự động (bắt buộc nếu không phải secretary)
            const genCoverBtn = page.locator('.modal .ma-btn-gen, .modal button:has-text("Tự động")');
            if (await genCoverBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await genCoverBtn.click();
                await page.waitForTimeout(500);
            }

            // Submit
            const saveBtn = page.locator('.ma-foot .ma-btn-save');
            await expect(saveBtn).not.toBeDisabled({ timeout: 3000 });
            await saveBtn.click();
            await page.waitForSelector('.modal', { state: 'hidden', timeout: 10_000 });
            await page.waitForTimeout(1000);

            console.log(`✅ SETUP-SS-03: Đã tạo phòng thi "${ROOM.roomName}".`);
        });

        // ─── SETUP-SS-04 ─────────────────────────────────────────
        test('SETUP-SS-04: Thêm thí sinh CT070218 vào phòng thi', async ({ page }) => {
            await page.goto('/dashboard/exam-rooms');
            await page.waitForSelector('.erm-title', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(1000);

            // Lọc theo quyết định thi
            const filterDecInput = page.locator('.filter-bar app-search-select').first().locator('input');
            await filterDecInput.click();
            await filterDecInput.fill(DECISION_NAME);
            await filterDecInput.press('Enter');
            await page.waitForTimeout(800);
            const decOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
            if (await decOpt.isVisible({ timeout: 3000 })) await decOpt.click();
            await page.waitForTimeout(500);

            // Lọc theo kế hoạch thi
            const filterSchInput = page.locator('.filter-bar app-search-select').nth(1).locator('input');
            await filterSchInput.click();
            await filterSchInput.fill(SCHEDULE.subjectName);
            await filterSchInput.press('Enter');
            await page.waitForTimeout(800);
            const schOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
            if (await schOpt.isVisible({ timeout: 3000 })) await schOpt.click();
            await page.waitForTimeout(1000);

            // Chọn phòng thi trong sidebar
            const roomItem = page.locator('.erc-room-item', { hasText: ROOM.roomName }).first();
            await expect(roomItem).toBeVisible({ timeout: 5000 });
            await roomItem.click();
            await page.waitForTimeout(1000);

            // Click "Thêm sinh viên"
            const addStudentBtn = page.locator('button:has-text("Thêm sinh viên")').first();
            await expect(addStudentBtn).toBeVisible({ timeout: 5000 });
            await addStudentBtn.click();
            await page.waitForTimeout(500);

            // Modal thêm thí sinh hiện ra
            await expect(page.locator('.ma-head-title:has-text("Thêm thí sinh")')).toBeVisible({ timeout: 5000 });

            // Điền form thí sinh
            await page.fill('input[formControlName="studentCode"]', STUDENT.studentCode);
            await page.fill('input[formControlName="fullName"]', STUDENT.fullName);
            await page.fill('input[formControlName="dateOfBirth"]', STUDENT.dateOfBirth);
            await page.fill('input[formControlName="clazz"]', STUDENT.clazz);

            // Submit
            const saveBtn = page.locator('.ma-foot .ma-btn-save');
            await expect(saveBtn).not.toBeDisabled({ timeout: 3000 });
            await saveBtn.click();
            await page.waitForSelector('.ma-head-title:has-text("Thêm thí sinh")', { state: 'hidden', timeout: 10_000 });
            await page.waitForTimeout(1000);

            console.log(`✅ SETUP-SS-04: Đã thêm thí sinh ${STUDENT.studentCode} (${STUDENT.fullName}) vào phòng "${ROOM.roomName}".`);
        });
    });
});
