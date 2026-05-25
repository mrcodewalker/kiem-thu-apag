import { Page, Locator } from '@playwright/test';

/**
 * Helper để tương tác với component app-search-select.
 *
 * SearchSelect hoạt động như sau:
 * 1. Click vào input để mở dropdown
 * 2. Gõ query để lọc
 * 3. Bấm Enter hoặc click option để chọn
 */
export async function selectSearchOption(
  page: Page,
  containerSelector: string,
  query: string,
  optionText?: string
): Promise<void> {
  const container = page.locator(containerSelector);

  // Click vào input của search-select để mở dropdown
  const input = container.locator('input').first();
  await input.click();
  await page.waitForTimeout(300);

  // Gõ query tìm kiếm
  await input.fill(query);

  // Nếu component có debounce hoặc server search, bấm Enter để trigger
  await input.press('Enter');
  await page.waitForTimeout(800);

  // Chờ dropdown options xuất hiện
  const dropdown = page.locator('.ss-dropdown, [class*="ss-opt"], .search-select-dropdown').first();

  // Nếu có optionText cụ thể thì click vào đó, không thì click option đầu tiên
  if (optionText) {
    await page.locator(`text="${optionText}"`).first().click();
  } else {
    // Click option đầu tiên trong dropdown
    const firstOption = page.locator('.ss-opt, [class*="ss-option"]').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    } else {
      // Fallback: click vào item đầu tiên trong list
      await page.locator('app-search-select .ss-list > *').first().click();
    }
  }

  await page.waitForTimeout(300);
}

/**
 * Chọn option trong search-select bằng cách click trực tiếp vào
 * phần tử chứa text khớp trong dropdown đang mở.
 */
export async function pickOptionContaining(
  page: Page,
  text: string
): Promise<void> {
  // Tìm option trong dropdown đang mở (fixed position)
  const option = page.locator(`[class*="ss-opt"]:has-text("${text}")`).first();
  if (await option.isVisible({ timeout: 3000 })) {
    await option.click();
  } else {
    // Fallback: tìm bất kỳ element nào chứa text trong dropdown
    await page.locator(`.ss-list >> text=${text}`).first().click();
  }
  await page.waitForTimeout(300);
}
