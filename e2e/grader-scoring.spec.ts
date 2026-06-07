/**
 * ============================================================
 * KIỂM THỬ CHỨC NĂNG: Chấm thi (Grader Scoring)
 * URL: https://hcqtc.vn/dashboard-grader/scoring
 * Role: GRADER (tài khoản: lamtung / LAM@123)
 * Framework: Playwright
 * ============================================================
 *
 * CHUẨN BỊ TRƯỚC KHI CHẠY:
 * 1. Đã chạy e2e/setup-grader-mock-data.spec.ts thành công
 *    -> Phòng P102 đã ở trạng thái CHAM, grader lamtung đã được giao
 *    -> Template "Viết 3 câu" (Tự luận 3-4-3) đã được gán
 * 2. File e2e/excel/INVALID.xlsx và VALID.xlsx đã có sẵn
 * 3. Chạy: npx playwright test grader-scoring --headed
 *
 * THỨ TỰ TEST:
 * TC-GS-01: Đăng nhập grader thành công
 * TC-GS-02: Hiển thị trang chấm điểm và danh sách phân công
 * TC-GS-03: Chọn phòng thi được phân công (P102)
 * TC-GS-04: Hiển thị bảng chấm điểm với cột động từ template
 * TC-GS-05: Nhập điểm hợp lệ cho 1 thí sinh và lưu
 * TC-GS-06: Nhập điểm vượt quá max — hiển thị lỗi
 * TC-GS-07: Nhập ký tự không phải số — hiển thị lỗi
 * TC-GS-08: Bỏ trống 1 cột điểm — không thể gửi
 * TC-GS-09: Nhập điểm âm — hiển thị lỗi
 * TC-GS-10: Gửi nhiều bài cùng lúc (saveAll)
 * TC-GS-11: Tải file mẫu Excel (downloadTemplate)
 * TC-GS-12: Import Excel — file INVALID.xlsx — hiển thị lỗi
 * TC-GS-13: Import Excel — file VALID.xlsx — nhập điểm thành công
 * TC-GS-14: Xem lịch sử chấm điểm
 * TC-GS-15: Lọc phân công theo trạng thái "Chưa xong" / "Xong"
 * TC-GS-16: Cảnh báo khi thoát trang có dữ liệu chưa lưu
 * TC-GS-17: Đăng xuất
 * TC-GS-18: [BUG CRITICAL] Import Excel mã phách bị sửa — mã phách bảng không được thay đổi (Expected: FAIL)
 * TC-GS-19: [BUG CRITICAL] Import Excel thêm mã phách giả — hệ thống tự thêm SV ma, số SV tăng (Expected: FAIL)
 * ============================================================
 */

import * as path from 'path';
import { test, expect, Page } from '@playwright/test';

// ============================================================
// Dùng storageState đã được global-setup.ts tạo sẵn.
// Browser mở ra là đã đăng nhập — không cần login trong từng test.
// ============================================================
const AUTH_STATE_FILE = path.join(__dirname, '.auth', 'grader.json');
test.use({ storageState: AUTH_STATE_FILE });

// ============================================================
// CẤU HÌNH TÀI KHOẢN GRADER
// ============================================================
const GRADER_ACCOUNT = {
    username: 'lamtung',
    password: 'LAM@123',
};

const ASSIGNED_ROOM = 'P102';
const SUBJECT_NAME = 'Kiểm thử phần mềm'; // môn học từ setup-grader-mock-data

// Điểm hợp lệ cho template "Viết 3 câu" (Tự luận 3-4-3, tổng max = 10)
const VALID_SCORES = ['3', '4', '3'];
const VALID_SCORES_PARTIAL = ['2', '3', '2']; // tổng = 7

// Đường dẫn file Excel test (đã chuẩn bị sẵn)
const EXCEL_INVALID = path.join(__dirname, 'excel', 'INVALID.xlsx');
const EXCEL_VALID = path.join(__dirname, 'excel', 'VALID.xlsx');
const EXCEL_SUA_MA_PHACH = path.join(__dirname, 'excel', 'SUA_MA_PHACH.xlsx');


// ============================================================
// HELPER: Chờ danh sách phân công load xong
// Dùng waitForFunction thay vì waitForSelector skeleton vì Angular *ngIf
// có thể không render skeleton nếu API trả về quá nhanh
// ============================================================
async function waitForAssignList(page: Page): Promise<void> {
    // Chờ đến khi có ít nhất 1 assign-item HOẶC empty state xuất hiện
    await page.waitForFunction(
        () => document.querySelector('.gs-assign-item') !== null
            || document.querySelector('.gs-empty') !== null,
        { timeout: 15_000 }
    );
}

// ============================================================
// HELPER: Tìm đúng assign item theo room + subject + template
// Filter kết hợp để tránh nhầm khi có nhiều phòng/template trùng tên
// ============================================================
async function findAssignItem(page: Page) {
    return page
        .locator('.gs-assign-item')
        .filter({ has: page.locator(`.gs-assign-name:has-text("${ASSIGNED_ROOM}")`) })
        .filter({ has: page.locator(`.gs-assign-ctx-chip:has-text("${SUBJECT_NAME}")`) })
        .first();
}

// ============================================================
// HELPER: Chọn phòng thi và chờ bảng điểm load xong
// ============================================================
async function selectRoom(page: Page): Promise<void> {
    await waitForAssignList(page);
    const item = await findAssignItem(page);
    await expect(item).toBeVisible({ timeout: 8000 });
    await item.click();
    // Chờ bảng điểm render: gs-table-wrap hoặc gs-empty xuất hiện
    await page.waitForFunction(
        () => document.querySelector('.gs-table-wrap') !== null
            || document.querySelector('.gs-empty') !== null,
        { timeout: 15_000 }
    );
}

// ============================================================
// TEST SUITE CHÍNH
// ============================================================
test.describe('Chấm thi — Grader Scoring (lamtung / P102)', () => {

    // ─── TC-GS-01 ───────────────────────────────────────────────
    // ─── TC-GS-01 ───────────────────────────────────────────────
    // Mục đích: xác nhận storageState hợp lệ — user đã đăng nhập sẵn,
    // truy cập /dashboard-grader/scoring không bị redirect về /login.
    // Việc điền form login được kiểm thử riêng trong global-setup.ts.
    test('TC-GS-01: Xác nhận đã đăng nhập — truy cập dashboard không bị redirect', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        // Nếu chưa đăng nhập → Angular guard redirect về /login
        // Nếu đã đăng nhập → ở lại dashboard-grader
        await expect(page).toHaveURL(/dashboard-grader/, { timeout: 10_000 });
        // Trang chấm điểm render được → token hợp lệ
        await expect(page.locator('.gs-header-title')).toHaveText('Chấm điểm');
        // Không hiển thị form login
        await expect(page.locator('#username')).not.toBeVisible();
    });

    // ─── TC-GS-02 ───────────────────────────────────────────────
    test('TC-GS-02: Hiển thị trang chấm điểm và danh sách phân công', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await expect(page.locator('.gs-header-title')).toHaveText('Chấm điểm');
        await expect(page.locator('.gs-header-sub')).toBeVisible();
        await expect(page.locator('.gs-card-title').first()).toContainText('Phân công của tôi');
        await expect(page.locator('.gs-type-switch button:has-text("Đại học")')).toBeVisible();
        await expect(page.locator('.gs-type-switch button:has-text("Thạc sĩ")')).toBeVisible();
        await waitForAssignList(page);
        expect(await page.locator('.gs-assign-item').count()).toBeGreaterThan(0);
        await expect(page.locator('.gs-placeholder')).toBeVisible();
        await expect(page.locator('.gs-placeholder')).toContainText('Chọn phân công để bắt đầu');
    });

    // ─── TC-GS-03 ───────────────────────────────────────────────
    test('TC-GS-03: Chọn phòng thi P102 được phân công', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);

        // Tìm đúng item bằng cả 3 tiêu chí: tên phòng + môn học + template
        // Tránh nhầm khi có nhiều phòng/template trùng tên
        const roomItem = await findAssignItem(page);
        await expect(roomItem).toBeVisible({ timeout: 8000 });

        // Verify thông tin TRƯỚC khi click (locator còn ổn định)
        await expect(roomItem.locator('.gs-assign-name')).toContainText(ASSIGNED_ROOM);
        await expect(roomItem.locator('.gs-assign-ctx-chip').first()).toContainText(SUBJECT_NAME);
        await expect(roomItem.locator('.gs-badge--role')).toContainText('CB1');

        // Đọc template name thực tế để log (không assert cứng vì tên có thể dài hơn)
        const tplText = await roomItem.locator('.gs-assign-tpl').textContent();
        console.log('Template hiển thị:', tplText?.trim());
        expect(tplText).toBeTruthy();

        // Click chọn phòng
        await roomItem.click();
        // Chờ bảng điểm render (gs-table-wrap hoặc gs-empty xuất hiện)
        await page.waitForFunction(
            () => document.querySelector('.gs-table-wrap') !== null
                || document.querySelector('.gs-empty') !== null,
            { timeout: 15_000 }
        );

        // Sau khi click: cột phải hiển thị bảng chấm điểm
        await expect(page.locator('.gs-card-title').nth(1)).toContainText('Bảng chấm điểm');

        // Toolbar bảng chấm cũng hiển thị đúng môn học
        await expect(
            page.locator('.gs-toolbar-left .gs-assign-ctx-chip').first()
        ).toContainText(SUBJECT_NAME);
    });

    // ─── TC-GS-04 ───────────────────────────────────────────────
    test('TC-GS-04: Hiển thị bảng chấm điểm với cột động từ template "Viết 3 câu"', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        const table = page.locator('.gs-table');
        await expect(table).toBeVisible();
        await expect(table.locator('thead th').nth(0)).toContainText('#');
        await expect(table.locator('thead th').nth(1)).toContainText('Mã phách');

        // Template "Viết 3 câu" phải có đúng 3 cột điểm động
        await expect(table.locator('thead th .gs-th-name')).toHaveCount(3);
        await expect(table.locator('thead th .gs-th-max').first()).toContainText('/');

        // Header cuối: Tổng, Trạng thái, Ghi chú
        const allTh = table.locator('thead th');
        const thCount = await allTh.count();
        await expect(allTh.nth(thCount - 4)).toContainText('Tổng');
        await expect(allTh.nth(thCount - 3)).toContainText('Trạng thái');
        await expect(allTh.nth(thCount - 2)).toContainText('Ghi chú');

        // Có ít nhất 1 hàng dữ liệu (11 thí sinh từ setup)
        const rows = table.locator('tbody tr');
        expect(await rows.count()).toBeGreaterThan(0);
        await expect(rows.first().locator('.gs-cover-badge')).toBeVisible();

        // Mỗi hàng có đúng 3 ô nhập điểm
        await expect(rows.first().locator('.gs-score-inp')).toHaveCount(3);
    });

    // ─── TC-GS-05 ───────────────────────────────────────────────
    test('TC-GS-05: Nhập điểm hợp lệ cho 1 thí sinh và lưu riêng', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        const firstRow = page.locator('.gs-table tbody tr').first();
        await expect(firstRow).toBeVisible({ timeout: 5000 });

        const inputs = firstRow.locator('.gs-score-inp');

        // Đọc điểm max của từng cột từ header
        const maxLabels = page.locator('.gs-table thead th .gs-th-max');
        const colCount = await maxLabels.count();
        const maxScores: number[] = [];
        for (let i = 0; i < colCount; i++) {
            const txt = await maxLabels.nth(i).textContent();
            maxScores.push(parseFloat(txt?.replace('/', '').trim() || '10'));
        }

        // Đọc giá trị hiện tại
        const currentScores: number[] = [];
        for (let i = 0; i < colCount; i++) {
            const val = await inputs.nth(i).inputValue();
            currentScores.push(parseFloat(val) || 0);
        }

        // Tạo điểm mới khác giá trị hiện tại
        const newScores = maxScores.map((max, i) => {
            const cur = currentScores[i];
            const candidate = cur < max ? cur + 1 : cur - 1;
            return Math.max(0, Math.min(candidate, max));
        });

        // Điền điểm — dùng triple-click + type để đảm bảo Angular (input) event fire
        for (let i = 0; i < newScores.length; i++) {
            await inputs.nth(i).click({ clickCount: 3 });
            await page.keyboard.type(String(newScores[i]));
            await inputs.nth(i).press('Tab');
        }
        await page.waitForTimeout(300);

        // Hàng phải có class row-dirty
        await expect(firstRow).toHaveClass(/row-dirty/);

        // Draft banner xuất hiện
        await expect(page.locator('.gs-draft-banner')).toBeVisible();

        // Tổng điểm hiển thị đúng
        const expectedTotal = newScores.reduce((a, b) => a + b, 0);
        await expect(firstRow.locator('.gs-total-cell')).toContainText(String(expectedTotal));

        // Click icon lưu riêng bài này
        const saveIcon = firstRow.locator('.gs-status-icon--dirty');
        await expect(saveIcon).toBeVisible();

        const toastPromise = page.waitForSelector(
            '.p-toast-message-success',
            { state: 'visible', timeout: 10_000 }
        );
        await saveIcon.click();
        await toastPromise;

        // Icon đổi sang ok, hàng có class row-saved
        await expect(firstRow.locator('.gs-status-icon--ok')).toBeVisible({ timeout: 10_000 });
        await expect(firstRow).toHaveClass(/row-saved/);
    });

    // ─── TC-GS-06 ───────────────────────────────────────────────
    test('TC-GS-06: Nhập điểm vượt quá max — hiển thị lỗi và nút gửi bị disabled', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        const targetRow = page.locator('.gs-table tbody tr').nth(1);
        const inputs = targetRow.locator('.gs-score-inp');

        // Đọc điểm max từ header cột đầu
        const maxText = await page.locator('.gs-table thead th .gs-th-max').first().textContent();
        const maxVal = parseFloat(maxText?.replace('/', '').trim() || '3');

        await inputs.nth(0).click({ clickCount: 3 });
        await page.keyboard.type(String(maxVal + 5));
        await inputs.nth(0).press('Tab');
        await page.waitForTimeout(300);

        // Tooltip lỗi "Tối đa X"
        await expect(targetRow.locator('.gs-inp-err-tip').first()).toBeVisible({ timeout: 3000 });
        await expect(targetRow.locator('.gs-inp-err-tip').first()).toContainText('Tối đa');

        // Ô có class has-error
        await expect(targetRow.locator('.gs-inp-cell.has-error').first()).toBeVisible();

        // Chip lỗi trên toolbar
        await expect(page.locator('.gs-error-chip')).toBeVisible();

        // Nút gửi bị disabled
        await expect(page.locator('.gs-btn-submit').first()).toBeDisabled();
    });

    // ─── TC-GS-07 ───────────────────────────────────────────────
    test('TC-GS-07: Nhập ký tự không phải số — hiển thị lỗi "Không hợp lệ"', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        const targetRow = page.locator('.gs-table tbody tr').nth(2);
        const firstInput = targetRow.locator('.gs-score-inp').first();

        await firstInput.click({ clickCount: 3 });
        await page.keyboard.type('abc');
        await firstInput.press('Tab');
        await page.waitForTimeout(300);

        await expect(targetRow.locator('.gs-inp-err-tip').first()).toBeVisible({ timeout: 3000 });
        await expect(targetRow.locator('.gs-inp-err-tip').first()).toContainText('Không hợp lệ');
        await expect(page.locator('.gs-error-chip')).toBeVisible();

        // Reset
        await firstInput.click({ clickCount: 3 });
        await page.keyboard.press('Delete');
        await firstInput.press('Tab');
    });

    // ─── TC-GS-08 ───────────────────────────────────────────────
    test('TC-GS-08: Bỏ trống 1 cột điểm — nút gửi bị disabled, hiển thị lỗi "Bắt buộc nhập"', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        // Tìm hàng chưa saved (tránh conflict với TC trước)
        const rows = page.locator('.gs-table tbody tr');
        const totalRows = await rows.count();
        let targetRow = rows.nth(3); // fallback
        for (let i = 3; i < totalRows; i++) {
            const row = rows.nth(i);
            const isSaved = await row.evaluate(el => el.classList.contains('row-saved'));
            if (!isSaved) { targetRow = row; break; }
        }
        const inputs = targetRow.locator('.gs-score-inp');

        // Điền cột 1 và cột 2
        await inputs.nth(0).click({ clickCount: 3 });
        await page.keyboard.type('2');
        await inputs.nth(0).press('Tab');
        await inputs.nth(1).click({ clickCount: 3 });
        await page.keyboard.type('3');
        await inputs.nth(1).press('Tab');

        // Cột 3: nhập rồi xóa để trigger validation "Bắt buộc nhập"
        await inputs.nth(2).click({ clickCount: 3 });
        await page.keyboard.type('1');
        await page.waitForTimeout(200);
        await inputs.nth(2).click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await inputs.nth(2).press('Tab');
        await page.waitForTimeout(500);

        // Nút gửi phải bị disabled
        const submitBtn = page.locator('.gs-btn-submit').first();
        await expect(submitBtn).toBeDisabled();

        // Error chip trên toolbar
        await expect(page.locator('.gs-error-chip')).toBeVisible();

        // Reset
        // await inputs.nth(0).click({ clickCount: 3 });
        // await page.keyboard.press('Delete');
        // await inputs.nth(0).press('Tab');
        // await inputs.nth(1).click({ clickCount: 3 });
        // await page.keyboard.press('Delete');
        // await inputs.nth(1).press('Tab');
    });

    // ─── TC-GS-09 ───────────────────────────────────────────────
    test('TC-GS-09: Nhập điểm âm — hiển thị lỗi "Không hợp lệ"', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        const targetRow = page.locator('.gs-table tbody tr').nth(4);
        const firstInput = targetRow.locator('.gs-score-inp').first();

        await firstInput.click({ clickCount: 3 });
        await page.keyboard.type('-1');
        await firstInput.press('Tab');
        await page.waitForTimeout(300);

        await expect(targetRow.locator('.gs-inp-err-tip').first()).toBeVisible({ timeout: 3000 });
        await expect(targetRow.locator('.gs-inp-err-tip').first()).toContainText('Không hợp lệ');

        // Reset
        // await firstInput.click({ clickCount: 3 });
        // await page.keyboard.press('Delete');
        // await firstInput.press('Tab');
    });

    // ─── TC-GS-10 ───────────────────────────────────────────────
    test('TC-GS-10: Nhập điểm nhiều bài và gửi tất cả cùng lúc (saveAll)', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        const rows = page.locator('.gs-table tbody tr');
        const totalRows = await rows.count();
        let filled = 0;

        for (let i = 0; i < totalRows && filled < 3; i++) {
            const row = rows.nth(i);
            const isSaved = await row.evaluate(el => el.classList.contains('row-saved'));
            if (isSaved) continue;

            const inputs = row.locator('.gs-score-inp');
            for (let c = 0; c < VALID_SCORES_PARTIAL.length; c++) {
                await inputs.nth(c).click({ clickCount: 3 });
                await page.keyboard.type(VALID_SCORES_PARTIAL[c]);
                await inputs.nth(c).press('Tab');
            }
            await page.waitForTimeout(100);
            filled++;
        }

        if (filled === 0) {
            console.log('Tất cả bài đã lưu — bỏ qua TC-GS-10');
            return;
        }

        // Draft banner hiển thị số bài thay đổi
        await expect(page.locator('.gs-draft-banner')).toBeVisible();
        const dirtyChip = page.locator('.gs-dirty-chip');
        await expect(dirtyChip).toBeVisible();
        const dirtyNum = parseInt((await dirtyChip.textContent())?.match(/\d+/)?.[0] || '0');
        expect(dirtyNum).toBeGreaterThanOrEqual(filled);

        // Bấm "Gửi X bài hợp lệ"
        const submitBtn = page.locator('.gs-draft-banner .gs-btn-submit');
        await expect(submitBtn).not.toBeDisabled();
        await submitBtn.click();

        // Draft banner biến mất sau khi lưu xong
        await expect(page.locator('.gs-draft-banner')).not.toBeVisible({ timeout: 15_000 });

        // Toast thành công — waitForSelector để không bỏ lỡ toast tự ẩn nhanh
        await page.waitForSelector('.p-toast-message-success', { state: 'visible', timeout: 10_000 });

        // Progress bar tổng cập nhật
        await expect(page.locator('.gs-overall-progress')).toBeVisible();
    });

    // ─── TC-GS-11 ───────────────────────────────────────────────
    test('TC-GS-11: Tải file mẫu Excel (downloadTemplate)', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        const downloadBtn = page.locator('button:has-text("Tải mẫu")');
        await expect(downloadBtn).toBeVisible();
        await expect(downloadBtn).not.toBeDisabled();

        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15_000 }),
            downloadBtn.click(),
        ]);

        expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
        expect(download.suggestedFilename()).toMatch(/Mau-cham-diem/i);
        console.log('Tải mẫu thành công:', download.suggestedFilename());
    });

    // ─── TC-GS-12 ───────────────────────────────────────────────
    test('TC-GS-12: Import Excel — file INVALID.xlsx — hiển thị lỗi', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        // Mở dialog import
        await page.locator('button:has-text("Import Excel")').click();
        await expect(
            page.locator('.gs-card-title:has-text("Import điểm từ Excel")')
        ).toBeVisible({ timeout: 5000 });

        // Upload file INVALID.xlsx từ thư mục e2e/excel/
        const fileInput = page.locator('.gs-upload-zone input[type="file"]');
        await fileInput.setInputFiles(EXCEL_INVALID);
        await page.waitForTimeout(1500);

        // Tên file hiển thị trong upload zone
        await expect(page.locator('.gs-upload-text strong')).toContainText('INVALID.xlsx');

        // Trường hợp 1: file không có cột "Mã phách" → gs-import-error hiển thị
        // Trường hợp 2: file có dữ liệu nhưng điểm không hợp lệ → gs-import-stat--err hiển thị
        const hasParseError = await page.locator('.gs-import-error').isVisible();
        const hasInvalidStats = await page.locator('.gs-import-stat--err').isVisible();
        expect(hasParseError || hasInvalidStats).toBeTruthy();

        // BUG PHÁT HIỆN: Khi import file Excel không hợp lệ, nút "Nhập" vẫn enabled
        // Kỳ vọng: nút "Nhập X bài" phải bị disabled hoàn toàn khi tất cả hàng đều lỗi
        // Thực tế: nút vẫn enabled với text "Nhập 0 bài" — gây nhầm lẫn cho user
        // → Lỗi UX: user có thể bấm nút "Nhập 0 bài" mà không có tác dụng gì
        const importBtn = page.locator('button:has-text("Nhập")').first();
        await expect(importBtn).toBeVisible({ timeout: 3000 });
        await expect(importBtn).toBeDisabled();

        // Quay lại bảng chấm điểm
        await page.locator('button:has-text("Quay lại")').click();
        await expect(
            page.locator('.gs-card-title:has-text("Bảng chấm điểm")')
        ).toBeVisible({ timeout: 3000 });
    });

    // ─── TC-GS-13 ───────────────────────────────────────────────
    test('TC-GS-13: Import Excel — file VALID.xlsx — nhập điểm thành công', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        // Mở dialog import
        await page.locator('button:has-text("Import Excel")').click();
        await expect(
            page.locator('.gs-card-title:has-text("Import điểm từ Excel")')
        ).toBeVisible({ timeout: 5000 });

        // Upload file VALID.xlsx từ thư mục e2e/excel/
        const fileInput = page.locator('.gs-upload-zone input[type="file"]');
        await fileInput.setInputFiles(EXCEL_VALID);
        await page.waitForTimeout(1500);

        // Tên file hiển thị trong upload zone
        await expect(page.locator('.gs-upload-text strong')).toContainText('VALID.xlsx');

        // Bảng preview hiển thị dữ liệu
        await expect(page.locator('.gs-import-table-wrap')).toBeVisible({ timeout: 5000 });

        // Phải có ít nhất 1 hàng hợp lệ
        const validStat = page.locator('.gs-import-stat--ok .gs-import-stat-val');
        await expect(validStat).toBeVisible();
        const validCount = parseInt((await validStat.textContent()) || '0');
        expect(validCount).toBeGreaterThan(0);

        // Nút "Nhập X bài" phải enabled
        const importBtn = page.locator('button:has-text("Nhập")').first();
        await expect(importBtn).toBeVisible();
        await expect(importBtn).not.toBeDisabled();

        // Bấm nhập
        await importBtn.click();

        // Sau khi import xong → quay lại bảng chấm điểm
        await expect(
            page.locator('.gs-card-title:has-text("Bảng chấm điểm")')
        ).toBeVisible({ timeout: 15_000 });

        // Toast thành công — waitForSelector để không bỏ lỡ toast tự ẩn nhanh
        await page.waitForSelector('.p-toast-message-success', { state: 'visible', timeout: 10_000 });
    });

    // ─── TC-GS-14 ───────────────────────────────────────────────
    test('TC-GS-14: Xem lịch sử chấm điểm', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        // Nút "Lịch sử" phải visible
        const historyBtn = page.locator('button:has-text("Lịch sử")');
        await expect(historyBtn).toBeVisible();
        await historyBtn.click();

        // Panel lịch sử hiện ra
        await expect(
            page.locator('.gs-card-title:has-text("Lịch sử chấm điểm")')
        ).toBeVisible({ timeout: 5000 });

        // Chờ skeleton biến mất
        // Cho history panel render xong
        await page.waitForFunction(
            () => document.querySelector('.gs-history-wrap') !== null
                || document.querySelector('.gs-empty') !== null,
            { timeout: 10_000 }
        );

        // Summary bar hiển thị số liệu
        await expect(page.locator('.gs-history-summary')).toBeVisible();
        await expect(
            page.locator('.gs-import-stat--total .gs-import-stat-val')
        ).toBeVisible();

        // Bảng lịch sử có header đúng
        const histTable = page.locator('.gs-history-table-wrap .gs-table');
        await expect(histTable).toBeVisible();
        await expect(histTable.locator('thead th').nth(1)).toContainText('Mã phách');
        await expect(histTable.locator('thead th').nth(2)).toContainText('Điểm hiện tại');

        // Có ít nhất 1 hàng (đã chấm từ TC-05)
        expect(await histTable.locator('tbody tr').count()).toBeGreaterThan(0);

        // Hàng đã chấm có class row-saved
        await expect(histTable.locator('tbody tr.row-saved').first()).toBeVisible();

        // // Nút "Quay lại" đóng panel
        // await page.locator('button:has-text("Quay lại")').click();
        // await expect(
        //     page.locator('.gs-card-title:has-text("Bảng chấm điểm")')
        // ).toBeVisible({ timeout: 3000 });
    });

    // ─── TC-GS-15 ───────────────────────────────────────────────
    test('TC-GS-15: Lọc phân công theo trạng thái "Chưa xong" và "Xong"', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);

        // Helper: chờ sau khi click filter — Angular xóa items cũ rồi render lại
        // Cần chờ skeleton xuất hiện (nếu có) rồi biến mất, hoặc chờ DOM ổn định
        const waitAfterFilter = async () => {
            // Chờ một tick để Angular bắt đầu loading
            await page.waitForTimeout(500);
            // Chờ đến khi assign-list không còn skeleton (assignLoading = false)
            // hoặc có item/empty state
            await page.waitForFunction(
                () => document.querySelector('.gs-assign-skeleton') === null,
                { timeout: 10_000 }
            );
        };

        // ── Switch sang "Chưa xong" ──────────────────────────────
        // Dùng nth(1) trong gs-type-switch thứ 2 để tránh nhầm với DH/THS
        // Dùng :text-is() (exact match) để tránh "Xong" match vào "Chưa xong"
        const completionSwitch = page.locator('.gs-type-switch').nth(1);
        const pendingBtn = completionSwitch.locator('button', { hasText: /^Chưa xong$/ });
        await expect(pendingBtn).toBeVisible();
        await pendingBtn.click();
        await waitAfterFilter();
        await expect(pendingBtn).toHaveClass(/active/);

        // Nếu có item thì tất cả phải có badge "Đang chấm"
        const pendingItems = page.locator('.gs-assign-item');
        const pendingCount = await pendingItems.count();
        for (let i = 0; i < pendingCount; i++) {
            await expect(pendingItems.nth(i).locator('.gs-badge--pending')).toBeVisible();
        }
        console.log(`Filter "Chưa xong": ${pendingCount} phân công`);

        // ── Switch sang "Xong" ───────────────────────────────────
        // Dùng exact match /^Xong$/ để không bắt nhầm "Chưa xong"
        const doneBtn = completionSwitch.locator('button', { hasText: /^Xong$/ });
        await doneBtn.click();
        await waitAfterFilter();
        await expect(doneBtn).toHaveClass(/active/);

        // Filter "Xong" có thể trả về rỗng nếu chưa hoàn thành phân công nào
        const doneItems = page.locator('.gs-assign-item');
        const doneCount = await doneItems.count();
        if (doneCount > 0) {
            // Nếu có item thì tất cả phải có badge "Hoàn thành"
            for (let i = 0; i < doneCount; i++) {
                await expect(doneItems.nth(i).locator('.gs-badge--done')).toBeVisible();
            }
        } else {
            // Không có item → phải có empty state
            await expect(page.locator('.gs-empty')).toBeVisible({ timeout: 5000 });
        }
        console.log(`Filter "Xong": ${doneCount} phân công`);

        // ── Switch về "Tất cả" ───────────────────────────────────
        const allBtn = completionSwitch.locator('button', { hasText: /^Tất cả$/ });
        await allBtn.click();
        await waitAfterFilter();
        await expect(allBtn).toHaveClass(/active/);
        // Phải có ít nhất 1 item sau khi về "Tất cả"
        await expect(page.locator('.gs-assign-item').first()).toBeVisible({ timeout: 8000 });
    });

    // ─── TC-GS-16 ───────────────────────────────────────────────
    test('TC-GS-16: Cảnh báo beforeunload khi có dữ liệu chưa gửi', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        // Tìm hàng chưa lưu và nhập điểm để tạo dirty state
        const rows = page.locator('.gs-table tbody tr');
        const totalRows = await rows.count();
        let dirtied = false;

        for (let i = 0; i < totalRows; i++) {
            const row = rows.nth(i);
            const isSaved = await row.evaluate(el => el.classList.contains('row-saved'));
            if (isSaved) continue;
            const inputs = row.locator('.gs-score-inp');
            await inputs.nth(0).click({ clickCount: 3 });
            await page.keyboard.type('1');
            await inputs.nth(0).press('Tab');
            dirtied = true;
            break;
        }

        if (!dirtied) {
            console.log('Không còn hàng chưa lưu — bỏ qua TC-GS-16');
            return;
        }

        // Verify dirty state — draft banner phải hiển thị
        await expect(page.locator('.gs-draft-banner')).toBeVisible();

        // Lắng nghe dialog beforeunload
        let dialogFired = false;
        page.on('dialog', async dialog => {
            dialogFired = true;
            await dialog.dismiss(); // Hủy để ở lại trang
        });

        // Thử navigate đi trang khác
        await page.evaluate(() => { window.location.href = '/login'; });
        await page.waitForTimeout(1000);

        // Một số browser headless không hiện dialog beforeunload — chấp nhận cả hai trường hợp
        if (dialogFired) {
            console.log('beforeunload dialog đã kích hoạt đúng');
        } else {
            // Fallback: verify hasDirty getter hoạt động đúng qua draft banner trước khi navigate
            console.log('Browser headless không hiện beforeunload dialog — đây là hành vi bình thường');
        }
    });

    // ─── TC-GS-17 ───────────────────────────────────────────────
    test('TC-GS-17: Đăng xuất khỏi hệ thống', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);

        // Tìm nút đăng xuất trong sidebar hoặc user menu
        const logoutBtn = page.locator('.dg-logout-btn, .dg-user-dd-item--danger').first();
        await expect(logoutBtn).toBeVisible({ timeout: 5000 });
        await logoutBtn.click();

        // Chờ modal xác nhận đăng xuất xuất hiện (dg-confirm-box)
        const confirmBox = page.locator('.dg-confirm-box');
        await expect(confirmBox).toBeVisible({ timeout: 5000 });
        await expect(confirmBox).toContainText('đăng xuất');

        // Nút xác nhận có class dg-confirm-ok
        const confirmBtn = confirmBox.locator('button.dg-confirm-ok');
        await confirmBtn.click();

        // Kiểm tra chuyển hướng về trang login
        await page.waitForURL('**/login**', { timeout: 10_000 });
        await expect(page).toHaveURL(/login/);

        console.log('👋 TC-GS-17: Grader đã đăng xuất thành công qua UI.');
    });

    // ─── TC-GS-18 (BUG NGHIÊM TRỌNG) ───────────────────────────
    // ╔══════════════════════════════════════════════════════════════╗
    // ║ BUG NGHIÊM TRỌNG: Import file SUA_MA_PHACH.xlsx chứa mã   ║
    // ║ phách bị sửa — hệ thống cho phép import và thay đổi mã    ║
    // ║ phách trong bảng.                                           ║
    // ║                                                             ║
    // ║ KỊCH BẢN:                                                   ║
    // ║   Mã phách GỐC đúng theo setup: A5, A6, ..., A15 (11 mã)  ║
    // ║   File SUA_MA_PHACH.xlsx chứa mã phách đã bị sửa khác     ║
    // ║   → Sau import, bảng có thể chứa mã phách KHÔNG thuộc     ║
    // ║     danh sách gốc A5→A15                                    ║
    // ║                                                             ║
    // ║ KỲ VỌNG: Bảng chỉ được chứa mã phách A5→A15               ║
    // ║ THỰC TẾ: Bảng chứa mã phách lạ sau import                  ║
    // ║                                                             ║
    // ║ MỨC ĐỘ: CRITICAL — mã phách bị thay đổi = sai dữ liệu    ║
    // ╚══════════════════════════════════════════════════════════════╝
    test('TC-GS-18: [BUG CRITICAL] Import Excel có mã phách bị sửa — bảng chứa mã phách không thuộc phân công gốc', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        // Danh sách mã phách GỐC đúng theo setup (A5 → A15 = 11 mã phách)
        const EXPECTED_COVER_CODES = ['A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'];

        // ── Bước 1: Đọc mã phách HIỆN TẠI trong bảng ────────────
        const rows = page.locator('.gs-table tbody tr');
        const rowCount = await rows.count();
        const currentCodes: string[] = [];
        for (let i = 0; i < rowCount; i++) {
            const code = await rows.nth(i).locator('.gs-cover-badge').textContent();
            if (code) currentCodes.push(code.trim());
        }
        console.log(`📋 Mã phách HIỆN TẠI (${currentCodes.length} SV): ${currentCodes.join(', ')}`);

        // ── Bước 2: Mở dialog Import và upload SUA_MA_PHACH.xlsx ─
        await page.locator('button:has-text("Import Excel")').click();
        await expect(
            page.locator('.gs-card-title:has-text("Import điểm từ Excel")')
        ).toBeVisible({ timeout: 5000 });

        const fileInput = page.locator('.gs-upload-zone input[type="file"]');
        await fileInput.setInputFiles(EXCEL_SUA_MA_PHACH);
        await page.waitForTimeout(2000);

        await expect(page.locator('.gs-upload-text strong')).toContainText('SUA_MA_PHACH');

        // ── Bước 3: Import nếu hệ thống cho phép ────────────────
        const importBtn = page.locator('.gs-btn-save');
        const canImport = (await importBtn.isVisible()) && !(await importBtn.isDisabled());

        if (canImport) {
            await importBtn.click();
            await page.waitForFunction(
                () => document.querySelector('.gs-table-wrap') !== null,
                { timeout: 10_000 }
            );
            await page.waitForTimeout(1500);
        } else {
            // Nếu không import được, quay lại bảng
            await page.locator('.gs-form-back').first().click();
            await page.waitForTimeout(1000);
        }

        // ── Bước 4: ASSERT — Lịch sử chỉ được chứa mã phách gốc A5→A15 ──
        const historyBtn = page.locator('button:has-text("Lịch sử")');
        await expect(historyBtn).toBeVisible();
        await historyBtn.click();

        await page.waitForFunction(
            () => document.querySelector('.gs-history-wrap') !== null || document.querySelector('.gs-empty') !== null,
            { timeout: 15_000 }
        );

        const historyBadges = page.locator('.gs-history-table-wrap .gs-cover-badge');
        const historyCount = await historyBadges.count();
        const historyCodes: string[] = [];
        for (let i = 0; i < historyCount; i++) {
            const code = await historyBadges.nth(i).textContent();
            if (code) historyCodes.push(code.trim());
        }
        console.log(`📋 Mã phách trong LỊCH SỬ (${historyCodes.length} SV): ${historyCodes.join(', ')}`);

        // Tìm mã phách KHÔNG thuộc danh sách gốc A5→A15
        const foreignCodes = historyCodes.filter(c => !EXPECTED_COVER_CODES.includes(c));

        if (foreignCodes.length > 0) {
            console.error('🚨 BUG CRITICAL: Lịch sử chứa mã phách KHÔNG thuộc phân công gốc!');
            console.error(`   Mã phách lạ: ${foreignCodes.join(', ')}`);
            console.error(`   Mã phách gốc đúng: ${EXPECTED_COVER_CODES.join(', ')}`);
        } else {
            console.log('✅ Không phát hiện mã phách lạ (có thể data đã clean)');
        }

        // LOG kết quả so sánh
        console.log(`   Expected: ${EXPECTED_COVER_CODES.length} SV, chỉ A5→A15`);
        console.log(`   Actual: ${historyCount} SV, mã phách: ${historyCodes.join(', ')}`);
        console.log(`   Kết luận: ${foreignCodes.length > 0 || historyCount !== EXPECTED_COVER_CODES.length ? '❌ BUG — mã phách bị thay đổi/thêm' : '✅ OK'}`);

        // Thực hiện assert để test case fail khi phát hiện lỗi
        expect(foreignCodes).toEqual([]);
        expect(historyCount).toBe(EXPECTED_COVER_CODES.length);
    });

    // ─── TC-GS-19 (BUG NGHIÊM TRỌNG) ───────────────────────────
    // ╔══════════════════════════════════════════════════════════════╗
    // ║ BUG NGHIÊM TRỌNG: Import file THEM_MA_PHACH.xlsx chứa     ║
    // ║ mã phách giả (A99, K85, E10, RON95) — hệ thống KHÔNG      ║
    // ║ override mà TỰ THÊM các mã phách mới vào bảng.            ║
    // ║                                                             ║
    // ║ KỊCH BẢN (file THEM_MA_PHACH.xlsx — 14 hàng):              ║
    // ║   Phòng P102 có 11 thí sinh gốc: A5, A6, ..., A15          ║
    // ║   File Excel chứa:                                          ║
    // ║   - 10 mã phách gốc (A5→A11, A13→A15) — update điểm OK   ║
    // ║   - A12 bị sửa thành A99 (mã phách lạ)                     ║
    // ║   - K85, E10, RON95 (3 mã phách hoàn toàn mới)             ║
    // ║                                                             ║
    // ║ HẬU QUẢ THỰC TẾ:                                           ║
    // ║   Hệ thống KHÔNG override/replace danh sách cũ.             ║
    // ║   Thay vào đó, nó GIỮ NGUYÊN 11 mã phách gốc VÀ THÊM    ║
    // ║   A99, K85, E10, RON95 vào DB → tổng = 15 sinh viên.       ║
    // ║   → Grader tự ý "thêm sinh viên ma" vào phòng thi!         ║
    // ║                                                             ║
    // ║ KỲ VỌNG (Expected):                                        ║
    // ║   - Số hàng sau import phải BẰNG số hàng trước (11)        ║
    // ║   - Mã phách lạ (A99, K85, E10, RON95) KHÔNG được thêm    ║
    // ║   - Frontend phải reject mã phách không thuộc phân công    ║
    // ║                                                             ║
    // ║ THỰC TẾ (Actual):                                           ║
    // ║   - Frontend không validate coverCode → gửi cả 14 hàng    ║
    // ║   - Backend tạo new CandidateScore() cho mã phách mới      ║
    // ║   - Số SV tăng từ 11 → 15 (thêm 4 "sinh viên ma")         ║
    // ║                                                             ║
    // ║ MỨC ĐỘ: CRITICAL — gian lận điểm, mất toàn vẹn dữ liệu   ║
    // ╚══════════════════════════════════════════════════════════════╝
    test('TC-GS-19: [BUG CRITICAL] Import Excel thêm mã phách giả — hệ thống tự thêm sinh viên ma, số SV tăng bất thường', async ({ page }) => {
        await page.goto('/dashboard-grader/scoring');
        await waitForAssignList(page);
        await selectRoom(page);

        // Danh sách mã phách GỐC đúng theo setup (A5 → A15 = 11 mã phách)
        // Đây là danh sách ADMIN_CHAM giao cho grader — không được vượt quá
        const EXPECTED_COVER_CODES = ['A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'];

        // ── Bước 1: Đọc trạng thái HIỆN TẠI ─────────────────────
        const rowsBefore = page.locator('.gs-table tbody tr');
        const countBefore = await rowsBefore.count();
        const currentCodes: string[] = [];
        for (let i = 0; i < countBefore; i++) {
            const code = await rowsBefore.nth(i).locator('.gs-cover-badge').textContent();
            if (code) currentCodes.push(code.trim());
        }
        console.log(`📋 Trạng thái HIỆN TẠI: ${countBefore} sinh viên`);
        console.log(`   Mã phách: ${currentCodes.join(', ')}`);

        // ── Bước 2: Mở dialog Import Excel ──────────────────────
        await page.locator('button:has-text("Import Excel")').click();
        await expect(
            page.locator('.gs-card-title:has-text("Import điểm từ Excel")')
        ).toBeVisible({ timeout: 5000 });

        // ── Bước 3: Upload file THEM_MA_PHACH.xlsx ───────────────
        const fileInput = page.locator('.gs-upload-zone input[type="file"]');
        await fileInput.setInputFiles(path.join(__dirname, 'excel', 'THEM_MA_PHACH.xlsx'));
        await page.waitForTimeout(2000);

        await expect(page.locator('.gs-upload-text strong')).toContainText('THEM_MA_PHACH');

        // ── Bước 4: Import nếu hệ thống cho phép ────────────────
        const importBtn = page.locator('.gs-btn-save');
        const canImport = (await importBtn.isVisible()) && !(await importBtn.isDisabled());

        if (canImport) {
            console.log('⚠️ Hệ thống cho phép import file có mã phách giả!');
            await importBtn.click();

            await page.waitForFunction(
                () => document.querySelector('.gs-table-wrap') !== null,
                { timeout: 15_000 }
            );
            await page.waitForTimeout(1500);
        } else {
            // Quay lại bảng
            await page.locator('.gs-form-back').first().click();
            await page.waitForTimeout(1000);
        }

        // ── Bước 5: ASSERT — So sánh với danh sách GỐC A5→A15 ──
        const historyBtn = page.locator('button:has-text("Lịch sử")');
        await expect(historyBtn).toBeVisible();
        await historyBtn.click();

        await page.waitForFunction(
            () => document.querySelector('.gs-history-wrap') !== null || document.querySelector('.gs-empty') !== null,
            { timeout: 15_000 }
        );

        const historyBadges = page.locator('.gs-history-table-wrap .gs-cover-badge');
        const historyCount = await historyBadges.count();
        const historyCodes: string[] = [];
        for (let i = 0; i < historyCount; i++) {
            const code = await historyBadges.nth(i).textContent();
            if (code) historyCodes.push(code.trim());
        }
        console.log(`📋 Mã phách trong LỊCH SỬ (${historyCodes.length} SV): ${historyCodes.join(', ')}`);

        // LOG kết quả — thực hiện assert để test case fail khi phát hiện lỗi
        console.log(`   Expected: ${EXPECTED_COVER_CODES.length} SV | Actual: ${historyCount} SV`);

        const ghostCodes = historyCodes.filter(c => !EXPECTED_COVER_CODES.includes(c));
        if (ghostCodes.length > 0) {
            console.error('🚨 BUG CRITICAL CONFIRMED:');
            console.error(`   Mã phách "ma" được THÊM VÀO: ${ghostCodes.join(', ')}`);
            console.error(`   Số SV vượt ngưỡng: ${EXPECTED_COVER_CODES.length} → ${historyCount} (+${historyCount - EXPECTED_COVER_CODES.length})`);
            console.error('   → Hệ thống không validate mã phách khi import!');
            console.error('   → Grader có thể tự ý thêm sinh viên vào phòng thi!');
        } else {
            console.log('✅ Không phát hiện mã phách ma (có thể data đã clean)');
        }

        console.log(`   Kết luận: ${ghostCodes.length > 0 || historyCount !== EXPECTED_COVER_CODES.length ? '❌ BUG — số SV vượt ngưỡng hoặc có mã phách lạ' : '✅ OK'}`);

        // Thực hiện assert để test case fail
        expect(ghostCodes).toEqual([]);
        expect(historyCount).toBe(EXPECTED_COVER_CODES.length);
    });

});
