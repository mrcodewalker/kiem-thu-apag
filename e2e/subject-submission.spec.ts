/**
 * ============================================================
 * KIỂM THỬ CHỨC NĂNG: Nộp bài tập trực tuyến (Subject Submission)
 * URL: https://hcqtc.vn/dashboard/subject-submission
 * Role: STUDENT (tài khoản: CT070218 / Haibeo2004@)
 * Framework: Playwright (Serial Mode with Shared Session)
 * ============================================================
 * 
 * THỨ TỰ TEST (Tuần tự):
 * TC-SS-01: Đăng nhập sinh viên thành công (Khởi tạo session)
 * TC-SS-02: Hiển thị trang danh sách môn thi
 * TC-SS-03: Xem chi tiết môn thi (Modal View)
 * TC-SS-04: Mở form nộp bài và kiểm tra các trường dữ liệu (bao gồm dropdown Chủ đề)
 * TC-SS-05: Kiểm tra nút "Nộp bài" bị disabled khi chưa chọn tệp
 * TC-SS-06: Kiểm tra validate định dạng tệp (không phải PDF)
 * TC-SS-07: Kiểm tra validate dung lượng tệp (> 20MB)
 * TC-SS-08: Thực hiện chọn tệp PDF hợp lệ và kiểm tra trạng thái "Sẵn sàng nộp"
 * TC-SS-09: Thay đổi hoặc xóa tệp đã chọn
 * TC-SS-10: Kiểm tra validate chủ đề bắt buộc khi nộp bài
 * TC-SS-11: Thực hiện nộp bài đầy đủ thông tin (Thành công)
 * TC-SS-12: Vào lịch sử nộp bài và xóa bài vừa nộp
 * TC-SS-13: Kiểm tra trạng thái môn thi sau khi xóa (Phải quay về "Chưa nộp")
 * TC-SS-14: Kiểm tra chức năng hỗ trợ (Support Dialog)
 * TC-SS-15: Đăng xuất khỏi hệ thống
 * ============================================================
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Chạy tuần tự để TC sau thừa hưởng kết quả của TC trước
test.describe.configure({ mode: 'serial' });

const AUTH_FILE = path.join(__dirname, 'student-auth.json');

const STUDENT_ACCOUNT = {
  username: 'CT070218',
  password: 'Haibeo2004@',
};

// Đường dẫn tệp mock đã upload
const TEST_DATA = {
  pdfValid: path.join(__dirname, 'mock-file', 'valid.pdf'),
  pdfLarge: path.join(__dirname, 'mock-file', 'greater-20-mb.pdf'),
  invalidFile: path.join(__dirname, 'mock-file', 'Invalid.xlsx'),
  pdfChange: path.join(__dirname, 'mock-file', 'change.pdf'),
};

test.describe('Nộp bài tập trực tuyến — Subject Submission Flow', () => {

  // ─── TC-SS-01 ───────────────────────────────────────────────
  // TC này thực hiện đăng nhập và lưu lại session để các TC sau dùng luôn, không cần login lại.
  test('TC-SS-01: Đăng nhập sinh viên thành công', async ({ page }) => {
    console.log('🔑 TC-SS-01: Đang đăng nhập tài khoản:', STUDENT_ACCOUNT.username);

    await page.goto('/login');
    await page.waitForSelector('#username', { state: 'visible' });
    await page.fill('#username', STUDENT_ACCOUNT.username);
    await page.fill('#password', STUDENT_ACCOUNT.password);
    await page.click('button:has-text("Đăng nhập")');

    // Chờ redirect vào dashboard sinh viên
    await page.waitForURL('**/dashboard-student/subjects', { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard-student\/subjects/);

    // Lưu trạng thái đăng nhập vào file để chia sẻ cho các test case sau
    await page.context().storageState({ path: AUTH_FILE });
    console.log('✅ Đăng nhập thành công và đã lưu session.');
  });

  // Các test case từ TC-02 trở đi sẽ sử dụng session đã lưu
  test.describe('Chức năng sau khi đăng nhập', () => {
    // Cấu hình sử dụng session đã lưu ở TC-01
    test.use({ storageState: AUTH_FILE });

    // ─── TC-SS-02 ───────────────────────────────────────────────
    test('TC-SS-02: Hiển thị trang danh sách môn thi', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await page.waitForSelector('.ss-title', { state: 'visible' });
      await waitForDataLoad(page);

      await expect(page.locator('.ss-title')).toHaveText('Môn thi');
      await expect(page.locator('.ss-table')).toBeVisible();

      const rows = page.locator('.ss-table tbody tr');
      const count = await rows.count();
      console.log(`📊 TC-SS-02: Tìm thấy ${count} môn thi.`);

      if (count === 0) {
        await expect(page.locator('.ss-empty')).toBeVisible();
      }
    });

    // ─── TC-SS-03 ───────────────────────────────────────────────
    test('TC-SS-03: Xem chi tiết môn thi (Modal View)', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await page.waitForSelector('.ss-table', { state: 'visible' });
      await waitForDataLoad(page);

      const viewBtn = page.locator('.ss-act-btn--view').first();
      await expect(viewBtn).toBeVisible({ timeout: 5000 });

      await viewBtn.click();
      const modal = page.locator('.ss-modal--xl');
      await expect(modal).toBeVisible();
      await expect(modal.locator('.ss-modal-title')).toContainText('Chi tiết môn thi');

      await modal.locator('.ss-modal-close').click();
      await expect(modal).not.toBeVisible();
    });

    // ─── TC-SS-04 ───────────────────────────────────────────────
    test('TC-SS-04: Mở form nộp bài tập lớn và kiểm tra các trường dữ liệu (bao gồm dropdown Chủ đề)', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });

      await submitBtn.click();
      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });
      await expect(modal).toBeVisible();

      // Kiểm tra trường Mã bài tập lớn (readonly)
      await expect(modal.locator('input[formControlName="assignmentName"]')).toHaveAttribute('readonly', '');

      // Kiểm tra dropdown Chủ đề (bắt buộc)
      const topicDropdown = modal.locator('.ss-custom-select');
      await expect(topicDropdown).toBeVisible();
      await expect(modal.locator('.ss-label:has-text("Chủ đề")')).toBeVisible();

      // Mở dropdown và kiểm tra có 10 chủ đề
      await topicDropdown.locator('.ss-custom-select__trigger').click();
      const options = modal.locator('.ss-custom-select__option');
      await expect(options).toHaveCount(10);
      // Đóng dropdown bằng cách click ra ngoài
      await modal.locator('.ss-modal-body').click({ position: { x: 5, y: 5 } });

      // Kiểm tra dropzone tệp
      await expect(modal.locator('.ss-dropzone')).toBeVisible();

      console.log('✅ TC-SS-04: Form nộp bài hiển thị đầy đủ: Mã bài tập, Chủ đề (dropdown 10 options), Mô tả, Tệp đính kèm.');
    });

    // ─── TC-SS-05 ───────────────────────────────────────────────
    test('TC-SS-05: Kiểm tra nút "Nộp bài" bị disabled khi chưa chọn tệp', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });
      await expect(modal).toBeVisible();

      const primaryBtn = modal.locator('button.ss-btn-primary:has-text("Nộp bài")');
      await expect(primaryBtn).toBeDisabled();
      console.log('✅ TC-SS-05: Nút nộp bài đã được khóa khi chưa chọn tệp.');
    });

    // ─── TC-SS-06 ───────────────────────────────────────────────
    test('TC-SS-06: Kiểm tra validate định dạng tệp (không phải PDF)', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });

      if (!TEST_DATA.invalidFile) {
        console.log('📝 TC-SS-06: Chờ cấu hình TEST_DATA.invalidFile. Hiện tại skip logic upload.');
        return;
      }

      const fileInput = modal.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_DATA.invalidFile);

      const errorToast = page.locator('.ss-toast--warn');
      await expect(errorToast).toBeVisible({ timeout: 5000 });
      await expect(errorToast).toContainText(/PDF/i);
    });

    // ─── TC-SS-07 ───────────────────────────────────────────────
    test('TC-SS-07: Kiểm tra validate dung lượng tệp (> 20MB)', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });

      if (!TEST_DATA.pdfLarge) {
        console.log('📝 TC-SS-07: Chờ cấu hình TEST_DATA.pdfLarge. Hiện tại skip logic upload.');
        return;
      }

      const fileInput = modal.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_DATA.pdfLarge);

      const errorToast = page.locator('.ss-toast--warn');
      await expect(errorToast).toBeVisible({ timeout: 5000 });
      await expect(errorToast).toContainText(/20MB/i);
    });

    // ─── TC-SS-08 ───────────────────────────────────────────────
    test('TC-SS-08: Thực hiện chọn tệp PDF hợp lệ và kiểm tra trạng thái "Sẵn sàng nộp"', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });

      if (!TEST_DATA.pdfValid) {
        console.log('📝 TC-SS-08: Chờ cấu hình TEST_DATA.pdfValid. Hiện tại skip logic upload.');
        return;
      }

      const fileInput = modal.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_DATA.pdfValid);

      await expect(modal.locator('.ss-file-card')).toBeVisible();
      await expect(modal.locator('.ss-file-card-ok')).toContainText('Sẵn sàng nộp');
      await expect(modal.locator('button.ss-btn-primary')).not.toBeDisabled();
    });

    // ─── TC-SS-09 ───────────────────────────────────────────────
    test('TC-SS-09: Thay đổi hoặc xóa tệp đã chọn', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();

      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });

      if (!TEST_DATA.pdfValid || !TEST_DATA.pdfChange) return;

      // Chọn file 1
      const fileInput = modal.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_DATA.pdfValid);
      await expect(modal.locator('.ss-file-card')).toBeVisible();

      // Thay đổi sang file 2 (change.pdf)
      await fileInput.setInputFiles(TEST_DATA.pdfChange);
      await expect(modal.locator('.ss-file-card-name')).toContainText('change.pdf');
      
      // Thử xóa
      await modal.locator('.ss-file-btn--remove').click();
      await expect(modal.locator('.ss-file-card')).not.toBeVisible();
      await expect(modal.locator('.ss-dropzone')).toBeVisible();
      console.log('✅ TC-SS-09: Thay đổi và xóa tệp thành công.');
    });

    // ─── TC-SS-10 ───────────────────────────────────────────────
    test('TC-SS-10: Kiểm tra validate chủ đề bắt buộc khi nộp bài', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });
      await expect(modal).toBeVisible();

      if (!TEST_DATA.pdfValid) {
        console.log('📝 TC-SS-10: Chờ tệp hợp lệ để test validate chủ đề.');
        return;
      }

      // Chọn file hợp lệ nhưng KHÔNG chọn chủ đề
      const fileInput = modal.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_DATA.pdfValid);
      await expect(modal.locator('.ss-file-card')).toBeVisible();

      // Bấm nộp bài mà không chọn chủ đề
      await modal.locator('button.ss-btn-primary').click();

      // Phải hiện toast cảnh báo yêu cầu chọn chủ đề
      const warnToast = page.locator('.ss-toast--warn');
      await expect(warnToast).toBeVisible({ timeout: 5000 });
      await expect(warnToast).toContainText(/chủ đề/i);

      // Kiểm tra error text hiển thị dưới dropdown
      const errorText = modal.locator('.ss-error-text');
      await expect(errorText).toBeVisible();
      await expect(errorText).toContainText('Vui lòng chọn chủ đề');

      console.log('✅ TC-SS-10: Validate chủ đề bắt buộc hoạt động đúng.');
    });

    // ─── TC-SS-11 ───────────────────────────────────────────────
    test('TC-SS-11: Thực hiện nộp bài đầy đủ thông tin (Thành công)', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();

      const modal = page.locator('.ss-modal').filter({ hasText: 'Nộp bài tập lớn' });

      // Chọn chủ đề (bắt buộc) - mở dropdown và chọn "Chủ đề 1"
      const topicTrigger = modal.locator('.ss-custom-select__trigger');
      await topicTrigger.click();
      await modal.locator('.ss-custom-select__option').first().click();

      // Kiểm tra chủ đề đã được chọn
      await expect(modal.locator('.ss-custom-select__value')).toContainText('Chủ đề 1');

      // Nhập mô tả (không bắt buộc)
      await modal.locator('textarea[formControlName="description"]').fill('Nội dung mô tả bài nộp qua Playwright.');

      if (!TEST_DATA.pdfValid) {
        console.log('📝 TC-SS-11: Chờ tệp hợp lệ để test nộp bài.');
        return;
      }

      // Chọn tệp PDF hợp lệ
      await modal.locator('input[type="file"]').setInputFiles(TEST_DATA.pdfValid);
      await expect(modal.locator('.ss-file-card')).toBeVisible();

      // Bấm nộp bài
      await modal.locator('button.ss-btn-primary').click();

      // Chờ toast thành công
      await expect(page.locator('.ss-toast--success')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.ss-processing-toast')).toBeVisible();
      console.log('✅ TC-SS-11: Nộp bài thành công (đã chọn chủ đề + tệp PDF).');
    });

    // ─── TC-SS-12 ───────────────────────────────────────────────
    test('TC-SS-12: Vào lịch sử nộp bài và xóa bài vừa nộp', async ({ page }) => {
      await page.goto('/dashboard-student/history');
      await page.waitForSelector('.ss-title', { state: 'visible' });
      
      // Chờ skeleton của lịch sử (HS dùng cùng class ss-skeleton-row)
      await waitForDataLoad(page);

      const deleteBtn = page.locator('.ss-act-btn--delete').first();
      if (!await deleteBtn.isVisible()) {
        console.log('ℹ️ TC-SS-12: Skip (Không tìm thấy bài nộp nào có thể xóa).');
        return;
      }

      await deleteBtn.click();
      
      // Chờ modal xác nhận xóa
      const confirmModal = page.locator('.ss-modal').filter({ hasText: 'Xác nhận xóa bài nộp' });
      await expect(confirmModal).toBeVisible();
      
      // Bấm nút Xác nhận xóa
      const doDeleteBtn = confirmModal.locator('.hs-btn-delete');
      await doDeleteBtn.click();
      
      // Chờ toast thành công
      await expect(page.locator('.ss-toast--success')).toBeVisible({ timeout: 10_000 });
      console.log('✅ TC-SS-12: Xóa bài nộp từ lịch sử thành công.');
    });

    // ─── TC-SS-13 ───────────────────────────────────────────────
    test('TC-SS-13: Kiểm tra trạng thái môn thi sau khi xóa (Phải quay về "Chưa nộp")', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);
      
      // Sau khi xóa, icon done (--done) phải biến mất và thay bằng icon submit (--submit)
      const submitBtn = page.locator('.ss-act-btn--submit').first();
      await expect(submitBtn).toBeVisible();
      console.log('✅ TC-SS-13: Môn thi đã quay lại trạng thái có thể nộp bài.');
    });

    // ─── TC-SS-14 ───────────────────────────────────────────────
    test('TC-SS-14: Kiểm tra chức năng hỗ trợ (Support Dialog)', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      await page.click('button:has-text("Help")');
      const modal = page.locator('.ss-modal').filter({ hasText: 'Liên hệ hỗ trợ' });
      await expect(modal).toBeVisible();
      await modal.locator('.ss-modal-close').click();
      await expect(modal).not.toBeVisible();
      console.log('✅ TC-SS-14: Dialog hỗ trợ mở/đóng thành công.');
    });

    // ─── TC-SS-15 ───────────────────────────────────────────────
    test('TC-SS-15: Đăng xuất khỏi hệ thống', async ({ page }) => {
      await page.goto('/dashboard-student/subjects');
      await waitForDataLoad(page);

      // Tìm nút đăng xuất trong sidebar hoặc user menu
      const logoutBtn = page.locator('.ds-logout-btn, .ds-user-dd-item--danger').first();
      await expect(logoutBtn).toBeVisible({ timeout: 5000 });
      await logoutBtn.click();

      // Chờ và click nút xác nhận đăng xuất trong modal
      const confirmBtn = page.locator('button:has-text("Đăng xuất")').filter({ visible: true }).last();
      await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
      await confirmBtn.click();

      // Kiểm tra chuyển hướng về trang login
      await page.waitForURL('**/login**', { timeout: 10_000 });
      await expect(page).toHaveURL(/login/);

      // Cleanup session file
      if (fs.existsSync(AUTH_FILE)) {
        try { fs.unlinkSync(AUTH_FILE); } catch (e) { }
      }
      console.log('👋 TC-SS-15: Đã đăng xuất thành công qua UI.');
    });
  });
});

// ============================================================
// HELPER FUNCTIONS TRONG SPEC
// ============================================================

/**
 * Chờ dữ liệu trong bảng load xong (skeleton biến mất)
 */
async function waitForDataLoad(page: Page) {
  // Chờ skeleton ẩn đi
  await page.waitForSelector('.ss-skeleton-row', { state: 'hidden', timeout: 15_000 });
  // Đợi thêm 1 chút để Angular render xong các row
  await page.waitForTimeout(1000);
}
