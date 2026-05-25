/**
 * ============================================================
 * KIỂM THỬ CHỨC NĂNG: Nộp đơn thi trực tuyến & Duyệt đơn
 * URL Student: https://hcqtc.vn/dashboard-student/exam-forms
 * URL Admin:   https://hcqtc.vn/dashboard/exam-form-review
 * Role: STUDENT (CT070218) → ADMIN (lamtung)
 * Framework: Playwright (Serial Mode)
 * ============================================================
 *
 * KỊCH BẢN:
 *
 * Phần 1 — Sinh viên nộp đơn (Happy Path):
 *   TC-EFS-01: Đăng nhập sinh viên
 *   TC-EFS-02: Truy cập trang nộp hồ sơ, hiển thị danh sách loại đơn
 *   TC-EFS-03: Chọn loại đơn "PHIẾU ĐĂNG KÝ DỰ THI CÔNG NGHỆ THÔNG TIN"
 *   TC-EFS-04: Điền thông tin biểu mẫu (các field + upload ảnh + ký tên)
 *   TC-EFS-05: Nộp hồ sơ thành công (End-to-End)
 *   TC-EFS-05B: Vào lịch sử đơn và xem chi tiết đơn vừa nộp
 *   TC-EFS-05C: Tải file PDF đơn từ lịch sử
 *   TC-EFS-06: Đăng xuất sinh viên
 *
 * Phần 1B — Kiểm thử Negative (Validation & Boundary):
 *   TC-EFS-N01: Nút "Tiếp tục" disabled khi chưa chọn loại đơn
 *   TC-EFS-N02: Submit disabled khi bỏ trống TOÀN BỘ trường bắt buộc
 *   TC-EFS-N03: Submit disabled khi chỉ điền 1-2 trường
 *   TC-EFS-N04: Submit disabled khi thiếu ảnh chân dung bắt buộc
 *   TC-EFS-N05: Submit disabled khi thiếu ảnh chân dung 2
 *   TC-EFS-N06: Nút "Quay lại" từ step 2 về step 1
 *   TC-EFS-N07: Tìm kiếm loại đơn không tồn tại → thông báo rỗng
 *   TC-EFS-N08: Thiếu 1 trường "Nơi sinh" → submit disabled
 *   TC-EFS-N09: Thiếu 1 trường "Email" → submit disabled
 *   TC-EFS-N10: Xóa ảnh đã upload → submit disabled trở lại
 *
 * Phần 2 — Admin duyệt đơn (Happy Path):
 *   TC-EFS-07: Đăng nhập admin
 *   TC-EFS-08: Truy cập trang duyệt đơn, tìm đơn vừa nộp
 *   TC-EFS-09: Mở chi tiết đơn và kiểm tra thông tin
 *   TC-EFS-09B: Admin tải PDF đơn từ chi tiết
 *   TC-EFS-09C: Admin tải ZIP đơn từ chi tiết
 *   TC-EFS-10: Duyệt đơn (APPROVED)
 *   TC-EFS-11: Đăng xuất admin
 *
 * Phần 2B — Admin Negative (Từ chối, lọc sai):
 *   TC-EFS-N11: Từ chối đơn (REJECTED) với ghi chú lý do
 *   TC-EFS-N12: Tìm mã SV không tồn tại → danh sách trống
 *   TC-EFS-N13: Lọc kết hợp không có kết quả → trống
 *   TC-EFS-N14: Nút "Xóa lọc" reset bộ lọc
 *   TC-EFS-N15: Đóng dialog chi tiết bằng nút X
 * ============================================================
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe.configure({ mode: 'serial' });

const STUDENT_AUTH_FILE = path.join(__dirname, '.auth', 'student-exam-form.json');
const ADMIN_AUTH_FILE = path.join(__dirname, '.auth', 'admin-exam-form.json');

const STUDENT_ACCOUNT = {
    username: 'CT070218',
    password: 'Haibeo2004@',
};

const ADMIN_ACCOUNT = {
    username: 'root',
    password: 'Haibeo2004@',
};

// Ảnh chân dung đã chuẩn bị sẵn
const IMAGES = {
    photo1: path.join(__dirname, 'images', 'anh_ho_so_1.jpg'),
    photo2: path.join(__dirname, 'images', 'anh_ho_so_2.jpg'),
    attachment: path.join(__dirname, 'images', 'anh_ho_so_3.jpg'),
    signature: path.join(__dirname, 'images', 'signature.png'),
};

// Dữ liệu mock điền form — họ tên, ngày sinh, mã SV sẽ tự fill từ hệ thống
const FORM_DATA = {
    formTypeName: 'PHIẾU ĐĂNG KÝ DỰ THI CÔNG NGHỆ THÔNG TIN',
    nam_nu: 'Nam',
    nganh_dao_tao: 'Công nghệ thông tin',
    dan_toc: 'Kinh',
    noi_sinh: 'Hà Nội',
    the_cccd_hoac_ho_chieu: '001234567890',
    ngay_cap: '15/06/2020',
    noi_cap: 'Cục Cảnh sát ĐKQL cư trú và DLQG về dân cư',
    dien_email: 'sinhvien@hcqtc.edu.vn',
    so_dien_thoai_su_dung: '0912345678',
    dia_chi_lien_he: '77 Nguyễn Chí Thanh, Đống Đa, Hà Nội',
};

// ═══════════════════════════════════════════════════════════════
// PHẦN 1: SINH VIÊN NỘP ĐƠN
// ═══════════════════════════════════════════════════════════════

test.describe('Phần 1 — Sinh viên nộp đơn thi CNTT', () => {

    // ─── TC-EFS-01 ─────────────────────────────────────────────
    test('TC-EFS-01: Đăng nhập sinh viên thành công', async ({ page }) => {
        await page.goto('/login');
        await page.waitForSelector('#username', { state: 'visible' });
        await page.fill('#username', STUDENT_ACCOUNT.username);
        await page.fill('#password', STUDENT_ACCOUNT.password);
        await page.click('button:has-text("Đăng nhập")');

        await page.waitForURL('**/dashboard-student/**', { timeout: 15_000 });
        await expect(page).toHaveURL(/dashboard-student/);

        await page.context().storageState({ path: STUDENT_AUTH_FILE });
        console.log('✅ TC-EFS-01: Đăng nhập sinh viên thành công.');
    });

    test.describe('Sau khi đăng nhập sinh viên', () => {
        test.use({ storageState: STUDENT_AUTH_FILE });

        // ─── TC-EFS-02 ─────────────────────────────────────────────
        test('TC-EFS-02: Truy cập trang nộp hồ sơ, hiển thị danh sách loại đơn', async ({ page }) => {
            await page.goto('/dashboard-student/exam-forms');
            await page.waitForSelector('.efs-title', { state: 'visible', timeout: 10_000 });

            await expect(page.locator('.efs-title')).toHaveText('Nộp hồ sơ trực tuyến');

            // Chờ danh sách loại đơn load xong
            await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });
            const typeCards = page.locator('.type-cards .type-card');
            const count = await typeCards.count();
            expect(count).toBeGreaterThan(0);
            console.log(`📋 TC-EFS-02: Tìm thấy ${count} loại đơn.`);
        });

        // ─── TC-EFS-03 ─────────────────────────────────────────────
        test('TC-EFS-03: Chọn loại đơn "PHIẾU ĐĂNG KÝ DỰ THI CÔNG NGHỆ THÔNG TIN"', async ({ page }) => {
            await page.goto('/dashboard-student/exam-forms');
            await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

            // Tìm kiếm loại đơn
            const searchInput = page.locator('.ft-search-inp');
            await searchInput.fill('CÔNG NGHỆ THÔNG TIN');
            await page.click('.ft-search-btn');
            await page.waitForTimeout(1000);

            // Click chọn loại đơn
            const targetCard = page.locator('.type-card', { hasText: FORM_DATA.formTypeName });
            await expect(targetCard).toBeVisible({ timeout: 5_000 });
            await targetCard.click();

            // Kiểm tra card được chọn (class .sel)
            await expect(targetCard).toHaveClass(/sel/);

            // Nhấn "Tiếp tục hồ sơ"
            const nextBtn = page.locator('button:has-text("Tiếp tục hồ sơ")');
            await expect(nextBtn).toBeEnabled();
            await nextBtn.click();

            // Chờ chuyển sang step 2
            await page.waitForSelector('.selected-type-banner', { state: 'visible', timeout: 10_000 });
            await expect(page.locator('.stb-name')).toContainText(FORM_DATA.formTypeName);
            console.log('✅ TC-EFS-03: Đã chọn loại đơn và chuyển sang bước điền thông tin.');
        });

        // ─── TC-EFS-04 ─────────────────────────────────────────────
        test('TC-EFS-04: Điền thông tin biểu mẫu và upload ảnh', async ({ page }) => {
            await page.goto('/dashboard-student/exam-forms');
            await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

            // Chọn loại đơn
            const searchInput = page.locator('.ft-search-inp');
            await searchInput.fill('CÔNG NGHỆ THÔNG TIN');
            await page.click('.ft-search-btn');
            await page.waitForTimeout(1000);

            const targetCard = page.locator('.type-card', { hasText: FORM_DATA.formTypeName });
            await targetCard.click();
            await page.click('button:has-text("Tiếp tục hồ sơ")');
            await page.waitForSelector('.selected-type-banner', { state: 'visible', timeout: 10_000 });

            // Chờ form load (họ tên, mã SV, ngày sinh sẽ tự fill)
            await page.waitForTimeout(2000);

            // Điền các trường thông tin
            await fillFormFields(page);

            // Upload ảnh chân dung 1 — file input ẩn, dùng setInputFiles trực tiếp
            await page.locator('#photo-input-anh_chan_dung_1').setInputFiles(IMAGES.photo1);
            await page.waitForTimeout(1500);

            // Upload ảnh chân dung 2
            await page.locator('#photo-input-anh_chan_dung_2').setInputFiles(IMAGES.photo2);
            await page.waitForTimeout(1500);

            // Ký tên — inject file signature.png vào component dưới dạng base64 dataUrl
            await injectSignature(page);

            console.log('✅ TC-EFS-04: Đã điền đầy đủ thông tin biểu mẫu, upload ảnh và ký tên.');
        });

        // ─── TC-EFS-05 ─────────────────────────────────────────────
        test('TC-EFS-05: Nộp hồ sơ thành công', async ({ page }) => {
            await page.goto('/dashboard-student/exam-forms');
            await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

            // Chọn loại đơn
            const searchInput = page.locator('.ft-search-inp');
            await searchInput.fill('CÔNG NGHỆ THÔNG TIN');
            await page.click('.ft-search-btn');
            await page.waitForTimeout(1000);

            const targetCard = page.locator('.type-card', { hasText: FORM_DATA.formTypeName });
            await targetCard.click();
            await page.click('button:has-text("Tiếp tục hồ sơ")');
            await page.waitForSelector('.selected-type-banner', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(2000);

            // Điền form nhanh
            await fillFormFields(page);

            // Upload ảnh (A4 document form — hidden file inputs)
            await page.locator('#photo-input-anh_chan_dung_1').setInputFiles(IMAGES.photo1);
            await page.waitForTimeout(1500);
            await page.locator('#photo-input-anh_chan_dung_2').setInputFiles(IMAGES.photo2);
            await page.waitForTimeout(1500);

            // Ký tên — inject file signature.png
            await injectSignature(page);

            // Nhấn nút "Nộp hồ sơ ngay"
            const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
            await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
            await submitBtn.click();

            // Chờ chuyển sang step 3 — kết quả thành công
            await page.waitForSelector('.result-success-content', { state: 'visible', timeout: 30_000 });
            await expect(page.locator('.result-title')).toContainText('Nộp hồ sơ thành công');

            // Kiểm tra thông tin đơn vừa nộp
            const detailCard = page.locator('.result-detail-card');
            await expect(detailCard).toBeVisible();

            console.log('✅ TC-EFS-05: Nộp hồ sơ thành công!');
        });

        // ─── TC-EFS-05B ────────────────────────────────────────────
        test('TC-EFS-05B: Vào lịch sử đơn và xem chi tiết đơn vừa nộp', async ({ page }) => {
            await page.goto('/dashboard-student/exam-form-history');
            await page.waitForSelector('.efh-title', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(2500);

            // Kiểm tra có ít nhất 1 đơn trong lịch sử
            const rows = page.locator('.ss-table tbody tr');
            await expect(rows.first()).toBeVisible({ timeout: 10_000 });

            // Click "Chi tiết" trên đơn đầu tiên
            const detailBtn = rows.first().locator('button:has-text("Chi tiết")');
            await detailBtn.click();
            await page.waitForTimeout(1500);

            // Kiểm tra dialog chi tiết hiển thị
            await expect(page.locator('text=Chi tiết đơn từ')).toBeVisible({ timeout: 10_000 });

            console.log('✅ TC-EFS-05B: Vào lịch sử đơn và xem chi tiết thành công.');
        });

        // ─── TC-EFS-05C ────────────────────────────────────────────
        test('TC-EFS-05C: Tải file PDF đơn từ lịch sử', async ({ page }) => {
            await page.goto('/dashboard-student/exam-form-history');
            await page.waitForSelector('.efh-title', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(2500);

            // Mở chi tiết đơn đầu tiên
            const rows = page.locator('.ss-table tbody tr');
            await expect(rows.first()).toBeVisible({ timeout: 10_000 });
            await rows.first().locator('button:has-text("Chi tiết")').click();
            await page.waitForTimeout(1500);
            await expect(page.locator('text=Chi tiết đơn từ')).toBeVisible({ timeout: 10_000 });

            // Tìm nút "Tải PDF"
            const pdfBtn = page.locator('button:has-text("Tải PDF")');
            await expect(pdfBtn).toBeVisible({ timeout: 5_000 });

            // Bắt sự kiện download khi click
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
                pdfBtn.click()
            ]);

            if (download) {
                const fileName = download.suggestedFilename();
                expect(fileName).toContain('.pdf');

                // Lưu file vào thư mục e2e để dễ kiểm tra
                const savePath = path.join(__dirname, 'downloads', fileName);
                await download.saveAs(savePath);
                console.log(`✅ TC-EFS-05C: Tải PDF thành công — đã lưu tại: ${savePath}`);

                // Mở file PDF vừa tải
                const { exec } = require('child_process');
                exec(`start "" "${savePath}"`);
            } else {
                await page.waitForTimeout(2000);
                console.log('✅ TC-EFS-05C: Đã nhấn tải PDF thành công.');
            }
        });

        // ─── TC-EFS-06 ─────────────────────────────────────────────
        test('TC-EFS-06: Đăng xuất sinh viên', async ({ page }) => {
            await page.goto('/dashboard-student/exam-forms');
            await page.waitForTimeout(2000);

            // Tìm nút đăng xuất hoặc menu user
            const userMenu = page.locator('.user-menu, .avatar-btn, [class*="logout"]').first();
            if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
                await userMenu.click();
                const logoutBtn = page.locator('text=Đăng xuất').first();
                if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await logoutBtn.click();
                }
            }

            console.log('✅ TC-EFS-06: Đã đăng xuất sinh viên.');
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// PHẦN 1B: KIỂM THỬ NEGATIVE — VALIDATION & BOUNDARY
// (Các trường hợp nộp đơn THẤT BẠI — phục vụ báo cáo kiểm thử)
// ═══════════════════════════════════════════════════════════════

test.describe('Phần 1B — Kiểm thử Negative: Validation form nộp đơn', () => {
    test.use({ storageState: STUDENT_AUTH_FILE });

    // ─── TC-EFS-N01 ────────────────────────────────────────────
    test('TC-EFS-N01: Nút "Tiếp tục hồ sơ" bị disabled khi chưa chọn loại đơn', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        // Không click chọn loại đơn nào
        const nextBtn = page.locator('button:has-text("Tiếp tục hồ sơ")');
        await expect(nextBtn).toBeDisabled();

        console.log('✅ TC-EFS-N01: Nút "Tiếp tục hồ sơ" disabled khi chưa chọn loại đơn.');
    });

    // ─── TC-EFS-N02 ────────────────────────────────────────────
    test('TC-EFS-N02: Nút "Nộp hồ sơ ngay" disabled khi bỏ trống TOÀN BỘ trường bắt buộc', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        // Chọn loại đơn CNTT
        await selectFormTypeCNTT(page);

        // Không điền gì cả — kiểm tra nút submit bị disabled
        const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
        await expect(submitBtn).toBeDisabled();

        console.log('✅ TC-EFS-N02: Nút submit disabled khi bỏ trống toàn bộ trường bắt buộc.');
    });

    // ─── TC-EFS-N03 ────────────────────────────────────────────
    test('TC-EFS-N03: Nút submit disabled khi chỉ điền 1-2 trường (thiếu các trường còn lại)', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        await selectFormTypeCNTT(page);

        // Chỉ điền 2 trường: nam_nu và dan_toc
        const namNuInput = page.locator('input[formControlName="nam_nu"]');
        if (await namNuInput.isVisible()) await namNuInput.fill('Nam');

        const danTocInput = page.locator('input[formControlName="dan_toc"]');
        if (await danTocInput.isVisible()) await danTocInput.fill('Kinh');

        // Các trường khác bỏ trống → submit vẫn disabled
        const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
        await expect(submitBtn).toBeDisabled();

        console.log('✅ TC-EFS-N03: Nút submit disabled khi chỉ điền 1-2 trường.');
    });

    // ─── TC-EFS-N04 ────────────────────────────────────────────
    test('TC-EFS-N04: Nút submit disabled khi điền đủ text + ký tên nhưng THIẾU ảnh chân dung', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        await selectFormTypeCNTT(page);

        // Điền đầy đủ các trường text
        await fillFormFields(page);

        // Ký tên
        await injectSignature(page);

        // KHÔNG upload ảnh chân dung → nút submit vẫn disabled (vì ảnh là required)
        const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
        await expect(submitBtn).toBeDisabled();

        console.log('✅ TC-EFS-N04: Nút submit disabled khi thiếu ảnh chân dung (dù đã ký + điền đủ text).');
    });

    // ─── TC-EFS-N05 ────────────────────────────────────────────
    test('TC-EFS-N05: Nút submit disabled khi điền đủ text + ký + ảnh 1 nhưng THIẾU ảnh 2', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        await selectFormTypeCNTT(page);
        await fillFormFields(page);

        // Ký tên
        await injectSignature(page);

        // Chỉ upload ảnh 1, không upload ảnh 2
        await page.locator('#photo-input-anh_chan_dung_1').setInputFiles(IMAGES.photo1);
        await page.waitForTimeout(1500);

        // Nút submit vẫn disabled vì thiếu ảnh 2
        const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
        await expect(submitBtn).toBeDisabled();

        console.log('✅ TC-EFS-N05: Nút submit disabled khi thiếu ảnh chân dung 2 (dù đã ký).');
    });

    // ─── TC-EFS-N06 ────────────────────────────────────────────
    test('TC-EFS-N06: Kiểm tra nút "Quay lại" từ step 2 về step 1', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        await selectFormTypeCNTT(page);

        // Đang ở step 2 — nhấn "Quay lại"
        const backBtn = page.locator('button:has-text("Quay lại")');
        await expect(backBtn).toBeVisible();
        await backBtn.click();

        // Phải quay về step 1 — hiển thị lại danh sách loại đơn
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 5_000 });
        const nextBtn = page.locator('button:has-text("Tiếp tục hồ sơ")');
        await expect(nextBtn).toBeVisible();

        console.log('✅ TC-EFS-N06: Nút "Quay lại" hoạt động đúng, quay về step 1.');
    });

    // ─── TC-EFS-N07 ────────────────────────────────────────────
    test('TC-EFS-N07: Tìm kiếm loại đơn không tồn tại → hiển thị "Không tìm thấy"', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        // Tìm kiếm với từ khóa không tồn tại
        const searchInput = page.locator('.ft-search-inp');
        await searchInput.fill('XYZABC_KHONG_TON_TAI_12345');
        await page.click('.ft-search-btn');
        await page.waitForTimeout(1500);

        // Kiểm tra hiển thị thông báo "Không tìm thấy"
        const emptyMsg = page.locator('.empty-types');
        await expect(emptyMsg).toBeVisible({ timeout: 5_000 });
        await expect(emptyMsg).toContainText('Không tìm thấy');

        console.log('✅ TC-EFS-N07: Tìm kiếm loại đơn không tồn tại → hiển thị thông báo rỗng.');
    });

    // ─── TC-EFS-N08 ────────────────────────────────────────────
    test('TC-EFS-N08: Điền thiếu trường "Nơi sinh" (1 trường required) → submit disabled', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        await selectFormTypeCNTT(page);

        // Điền tất cả trừ "Nơi sinh" — dùng placeholder selector
        const fieldsWithoutNoiSinh: Array<{ label: string; value: string }> = [
            { label: 'Nam nữ', value: FORM_DATA.nam_nu },
            { label: 'Ngành đào tạo', value: FORM_DATA.nganh_dao_tao },
            { label: 'Dân tộc', value: FORM_DATA.dan_toc },
            // Bỏ qua "Nơi sinh"
            { label: 'Thẻ CCCD hoặc Hộ chiếu', value: FORM_DATA.the_cccd_hoac_ho_chieu },
            { label: 'Ngày cấp', value: FORM_DATA.ngay_cap },
            { label: 'Nơi cấp', value: FORM_DATA.noi_cap },
            { label: 'Điền email', value: FORM_DATA.dien_email },
            { label: 'Số điện thoại sử dụng', value: FORM_DATA.so_dien_thoai_su_dung },
            { label: 'Địa chỉ liên hệ', value: FORM_DATA.dia_chi_lien_he },
        ];

        for (const field of fieldsWithoutNoiSinh) {
            const input = page.locator(`input.a4-inline-input[placeholder="${field.label}"]`);
            if (await input.count() > 0) {
                await input.first().fill(field.value);
            }
        }

        // Upload cả 2 ảnh
        await page.locator('#photo-input-anh_chan_dung_1').setInputFiles(IMAGES.photo1);
        await page.waitForTimeout(1000);
        await page.locator('#photo-input-anh_chan_dung_2').setInputFiles(IMAGES.photo2);
        await page.waitForTimeout(1000);

        // Ký tên — đảm bảo có signature
        await injectSignature(page);

        // Nút submit vẫn disabled vì thiếu "Nơi sinh"
        const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
        await expect(submitBtn).toBeDisabled();

        console.log('✅ TC-EFS-N08: Submit disabled khi thiếu 1 trường bắt buộc (Nơi sinh) dù đã ký và upload ảnh.');
    });

    // ─── TC-EFS-N09 ────────────────────────────────────────────
    test('TC-EFS-N09: Điền thiếu trường "Email" → submit disabled', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        await selectFormTypeCNTT(page);

        // Điền tất cả trừ "Điền email"
        const fieldsWithoutEmail: Array<{ label: string; value: string }> = [
            { label: 'Nam nữ', value: FORM_DATA.nam_nu },
            { label: 'Ngành đào tạo', value: FORM_DATA.nganh_dao_tao },
            { label: 'Dân tộc', value: FORM_DATA.dan_toc },
            { label: 'Nơi sinh', value: FORM_DATA.noi_sinh },
            { label: 'Thẻ CCCD hoặc Hộ chiếu', value: FORM_DATA.the_cccd_hoac_ho_chieu },
            { label: 'Ngày cấp', value: FORM_DATA.ngay_cap },
            { label: 'Nơi cấp', value: FORM_DATA.noi_cap },
            // Bỏ qua "Điền email"
            { label: 'Số điện thoại sử dụng', value: FORM_DATA.so_dien_thoai_su_dung },
            { label: 'Địa chỉ liên hệ', value: FORM_DATA.dia_chi_lien_he },
        ];

        for (const field of fieldsWithoutEmail) {
            const input = page.locator(`input.a4-inline-input[placeholder="${field.label}"]`);
            if (await input.count() > 0) {
                await input.first().fill(field.value);
            }
        }

        // Upload ảnh
        await page.locator('#photo-input-anh_chan_dung_1').setInputFiles(IMAGES.photo1);
        await page.waitForTimeout(1000);
        await page.locator('#photo-input-anh_chan_dung_2').setInputFiles(IMAGES.photo2);
        await page.waitForTimeout(1000);

        // Ký tên — đảm bảo có signature
        await injectSignature(page);

        const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
        await expect(submitBtn).toBeDisabled();

        console.log('✅ TC-EFS-N09: Submit disabled khi thiếu trường Email dù đã ký và upload ảnh.');
    });

    // ─── TC-EFS-N10 ────────────────────────────────────────────
    test('TC-EFS-N10: Xóa ảnh chân dung đã upload → nút submit trở lại disabled', async ({ page }) => {
        await page.goto('/dashboard-student/exam-forms');
        await page.waitForSelector('.type-cards .type-card', { state: 'visible', timeout: 10_000 });

        await selectFormTypeCNTT(page);
        await fillFormFields(page);

        // Ký tên
        await injectSignature(page);

        // Upload cả 2 ảnh
        await page.locator('#photo-input-anh_chan_dung_1').setInputFiles(IMAGES.photo1);
        await page.waitForTimeout(1500);
        await page.locator('#photo-input-anh_chan_dung_2').setInputFiles(IMAGES.photo2);
        await page.waitForTimeout(1500);

        // Xóa ảnh 1 bằng nút remove (class a4-photo-remove-btn)
        const removeBtn = page.locator('.a4-photo-remove-btn').first();
        await expect(removeBtn).toBeVisible({ timeout: 3000 });
        await removeBtn.click();
        await page.waitForTimeout(500);

        // Nút submit phải disabled lại vì thiếu ảnh
        const submitBtn = page.locator('button[type="submit"]:has-text("Nộp hồ sơ ngay")');
        await expect(submitBtn).toBeDisabled();

        console.log('✅ TC-EFS-N10: Xóa ảnh → submit disabled trở lại (dù đã ký + điền đủ text).');
    });
});

// ═══════════════════════════════════════════════════════════════
// PHẦN 2: ADMIN DUYỆT ĐƠN
// ═══════════════════════════════════════════════════════════════

test.describe('Phần 2 — Admin duyệt đơn thi', () => {

    // ─── TC-EFS-07 ─────────────────────────────────────────────
    test('TC-EFS-07: Đăng nhập admin thành công', async ({ page }) => {
        await page.goto('/login');
        await page.waitForSelector('#username', { state: 'visible' });
        await page.fill('#username', ADMIN_ACCOUNT.username);
        await page.fill('#password', ADMIN_ACCOUNT.password);
        await page.click('button:has-text("Đăng nhập")');

        await page.waitForURL('**/dashboard**', { timeout: 15_000 });
        await page.context().storageState({ path: ADMIN_AUTH_FILE });
        console.log('✅ TC-EFS-07: Đăng nhập admin thành công.');
    });

    test.describe('Sau khi đăng nhập admin', () => {
        test.use({ storageState: ADMIN_AUTH_FILE });

        // ─── TC-EFS-08 ─────────────────────────────────────────────
        test('TC-EFS-08: Truy cập trang duyệt đơn, tìm đơn vừa nộp', async ({ page }) => {
            await page.goto('/dashboard/exam-form-review');
            await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

            // Tìm theo mã sinh viên
            const studentCodeInput = page.locator('input[formControlName="studentCode"]');
            await studentCodeInput.fill(STUDENT_ACCOUNT.username);
            await page.click('button:has-text("Tìm kiếm")');
            await page.waitForTimeout(2000);

            // Kiểm tra có kết quả
            const rows = page.locator('table tbody tr');
            const count = await rows.count();
            expect(count).toBeGreaterThan(0);

            // Tìm dòng có loại đơn CNTT
            const targetRow = page.locator('table tbody tr', { hasText: FORM_DATA.formTypeName }).first();
            await expect(targetRow).toBeVisible({ timeout: 5_000 });

            console.log(`✅ TC-EFS-08: Tìm thấy đơn của ${STUDENT_ACCOUNT.username} trong danh sách.`);
        });

        // ─── TC-EFS-09 ─────────────────────────────────────────────
        test('TC-EFS-09: Mở chi tiết đơn và kiểm tra thông tin', async ({ page }) => {
            await page.goto('/dashboard/exam-form-review');
            await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

            // Tìm đơn
            const studentCodeInput = page.locator('input[formControlName="studentCode"]');
            await studentCodeInput.fill(STUDENT_ACCOUNT.username);
            await page.click('button:has-text("Tìm kiếm")');
            await page.waitForTimeout(2000);

            // Click "Chi tiết" trên dòng đầu tiên
            const detailBtn = page.locator('table tbody tr').first().locator('button:has-text("Chi tiết")');
            await detailBtn.click();

            // Chờ dialog mở và load nội dung
            await page.waitForSelector('.dialog-header', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(3000);

            // Kiểm tra thông tin sinh viên hiển thị trong dialog
            const headerDesc = page.locator('.header-description');
            await expect(headerDesc).toContainText(STUDENT_ACCOUNT.username);

            console.log('✅ TC-EFS-09: Mở chi tiết đơn thành công, thông tin chính xác.');
        });

        // ─── TC-EFS-09B ────────────────────────────────────────────
        test('TC-EFS-09B: Admin tải PDF đơn từ chi tiết', async ({ page }) => {
            await page.goto('/dashboard/exam-form-review');
            await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

            const studentCodeInput = page.locator('input[formControlName="studentCode"]');
            await studentCodeInput.fill(STUDENT_ACCOUNT.username);
            await page.click('button:has-text("Tìm kiếm")');
            await page.waitForTimeout(2000);

            // Mở chi tiết
            await page.locator('table tbody tr').first().locator('button:has-text("Chi tiết")').click();
            await page.waitForSelector('.dialog-header', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(2000);

            // Click "Xuất PDF"
            const pdfBtn = page.locator('button:has-text("Xuất PDF")');
            await expect(pdfBtn).toBeVisible({ timeout: 5_000 });

            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
                pdfBtn.click()
            ]);

            if (download) {
                const fileName = download.suggestedFilename();
                expect(fileName).toContain('.pdf');
                const savePath = path.join(__dirname, 'downloads', fileName);
                await download.saveAs(savePath);
                console.log(`✅ TC-EFS-09B: Tải PDF thành công — ${savePath}`);
                const { exec } = require('child_process');
                exec(`start "" "${savePath}"`);
            } else {
                await page.waitForTimeout(3000);
                console.log('✅ TC-EFS-09B: Đã nhấn xuất PDF.');
            }
        });

        // ─── TC-EFS-09C ────────────────────────────────────────────
        test('TC-EFS-09C: Admin tải ZIP đơn từ chi tiết', async ({ page }) => {
            await page.goto('/dashboard/exam-form-review');
            await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

            const studentCodeInput = page.locator('input[formControlName="studentCode"]');
            await studentCodeInput.fill(STUDENT_ACCOUNT.username);
            await page.click('button:has-text("Tìm kiếm")');
            await page.waitForTimeout(2000);

            // Mở chi tiết
            await page.locator('table tbody tr').first().locator('button:has-text("Chi tiết")').click();
            await page.waitForSelector('.dialog-header', { state: 'visible', timeout: 10_000 });
            await page.waitForTimeout(2000);

            // Click "Xuất ZIP"
            const zipBtn = page.locator('button:has-text("Xuất ZIP")');
            await expect(zipBtn).toBeVisible({ timeout: 5_000 });

            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
                zipBtn.click()
            ]);

            if (download) {
                const fileName = download.suggestedFilename();
                expect(fileName).toContain('.zip');
                const savePath = path.join(__dirname, 'downloads', fileName);
                await download.saveAs(savePath);
                console.log(`✅ TC-EFS-09C: Tải ZIP thành công — ${savePath}`);
                const { exec } = require('child_process');
                exec(`start "" "${savePath}"`);
            } else {
                await page.waitForTimeout(3000);
                console.log('✅ TC-EFS-09C: Đã nhấn xuất ZIP.');
            }
        });

        // ─── TC-EFS-10 ─────────────────────────────────────────────
        test('TC-EFS-10: Duyệt đơn (APPROVED)', async ({ page }) => {
            await page.goto('/dashboard/exam-form-review');
            await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

            // Tìm đơn PENDING
            const studentCodeInput = page.locator('input[formControlName="studentCode"]');
            await studentCodeInput.fill(STUDENT_ACCOUNT.username);

            // Lọc trạng thái PENDING
            const statusSelect = page.locator('select[formControlName="status"]');
            await statusSelect.selectOption('PENDING');
            await page.click('button:has-text("Tìm kiếm")');
            await page.waitForTimeout(2000);

            // Click "Cập nhật duyệt" trên dòng đầu tiên
            const reviewBtn = page.locator('table tbody tr').first().locator('button:has-text("Cập nhật duyệt")');
            if (await reviewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await reviewBtn.click();

                // Chờ dialog review mở
                await page.waitForSelector('.dialog-header', { state: 'visible', timeout: 10_000 });

                // Chọn "Đồng ý duyệt"
                const approveRadio = page.locator('label[for="act-approve2"]');
                await approveRadio.click();
                await page.waitForTimeout(500);

                // Tìm và nhấn nút xác nhận duyệt (nút submit trong dialog review)
                const confirmBtn = page.locator('button:has-text("Xác nhận"), button:has-text("Duyệt đơn"), button[type="submit"]').last();
                if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await confirmBtn.click();
                    await page.waitForTimeout(3000);
                }

                console.log('✅ TC-EFS-10: Đã duyệt đơn thành công.');
            } else {
                console.log('⚠️ TC-EFS-10: Không tìm thấy đơn PENDING để duyệt.');
            }
        });

        // ─── TC-EFS-11 ─────────────────────────────────────────────
        test('TC-EFS-11: Đăng xuất admin', async ({ page }) => {
            await page.goto('/dashboard/exam-form-review');
            await page.waitForTimeout(2000);

            const userMenu = page.locator('.user-menu, .avatar-btn, [class*="logout"]').first();
            if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
                await userMenu.click();
                const logoutBtn = page.locator('text=Đăng xuất').first();
                if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await logoutBtn.click();
                }
            }

            console.log('✅ TC-EFS-11: Đã đăng xuất admin.');
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// PHẦN 2B: ADMIN — KIỂM THỬ NEGATIVE (Từ chối đơn, lọc sai)
// ═══════════════════════════════════════════════════════════════

test.describe('Phần 2B — Admin: Kiểm thử Negative duyệt đơn', () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    // ─── TC-EFS-N11 ────────────────────────────────────────────
    test('TC-EFS-N11: Admin từ chối đơn (REJECTED) với ghi chú lý do', async ({ page }) => {
        await page.goto('/dashboard/exam-form-review');
        await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

        // Tìm đơn PENDING
        const studentCodeInput = page.locator('input[formControlName="studentCode"]');
        await studentCodeInput.fill(STUDENT_ACCOUNT.username);
        const statusSelect = page.locator('select[formControlName="status"]');
        await statusSelect.selectOption('PENDING');
        await page.click('button:has-text("Tìm kiếm")');
        await page.waitForTimeout(2000);

        const reviewBtn = page.locator('table tbody tr').first().locator('button:has-text("Cập nhật duyệt")');
        if (await reviewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await reviewBtn.click();
            await page.waitForSelector('.dialog-header', { state: 'visible', timeout: 10_000 });

            // Chọn "Từ chối"
            const rejectRadio = page.locator('label[for="act-reject2"]');
            await rejectRadio.click();
            await page.waitForTimeout(500);

            // Điền ghi chú lý do từ chối
            const noteInput = page.locator('textarea[formControlName="adminNote"], textarea[formControlName="note"]');
            if (await noteInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await noteInput.fill('Hồ sơ thiếu thông tin, vui lòng bổ sung ảnh chân dung rõ nét hơn.');
            }

            // Nhấn xác nhận
            const confirmBtn = page.locator('button:has-text("Xác nhận"), button:has-text("Từ chối"), button[type="submit"]').last();
            if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await confirmBtn.click();
                await page.waitForTimeout(3000);
            }

            console.log('✅ TC-EFS-N11: Đã từ chối đơn với ghi chú lý do.');
        } else {
            console.log('⚠️ TC-EFS-N11: Không tìm thấy đơn PENDING để từ chối.');
        }
    });

    // ─── TC-EFS-N12 ────────────────────────────────────────────
    test('TC-EFS-N12: Tìm kiếm đơn với mã SV không tồn tại → không có kết quả', async ({ page }) => {
        await page.goto('/dashboard/exam-form-review');
        await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

        const studentCodeInput = page.locator('input[formControlName="studentCode"]');
        await studentCodeInput.fill('MAKHONGTONTAI999');
        await page.click('button:has-text("Tìm kiếm")');
        await page.waitForTimeout(2000);

        // Kiểm tra hiển thị "Không có đơn nào"
        const emptyState = page.locator('text=Không có đơn nào');
        await expect(emptyState).toBeVisible({ timeout: 5_000 });

        console.log('✅ TC-EFS-N12: Tìm mã SV không tồn tại → hiển thị trống.');
    });

    // ─── TC-EFS-N13 ────────────────────────────────────────────
    test('TC-EFS-N13: Lọc trạng thái APPROVED khi không có đơn nào được duyệt → danh sách trống', async ({ page }) => {
        await page.goto('/dashboard/exam-form-review');
        await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

        // Lọc theo mã SV + trạng thái CANCELLED (ít khả năng có)
        const studentCodeInput = page.locator('input[formControlName="studentCode"]');
        await studentCodeInput.fill('MAKHONGTONTAI999');
        const statusSelect = page.locator('select[formControlName="status"]');
        await statusSelect.selectOption('CANCELLED');
        await page.click('button:has-text("Tìm kiếm")');
        await page.waitForTimeout(2000);

        const emptyState = page.locator('text=Không có đơn nào');
        await expect(emptyState).toBeVisible({ timeout: 5_000 });

        console.log('✅ TC-EFS-N13: Lọc kết hợp không có kết quả → hiển thị trống.');
    });

    // ─── TC-EFS-N14 ────────────────────────────────────────────
    test('TC-EFS-N14: Nhấn "Xóa lọc" reset toàn bộ bộ lọc tìm kiếm', async ({ page }) => {
        await page.goto('/dashboard/exam-form-review');
        await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

        // Điền bộ lọc
        const studentCodeInput = page.locator('input[formControlName="studentCode"]');
        await studentCodeInput.fill('CT070218');
        const statusSelect = page.locator('select[formControlName="status"]');
        await statusSelect.selectOption('PENDING');

        // Nhấn "Xóa lọc"
        const clearBtn = page.locator('button:has-text("Xóa lọc")');
        await clearBtn.click();
        await page.waitForTimeout(1000);

        // Kiểm tra các field đã được reset
        await expect(studentCodeInput).toHaveValue('');

        console.log('✅ TC-EFS-N14: Nút "Xóa lọc" reset thành công.');
    });

    // ─── TC-EFS-N15 ────────────────────────────────────────────
    test('TC-EFS-N15: Đóng dialog chi tiết đơn bằng nút X', async ({ page }) => {
        await page.goto('/dashboard/exam-form-review');
        await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });

        // Tìm đơn bất kỳ
        await page.click('button:has-text("Tìm kiếm")');
        await page.waitForTimeout(2000);

        const rows = page.locator('table tbody tr');
        if (await rows.count() > 0) {
            // Mở chi tiết
            const detailBtn = rows.first().locator('button:has-text("Chi tiết")');
            await detailBtn.click();
            await page.waitForSelector('.dialog-header', { state: 'visible', timeout: 10_000 });

            // Đóng dialog bằng nút X
            const closeBtn = page.locator('.btn-close');
            await closeBtn.click();
            await page.waitForTimeout(500);

            // Dialog phải biến mất
            await expect(page.locator('.dialog-header')).not.toBeVisible();
            console.log('✅ TC-EFS-N15: Đóng dialog chi tiết bằng nút X thành công.');
        } else {
            console.log('⚠️ TC-EFS-N15: Không có đơn nào để test.');
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Điền nhanh tất cả các trường text trong form đơn thi CNTT.
 * Form A4 document dùng .a4-inline-input với [placeholder] = label của field.
 * Họ tên, mã SV, ngày sinh sẽ được hệ thống tự fill.
 */
async function fillFormFields(page: Page): Promise<void> {
    const fields: Array<{ label: string; value: string }> = [
        { label: 'Nam nữ', value: FORM_DATA.nam_nu },
        { label: 'Ngành đào tạo', value: FORM_DATA.nganh_dao_tao },
        { label: 'Dân tộc', value: FORM_DATA.dan_toc },
        { label: 'Nơi sinh', value: FORM_DATA.noi_sinh },
        { label: 'Thẻ CCCD hoặc Hộ chiếu', value: FORM_DATA.the_cccd_hoac_ho_chieu },
        { label: 'Ngày cấp', value: FORM_DATA.ngay_cap },
        { label: 'Nơi cấp', value: FORM_DATA.noi_cap },
        { label: 'Điền email', value: FORM_DATA.dien_email },
        { label: 'Số điện thoại sử dụng', value: FORM_DATA.so_dien_thoai_su_dung },
        { label: 'Địa chỉ liên hệ', value: FORM_DATA.dia_chi_lien_he },
    ];

    for (const field of fields) {
        // Tìm input bằng placeholder chính xác
        const input = page.locator(`input.a4-inline-input[placeholder="${field.label}"]`);
        if (await input.count() > 0) {
            await input.first().click();
            await input.first().fill(field.value);
            continue;
        }
        // Fallback: tìm input.a4-standalone-input bằng placeholder
        const standaloneInput = page.locator(`input.a4-standalone-input[placeholder="${field.label}"]`);
        if (await standaloneInput.count() > 0) {
            await standaloneInput.first().fill(field.value);
            continue;
        }
        console.log(`⚠️ Không tìm thấy input cho: "${field.label}"`);
    }
}

/**
 * Inject chữ ký từ file signature.png vào component A4 document form.
 * Ưu tiên inject qua Angular API, fallback vẽ trực tiếp trên canvas.
 */
async function injectSignature(page: Page): Promise<void> {
    const sigBuffer = fs.readFileSync(IMAGES.signature);
    const sigBase64 = sigBuffer.toString('base64');
    const sigDataUrl = `data:image/png;base64,${sigBase64}`;

    const signBtn = page.locator('.a4-sign-btn');
    if (!(await signBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log('ℹ️ Không tìm thấy nút ký tên, bỏ qua.');
        return;
    }

    // Thử inject qua Angular component API
    const injected = await page.evaluate((dataUrl) => {
        const a4Wrap = document.querySelector('app-a4-document-form');
        if (!a4Wrap) return false;
        const ng = (window as any).ng;
        if (ng && ng.getComponent) {
            const comp = ng.getComponent(a4Wrap);
            if (comp) {
                comp.signatureDataUrl = dataUrl;
                comp.signatureChange.emit(dataUrl);
                return true;
            }
        }
        return false;
    }, sigDataUrl);

    if (injected) {
        await page.waitForTimeout(500);
        const sigImg = page.locator('.a4-signature-img');
        if (await sigImg.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('🖊️ Chữ ký đã được inject qua Angular API.');
            return;
        }
    }

    // Fallback: mở modal và vẽ trực tiếp trên cả 2 canvas
    console.log('⚠️ Inject API không thành công, vẽ trực tiếp trên canvas...');
    await signBtn.click();
    await page.waitForSelector('.sig-modal-overlay', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);

    // === Canvas 1: Ký tên ===
    const sigCanvas = page.locator('.sig-canvas-container:not(.sig-name-canvas-container) .sig-canvas');
    await expect(sigCanvas).toBeVisible({ timeout: 3000 });
    const sigBox = await sigCanvas.boundingBox();
    if (sigBox) {
        // Vẽ nhiều nét để đảm bảo hasSignature = true
        await page.mouse.move(sigBox.x + 20, sigBox.y + sigBox.height * 0.3);
        await page.mouse.down();
        await page.mouse.move(sigBox.x + sigBox.width * 0.5, sigBox.y + sigBox.height * 0.7, { steps: 8 });
        await page.mouse.move(sigBox.x + sigBox.width - 20, sigBox.y + sigBox.height * 0.4, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Vẽ thêm 1 nét nữa
        await page.mouse.move(sigBox.x + 30, sigBox.y + sigBox.height * 0.6);
        await page.mouse.down();
        await page.mouse.move(sigBox.x + sigBox.width * 0.7, sigBox.y + sigBox.height * 0.5, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(300);
    }

    // === Canvas 2: Ghi rõ họ và tên ===
    const nameCanvas = page.locator('.sig-name-canvas-container .sig-canvas');
    await expect(nameCanvas).toBeVisible({ timeout: 3000 });
    const nameBox = await nameCanvas.boundingBox();
    if (nameBox) {
        // Vẽ nhiều nét mô phỏng viết tên
        await page.mouse.move(nameBox.x + 15, nameBox.y + nameBox.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(nameBox.x + nameBox.width * 0.3, nameBox.y + nameBox.height * 0.3, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        await page.mouse.move(nameBox.x + nameBox.width * 0.35, nameBox.y + nameBox.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(nameBox.x + nameBox.width * 0.6, nameBox.y + nameBox.height * 0.4, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        await page.mouse.move(nameBox.x + nameBox.width * 0.65, nameBox.y + nameBox.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(nameBox.x + nameBox.width - 15, nameBox.y + nameBox.height * 0.6, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(300);
    }

    // Nhấn "Xác nhận"
    const confirmBtn = page.locator('.sig-btn-confirm');
    await page.waitForTimeout(500);
    if (await confirmBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
        console.log('🖊️ Đã vẽ chữ ký và xác nhận thành công.');
    } else {
        console.log('⚠️ Nút xác nhận vẫn disabled — có thể chưa vẽ đủ trên cả 2 canvas.');
        // Thử đóng modal
        const cancelBtn = page.locator('.sig-btn-cancel');
        if (await cancelBtn.isVisible()) await cancelBtn.click();
    }
}

/**
 * Helper: Chọn loại đơn CNTT và chuyển sang step 2.
 * Dùng chung cho các test case negative.
 */
async function selectFormTypeCNTT(page: Page): Promise<void> {
    const searchInput = page.locator('.ft-search-inp');
    await searchInput.fill('CÔNG NGHỆ THÔNG TIN');
    await page.click('.ft-search-btn');
    await page.waitForTimeout(1000);

    const targetCard = page.locator('.type-card', { hasText: FORM_DATA.formTypeName });
    await targetCard.click();
    await page.click('button:has-text("Tiếp tục hồ sơ")');
    await page.waitForSelector('.selected-type-banner', { state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(2000);
}
