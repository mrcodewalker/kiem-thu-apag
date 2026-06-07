import { Page } from '@playwright/test';

/**
 * Đăng nhập vào hệ thống với tài khoản secretary/admin.
 * Sau khi gọi hàm này, page đã ở trạng thái đã đăng nhập.
 */
export async function loginAsSecretary(page: Page): Promise<void> {
  await page.goto('/login');

  // Chờ form login xuất hiện
  await page.waitForSelector('#username', { state: 'visible' });

  // Điền thông tin đăng nhập
  await page.fill('#username', TEST_ACCOUNT.username);
  await page.fill('#password', TEST_ACCOUNT.password);

  // Click đăng nhập
  await page.click('button:has-text("Đăng nhập")');

  // Chờ redirect vào dashboard (chờ sidebar hoặc URL thay đổi)
  await page.waitForURL('**/dashboard/**', { timeout: 15_000 });
}

/**
 * Điều hướng đến trang Quản lý Kế hoạch thi.
 * Gọi sau loginAsSecretary.
 */
export async function goToExamSchedulePage(page: Page): Promise<void> {
  await page.goto('/dashboard/exam-schedules');
  // Chờ header trang load
  await page.waitForSelector('.esm-title', { state: 'visible', timeout: 15_000 });
}

// ============================================================
// CẤU HÌNH TÀI KHOẢN VÀ DỮ LIỆU TEST
// Thay đổi các giá trị này trước khi chạy test
// ============================================================
export const TEST_ACCOUNT = {
  username: 'root',       // <-- thay bằng tài khoản secretary thật
  password: 'Haibeo2004@',   // <-- thay bằng mật khẩu thật
};

export const TEST_DATA = {
  // Tên quyết định thi đã tồn tại trên server để dùng cho tìm kiếm
  existingDecisionName: 'HK1',

  // Dữ liệu để tạo kế hoạch thi mới (dùng trong TC-ESM-03)
  newSchedule: {
    subjectName: 'Playwright Test Subject',
    clazz: 'QLNN2024A',
    subjectCodeUnique: 'PW001',
    subjectCredits: '3',
    format: 'Tự luận',
    // Khoảng thời gian: phải là tương lai để hợp lệ
    startTimeRaw: '01/12/2025 08:00 đến 01/12/2026 10:00',
    note: 'Tạo bởi Playwright test - có thể xóa',
  },

  // Dữ liệu để sửa kế hoạch thi (dùng trong TC-ESM-04)
  updatedSchedule: {
    subjectName: 'Playwright Test Subject UPDATED',
    note: 'Đã cập nhật bởi Playwright',
  },
};
