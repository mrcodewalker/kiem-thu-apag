/**
 * ============================================================
 * SETUP MOCK DATA — Chuẩn bị dữ liệu kiểm thử chức năng CHẤM THI
 * URL: https://hcqtc.vn
 * Framework: Playwright (UI automation — giống exam-schedule-management.spec.ts)
 * ============================================================
 *
 * LUỒNG THỰC HIỆN (qua giao diện browser):
 *   SETUP-01: Đăng nhập admin
 *   SETUP-02: Tạo kế hoạch thi "Kiểm thử phần mềm" (thi online) thuộc quyết định HK1
 *   SETUP-03: Tạo phòng thi P102 với mã phách A5
 *   SETUP-04: Thêm thí sinh CT070218 - Huỳnh Ngọc Hải (24/11/2004)
 *   SETUP-05: Thêm 10 sinh viên mock vào phòng P102
 *   SETUP-06: Chuyển phòng P102 sang trạng thái PHACH (sửa status + giữ mã phách A5)
 *   SETUP-07: Chuyển phòng P102 sang trạng thái CHAM + giao cho grader lamtung & huytq
 *             với template "Viết 3 câu" (Tự luận 3-4-3)
 *
 * CHUẨN BỊ:
 *   - Tài khoản admin đã điền trong e2e/helpers/auth.helper.ts
 *   - Quyết định thi "HK1" đã tồn tại trên server
 *   - Grader lamtung và huytq đã có tài khoản
 *   - Template "Viết 3 câu" đã được tạo trong hệ thống
 *
 * CHẠY:
 *   npx playwright test setup-grader-mock-data --headed
 * ============================================================
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsSecretary, TEST_DATA as AUTH_DATA } from './helpers/auth.helper';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, 'secretary-setup-auth.json');

// ============================================================
// CẤU HÌNH DỮ LIỆU MOCK
// ============================================================
const DECISION_NAME = 'HK1';

const SCHEDULE = {
  subjectName: 'Kiểm thử phần mềm',
  clazz: 'CT07',
  subjectCodeUnique: 'KTPM2025',
  subjectCredits: '3',
  format: 'Tự luận',
  onlineExam: 'x',
  startTimeRaw: '01/05/2025 08:00 đến 20/05/2025 10:00',
  note: 'Mock data - kiểm thử chấm thi',
};

const ROOM_NAME = 'P102';
const COVER_CODE = 'A5';

const MAIN_STUDENT = {
  studentCode: 'CT070218',
  fullName: 'Huỳnh Ngọc Hải',
  dateOfBirth: '24/11/2004',
  clazz: 'CT07',
};

const MOCK_STUDENTS = [
  { studentCode: 'CT070201', fullName: 'Nguyễn Văn An', dateOfBirth: '01/03/2004', clazz: 'CT07' },
  { studentCode: 'CT070202', fullName: 'Trần Thị Bình', dateOfBirth: '15/05/2004', clazz: 'CT07' },
  { studentCode: 'CT070203', fullName: 'Lê Hoàng Cường', dateOfBirth: '22/07/2004', clazz: 'CT07' },
  { studentCode: 'CT070204', fullName: 'Phạm Thị Dung', dateOfBirth: '08/09/2004', clazz: 'CT07' },
  { studentCode: 'CT070205', fullName: 'Hoàng Văn Em', dateOfBirth: '30/01/2004', clazz: 'CT07' },
  { studentCode: 'CT070206', fullName: 'Vũ Thị Phương', dateOfBirth: '12/04/2004', clazz: 'CT07' },
  { studentCode: 'CT070207', fullName: 'Đặng Minh Quân', dateOfBirth: '25/06/2004', clazz: 'CT07' },
  { studentCode: 'CT070208', fullName: 'Bùi Thị Hoa', dateOfBirth: '03/08/2004', clazz: 'CT07' },
  { studentCode: 'CT070209', fullName: 'Ngô Văn Khoa', dateOfBirth: '17/10/2004', clazz: 'CT07' },
  { studentCode: 'CT070210', fullName: 'Đinh Thị Lan', dateOfBirth: '29/12/2004', clazz: 'CT07' },
];

const GRADER_1 = 'lamtung';
const GRADER_2 = 'huytq';
const TEMPLATE_NAME = 'Viết 3 câu';

// ============================================================
// HELPER: Chọn option trong app-search-select
// ============================================================
async function selectDecision(page: Page, containerSelector: string, query: string): Promise<void> {
  const input = page.locator(`${containerSelector} input`).first();
  await input.click();
  await page.waitForTimeout(300);
  await input.fill(query);
  await input.press('Enter');
  await page.waitForTimeout(800);
  const opt = page.locator('.ss-opt, [class*="ss-option"]').first();
  if (await opt.isVisible({ timeout: 3000 })) await opt.click();
  await page.waitForTimeout(400);
}

// ============================================================
// HELPER: Thêm 1 thí sinh vào phòng thi đang chọn
// ============================================================
async function addCandidate(page: Page, student: typeof MAIN_STUDENT): Promise<void> {
  // Mở dialog thêm sinh viên
  await page.click('button:has-text("Thêm sinh viên")');

  // Chờ modal mở — scope vào modal đang visible
  const modal = page.locator('.modal').filter({ hasText: 'Thêm thí sinh' }).first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Điền thông tin — scope vào modal để tránh nhầm với các input khác trên trang
  await modal.locator('input[formControlName="studentCode"]').fill(student.studentCode);
  await modal.locator('input[formControlName="fullName"]').fill(student.fullName);
  await modal.locator('input[formControlName="dateOfBirth"]').fill(student.dateOfBirth);
  await modal.locator('input[formControlName="clazz"]').fill(student.clazz);

  // Lưu
  const saveBtn = modal.locator('.ma-foot .ma-btn-save').first();
  await expect(saveBtn).not.toBeDisabled();
  await saveBtn.click();

  // Chờ modal đóng
  await expect(modal).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);
}

// ============================================================
// TEST SUITE — Chạy tuần tự
// ============================================================
test.describe.serial('Setup Mock Data — Grader Scoring', () => {

  // ─── SETUP-01: Đăng nhập ─────────────────────────────────────
  test('SETUP-01: Đăng nhập Secretary', async ({ page }) => {
    await loginAsSecretary(page);
    await expect(page).toHaveURL(/dashboard/);

    // Lưu lại session
    if (!fs.existsSync(path.dirname(AUTH_FILE))) {
      fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    }
    await page.context().storageState({ path: AUTH_FILE });
    console.log('✅ Đăng nhập Secretary và lưu session thành công');
  });

  test.describe('Các bước thực hiện với quyền Secretary', () => {
    // Áp dụng session cho các test sau (Trừ SETUP-08 sẽ login user khác)
    test.use({ storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined });

    // ─── SETUP-02: Tạo kế hoạch thi ──────────────────────────────
    test('SETUP-02: Tạo kế hoạch thi Kiểm thử phần mềm (thi online)', async ({ page }) => {
      await page.goto('/dashboard/exam-schedules');
      await page.waitForSelector('.esm-title', { state: 'visible', timeout: 15_000 });

      // Mở modal thêm
      await page.click('button:has-text("Thêm kế hoạch")');
      await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.ma-head-title')).toContainText('Chọn quyết định thi');

      // Bước 1: chọn quyết định HK1
      await selectDecision(page, '.modal app-search-select', DECISION_NAME);
      await expect(page.locator('.ma-head-title')).toContainText('Thêm kế hoạch thi', { timeout: 5000 });

      // Bước 2: điền form
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

      const submitBtn = page.locator('.ma-foot .ma-btn-save');
      await expect(submitBtn).not.toBeDisabled();
      await submitBtn.click();

      await page.waitForSelector('.modal', { state: 'hidden', timeout: 10_000 });
      await page.waitForTimeout(1000);

      // Verify record xuất hiện
      const decisionInput = page.locator('.filter-bar app-search-select input').first();
      await decisionInput.click();
      await decisionInput.fill(DECISION_NAME);
      await decisionInput.press('Enter');
      await page.waitForTimeout(800);
      const opt = page.locator('.ss-opt, [class*="ss-option"]').first();
      if (await opt.isVisible({ timeout: 3000 })) await opt.click();
      await page.waitForTimeout(500);

      const subjectInput = page.locator('.filter-bar input[placeholder*="môn"]').first();
      await subjectInput.fill(SCHEDULE.subjectName);
      await page.click('button.btn-search');
      await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

      await expect(page.locator('.esm-table tbody tr').first()).toContainText(SCHEDULE.subjectName, { timeout: 5000 });
      console.log(`✅ Tạo kế hoạch thi: "${SCHEDULE.subjectName}" (thi online)`);
    });

    // ─── SETUP-03: Tạo phòng thi P102 ────────────────────────────
    test('SETUP-03: Tạo phòng thi P102 với mã phách A5', async ({ page }) => {
      await page.goto('/dashboard/exam-rooms');
      await page.waitForSelector('.erm-title', { state: 'visible', timeout: 15_000 });

      // Mở dialog thêm phòng
      await page.click('button:has-text("Thêm phòng mới")');
      await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });

      // Chọn quyết định
      await selectDecision(page, '.modal app-search-select', DECISION_NAME);
      await page.waitForTimeout(500);

      // Chọn kế hoạch thi
      const scheduleSelect = page.locator('.modal app-search-select').nth(1);
      const scheduleInput = scheduleSelect.locator('input').first();
      await scheduleInput.click();
      await scheduleInput.fill(SCHEDULE.subjectName);
      await scheduleInput.press('Enter');
      await page.waitForTimeout(800);
      const schedOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
      if (await schedOpt.isVisible({ timeout: 3000 })) await schedOpt.click();
      await page.waitForTimeout(400);

      // Điền tên phòng
      await page.fill('input[formControlName="roomName"]', ROOM_NAME);

      // Điền mã phách A5 thủ công (phải khớp với file Excel VALID.xlsx)
      const coverInput = page.locator('input[formControlName="coverCode"]');
      if (await coverInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await coverInput.fill(COVER_CODE);
      }

      // Lưu
      const saveBtn = page.locator('.ma-foot .ma-btn-save');
      await expect(saveBtn).not.toBeDisabled();
      await saveBtn.click();

      await page.waitForSelector('.modal', { state: 'hidden', timeout: 10_000 });
      await page.waitForTimeout(1000);

      // Verify phòng xuất hiện trong sidebar
      await expect(page.locator(`.erc-room-item:has-text("${ROOM_NAME}")`).first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ Tạo phòng thi: ${ROOM_NAME} (mã phách: ${COVER_CODE})`);
    });

    // ─── SETUP-04: Thêm thí sinh chính CT070218 ──────────────────
    test('SETUP-04: Thêm thí sinh CT070218 - Huỳnh Ngọc Hải', async ({ page }) => {
      await page.goto('/dashboard/exam-rooms');
      await page.waitForSelector('.erm-title', { state: 'visible', timeout: 15_000 });

      // Lọc theo quyết định + kế hoạch để tìm phòng P102
      await selectDecision(page, '.filter-bar app-search-select:first-of-type', DECISION_NAME);
      await page.waitForTimeout(500);

      const scheduleFilterSelect = page.locator('.filter-bar app-search-select').nth(1);
      const schedFilterInput = scheduleFilterSelect.locator('input').first();
      await schedFilterInput.click();
      await schedFilterInput.fill(SCHEDULE.subjectName);
      await schedFilterInput.press('Enter');
      await page.waitForTimeout(800);
      const schedFilterOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
      if (await schedFilterOpt.isVisible({ timeout: 3000 })) await schedFilterOpt.click();
      await page.waitForTimeout(500);

      // Click vào phòng P102 trong sidebar
      const roomItem = page.locator(`.erc-room-item:has-text("${ROOM_NAME}")`).first();
      await expect(roomItem).toBeVisible({ timeout: 5000 });
      await roomItem.click();
      await page.waitForTimeout(500);

      // Thêm thí sinh chính
      await addCandidate(page, MAIN_STUDENT);

      console.log(`✅ Thêm thí sinh: ${MAIN_STUDENT.studentCode} - ${MAIN_STUDENT.fullName}`);
    });

    // ─── SETUP-05: Thêm 10 sinh viên mock ────────────────────────
    test('SETUP-05: Thêm 10 sinh viên mock vào phòng P102', async ({ page }) => {
      await page.goto('/dashboard/exam-rooms');
      await page.waitForSelector('.erm-title', { state: 'visible', timeout: 15_000 });

      // Lọc và chọn phòng P102
      await selectDecision(page, '.filter-bar app-search-select:first-of-type', DECISION_NAME);
      await page.waitForTimeout(500);

      const schedFilterInput = page.locator('.filter-bar app-search-select').nth(1).locator('input').first();
      await schedFilterInput.click();
      await schedFilterInput.fill(SCHEDULE.subjectName);
      await schedFilterInput.press('Enter');
      await page.waitForTimeout(800);
      const schedOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
      if (await schedOpt.isVisible({ timeout: 3000 })) await schedOpt.click();
      await page.waitForTimeout(500);

      const roomItem = page.locator(`.erc-room-item:has-text("${ROOM_NAME}")`).first();
      await expect(roomItem).toBeVisible({ timeout: 5000 });
      await roomItem.click();
      await page.waitForTimeout(500);

      // Thêm từng sinh viên
      for (let i = 0; i < MOCK_STUDENTS.length; i++) {
        const student = MOCK_STUDENTS[i];
        await addCandidate(page, student);
        console.log(`  ✅ [${i + 1}/10] ${student.studentCode} - ${student.fullName}`);
      }

      console.log(`✅ Đã thêm 10 sinh viên mock vào phòng ${ROOM_NAME}`);
    });

    // ─── SETUP-06: Chuyển phòng sang PHACH ───────────────────────
    test('SETUP-06: Chuyển phòng P102 sang trạng thái PHACH', async ({ page }) => {
      await page.goto('/dashboard/exam-rooms');
      await page.waitForSelector('.erm-title', { state: 'visible', timeout: 15_000 });

      // Lọc và chọn phòng P102
      await selectDecision(page, '.filter-bar app-search-select:first-of-type', DECISION_NAME);
      await page.waitForTimeout(500);

      const schedFilterInput = page.locator('.filter-bar app-search-select').nth(1).locator('input').first();
      await schedFilterInput.click();
      await schedFilterInput.fill(SCHEDULE.subjectName);
      await schedFilterInput.press('Enter');
      await page.waitForTimeout(800);
      const schedOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
      if (await schedOpt.isVisible({ timeout: 3000 })) await schedOpt.click();
      await page.waitForTimeout(500);

      const roomItem = page.locator(`.erc-room-item:has-text("${ROOM_NAME}")`).first();
      await expect(roomItem).toBeVisible({ timeout: 5000 });
      await roomItem.click();
      await page.waitForTimeout(500);

      // Click nút "Chuyển phách" — chỉ active khi phòng đang THI
      const chuyenPhachBtn = page.locator('button.btn-phach, button:has-text("Chuyển phách")');
      await expect(chuyenPhachBtn).toBeVisible({ timeout: 5000 });
      await expect(chuyenPhachBtn).not.toBeDisabled();
      await chuyenPhachBtn.click();
      await page.waitForTimeout(500);

      // Xác nhận trong dialog nếu có
      const confirmBtn = page.locator('.p-confirm-dialog-accept, button:has-text("Xác nhận"), button:has-text("Đồng ý")');
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
      }

      // Verify badge trạng thái đổi sang PHACH
      await page.waitForTimeout(1000);
      const statusBadge = page.locator('.erc-room-item.active .status-badge, .room-meta-row .status-badge').first();
      await expect(statusBadge).toContainText(/phach|PHACH|Chờ phách/i, { timeout: 5000 });
      console.log(`✅ Phòng ${ROOM_NAME} đã chuyển sang trạng thái PHACH`);
    });

    // ─── SETUP-07: Chuyển phòng từ PHACH sang CHAM ───────────────
    test('SETUP-07: Chuyển phòng P102 từ PHACH sang CHAM', async ({ page }) => {
      await page.goto('/dashboard/exam-rooms');
      await page.waitForSelector('.erm-title', { state: 'visible', timeout: 15_000 });

      // Lọc và chọn phòng P102
      await selectDecision(page, '.filter-bar app-search-select:first-of-type', DECISION_NAME);
      await page.waitForTimeout(500);

      const schedFilterInput = page.locator('.filter-bar app-search-select').nth(1).locator('input').first();
      await schedFilterInput.click();
      await schedFilterInput.fill(SCHEDULE.subjectName);
      await schedFilterInput.press('Enter');
      await page.waitForTimeout(800);
      const schedOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
      if (await schedOpt.isVisible({ timeout: 3000 })) await schedOpt.click();
      await page.waitForTimeout(500);

      const roomItem = page.locator(`.erc-room-item:has-text("${ROOM_NAME}")`).first();
      await expect(roomItem).toBeVisible({ timeout: 5000 });
      await roomItem.click();
      await page.waitForTimeout(500);

      // Mở dialog sửa phòng để đổi status từ PHACH → CHAM
      // Click nút sửa (act-btn edit) trên room item trong sidebar
      const editBtn = roomItem.locator('.act-btn.edit');
      await editBtn.click();
      await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });

      // Đổi trạng thái sang CHAM
      const statusSelect = page.locator('.modal select[formControlName="status"], .modal .ma-inp[formControlName="status"]');
      await statusSelect.selectOption({ value: 'CHAM' });
      await page.waitForTimeout(300);

      // Lưu
      const saveBtn = page.locator('.modal .ma-foot .ma-btn-save');
      await expect(saveBtn).not.toBeDisabled();
      await saveBtn.click();

      // Xác nhận mật khẩu nếu có (component yêu cầu password verify khi edit)
      const pwdInput = page.locator('input[type="password"]').last();
      if (await pwdInput.isVisible({ timeout: 2000 })) {
        await pwdInput.fill('Haibeo2004@');
        const pwdConfirmBtn = page.locator('button:has-text("Xác nhận"), button:has-text("Confirm")').last();
        await pwdConfirmBtn.click();
        await page.waitForTimeout(500);
      }

      await page.waitForSelector('.modal', { state: 'hidden', timeout: 10_000 });
      await page.waitForTimeout(1000);

      // Verify badge đổi sang CHAM
      const statusBadge = page.locator(`.erc-room-item:has-text("${ROOM_NAME}") .status-badge`).first();
      await expect(statusBadge).toContainText(/cham|CHAM|Đang chấm/i, { timeout: 5000 });
      console.log(`✅ Phòng ${ROOM_NAME} đã chuyển sang trạng thái CHAM`);
    });

  }); // End sub-describe for Secretary

  // ─── SETUP-08: Khởi tạo phiên chấm với ADMIN_CHAM ───────────
  // Phải đăng nhập bằng ADMIN_CHAM — chỉ role này mới có quyền
  // vào trang exam-room-scoring và khởi tạo phiên chấm
  test('SETUP-08: Giao phòng P102 cho grader lamtung & huytq (template Viết 3 câu)', async ({ page }) => {
    // Reset storage state cho test này vì login user khác
    await page.context().clearCookies();

    // Đăng nhập bằng ADMIN_CHAM
    await page.goto('/login');
    await page.waitForSelector('#username', { state: 'visible' });
    await page.fill('#username', 'ADMIN_CHAM');
    await page.fill('#password', 'CHAM@123');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL('**/dashboard/**', { timeout: 15_000 });

    // Vào trang Quản lý chấm điểm
    await page.goto('/dashboard/exam-room-scoring');
    await page.waitForSelector('.erm-title', { state: 'visible', timeout: 15_000 });

    // Lọc theo quyết định HK1
    const decisionInput = page.locator('.filter-bar app-search-select').nth(0).locator('input').first();
    await decisionInput.click();
    await decisionInput.fill(DECISION_NAME);
    await decisionInput.press('Enter');
    await page.waitForTimeout(1200);
    const decOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
    await expect(decOpt).toBeVisible({ timeout: 5000 });
    await decOpt.click();
    await page.waitForTimeout(600);

    // Lọc theo kế hoạch thi
    const schedInput = page.locator('.filter-bar app-search-select').nth(1).locator('input').first();
    await schedInput.click();
    await schedInput.fill(SCHEDULE.subjectName);
    await schedInput.press('Enter');
    await page.waitForTimeout(1200);
    const schedOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
    await expect(schedOpt).toBeVisible({ timeout: 5000 });
    await schedOpt.click();
    await page.waitForTimeout(600);

    // Bấm tìm kiếm để load phòng
    await page.click('button.btn-search-icon');
    await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

    // Chọn phòng P102 trong sidebar
    const roomItem = page.locator(`.erc-room-item:has-text("${ROOM_NAME}")`).first();
    await expect(roomItem).toBeVisible({ timeout: 5000 });
    await roomItem.click();
    await page.waitForTimeout(500);

    // Nút "Khởi tạo phiên chấm" phải visible
    const initBtn = page.locator('button:has-text("Khởi tạo phiên chấm")');
    await expect(initBtn).toBeVisible({ timeout: 5000 });
    await initBtn.click();

    // Modal khởi tạo phiên chấm mở
    await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ma-head-title')).toContainText('Khởi tạo phiên chấm');

    // ── Chọn template ──────────────────────────────────────────
    // Bước 1: chọn loại "Viết 3 câu" trong dropdown .f-select-type
    const templateTypeSelect = page.locator('.modal .f-select-type').first();
    await expect(templateTypeSelect).toBeVisible({ timeout: 3000 });
    await templateTypeSelect.selectOption({ label: 'Viết 3 câu' });
    await page.waitForTimeout(1000); // chờ filter reload options qua API

    // Bước 2: click vào search-select template để xổ danh sách đã lọc
    // KHÔNG gõ thêm — chỉ click để mở, chờ options load, chọn đầu tiên
    const templateInput = page.locator('.modal app-search-select').first().locator('input').first();
    await templateInput.click();
    await page.waitForTimeout(1200); // chờ debounceMs=800 + API response

    const templateOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
    await expect(templateOpt).toBeVisible({ timeout: 6000 });
    const templateLabel = await templateOpt.textContent();
    await templateOpt.click();
    await page.waitForTimeout(500);
    console.log(`  Template đã chọn: "${templateLabel?.trim()}"`);

    // ── Chọn Grader 1: lamtung ─────────────────────────────────
    // debounceMs=1500 — gõ query + Enter, chờ API load xong (4-5s), chọn đúng option
    const grader1Input = page.locator('.modal app-search-select').nth(1).locator('input').first();
    await grader1Input.click();
    await grader1Input.fill(GRADER_1);
    await grader1Input.press('Enter');
    // Chờ dropdown đóng (options cũ biến mất) rồi mở lại với kết quả mới
    await page.waitForTimeout(5000); // chờ API trả về kết quả search
    // Lúc này options đã được cập nhật — click lại input để xổ dropdown mới
    await grader1Input.click();
    await page.waitForTimeout(500);
    // Tìm option chứa đúng username lamtung
    const grader1Opt = page.locator(`.ss-opt:has-text("${GRADER_1}"), [class*="ss-option"]:has-text("${GRADER_1}")`).first();
    await expect(grader1Opt).toBeVisible({ timeout: 5000 });
    const grader1Label = await grader1Opt.textContent();
    await grader1Opt.click();
    await page.waitForTimeout(500);
    console.log(`  Grader 1 đã chọn: "${grader1Label?.trim()}"`);

    // ── Chọn Grader 2: huytq ───────────────────────────────────
    const grader2Input = page.locator('.modal app-search-select').nth(2).locator('input').first();
    await grader2Input.click();
    await grader2Input.fill(GRADER_2);
    await grader2Input.press('Enter');
    await page.waitForTimeout(5000); // chờ API trả về kết quả search
    await grader2Input.click();
    await page.waitForTimeout(500);
    const grader2Opt = page.locator(`.ss-opt:has-text("${GRADER_2}"), [class*="ss-option"]:has-text("${GRADER_2}")`).first();
    await expect(grader2Opt).toBeVisible({ timeout: 5000 });
    const grader2Label = await grader2Opt.textContent();
    await grader2Opt.click();
    await page.waitForTimeout(500);
    console.log(`  Grader 2 đã chọn: "${grader2Label?.trim()}"`);

    // ── Submit ─────────────────────────────────────────────────
    const submitBtn = page.locator('.modal .ma-foot .ma-btn-save');
    await expect(submitBtn).not.toBeDisabled();
    await expect(submitBtn).toContainText('Khởi tạo');
    await submitBtn.click();

    // Chờ modal đóng (có thể mất thời gian vì gửi email)
    await page.waitForSelector('.modal', { state: 'hidden', timeout: 20_000 });
    await page.waitForTimeout(1500);

    // Verify: scoring info bar xuất hiện (CB1/CB2 progress)
    await expect(page.locator('.ers-info-bar')).toBeVisible({ timeout: 8000 });

    console.log(`✅ Khởi tạo phiên chấm thành công!`);
    console.log(`   Phòng: ${ROOM_NAME} | Template: ${templateLabel?.trim()}`);
    console.log(`   Grader 1: ${grader1Label?.trim()} | Grader 2: ${grader2Label?.trim()}`);
    console.log('\n🎉 MOCK DATA ĐÃ SẴN SÀNG — Grader có thể đăng nhập và chấm điểm!');
  });

});

// ============================================================
// CLEANUP — Xóa kế hoạch thi mock để có thể chạy lại từ đầu
// Chạy riêng: npx playwright test setup-grader-mock-data --headed --grep "CLEANUP"
// ============================================================
test.describe('Cleanup Mock Data', () => {
  // Cleanup cũng dùng Secretary
  test.use({ storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined });

  test('CLEANUP: Xóa kế hoạch thi "Kiểm thử phần mềm" để remake', async ({ page }) => {
    await page.goto('/dashboard/exam-schedules');
    await page.waitForSelector('.esm-title', { state: 'visible', timeout: 15_000 });

    // Tìm kế hoạch thi theo quyết định HK1
    const decisionInput = page.locator('.filter-bar app-search-select input').first();
    await decisionInput.click();
    await decisionInput.fill(DECISION_NAME);
    await decisionInput.press('Enter');
    await page.waitForTimeout(800);
    const decOpt = page.locator('.ss-opt, [class*="ss-option"]').first();
    if (await decOpt.isVisible({ timeout: 3000 })) await decOpt.click();
    await page.waitForTimeout(500);

    // Lọc theo tên môn
    const subjectInput = page.locator('.filter-bar input[placeholder*="môn"]').first();
    await subjectInput.fill(SCHEDULE.subjectName);
    await page.click('button.btn-search');
    await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

    const rows = page.locator('.esm-table tbody tr');
    const count = await rows.count();

    if (count === 0) {
      console.log(`ℹ️ Không tìm thấy kế hoạch thi "${SCHEDULE.subjectName}" — không cần xóa`);
      return;
    }

    // Xóa từng record tìm thấy (có thể có nhiều nếu chạy nhiều lần)
    let deleted = 0;
    for (let i = 0; i < count; i++) {
      const firstRow = page.locator('.esm-table tbody tr').first();
      const rowText = await firstRow.textContent();

      if (!rowText?.includes(SCHEDULE.subjectName)) break;

      // Mở menu 3 chấm
      await firstRow.locator('.act-menu-btn').click();
      await page.waitForTimeout(300);

      const deleteItem = page.locator('.act-dropdown .act-item--danger:has-text("Xóa")');
      if (!await deleteItem.isVisible({ timeout: 2000 })) {
        console.warn(`  ⚠️ Không có nút Xóa cho record này (có thể đã có phòng thi)`);
        await page.keyboard.press('Escape');
        break;
      }
      await deleteItem.click();
      await page.waitForTimeout(300);

      // Inline confirm
      const inlineConfirm = page.locator('.inline-confirm').first();
      await expect(inlineConfirm).toBeVisible({ timeout: 3000 });
      await inlineConfirm.locator('.ic-confirm').click();
      await page.waitForTimeout(500);

      // Custom dialog confirm
      const confirmDeleteBtn = page.locator('app-custom-dialog button:has-text("Xóa ngay")');
      if (await confirmDeleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmDeleteBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.waitForTimeout(1500);
      deleted++;
      console.log(`  🗑️ Đã xóa record ${deleted}`);
    }

    console.log(`✅ CLEANUP hoàn tất — đã xóa ${deleted} kế hoạch thi "${SCHEDULE.subjectName}"`);
    console.log(`   Bạn có thể chạy lại setup từ SETUP-02`);
  });

});
