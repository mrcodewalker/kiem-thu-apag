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
 *   SETUP-SS-03: Thêm thí sinh CT070218 vào kế hoạch thi
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
    startTimeRaw: '01/06/2026 08:00 đến 30/06/2026 23:59',
    note: 'Mock data — dùng cho kiểm thử nộp bài tập lớn',
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
        test('SETUP-SS-03: Thêm thí sinh CT070218 vào kế hoạch thi', async ({ page }) => {
            await page.goto('/dashboard/exam-schedules');
            await page.waitForSelector('.esm-title', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(1000);

            // Tìm kế hoạch thi vừa tạo
            const decisionInput = page.locator('.filter-bar app-search-select input').first();
            await decisionInput.click();
            await decisionInput.fill(DECISION_NAME);
            await decisionInput.press('Enter');
            await page.waitForTimeout(800);
            const decOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
            if (await decOpt.isVisible({ timeout: 3000 })) await decOpt.click();
            await page.waitForTimeout(500);

            // Tìm theo tên môn
            const subjectInput = page.locator('.filter-bar input[placeholder*="môn"]').first();
            await subjectInput.fill(SCHEDULE.subjectName);
            await page.click('button.btn-search');
            await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

            // Mở chi tiết kế hoạch thi
            const firstRow = page.locator('.esm-table tbody tr').first();
            await expect(firstRow).toBeVisible({ timeout: 5000 });
            await firstRow.locator('.act-menu-btn').click();
            await page.waitForTimeout(300);
            await page.locator('.act-dropdown .act-item:has-text("Xem chi tiết")').click();

            // Chờ modal chi tiết mở
            await expect(page.locator('.modal-xl')).toBeVisible({ timeout: 5000 });
            await page.waitForTimeout(1000);

            // Thêm thí sinh
            const addStudentBtn = page.locator('button:has-text("Thêm sinh viên")');
            if (await addStudentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await addStudentBtn.click();

                const addModal = page.locator('.modal').filter({ hasText: 'Thêm thí sinh' }).first();
                await expect(addModal).toBeVisible({ timeout: 5000 });

                await addModal.locator('input[formControlName="studentCode"]').fill(STUDENT.studentCode);
                await addModal.locator('input[formControlName="fullName"]').fill(STUDENT.fullName);
                await addModal.locator('input[formControlName="dateOfBirth"]').fill(STUDENT.dateOfBirth);
                await addModal.locator('input[formControlName="clazz"]').fill(STUDENT.clazz);

                const saveBtn = addModal.locator('.ma-btn-save, button:has-text("Lưu"), button:has-text("Thêm")').first();
                await expect(saveBtn).not.toBeDisabled();
                await saveBtn.click();
                await expect(addModal).not.toBeVisible({ timeout: 8000 });

                console.log(`✅ SETUP-SS-03: Đã thêm thí sinh ${STUDENT.studentCode} vào kế hoạch thi.`);
            } else {
                console.log('⚠️ SETUP-SS-03: Không tìm thấy nút "Thêm sinh viên" — có thể đã có sẵn.');
            }
        });
    });
});
