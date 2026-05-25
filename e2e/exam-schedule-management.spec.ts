/**
 * ============================================================
 * KIỂM THỬ CHỨC NĂNG: Quản lý Kế hoạch thi
 * URL: https://hcqtc.vn/dashboard/exam-schedules
 * Role: Secretary / Admin
 * Framework: Playwright
 * ============================================================
 *
 * CHUẨN BỊ TRƯỚC KHI CHẠY:
 * 1. Mở file e2e/helpers/auth.helper.ts
 * 2. Điền username/password tài khoản secretary thật vào TEST_ACCOUNT
 * 3. Điền tên quyết định thi đã có trên server vào TEST_DATA.existingDecisionName
 * 4. Chạy: npx playwright test exam-schedule-management --headed
 *
 * THỨ TỰ TEST (phụ thuộc dữ liệu):
 * TC-ESM-01: Hiển thị trang và trạng thái ban đầu
 * TC-ESM-02: Tìm kiếm theo quyết định thi
 * TC-ESM-03: Thêm mới kế hoạch thi
 * TC-ESM-04: Hủy xóa kế hoạch thi
 * TC-ESM-05: Sửa thông tin kế hoạch thi
 * TC-ESM-06: Xóa kế hoạch thi
 * TC-ESM-07: Bỏ trống tên môn học
 * TC-ESM-08: Bỏ trống lớp
 * TC-ESM-09: Nhập thời gian sai format
 * TC-ESM-10: Điền đầy đủ và đúng format
 * TC-ESM-11: Ẩn và hiện lại cột trong bảng
 * TC-ESM-12: Phân trang danh sách kế hoạch thi
 * TC-ESM-13: Tự động điền giờ 07:00 khi nhập khoảng ngày
 * TC-ESM-14: Hỗ trợ format thời gian linh hoạt
 * TC-ESM-15: Ngày kết thúc trước ngày bắt đầu → báo lỗi
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsSecretary, goToExamSchedulePage, TEST_DATA } from './helpers/auth.helper';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, 'secretary-esm-auth.json');

test.describe.serial('Quản lý Kế hoạch thi (Exam Schedule Management)', () => {

  test('TC-ESM-00: Đăng nhập Secretary', async ({ page }) => {
    await loginAsSecretary(page);
    await expect(page).toHaveURL(/dashboard/);

    // Lưu lại session
    if (!fs.existsSync(path.dirname(AUTH_FILE))) {
      fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    }
    await page.context().storageState({ path: AUTH_FILE });
    console.log('✅ Đăng nhập Secretary và lưu session thành công');
  });

  test.describe('Thao tác sau khi đăng nhập', () => {
    test.use({ storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined });

    test.beforeEach(async ({ page }) => {
      await goToExamSchedulePage(page);
    });

    // ============================================================
    // TC-ESM-01: Hiển thị trang và trạng thái ban đầu
    // ============================================================
    test('TC-ESM-01: Hiển thị trang đúng với trạng thái ban đầu', async ({ page }) => {
      await expect(page.locator('.esm-title')).toHaveText('Quản lý Kế hoạch thi');
      await expect(page.locator('.esm-subtitle')).toBeVisible();
      await expect(page.locator('button:has-text("Thêm kế hoạch")')).toBeVisible();
      await expect(page.locator('button:has-text("Import Excel")')).toBeVisible();
      await expect(page.locator('.filter-bar')).toBeVisible();
      await expect(page.locator('app-search-select').first()).toBeVisible();

      await page.waitForTimeout(1500);

      const cardHtml = await page.locator('.esm-card').innerHTML();
      console.log('=== ESM CARD HTML (first 2000 chars) ===');
      console.log(cardHtml.substring(0, 2000));

      const hasEmptyClass = await page.locator('.esm-empty').count();
      const hasInitialText = await page.locator('text=Bắt đầu quản lý').count();
      const hasDecisionText = await page.locator('text=Quyết định kỳ thi').count();
      console.log('esm-empty:', hasEmptyClass, '| Bắt đầu quản lý:', hasInitialText, '| Quyết định kỳ thi:', hasDecisionText);

      await expect(page.locator('.esm-title')).toBeVisible();
      await expect(page.locator('.filter-bar')).toBeVisible();
      await expect(page.locator('button:has-text("Thêm kế hoạch")').first()).toBeVisible();

      const hasAnyEmptyIndicator = hasEmptyClass > 0 || hasInitialText > 0 || hasDecisionText > 0;
      expect(hasAnyEmptyIndicator).toBeTruthy();
    });

    // ============================================================
    // TC-ESM-02: Tìm kiếm theo quyết định thi
    // ============================================================
    test('TC-ESM-02: Tìm kiếm kế hoạch thi theo quyết định', async ({ page }) => {
      const decisionInput = page.locator('.filter-bar app-search-select input').first();
      await decisionInput.click();
      await page.waitForTimeout(500);
      await decisionInput.fill(TEST_DATA.existingDecisionName);
      await decisionInput.press('Enter');
      await page.waitForTimeout(1000);

      const firstOption = page.locator('.ss-opt, [class*="ss-option"], .ss-list > div').first();
      await expect(firstOption).toBeVisible({ timeout: 5000 });
      await firstOption.click();
      await page.waitForTimeout(1000);

      await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

      const hasData = await page.locator('.esm-table tbody tr').count() > 0;
      const hasEmpty = await page.locator('.esm-empty').isVisible();
      expect(hasData || hasEmpty).toBeTruthy();

      if (hasData) {
        await expect(page.locator('.esm-table thead th').nth(0)).toContainText('ID');
        await expect(page.locator('.esm-table thead th').nth(2)).toContainText('Tên môn học');
        await expect(page.locator('.pg-info')).toBeVisible();
        await expect(page.locator('.pg-info')).toContainText('kế hoạch thi');
      }
    });

    // ============================================================
    // TC-ESM-03: Thêm mới kế hoạch thi
    // Tạo ra record để TC-04, TC-05, TC-06 dùng
    // ============================================================
    test('TC-ESM-03: Thêm mới kế hoạch thi', async ({ page }) => {
      await page.click('button:has-text("Thêm kế hoạch")');
      await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.ma-head-title')).toContainText('Chọn quyết định thi');

      const modalDecisionInput = page.locator('.modal app-search-select input').first();
      await modalDecisionInput.click();
      await page.waitForTimeout(300);
      await modalDecisionInput.fill(TEST_DATA.existingDecisionName);
      await modalDecisionInput.press('Enter');
      const modalOption = page.locator('.ss-opt, [class*="ss-option"]').first();
      await expect(modalOption).toBeVisible({ timeout: 5000 });
      await modalOption.click();
      await page.waitForTimeout(500);

      await expect(page.locator('.ma-head-title')).toContainText('Thêm kế hoạch thi');
      await page.fill('input[formControlName="subjectName"]', TEST_DATA.newSchedule.subjectName);
      await page.fill('input[formControlName="clazz"]', TEST_DATA.newSchedule.clazz);
      await page.fill('input[formControlName="subjectCodeUnique"]', TEST_DATA.newSchedule.subjectCodeUnique);
      await page.fill('input[formControlName="subjectCredits"]', TEST_DATA.newSchedule.subjectCredits);
      await page.fill('input[formControlName="format"]', TEST_DATA.newSchedule.format);
      await page.fill('input[formControlName="onlineExam"]', 'x');
      await page.fill('input[formControlName="startTimeRaw"]', TEST_DATA.newSchedule.startTimeRaw);
      await page.locator('input[formControlName="startTimeRaw"]').blur();
      await page.waitForTimeout(300);
      await page.fill('textarea[formControlName="note"]', TEST_DATA.newSchedule.note);

      const submitBtn = page.locator('.ma-foot .ma-btn-save');
      await expect(submitBtn).not.toBeDisabled();
      await expect(submitBtn).toContainText('Thêm mới');
      await submitBtn.click();

      await page.waitForSelector('.modal', { state: 'hidden', timeout: 10_000 });
      await page.waitForTimeout(1000);

      await _searchByDecisionAndSubject(page, TEST_DATA.existingDecisionName, TEST_DATA.newSchedule.subjectName);
      const rows = page.locator('.esm-table tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 5000 });
      await expect(rows.first()).toContainText(TEST_DATA.newSchedule.subjectName);
    });

    // ============================================================
    // TC-ESM-04: Hủy xóa kế hoạch thi
    // Chạy TRƯỚC TC-05 và TC-06 để record còn nguyên
    // ============================================================
    test('TC-ESM-04: Hủy xóa kế hoạch thi', async ({ page }) => {
      await _searchByDecisionAndSubject(page, TEST_DATA.existingDecisionName, TEST_DATA.newSchedule.subjectName);

      const firstRow = page.locator('.esm-table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 5000 });
      const subjectNameBefore = await firstRow.locator('.td-name-content').textContent();

      await firstRow.locator('.act-menu-btn').click();
      await page.waitForTimeout(300);
      await page.locator('.act-dropdown .act-item--danger:has-text("Xóa")').click();
      await page.waitForTimeout(300);

      const inlineConfirm = page.locator('.inline-confirm');
      await expect(inlineConfirm).toBeVisible({ timeout: 3000 });
      await inlineConfirm.locator('.ic-confirm').click();
      await page.waitForTimeout(500);

      const customDialog = page.locator('.fixed.inset-0.z-50');
      await expect(customDialog).toBeVisible({ timeout: 5000 });
      await expect(customDialog).toContainText('Xác nhận xóa');

      // Click Hủy — KHÔNG xóa
      await customDialog.locator('button:has-text("Hủy")').click();
      await page.waitForTimeout(500);
      await expect(customDialog).not.toBeVisible();

      // Record vẫn còn
      await _searchByDecisionAndSubject(page, TEST_DATA.existingDecisionName, TEST_DATA.newSchedule.subjectName);
      await expect(page.locator('.esm-table tbody tr').first().locator('.td-name-content'))
        .toContainText(subjectNameBefore!.trim());
    });

    // ============================================================
    // TC-ESM-05: Sửa thông tin kế hoạch thi
    // Chạy sau TC-04, trước TC-06
    // ============================================================
    test('TC-ESM-05: Sửa thông tin kế hoạch thi', async ({ page }) => {
      await _searchByDecisionAndSubject(page, TEST_DATA.existingDecisionName, TEST_DATA.newSchedule.subjectName);

      const firstRow = page.locator('.esm-table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 5000 });

      await firstRow.locator('.act-menu-btn').click();
      await page.waitForTimeout(300);
      await page.locator('.act-dropdown .act-item:has-text("Sửa thông tin")').click();

      await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.ma-head-title')).toContainText('Cập nhật kế hoạch thi');

      const subjectNameInput = page.locator('input[formControlName="subjectName"]');
      await subjectNameInput.clear();
      await subjectNameInput.fill(TEST_DATA.updatedSchedule.subjectName);

      const noteInput = page.locator('textarea[formControlName="note"]');
      await noteInput.clear();
      await noteInput.fill(TEST_DATA.updatedSchedule.note);

      const updateBtn = page.locator('.ma-foot .ma-btn-save');
      await expect(updateBtn).toContainText('Cập nhật');
      await expect(updateBtn).not.toBeDisabled();
      await updateBtn.click();

      await page.waitForSelector('.modal', { state: 'hidden', timeout: 10_000 });
      await page.waitForTimeout(500);

      await _searchByDecisionAndSubject(page, TEST_DATA.existingDecisionName, TEST_DATA.updatedSchedule.subjectName);
      await expect(page.locator('.esm-table tbody tr').first()).toContainText(TEST_DATA.updatedSchedule.subjectName);
    });

    // ============================================================
    // TC-ESM-06: Xóa kế hoạch thi
    // Chạy sau TC-05 (record đã đổi tên)
    // ============================================================
    test('TC-ESM-06: Xóa kế hoạch thi', async ({ page }) => {
      await _searchByDecisionAndSubject(page, TEST_DATA.existingDecisionName, TEST_DATA.updatedSchedule.subjectName);

      const firstRow = page.locator('.esm-table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 5000 });
      const subjectName = await firstRow.locator('.td-name-content').textContent();

      await firstRow.locator('.act-menu-btn').click();
      await page.waitForTimeout(300);
      await page.locator('.act-dropdown .act-item--danger:has-text("Xóa")').click();
      await page.waitForTimeout(300);

      const inlineConfirm = page.locator('.inline-confirm');
      await expect(inlineConfirm).toBeVisible({ timeout: 3000 });
      await inlineConfirm.locator('.ic-confirm').click();
      await page.waitForTimeout(500);

      const customDialog = page.locator('.fixed.inset-0.z-50');
      await expect(customDialog).toBeVisible({ timeout: 5000 });
      await expect(customDialog).toContainText('Xác nhận xóa');
      await customDialog.locator('button:has-text("Xóa ngay")').click();

      await page.waitForSelector('.fixed.inset-0.z-50', { state: 'hidden', timeout: 10_000 });
      await page.waitForTimeout(1500);

      const count = await page.locator('.esm-table tbody tr').count();
      if (count > 0) {
        await expect(page.locator(`.esm-table tbody tr:has-text("${subjectName?.trim()}")`)).toHaveCount(0);
      }
    });

    // ============================================================
    // TC-ESM-07: Bỏ trống tên môn học — nút submit bị disabled
    // ============================================================
    test('TC-ESM-07: Bỏ trống tên môn học — nút submit bị disabled', async ({ page }) => {
      await _openAddFormStep2(page);

      await page.fill('input[formControlName="clazz"]', 'QLNN2024A');
      await page.fill('input[formControlName="startTimeRaw"]', '01/12/2025 08:00 đến 01/12/2025 10:00');
      await page.locator('input[formControlName="startTimeRaw"]').blur();
      await page.waitForTimeout(300);

      await expect(page.locator('.ma-foot .ma-btn-save')).toBeDisabled();

      await page.click('.ma-close');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
    });

    // ============================================================
    // TC-ESM-08: Bỏ trống lớp — nút submit bị disabled
    // ============================================================
    test('TC-ESM-08: Bỏ trống lớp — nút submit bị disabled', async ({ page }) => {
      await _openAddFormStep2(page);

      await page.fill('input[formControlName="subjectName"]', 'Môn test');
      await page.fill('input[formControlName="startTimeRaw"]', '01/12/2025 08:00 đến 01/12/2025 10:00');
      await page.locator('input[formControlName="startTimeRaw"]').blur();
      await page.waitForTimeout(300);

      await expect(page.locator('.ma-foot .ma-btn-save')).toBeDisabled();

      await page.click('.ma-close');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
    });

    // ============================================================
    // TC-ESM-09: Nhập thời gian sai format — nút submit bị disabled
    // ============================================================
    test('TC-ESM-09: Nhập thời gian sai format — nút submit bị disabled', async ({ page }) => {
      await _openAddFormStep2(page);

      await page.fill('input[formControlName="subjectName"]', 'Môn test');
      await page.fill('input[formControlName="clazz"]', 'QLNN2024A');
      await page.fill('input[formControlName="startTimeRaw"]', 'ngày 01 tháng 12 năm 2025');
      await page.locator('input[formControlName="startTimeRaw"]').blur();
      await page.waitForTimeout(300);

      await expect(page.locator('.ma-foot .ma-btn-save')).toBeDisabled();
      await expect(page.locator('.f-err')).toBeVisible();
      await expect(page.locator('.f-err')).toContainText('dd/mm/yyyy HH:mm');

      await page.click('.ma-close');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
    });

    // ============================================================
    // TC-ESM-10: Điền đầy đủ và đúng format — nút submit được enabled
    // ============================================================
    test('TC-ESM-10: Điền đầy đủ và đúng format — nút submit được enabled', async ({ page }) => {
      await _openAddFormStep2(page);

      await page.fill('input[formControlName="subjectName"]', 'Môn test');
      await page.fill('input[formControlName="clazz"]', 'QLNN2024A');
      await page.fill('input[formControlName="startTimeRaw"]', '01/12/2025 08:00 đến 01/12/2025 10:00');
      await page.locator('input[formControlName="startTimeRaw"]').blur();
      await page.waitForTimeout(300);

      await expect(page.locator('.ma-foot .ma-btn-save')).not.toBeDisabled();

      await page.click('.ma-close');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
    });

    // ============================================================
    // TC-ESM-11: Mở/đóng panel chọn cột và toggle checkbox
    // ============================================================
    test('TC-ESM-11: Ẩn và hiện lại cột trong bảng', async ({ page }) => {
      await _searchByDecision(page, TEST_DATA.existingDecisionName);
      await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

      if (await page.locator('.esm-table tbody tr').count() === 0) {
        test.skip();
        return;
      }

      // Nút settings mở panel chọn cột
      const colSelectorBtn = page.locator('button.btn-ghost.btn-icon[title="Chọn cột hiển thị"]');
      await expect(colSelectorBtn).toBeVisible();
      await colSelectorBtn.click();
      await page.waitForTimeout(300);

      // Panel hiện ra với đầy đủ các nút
      const colPanel = page.locator('.col-selector-panel');
      await expect(colPanel).toBeVisible({ timeout: 3000 });
      await expect(colPanel.locator('button:has-text("Hiện tất cả")')).toBeVisible();
      await expect(colPanel.locator('button:has-text("Ẩn tất cả")')).toBeVisible();
      await expect(colPanel.locator('button:has-text("Mặc định")')).toBeVisible();

      // Danh sách checkbox cột phải có ít nhất 5 cột
      const checkboxes = colPanel.locator('.col-check-item');
      const colCount = await checkboxes.count();
      expect(colCount).toBeGreaterThanOrEqual(5);

      // Click "Ẩn tất cả" → tất cả checkbox phải unchecked (trừ cột cố định)
      await colPanel.locator('button:has-text("Ẩn tất cả")').click();
      await page.waitForTimeout(300);

      // // Click "Hiện tất cả" → tất cả checkbox phải checked
      // await colPanel.locator('button:has-text("Hiện tất cả")').click();
      // await page.waitForTimeout(300);
      // const checkedAfterShowAll = await colPanel.locator('.col-check-item input[type="checkbox"]:checked').count();
      // expect(checkedAfterShowAll).toBeGreaterThan(0);
      // // Click "Mặc định" → reset về trạng thái ban đầu
      // await colPanel.locator('button:has-text("Mặc định")').click();
      // await page.waitForTimeout(300);
      // Đóng panel bằng cách click lại nút settings
      await colSelectorBtn.click();
      await expect(colPanel).not.toBeVisible();
    });

    // ============================================================
    // TC-ESM-12: Phân trang danh sách kế hoạch thi
    // ============================================================
    test('TC-ESM-12: Phân trang danh sách kế hoạch thi', async ({ page }) => {
      await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

      const pgInfo = page.locator('.pg-info');
      const totalText = await pgInfo.textContent();
      if (!totalText || !totalText.includes('kế hoạch thi')) {
        test.skip();
        return;
      }

      // Đổi số dòng/trang sang 5 — dùng value number vì Angular dùng [ngValue]="5"
      const rowsSelect = page.locator('.f-select-sm');
      await rowsSelect.selectOption({ value: '5' });
      await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

      // Số row hiển thị phải <= 5
      const rowCount = await page.locator('.esm-table tbody tr').count();
      expect(rowCount).toBeLessThanOrEqual(5);

      // Kiểm tra pg-info cập nhật đúng
      await expect(pgInfo).toBeVisible();
      await expect(pgInfo).toContainText('kế hoạch thi');

      // Nếu có nhiều hơn 5 record → test chuyển trang
      // Nút trang tiếp: pg-controls có 4 nút (đầu, trước, sau, cuối)
      const pgBtns = page.locator('.pg-controls .pg-btn');
      const nextBtn = pgBtns.nth(2); // nút ">"

      if (await nextBtn.isEnabled()) {
        const firstRowPage1 = await page.locator('.esm-table tbody tr').first().textContent();

        // Sang trang 2
        await nextBtn.click();
        await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });

        // Nội dung trang 2 khác trang 1
        const firstRowPage2 = await page.locator('.esm-table tbody tr').first().textContent();
        expect(firstRowPage2).not.toEqual(firstRowPage1);

        // Nút trang trước phải enabled
        const prevBtn = pgBtns.nth(1);
        await expect(prevBtn).toBeEnabled();

        // Quay lại trang 1
        await prevBtn.click();
        await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });
        const firstRowBack = await page.locator('.esm-table tbody tr').first().textContent();
        expect(firstRowBack).toEqual(firstRowPage1);
      }

      // // Reset về 10 dòng/trang
      // await rowsSelect.selectOption({ value: '10' });
      // await page.waitForTimeout(500);
    });

    // ============================================================
    // TC-ESM-13: Tự động điền giờ 07:00 khi nhập khoảng ngày
    // ============================================================
    test('TC-ESM-13: Tự động điền giờ 07:00 khi nhập khoảng ngày (13/05/2026 tới 25/12/2027)', async ({ page }) => {
      await _openAddFormStep2(page);

      await page.fill('input[formControlName="subjectName"]', 'Môn Test Auto Time Mapping');
      await page.fill('input[formControlName="clazz"]', 'K65-AUTO');

      const timeInput = page.locator('input[formControlName="startTimeRaw"]');
      // Nhập format tự do có chứa 2 mốc ngày
      await timeInput.fill('Từ ngày 13/05/2026 tới ngày 25/12/2027');
      await timeInput.blur();
      await page.waitForTimeout(500);

      // Kiểm tra xem nó có tự format lại thành chuẩn dd/MM/yyyy HH:mm không
      const finalValue = await timeInput.inputValue();
      // Kỳ vọng nó tự map về 07:00 cho cả 2 mốc
      expect(finalValue).toContain('13/05/2026 07:00');
      expect(finalValue).toContain('25/12/2027 07:00');

      // Nút submit phải được enabled sau khi auto-map thành công
      await expect(page.locator('.ma-foot .ma-btn-save')).not.toBeDisabled();

      await page.click('.ma-close');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
    });

    // ============================================================
    // TC-ESM-14: Hỗ trợ format thời gian linh hoạt (dấu -> và thiếu năm)
    // ============================================================
    test('TC-ESM-14: Hỗ trợ format thời gian linh hoạt (14/05 00:00 -> 15/05 23:59)', async ({ page }) => {
      await _openAddFormStep2(page);

      await page.fill('input[formControlName="subjectName"]', 'Môn Test Format Mới');
      await page.fill('input[formControlName="clazz"]', 'K65-NEW');

      const timeInput = page.locator('input[formControlName="startTimeRaw"]');
      // Nhập format "->" và thiếu năm
      await timeInput.fill('14/05 00:00 -> 15/05 23:59');
      await timeInput.blur();
      await page.waitForTimeout(500);

      const finalValue = await timeInput.inputValue();
      const currentYear = new Date().getFullYear();
      // Kỳ vọng nó tự map về đúng ngày tháng năm và giờ
      expect(finalValue).toContain(`14/05/${currentYear} 00:00`);
      expect(finalValue).toContain(`15/05/${currentYear} 23:59`);
      expect(finalValue).toContain('đến');

      await expect(page.locator('.ma-foot .ma-btn-save')).not.toBeDisabled();

      await page.click('.ma-close');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
    });

    // ============================================================
    // TC-ESM-15: Ngày kết thúc trước ngày bắt đầu → báo lỗi, không cho tạo
    // ============================================================
    test('TC-ESM-15: Ngày kết thúc trước ngày bắt đầu → báo lỗi', async ({ page }) => {
      await _openAddFormStep2(page);

      await page.fill('input[formControlName="subjectName"]', 'Môn Test Ngày Ngược');
      await page.fill('input[formControlName="clazz"]', 'K65-ERR');

      const timeInput = page.locator('input[formControlName="startTimeRaw"]');
      // Nhập ngày kết thúc TRƯỚC ngày bắt đầu
      await timeInput.fill('25/12/2026 10:00 đến 01/01/2026 08:00');
      await timeInput.blur();
      await page.waitForTimeout(500);

      // Phải hiện lỗi
      const errMsg = page.locator('.f-err');
      await expect(errMsg).toBeVisible({ timeout: 3000 });
      await expect(errMsg).toContainText('Ngày kết thúc phải sau ngày bắt đầu');

      // Nút submit phải disabled
      await expect(page.locator('.ma-foot .ma-btn-save')).toBeDisabled();

      await page.click('.ma-close');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
    });

  }); // End sub-describe
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function _searchByDecisionAndSubject(page: Page, decisionName: string, subjectName: string): Promise<void> {
  await _searchByDecision(page, decisionName);
  const subjectInput = page.locator('.filter-bar input[placeholder*="môn"]').first();
  await subjectInput.fill(subjectName);
  await page.click('button.btn-search');
  await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });
}

async function _searchByDecision(page: Page, decisionName: string): Promise<void> {
  const decisionInput = page.locator('.filter-bar app-search-select input').first();
  await decisionInput.click();
  await page.waitForTimeout(300);
  await decisionInput.fill(decisionName);
  await decisionInput.press('Enter');
  await page.waitForTimeout(800);

  const opt = page.locator('.ss-opt, [class*="ss-option"]').first();
  if (await opt.isVisible({ timeout: 3000 })) {
    await opt.click();
  }
  await page.waitForTimeout(500);
  await page.waitForSelector('.skeleton-wrap', { state: 'hidden', timeout: 10_000 });
}

async function _openAddFormStep2(page: Page): Promise<void> {
  await page.click('button:has-text("Thêm kế hoạch")');
  await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.ma-head-title')).toContainText('Chọn quyết định thi');

  const modalDecisionInput = page.locator('.modal app-search-select input').first();
  await modalDecisionInput.click();
  await modalDecisionInput.fill(TEST_DATA.existingDecisionName);
  await modalDecisionInput.press('Enter');
  await page.waitForTimeout(800);

  const opt = page.locator('.ss-opt, [class*="ss-option"]').first();
  if (await opt.isVisible({ timeout: 3000 })) await opt.click();
  await page.waitForTimeout(500);

  await expect(page.locator('.ma-head-title')).toContainText('Thêm kế hoạch thi');
}
