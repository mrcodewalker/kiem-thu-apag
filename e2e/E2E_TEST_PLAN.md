# 📋 KẾ HOẠCH KIỂM THỬ E2E – HỆ THỐNG APAG (HCQTC)

> Tài liệu mô tả chi tiết bộ test end-to-end Playwright cho 3 chức năng nghiệp vụ chính của APAG.
> Dùng làm đầu vào cho NotebookLM / báo cáo nghiệm thu / handover cho team QA.
>
> **Stack:** Angular 18 (FE) + Spring Boot (BE) + Playwright 1.x + Chromium.
> **Base URL:** `https://hcqtc.vn`
> **Cập nhật:** 23/05/2026

---

## 📑 Mục lục

1. [Tổng quan & 3 chức năng kiểm thử](#1-tổng-quan--3-chức-năng-kiểm-thử)
2. [Cấu trúc thư mục `e2e/`](#2-cấu-trúc-thư-mục-e2e)
3. [Cấu hình Playwright](#3-cấu-hình-playwright)
4. [Cơ chế chia sẻ trạng thái đăng nhập (storageState)](#4-cơ-chế-chia-sẻ-trạng-thái-đăng-nhập-storagestate)
5. [Helper dùng chung](#5-helper-dùng-chung)
6. [Tài khoản & dữ liệu mock](#6-tài-khoản--dữ-liệu-mock)
7. [File upload phục vụ kiểm thử](#7-file-upload-phục-vụ-kiểm-thử)
8. [Sơ đồ luồng phụ thuộc giữa các spec](#8-sơ-đồ-luồng-phụ-thuộc-giữa-các-spec)
9. [Chức năng 1 – Quản lý Kế hoạch thi](#9-chức-năng-1--quản-lý-kế-hoạch-thi)
10. [Chức năng 2 – Nộp bài tập lớn (Sinh viên)](#10-chức-năng-2--nộp-bài-tập-lớn-sinh-viên)
11. [Chức năng 3 – Chấm điểm thi trực tuyến (Grader)](#11-chức-năng-3--chấm-điểm-thi-trực-tuyến-grader)
12. [Hai file setup mock data](#12-hai-file-setup-mock-data)
13. [Validation tổng hợp](#13-validation-tổng-hợp)
14. [Lệnh chạy](#14-lệnh-chạy)

---

## 1. Tổng quan & 3 chức năng kiểm thử

Bộ test phủ ba luồng nghiệp vụ chính, mỗi luồng nằm trong một spec file riêng:

| # | Chức năng | Spec | Role | TC |
|---|-----------|------|------|----|
| 1 | Quản lý Kế hoạch thi | `exam-schedule-management.spec.ts` | Secretary (`root`) | 16 |
| 2 | Nộp bài tập lớn | `subject-submission.spec.ts` | Student (`CT070218`) | 15 |
| 3 | Chấm điểm thi trực tuyến | `grader-scoring.spec.ts` | Grader (`lamtung`) | 17 |

Hai spec hỗ trợ chuẩn bị dữ liệu (chạy trước spec chính):

| Spec | Tác dụng | Bắt buộc trước spec nào |
|------|----------|-------------------------|
| `setup-subject-submission-data.spec.ts` | Tạo môn online + thêm sinh viên `CT070218` vào kế hoạch thi | `subject-submission.spec.ts` |
| `setup-grader-mock-data.spec.ts` | Dựng phòng `P102`, 11 thí sinh, chuyển trạng thái `THI → PHACH → CHAM`, giao 2 grader + template | `grader-scoring.spec.ts` |

---

## 2. Cấu trúc thư mục `e2e/`

```
apag-fe/
├── playwright.config.ts                # baseURL, globalSetup, retries, reporter
└── e2e/
    ├── .auth/
    │   └── grader.json                 # storageState lamtung – do global-setup.ts tạo
    ├── downloads/                      # File tải về trong test (PDF, Excel)
    ├── excel/
    │   ├── VALID.xlsx                  # Excel đúng template → import OK
    │   └── INVALID.xlsx                # Excel sai → import báo lỗi
    ├── fixtures/                       # (giữ chỗ cho fixture nâng cao)
    ├── helpers/
    │   ├── auth.helper.ts              # loginAsSecretary + TEST_ACCOUNT + TEST_DATA
    │   └── search-select.helper.ts     # tương tác app-search-select
    ├── images/                         # Ảnh chân dung & chữ ký cho exam-form
    ├── mock-file/
    │   ├── valid.pdf                   # PDF hợp lệ < 20 MB
    │   ├── greater-20-mb.pdf           # PDF > 20 MB → test boundary size
    │   ├── change.pdf                  # PDF khác → test "thay đổi tệp"
    │   └── Invalid.xlsx                # Excel → test sai định dạng (≠ pdf)
    ├── global-setup.ts                 # Login lamtung 1 lần khi khởi động test runner
    │
    ├── exam-schedule-management.spec.ts        # ★ Chức năng 1
    ├── subject-submission.spec.ts              # ★ Chức năng 2
    ├── grader-scoring.spec.ts                  # ★ Chức năng 3
    │
    ├── setup-subject-submission-data.spec.ts   # mock cho chức năng 2
    ├── setup-grader-mock-data.spec.ts          # mock cho chức năng 3
    │
    ├── secretary-esm-auth.json         # storageState root – do TC-ESM-00 tạo
    └── E2E_TEST_PLAN.md                # ← FILE NÀY
```

> File `*-auth.json` ở đầu thư mục `e2e/` (không phải `.auth/`) là **storageState do từng spec tự sinh ra** trong TC đầu tiên. Chúng không cần commit, có thể bị xóa cuối spec (vd `subject-submission` có cleanup ở TC-SS-15).

---

## 3. Cấu hình Playwright

File `apag-fe/playwright.config.ts` xác lập các tham số áp cho **toàn bộ** spec:

| Cấu hình | Giá trị | Ý nghĩa |
|----------|---------|---------|
| `testDir` | `./e2e` | Thư mục chứa spec |
| `globalSetup` | `./e2e/global-setup.ts` | Hàm chạy 1 lần trước toàn bộ test runner – dùng để login `lamtung` |
| `timeout` | `60_000` ms | Mỗi TC tối đa 60 giây |
| `expect.timeout` | `10_000` ms | Mỗi `expect(...)` chờ tối đa 10 giây |
| `fullyParallel` | `false` | KHÔNG chạy song song – các spec serial vì cùng database |
| `retries` | `1` | Mỗi TC fail được retry 1 lần |
| `use.baseURL` | `https://hcqtc.vn` | `page.goto('/login')` = `https://hcqtc.vn/login` |
| `use.headless` | `false` | Mặc định mở browser thật để dễ debug |
| `use.viewport` | `1440 × 900` | Đảm bảo layout desktop (modal, sidebar) |
| `use.screenshot` | `only-on-failure` | Chụp ảnh khi TC fail |
| `use.video` | `retain-on-failure` | Quay video TC fail |
| `use.trace` | `retain-on-failure` | Lưu trace để mở bằng `npx playwright show-trace` |
| `use.locale` | `vi-VN` | Trình duyệt giả lập tiếng Việt |
| `use.timezoneId` | `Asia/Ho_Chi_Minh` | Đảm bảo `new Date()` cho giờ VN, tránh sai múi giờ trong validate ngày |

---

## 4. Cơ chế chia sẻ trạng thái đăng nhập (storageState)

Hệ thống dùng **3 cách** để tránh phải login lại trong từng TC. Cả 3 đều dựa trên `BrowserContext.storageState()` của Playwright (lưu cookies + localStorage `token_kolla`, `user_kolla`, `expiration_kolla_token`).

### 4.1. Cách 1 – `globalSetup` (dùng cho `grader-scoring.spec.ts`)

`e2e/global-setup.ts` chạy **một lần duy nhất** trước toàn bộ test runner:

```typescript
// global-setup.ts
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: 'https://hcqtc.vn' });
const page = await context.newPage();
await page.goto('/login');
await page.fill('#username', 'lamtung');
await page.fill('#password', 'LAM@123');
await page.click('button:has-text("Đăng nhập")');
await page.waitForURL('**/dashboard-grader/**');
await context.storageState({ path: 'e2e/.auth/grader.json' });
```

Sau đó trong `grader-scoring.spec.ts`:

```typescript
const AUTH_STATE_FILE = path.join(__dirname, '.auth', 'grader.json');
test.use({ storageState: AUTH_STATE_FILE });
```

→ **Mọi TC** trong spec đó mở browser ở trạng thái đã đăng nhập. TC-GS-01 chỉ cần verify token bằng cách goto `/dashboard-grader/scoring` và xem có bị redirect về `/login` không.

### 4.2. Cách 2 – Login trong TC đầu tiên + lưu state (dùng cho `exam-schedule-management`, `subject-submission`)

Mẫu chung:

```typescript
const AUTH_FILE = path.join(__dirname, 'secretary-esm-auth.json');

test('TC-ESM-00: Đăng nhập', async ({ page }) => {
  await loginAsSecretary(page);
  await page.context().storageState({ path: AUTH_FILE });
});

test.describe('Sau khi đăng nhập', () => {
  test.use({ storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined });

  test.beforeEach(async ({ page }) => {
    await goToExamSchedulePage(page);
  });

  // Các TC tiếp theo dùng session đã lưu
});
```

→ TC-00 phải chạy **đầu tiên**. Nếu skip TC-00, các TC sau chạy không có session.

### 4.3. Cách 3 – Login từng spec với storage riêng (dùng cho `setup-*`)

Mỗi spec setup có file storage riêng:
- `setup-subject-submission-data.spec.ts` → `secretary-setup-ss-auth.json`
- `setup-grader-mock-data.spec.ts` → `secretary-setup-auth.json` (Secretary) **+** một sub-test login lại bằng `ADMIN_CHAM` để khởi tạo phiên chấm.

Lý do: setup chạy như một spec độc lập, không phụ thuộc spec khác → cần state riêng để có thể chạy lại bất kỳ lúc nào.

### 4.4. Bảng tổng hợp các file storageState

| File | Spec sinh ra | Spec sử dụng | Tài khoản |
|------|--------------|--------------|-----------|
| `e2e/.auth/grader.json` | `global-setup.ts` (auto) | `grader-scoring.spec.ts` | `lamtung` |
| `e2e/secretary-esm-auth.json` | `exam-schedule-management.spec.ts` (TC-ESM-00) | chính nó | `root` |
| `e2e/student-auth.json` | `subject-submission.spec.ts` (TC-SS-01) | chính nó | `CT070218` |
| `e2e/secretary-setup-auth.json` | `setup-grader-mock-data.spec.ts` (SETUP-01) | chính nó (SETUP-02..07) | `root` |
| `e2e/secretary-setup-ss-auth.json` | `setup-subject-submission-data.spec.ts` (SETUP-SS-01) | chính nó (SETUP-SS-02, 03) | `root` |

---

## 5. Helper dùng chung

### 5.1. `e2e/helpers/auth.helper.ts`

| Hàm / Hằng | Vai trò |
|------------|---------|
| `TEST_ACCOUNT` | Cấu hình `username` + `password` Secretary (mặc định `root` / `Haibeo2004@`) |
| `TEST_DATA.existingDecisionName` | Tên quyết định thi đã có sẵn trên server (`HK1`) – dùng cho mọi spec liên quan kế hoạch thi |
| `TEST_DATA.newSchedule` | Object chứa dữ liệu để tạo kế hoạch thi mới (subjectName, clazz, format, startTimeRaw, ...) |
| `TEST_DATA.updatedSchedule` | Object chứa dữ liệu để cập nhật kế hoạch thi (TC-ESM-05) |
| `loginAsSecretary(page)` | Goto `/login`, điền username/password từ `TEST_ACCOUNT`, chờ URL `**/dashboard/**` |
| `goToExamSchedulePage(page)` | Goto `/dashboard/exam-schedules`, chờ `.esm-title` hiện ra |

**Spec đang sử dụng:** `exam-schedule-management.spec.ts`, `setup-subject-submission-data.spec.ts`, `setup-grader-mock-data.spec.ts`.

### 5.2. `e2e/helpers/search-select.helper.ts`

Hệ thống dùng component custom `app-search-select` (dropdown có ô tìm kiếm). Helper này gói thao tác chuẩn:

| Hàm | Vai trò |
|-----|---------|
| `selectSearchOption(page, containerSelector, query, optionText?)` | Click input, fill query, Enter, click option đầu tiên (hoặc text cụ thể) |
| `pickOptionContaining(page, text)` | Click option trong dropdown đang mở chứa text khớp |

> Trong các spec chính, vì có nhiều biến thể (single select, multi select, có debounce 800ms vs 1500ms), **đa số spec inline thao tác trực tiếp** thay vì gọi helper. Helper chỉ giữ vai trò "fallback chuẩn".

### 5.3. Helper inline – `_searchByDecision`, `_searchByDecisionAndSubject`, `_openAddFormStep2`, `addCandidate`, `selectDecision`, `findAssignItem`, `selectRoom`, `waitForAssignList`, `waitForDataLoad`

Các hàm phụ này được khai báo **bên trong spec** dùng nó. Lý do: chúng phụ thuộc vào DOM cụ thể của trang, không tổng quát đủ để đưa lên helper chung.

| Hàm | Spec | Vai trò |
|-----|------|---------|
| `_searchByDecision` | `exam-schedule-management` | Filter bảng theo quyết định thi |
| `_searchByDecisionAndSubject` | `exam-schedule-management` | Filter theo cả quyết định + tên môn |
| `_openAddFormStep2` | `exam-schedule-management` | Mở dialog "Thêm kế hoạch", chọn quyết định, sang bước 2 |
| `selectDecision` | `setup-grader-mock-data` | Chọn option trong app-search-select |
| `addCandidate` | `setup-grader-mock-data` | Thêm 1 thí sinh vào phòng đang chọn |
| `waitForAssignList` | `grader-scoring` | Chờ danh sách phân công xuất hiện hoặc empty state |
| `findAssignItem` | `grader-scoring` | Tìm đúng item P102 + môn `Kiểm thử phần mềm` (tránh nhầm khi trùng tên) |
| `selectRoom` | `grader-scoring` | Click vào item rồi chờ bảng chấm điểm render |
| `waitForDataLoad` | `subject-submission` | Chờ `.ss-skeleton-row` ẩn rồi đợi 1s render Angular |

---

## 6. Tài khoản & dữ liệu mock

### 6.1. Tài khoản

| Username | Password | Role | Spec sử dụng |
|----------|----------|------|--------------|
| `root` | `Haibeo2004@` | Secretary / Admin | `exam-schedule-management`, cả 2 file setup |
| `ADMIN_CHAM` | `CHAM@123` | Admin chấm | `setup-grader-mock-data` (SETUP-08 – khởi tạo phiên chấm) |
| `CT070218` | `Haibeo2004@` | Student (Huỳnh Ngọc Hải, sinh 24/11/2004) | `subject-submission` |
| `lamtung` | `LAM@123` | Grader CB1 | `grader-scoring`, `global-setup` |
| `huytq` | – | Grader CB2 | Chỉ là username trong setup (`setup-grader-mock-data` SETUP-08) |

### 6.2. Dữ liệu cố định trên server (KHÔNG do test tạo)

| Trường | Giá trị | Yêu cầu |
|--------|---------|---------|
| Quyết định thi | `HK1` | Phải có sẵn |
| Template chấm | `Viết 3 câu` (Tự luận 3-4-3, max 10đ) | Phải có sẵn |

### 6.3. Dữ liệu do `setup-grader-mock-data.spec.ts` tạo

| Mục | Giá trị |
|-----|---------|
| Môn thi | `Kiểm thử phần mềm` (mã `KTPM2025`, 3 tín chỉ, Tự luận, online) |
| Khoảng thời gian | `15/12/2025 08:00` → `15/12/2026 10:00` |
| Phòng thi | `P102` (mã phách `A5`) |
| Thí sinh chính | `CT070218 – Huỳnh Ngọc Hải` |
| 10 thí sinh phụ | `CT070201..CT070210` (xem mục 6.4) |
| Phiên chấm | Template `Viết 3 câu`, CB1 = `lamtung`, CB2 = `huytq` |

### 6.4. Dữ liệu do `setup-subject-submission-data.spec.ts` tạo

| Mục | Giá trị |
|-----|---------|
| Môn thi | `Bài tập lớn Kiểm thử PM` (mã `BTLKTPM2025`, hình thức `Bài tập lớn`, online) |
| Khoảng thời gian | `01/06/2026 08:00` → `30/06/2026 23:59` |
| Thí sinh thêm | `CT070218 – Huỳnh Ngọc Hải` (sinh `24/11/2004`, lớp `CT07`) |

### 6.5. Danh sách 11 thí sinh trong P102

| Mã SV | Họ tên | Ngày sinh |
|-------|--------|-----------|
| CT070218 | Huỳnh Ngọc Hải | 24/11/2004 |
| CT070201 | Nguyễn Văn An | 01/03/2004 |
| CT070202 | Trần Thị Bình | 15/05/2004 |
| CT070203 | Lê Hoàng Cường | 22/07/2004 |
| CT070204 | Phạm Thị Dung | 08/09/2004 |
| CT070205 | Hoàng Văn Em | 30/01/2004 |
| CT070206 | Vũ Thị Phương | 12/04/2004 |
| CT070207 | Đặng Minh Quân | 25/06/2004 |
| CT070208 | Bùi Thị Hoa | 03/08/2004 |
| CT070209 | Ngô Văn Khoa | 17/10/2004 |
| CT070210 | Đinh Thị Lan | 29/12/2004 |

---

## 7. File upload phục vụ kiểm thử

Tất cả file mock đặt trong `e2e/mock-file/` (cho subject-submission) và `e2e/excel/` (cho grader-scoring).

### 7.1. `e2e/mock-file/` – chức năng nộp bài tập lớn

| File | Định dạng | Kích thước | TC sử dụng | Mục đích |
|------|-----------|------------|------------|----------|
| `valid.pdf` | PDF | < 20 MB | TC-SS-08, TC-SS-09 (file 1), TC-SS-10, TC-SS-11 | File hợp lệ – test happy path nộp bài |
| `greater-20-mb.pdf` | PDF | > 20 MB | TC-SS-07 | Boundary size – test reject file vượt 20 MB |
| `change.pdf` | PDF | < 20 MB | TC-SS-09 | File khác – test thay đổi tệp đã chọn |
| `Invalid.xlsx` | Excel | bất kỳ | TC-SS-06 | Sai định dạng – test reject file ≠ pdf |

→ Cách load trong test:
```typescript
const TEST_DATA = {
  pdfValid: path.join(__dirname, 'mock-file', 'valid.pdf'),
  pdfLarge: path.join(__dirname, 'mock-file', 'greater-20-mb.pdf'),
  invalidFile: path.join(__dirname, 'mock-file', 'Invalid.xlsx'),
  pdfChange: path.join(__dirname, 'mock-file', 'change.pdf'),
};
await modal.locator('input[type="file"]').setInputFiles(TEST_DATA.pdfValid);
```

### 7.2. `e2e/excel/` – chức năng chấm điểm

| File | TC sử dụng | Mục đích |
|------|------------|----------|
| `VALID.xlsx` | TC-GS-13 | Excel đúng cấu trúc template "Viết 3 câu" – test import OK, hiển thị preview, click "Nhập" → toast success |
| `INVALID.xlsx` | TC-GS-12 | Excel thiếu cột "Mã phách" hoặc điểm sai → hiển thị `.gs-import-error` hoặc `.gs-import-stat--err`, nút "Nhập" disabled |

→ Cách load:
```typescript
const EXCEL_VALID = path.join(__dirname, 'excel', 'VALID.xlsx');
await page.locator('.gs-upload-zone input[type="file"]').setInputFiles(EXCEL_VALID);
```

### 7.3. `e2e/.auth/grader.json`

Không phải file upload – đây là **storageState** chứa cookies & localStorage của `lamtung` sau khi login. Do `global-setup.ts` tạo, do `grader-scoring.spec.ts` đọc.

---

## 8. Sơ đồ luồng phụ thuộc giữa các spec

```
┌──────────────────────────────────────────────────────────────────┐
│  ĐIỀU KIỆN TIÊN QUYẾT TRÊN SERVER                                │
│  • Quyết định "HK1"                                              │
│  • Template "Viết 3 câu"                                         │
│  • Tài khoản: root, ADMIN_CHAM, CT070218, lamtung, huytq         │
└──────────────────────────────────────────────────────────────────┘

         FLOW 1                   FLOW 2                   FLOW 3
   ┌──────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
   │   Quản lý    │    │  Nộp bài tập lớn    │    │   Chấm điểm thi      │
   │  Kế hoạch    │    │                     │    │                      │
   └──────┬───────┘    └──────────┬──────────┘    └───────────┬──────────┘
          │                       │                           │
          │           ┌───────────▼──────────┐    ┌───────────▼──────────┐
          │           │ setup-subject-       │    │ setup-grader-mock-   │
          │           │ submission-data      │    │ data (8 SETUP)       │
          │           │ (3 SETUP, ~1 phút)   │    │ (~5–8 phút)          │
          │           └───────────┬──────────┘    └───────────┬──────────┘
          │                       │                           │
          │                       │                ┌──────────▼─────────┐
          │                       │                │ global-setup.ts    │
          │                       │                │ (login lamtung)    │
          │                       │                └──────────┬─────────┘
          │                       │                           │
   ┌──────▼───────┐    ┌──────────▼──────────┐    ┌───────────▼──────────┐
   │ exam-schedule│    │ subject-submission  │    │   grader-scoring     │
   │ -management  │    │ (15 TC)             │    │   (17 TC)            │
   │ (16 TC)      │    │                     │    │                      │
   └──────────────┘    └─────────────────────┘    └──────────────────────┘
```

**Kết luận:** mock data của Flow 3 phải được tạo TRƯỚC khi chạy `grader-scoring`, không phải tạo sau cùng. Lý do: grader chỉ thấy phân công sau khi admin đã giao phòng + template; phòng chỉ có thể giao khi đã ở trạng thái `CHAM`; trạng thái `CHAM` cần đi qua `THI → PHACH` và phải có thí sinh + mã phách.

---

## 9. Chức năng 1 – Quản lý Kế hoạch thi

**Spec:** `exam-schedule-management.spec.ts` · **Role:** Secretary (`root`) · **URL:** `/dashboard/exam-schedules`

### 9.1. Cấu trúc spec

```
test.describe.serial('Quản lý Kế hoạch thi', () => {
  test('TC-ESM-00: Đăng nhập', ...)              // Login + lưu secretary-esm-auth.json

  test.describe('Thao tác sau khi đăng nhập', () => {
    test.use({ storageState: AUTH_FILE });
    test.beforeEach(async ({ page }) => { await goToExamSchedulePage(page); });

    // TC-ESM-01 → TC-ESM-15
  });
});
```

### 9.2. Form fields & validators

Component sử dụng Reactive Form với các control:

| `formControlName` | Required | Validator | Loại UI | Ghi chú |
|-------------------|----------|-----------|---------|---------|
| `subjectName` | ✅ | `required` | text input | Tên môn |
| `subjectCode` | ✅ (chỉ ở edit) | `required` (set lại khi mở edit) | text input | Disabled khi tạo mới |
| `clazz` | ✅ | `required` | text input | Lớp học phần |
| `subjectCodeUnique` | – | – | text input | Mã unique |
| `subjectCredits` | – | – | text input | Số tín chỉ |
| `format` | – | – | text input | "Tự luận" / "Trắc nghiệm" / ... |
| `onlineExam` | – | – | text input | "x" nếu online |
| `startTimeRaw` | ✅ | `required` + `pattern(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{2}:\d{2}/)` | text input flexible | Xem mục 9.3 |
| `releaseTimeRaw` | – | – | text input | Thời gian công bố điểm |
| `initTime` | – (auto) | – | hidden Date | Tự sinh từ `startTimeRaw` |
| `stopTime` | – (auto) | – | p-calendar | `[minDate]="minStopDate"` |
| `note` | – | – | textarea | Ghi chú |

### 9.3. Logic `startTimeRaw` – nhập linh hoạt + auto chuẩn hóa khi blur

Regex pattern hỗ trợ trong `onStartTimeBlur()`:

```regex
(?:từ\s+)?(?:ngày\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)
   (?:\s+(\d{1,2}:\d{2}))?
.*?(?:đến|->|—|-|to)\s+
(?:ngày\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)
   (?:\s+(\d{1,2}:\d{2}))?
```

| Input người dùng | Output sau blur | initTime | stopTime |
|------------------|-----------------|----------|----------|
| `01/12/2025 08:00 đến 01/12/2026 10:00` | `Từ ngày 01/12/2025 08:00 đến 01/12/2026 10:00` | 01/12/2025 08:00 | 01/12/2026 10:00 |
| `Từ ngày 13/05/2026 tới ngày 25/12/2027` | `Từ ngày 13/05/2026 07:00 đến 25/12/2027 07:00` | 13/05/2026 **07:00** | 25/12/2027 **07:00** |
| `14/05 00:00 -> 15/05 23:59` | `Từ ngày 14/05/{year} 00:00 đến 15/05/{year} 23:59` | 14/05 năm hiện tại 00:00 | 15/05 năm hiện tại 23:59 |
| `01/12/2025` (single date) | `Ngày 01/12/2025 07:00` | 01/12/2025 07:00 | 01/12/2025 23:59 |
| `ngày 01 tháng 12 năm 2025` | KHÔNG match → `.f-err` xuất hiện chứa "dd/mm/yyyy HH:mm" | – | – |
| `25/12/2026 10:00 đến 01/01/2026 08:00` | Match nhưng `endDate <= startDate` → `.f-err` "Ngày kết thúc phải sau ngày bắt đầu" | – | – |

**Quy tắc:**
- Thiếu giờ → mặc định **`07:00`**.
- Thiếu năm → dùng `new Date().getFullYear()`.
- Single date → `stopTime = ngày đó 23:59`.
- `date2 <= date1` → set error `invalidRange`, submit disabled.

### 9.4. Validation `endDate < startDate` ở **datepicker**

Component subscribe `initTime.valueChanges`:

```typescript
this.form.get('initTime')?.valueChanges.subscribe((val: Date | null) => {
  this.minStopDate = val instanceof Date && !isNaN(val.getTime())
    ? val
    : new Date(0);
  // Nếu stopTime hiện tại < initTime → reset stopTime
});
```

Trên template:

```html
<p-calendar formControlName="stopTime" [minDate]="minStopDate"></p-calendar>
```

→ Trong UI, các ngày trước `initTime` bị **grayed-out, không click được**. Đây chính là cơ chế "disable không cho bấm chọn ở datepicker" mà yêu cầu nghiệp vụ đặt ra.

### 9.5. Danh sách Test Case

| TC | Loại | Mô tả | Phụ thuộc | Selector chính |
|----|------|-------|-----------|----------------|
| **TC-ESM-00** | Setup | Login Secretary, lưu storageState `secretary-esm-auth.json` | – | `#username`, `#password` |
| **TC-ESM-01** | Happy | Hiển thị trang ban đầu: title, subtitle, button "Thêm kế hoạch" / "Import Excel", filter, empty state | 00 | `.esm-title`, `.esm-subtitle`, `.filter-bar`, `.esm-empty` |
| **TC-ESM-02** | Happy | Tìm kiếm theo quyết định `HK1` → có data hoặc empty, kiểm tra header bảng | 00 | `.filter-bar app-search-select`, `.esm-table thead th`, `.pg-info` |
| **TC-ESM-03** | Happy | Modal 2 bước: chọn quyết định → điền form → submit. Verify record xuất hiện sau filter | 00 | `.modal`, `.ma-head-title`, `.ma-foot .ma-btn-save` |
| **TC-ESM-04** | Negative | Mở dialog xóa → click **Hủy** → record VẪN CÒN | 03 | `.act-menu-btn`, `.act-item--danger`, `.inline-confirm`, `.fixed.inset-0.z-50` |
| **TC-ESM-05** | Happy | Sửa `subjectName` + `note` → submit "Cập nhật" → verify record có tên mới | 03, 04 | `input[formControlName="subjectName"]`, `.ma-btn-save` |
| **TC-ESM-06** | Happy | Xóa thật: inline confirm → custom dialog → click "Xóa ngay" → record biến mất | 05 | `.ic-confirm`, `button:has-text("Xóa ngay")` |
| **TC-ESM-07** | Negative | Bỏ trống `subjectName`, điền các field khác → nút submit **disabled** | – | `.ma-btn-save` (assert `.toBeDisabled()`) |
| **TC-ESM-08** | Negative | Bỏ trống `clazz` → submit **disabled** | – | như trên |
| **TC-ESM-09** | Negative | Nhập `"ngày 01 tháng 12 năm 2025"` → KHÔNG match pattern → submit disabled, `.f-err` chứa "dd/mm/yyyy HH:mm" | – | `.f-err` |
| **TC-ESM-10** | Happy | Điền đủ + đúng format `01/12/2025 08:00 đến 01/12/2025 10:00` → submit **enabled** | – | `.ma-btn-save` (assert `.not.toBeDisabled()`) |
| **TC-ESM-11** | UI | Mở panel chọn cột, kiểm tra có >= 5 cột, "Hiện tất cả"/"Ẩn tất cả"/"Mặc định", đóng panel | – | `.col-selector-panel`, `.col-check-item` |
| **TC-ESM-12** | UI | Đổi rows/page sang `5`, verify số dòng ≤ 5, click next page → first row khác, click prev → quay lại | – | `.f-select-sm`, `.pg-controls .pg-btn`, `.pg-info` |
| **TC-ESM-13** | Edge | Input `"Từ ngày 13/05/2026 tới ngày 25/12/2027"` (chỉ ngày) → auto fill `07:00` cho cả 2 mốc, submit enabled | – | `input[formControlName="startTimeRaw"]` |
| **TC-ESM-14** | Edge | Input `"14/05 00:00 -> 15/05 23:59"` (`->` + thiếu năm) → auto thêm năm hiện tại, format chuẩn có "đến" | – | như trên |
| **TC-ESM-15** | Negative | Input `"25/12/2026 10:00 đến 01/01/2026 08:00"` → `.f-err` chứa "Ngày kết thúc phải sau ngày bắt đầu", submit disabled | – | `.f-err`, `.ma-btn-save` |

### 9.6. Selectors quan trọng

```
.esm-title, .esm-subtitle, .esm-card, .esm-empty, .esm-table
.filter-bar, .filter-bar app-search-select
.skeleton-wrap
.modal, .ma-head-title, .ma-foot .ma-btn-save, .ma-close
.f-err
.act-menu-btn, .act-dropdown, .act-item, .act-item--danger
.inline-confirm, .ic-confirm
.fixed.inset-0.z-50               // Custom dialog xác nhận xóa
.col-selector-panel, .col-check-item
.pg-info, .pg-controls .pg-btn, .f-select-sm
```

---

## 10. Chức năng 2 – Nộp bài tập lớn (Sinh viên)

**Spec:** `subject-submission.spec.ts` · **Role:** Student `CT070218` · **URL:** `/dashboard-student/subjects`, `/dashboard-student/history`

### 10.1. Cấu trúc spec

```
test.describe.configure({ mode: 'serial' });
test.describe('Subject Submission Flow', () => {
  test('TC-SS-01: Đăng nhập sinh viên', ...)        // Lưu student-auth.json

  test.describe('Sau khi đăng nhập', () => {
    test.use({ storageState: AUTH_FILE });
    // TC-SS-02 → TC-SS-15
  });
});
```

### 10.2. Tiền điều kiện dữ liệu

Sinh viên `CT070218` chỉ thấy môn thi khi **`setup-subject-submission-data.spec.ts`** đã chạy. Spec này tạo:
- Môn `Bài tập lớn Kiểm thử PM` với `onlineExam = "x"`, khoảng `01/06/2026 → 30/06/2026`.
- Thêm `CT070218` vào kế hoạch thi đó.

### 10.3. Form & Validation nộp bài

| Field | Required | Rule | Error UI |
|-------|----------|------|----------|
| `assignmentName` | ✅ readonly | tự fill | – |
| `topicId` (dropdown 10 chủ đề) | ✅ | bắt buộc chọn | Toast `.ss-toast--warn` ("Vui lòng chọn chủ đề") + `.ss-error-text` dưới dropdown |
| `description` | – | – | – |
| `file` | ✅ | type = `application/pdf` | Toast `.ss-toast--warn` chứa "PDF" |
| `file` | ✅ | size ≤ 20 MB | Toast `.ss-toast--warn` chứa "20MB" |

### 10.4. Danh sách Test Case

| TC | Loại | Mô tả | File mock | Selector chính |
|----|------|-------|-----------|----------------|
| **TC-SS-01** | Setup | Goto `/login`, fill `CT070218`, lưu `student-auth.json` | – | `#username`, `#password` |
| **TC-SS-02** | Happy | Vào `/dashboard-student/subjects`, verify `.ss-title` = "Môn thi", có bảng | – | `.ss-title`, `.ss-table`, `.ss-empty` |
| **TC-SS-03** | Happy | Click `.ss-act-btn--view` → modal `.ss-modal--xl` mở, đóng được | – | `.ss-modal--xl`, `.ss-modal-close` |
| **TC-SS-04** | Happy | Click `.ss-act-btn--submit` → modal mở. Verify `assignmentName` readonly, dropdown chủ đề có đúng **10 option**, dropzone hiển thị | – | `.ss-custom-select`, `.ss-custom-select__option` (toHaveCount 10) |
| **TC-SS-05** | Negative | Mở form, KHÔNG chọn file → nút `.ss-btn-primary` **disabled** | – | `.ss-btn-primary` |
| **TC-SS-06** | Negative | Upload `Invalid.xlsx` → toast `.ss-toast--warn` chứa "PDF" | `Invalid.xlsx` | `.ss-toast--warn` |
| **TC-SS-07** | Negative | Upload `greater-20-mb.pdf` → toast `.ss-toast--warn` chứa "20MB" | `greater-20-mb.pdf` | `.ss-toast--warn` |
| **TC-SS-08** | Happy | Upload `valid.pdf` → `.ss-file-card` hiện, `.ss-file-card-ok` chứa "Sẵn sàng nộp", submit enabled | `valid.pdf` | `.ss-file-card`, `.ss-file-card-ok` |
| **TC-SS-09** | Happy | Upload `valid.pdf` → đổi sang `change.pdf` (verify tên), bấm `.ss-file-btn--remove` → file biến mất, dropzone hiện lại | `valid.pdf`, `change.pdf` | `.ss-file-card-name`, `.ss-file-btn--remove` |
| **TC-SS-10** | Negative | Upload `valid.pdf` (KHÔNG chọn chủ đề) → click submit → toast warn chứa "chủ đề" + `.ss-error-text` "Vui lòng chọn chủ đề" | `valid.pdf` | `.ss-toast--warn`, `.ss-error-text` |
| **TC-SS-11** | Happy | Chọn chủ đề (option đầu = "Chủ đề 1"), điền description, upload `valid.pdf`, click submit → toast `.ss-toast--success` + `.ss-processing-toast` | `valid.pdf` | `.ss-custom-select__value`, `.ss-toast--success` |
| **TC-SS-12** | Happy | Goto `/dashboard-student/history`, click `.ss-act-btn--delete` → modal "Xác nhận xóa bài nộp" → click `.hs-btn-delete` → toast success | – | `.ss-modal`, `.hs-btn-delete` |
| **TC-SS-13** | Happy | Quay về `/subjects` → môn quay về trạng thái có `.ss-act-btn--submit` (chưa nộp) | – | `.ss-act-btn--submit` |
| **TC-SS-14** | UI | Click "Help" → modal "Liên hệ hỗ trợ" mở, đóng được | – | `.ss-modal-close` |
| **TC-SS-15** | Cleanup | Click `.ds-logout-btn`, modal xác nhận → click "Đăng xuất" → redirect `/login`, xóa file `student-auth.json` | – | `.ds-logout-btn`, `.ds-user-dd-item--danger` |

### 10.5. Selectors quan trọng

```
.ss-title, .ss-table, .ss-empty, .ss-skeleton-row
.ss-act-btn--view, .ss-act-btn--submit, .ss-act-btn--delete
.ss-modal, .ss-modal--xl, .ss-modal-title, .ss-modal-close, .ss-modal-body
.ss-custom-select, .ss-custom-select__trigger, .ss-custom-select__option, .ss-custom-select__value
.ss-dropzone
.ss-file-card, .ss-file-card-name, .ss-file-card-ok, .ss-file-btn--remove
.ss-btn-primary, .ss-btn-cancel
.ss-toast--warn, .ss-toast--success, .ss-processing-toast
.ss-error-text, .ss-label
.hs-btn-delete                          // Nút xác nhận xóa trong history
.ds-logout-btn, .ds-user-dd-item--danger
```

---

## 11. Chức năng 3 – Chấm điểm thi trực tuyến (Grader)

**Spec:** `grader-scoring.spec.ts` · **Role:** Grader `lamtung` (CB1) · **URL:** `/dashboard-grader/scoring`

### 11.1. Cấu trúc spec

```
const AUTH_STATE_FILE = path.join(__dirname, '.auth', 'grader.json');
test.use({ storageState: AUTH_STATE_FILE });

test.describe('Chấm thi — Grader Scoring', () => {
  // TC-GS-01 → TC-GS-17
  // KHÔNG có test login vì storageState đã được global-setup.ts tạo
});
```

### 11.2. Tiền điều kiện dữ liệu (do `setup-grader-mock-data` tạo)

- Phòng `P102` ở trạng thái **`CHAM`**.
- `lamtung` được giao role **CB1** + `huytq` được giao **CB2**.
- Template **"Viết 3 câu"** (3 câu hỏi, max điểm `3 / 4 / 3` → tổng max `10`).
- 11 thí sinh đã có mã phách.

### 11.3. Bảng chấm – cấu trúc cột động

```
| #  | Mã phách | Câu 1 (/3) | Câu 2 (/4) | Câu 3 (/3) | Tổng | Trạng thái | Ghi chú | Lưu |
```

Số ô nhập điểm = số câu trong template (động).

### 11.4. Validation từng ô điểm

| Trường hợp | Class CSS | Tooltip | Hệ quả |
|------------|-----------|---------|--------|
| Trống (sau khi blur) | `.gs-inp-cell.has-error` | "Bắt buộc nhập" | `.gs-error-chip` hiện, `.gs-btn-submit` disabled |
| Ký tự không phải số | `.gs-inp-cell.has-error` | "Không hợp lệ" | như trên |
| Số âm | `.gs-inp-cell.has-error` | "Không hợp lệ" | như trên |
| Vượt max cột | `.gs-inp-cell.has-error` | "Tối đa N" | như trên |
| Hợp lệ chưa lưu | row có `.row-dirty`, `.gs-status-icon--dirty` hiện | – | `.gs-draft-banner` hiện, `.gs-dirty-chip` hiện số bài |
| Đã lưu | row có `.row-saved`, `.gs-status-icon--ok` hiện | – | – |

### 11.5. Danh sách Test Case

| TC | Loại | Mô tả | File mock | Selector chính |
|----|------|-------|-----------|----------------|
| **TC-GS-01** | Auth | Goto `/dashboard-grader/scoring` → KHÔNG bị redirect về `/login`, `.gs-header-title` = "Chấm điểm" | – | `.gs-header-title` |
| **TC-GS-02** | Happy | Header + sub, "Phân công của tôi", switch ĐH/ThS, danh sách phân công có ≥ 1 item, placeholder | – | `.gs-card-title`, `.gs-type-switch`, `.gs-assign-item`, `.gs-placeholder` |
| **TC-GS-03** | Happy | `findAssignItem()` lọc theo P102 + môn + role CB1, click → bảng chấm điểm hiện | – | `.gs-assign-name`, `.gs-assign-ctx-chip`, `.gs-badge--role`, `.gs-table-wrap` |
| **TC-GS-04** | Happy | Bảng có cột `#`, `Mã phách`, đúng **3 ô điểm động** (`.gs-th-name` x3), cuối cùng là `Tổng / Trạng thái / Ghi chú` | – | `.gs-table thead th`, `.gs-th-name`, `.gs-th-max`, `.gs-cover-badge` |
| **TC-GS-05** | Happy | Đọc max từ header → fill điểm mới khác giá trị hiện tại → row `.row-dirty`, `.gs-draft-banner` hiện, click `.gs-status-icon--dirty` → toast success → row `.row-saved` | – | `.gs-score-inp`, `.gs-draft-banner`, `.gs-status-icon--dirty/ok`, `.p-toast-message-success` |
| **TC-GS-06** | Negative | Hàng 2: nhập `max+5` ở cột đầu → `.gs-inp-err-tip` hiện "Tối đa", `.gs-error-chip` hiện, `.gs-btn-submit` disabled | – | `.gs-inp-err-tip`, `.gs-error-chip`, `.gs-btn-submit` |
| **TC-GS-07** | Negative | Hàng 3: nhập `abc` → `.gs-inp-err-tip` hiện "Không hợp lệ" | – | như trên |
| **TC-GS-08** | Negative | Hàng 4: điền 2 cột, bỏ trống cột 3 → submit disabled. Force click → "Bắt buộc nhập" hiện | – | `.gs-inp-err-tip` |
| **TC-GS-09** | Negative | Hàng 5: nhập `-1` → "Không hợp lệ" | – | như trên |
| **TC-GS-10** | Happy | Tìm 3 hàng chưa lưu, fill `[2,3,2]` từng hàng → `.gs-draft-banner` hiện, `.gs-dirty-chip` ≥ 3 → click "Gửi X bài hợp lệ" → banner ẩn, toast success, `.gs-overall-progress` hiện | – | `.gs-draft-banner .gs-btn-submit`, `.gs-overall-progress` |
| **TC-GS-11** | Happy | Click "Tải mẫu" → bắt download event, filename khớp `Mau-cham-diem*.xlsx` | – | `button:has-text("Tải mẫu")` |
| **TC-GS-12** | Negative | Click "Import Excel" → upload `INVALID.xlsx` → hiện `.gs-import-error` HOẶC `.gs-import-stat--err`. Nút "Nhập" disabled (nếu hiện) | `INVALID.xlsx` | `.gs-upload-zone input[type="file"]`, `.gs-import-error`, `.gs-import-stat--err` |
| **TC-GS-13** | Happy | Upload `VALID.xlsx` → `.gs-import-table-wrap` preview, `.gs-import-stat--ok` > 0, click "Nhập" → quay lại bảng chấm + toast success | `VALID.xlsx` | `.gs-import-stat--ok`, `.gs-import-table-wrap` |
| **TC-GS-14** | Happy | Click "Lịch sử" → panel "Lịch sử chấm điểm" + `.gs-history-summary` + bảng có cột "Mã phách"/"Điểm hiện tại", có row `.row-saved` | – | `.gs-history-wrap`, `.gs-history-summary`, `.gs-history-table-wrap` |
| **TC-GS-15** | UI | Filter "Chưa xong" → tất cả item có `.gs-badge--pending`. Filter "Xong" → có item thì có `.gs-badge--done`, không thì `.gs-empty`. Filter "Tất cả" → có item | – | `.gs-type-switch button`, `.gs-badge--pending`, `.gs-badge--done` |
| **TC-GS-16** | Edge | Tạo dirty data → `window.location.href = '/login'` → bắt event `dialog` (beforeunload). Headless có thể không trigger → log warning, không fail | – | `.gs-draft-banner` |
| **TC-GS-17** | Cleanup | Click `.dg-logout-btn` → `.dg-confirm-box` hiện chứa "đăng xuất" → click `.dg-confirm-ok` → redirect `/login` | – | `.dg-logout-btn`, `.dg-confirm-box`, `.dg-confirm-ok` |

### 11.6. Selectors quan trọng

```
# Header & danh sách phân công
.gs-header-title, .gs-header-sub, .gs-card-title
.gs-type-switch button                     // Đại học/Thạc sĩ + Tất cả/Chưa xong/Xong
.gs-assign-item, .gs-assign-name, .gs-assign-ctx-chip, .gs-assign-tpl
.gs-badge--role, --pending, --done
.gs-empty, .gs-placeholder, .gs-assign-skeleton

# Bảng chấm
.gs-table, .gs-table-wrap
.gs-th-name, .gs-th-max
.gs-cover-badge                            // Mã phách
.gs-score-inp                              // Input điểm
.gs-inp-cell.has-error, .gs-inp-err-tip    // Lỗi inline
.gs-total-cell
.gs-status-icon--ok, --dirty
.row-dirty, .row-saved

# Toolbar & action
.gs-toolbar-left
.gs-draft-banner, .gs-dirty-chip, .gs-error-chip
.gs-btn-submit
.gs-overall-progress

# Import Excel
.gs-upload-zone, .gs-upload-text
.gs-import-error
.gs-import-stat--ok, --err, --total
.gs-import-table-wrap

# Lịch sử
.gs-history-wrap, .gs-history-summary, .gs-history-table-wrap

# Logout
.dg-logout-btn, .dg-user-dd-item--danger
.dg-confirm-box, .dg-confirm-ok

# Toast PrimeNG
.p-toast-message-success, .p-toast-message-error, .p-toast-message-warn
```

---

## 12. Hai file setup mock data

### 12.1. `setup-subject-submission-data.spec.ts`

| TC | Mô tả | Yêu cầu |
|----|-------|---------|
| **SETUP-SS-01** | Login `root` qua `loginAsSecretary()`, lưu `secretary-setup-ss-auth.json` | – |
| **SETUP-SS-02** | Vào `/dashboard/exam-schedules` → modal "Thêm kế hoạch" → chọn `HK1` → điền form: `Bài tập lớn Kiểm thử PM`, `CT07`, `BTLKTPM2025`, `3` tín chỉ, `Bài tập lớn`, `x` (online), `01/06/2026 08:00 đến 30/06/2026 23:59` → submit | `HK1` đã tồn tại |
| **SETUP-SS-03** | Filter quyết định + môn vừa tạo → mở chi tiết kế hoạch → nếu thấy nút "Thêm sinh viên" thì thêm `CT070218` (Huỳnh Ngọc Hải, 24/11/2004, CT07) | SETUP-SS-02 đã tạo môn |

### 12.2. `setup-grader-mock-data.spec.ts`

| TC | Mô tả | Account | Lưu ý |
|----|-------|---------|-------|
| **SETUP-01** | Login `root`, lưu `secretary-setup-auth.json` | `root` | – |
| **SETUP-02** | Tạo kế hoạch `Kiểm thử phần mềm` thuộc `HK1`, format `Tự luận`, online, `15/12/2025 08:00 → 15/12/2026 10:00` | `root` | – |
| **SETUP-03** | Vào `/dashboard/exam-rooms`, chọn quyết định + môn → tạo phòng `P102` với mã phách `A5` | `root` | – |
| **SETUP-04** | Lọc đúng kế hoạch, click vào `P102` trong sidebar → "Thêm sinh viên" → `CT070218` | `root` | – |
| **SETUP-05** | Lặp lại bước trên cho 10 sinh viên `CT070201..CT070210` | `root` | Mất ~2 phút |
| **SETUP-06** | Click `P102` → click "Chuyển phách" (active khi đang `THI`) → confirm → badge đổi sang `PHACH` | `root` | – |
| **SETUP-07** | Click icon Sửa trên `P102` → đổi `status` thành `CHAM` → submit (có thể yêu cầu password) → badge đổi sang `CHAM` | `root` | – |
| **SETUP-08** | **Đổi tài khoản**: clear cookies, login `ADMIN_CHAM` → `/dashboard/exam-room-scoring` → lọc → chọn `P102` → "Khởi tạo phiên chấm" → chọn template `Viết 3 câu` → grader 1 = `lamtung` (CB1), grader 2 = `huytq` (CB2) → submit | **`ADMIN_CHAM`** | Phải đổi tài khoản vì chỉ admin chấm mới có quyền |
| **CLEANUP** | Spec riêng `Cleanup Mock Data` → xóa kế hoạch `Kiểm thử phần mềm` để có thể chạy lại setup từ đầu | `root` | Chạy bằng: `npx playwright test setup-grader-mock-data --grep "CLEANUP"` |

> Tổng thời gian setup grader: **~5–8 phút** (do mỗi thao tác đều qua UI thực và có nhiều `waitForTimeout` để chờ Angular render + API response).

---

## 13. Validation tổng hợp

| Module | Field | Rule | Hành vi khi vi phạm | TC liên quan |
|--------|-------|------|---------------------|--------------|
| Kế hoạch thi | `subjectName` | required | Submit disabled | TC-ESM-07 |
| Kế hoạch thi | `clazz` | required | Submit disabled | TC-ESM-08 |
| Kế hoạch thi | `startTimeRaw` | required + pattern `dd/mm/yyyy HH:mm` | Submit disabled, `.f-err` hiện | TC-ESM-09 |
| Kế hoạch thi | `startTimeRaw` | endDate > startDate | `.f-err` "Ngày kết thúc phải sau ngày bắt đầu", submit disabled | TC-ESM-15 |
| Kế hoạch thi | `stopTime` (datepicker) | `[minDate]="initTime"` | Ngày trước initTime bị disabled trong p-calendar | (UI rule – đảm bảo ngầm bởi TC-15) |
| Kế hoạch thi | `startTimeRaw` | auto fill `07:00` khi thiếu giờ | Output có `07:00` | TC-ESM-13 |
| Kế hoạch thi | `startTimeRaw` | hỗ trợ `->`, `tới`, `đến`, thiếu năm | Auto chuẩn hóa thành "Từ ngày ... đến ..." | TC-ESM-14 |
| Nộp bài | `topicId` | required | Toast warn + `.ss-error-text` | TC-SS-10 |
| Nộp bài | `file` | required | Submit disabled | TC-SS-05 |
| Nộp bài | `file` | type = pdf | Toast warn "PDF" | TC-SS-06 |
| Nộp bài | `file` | size ≤ 20 MB | Toast warn "20MB" | TC-SS-07 |
| Chấm điểm | mỗi ô score | not-empty | tooltip "Bắt buộc nhập" | TC-GS-08 |
| Chấm điểm | mỗi ô score | numeric | tooltip "Không hợp lệ" | TC-GS-07 |
| Chấm điểm | mỗi ô score | ≥ 0 | tooltip "Không hợp lệ" | TC-GS-09 |
| Chấm điểm | mỗi ô score | ≤ max cột | tooltip "Tối đa N" | TC-GS-06 |
| Chấm điểm | toàn bảng | mọi ô đều hợp lệ | `.gs-btn-submit` disabled khi có ≥ 1 lỗi | TC-GS-06..09 |

---

## 14. Lệnh chạy

### 14.1. Cài đặt 1 lần

```bash
cd c:\Users\ADMIN\APAG\apag-fe
npm install
npx playwright install chromium
```

### 14.2. Chạy theo flow (đúng thứ tự)

```bash
# === FLOW 1: Quản lý kế hoạch thi (độc lập) ===
npx playwright test exam-schedule-management

# === FLOW 2: Nộp bài tập lớn ===
npx playwright test setup-subject-submission-data        # tạo môn + thêm SV
npx playwright test subject-submission                    # chạy 15 TC

# === FLOW 3: Chấm điểm ===
npx playwright test setup-grader-mock-data                # ~5-8 phút – tạo P102, CHAM, giao grader
# global-setup.ts tự chạy → tạo .auth/grader.json
npx playwright test grader-scoring                        # chạy 17 TC
```

### 14.3. Chạy 1 TC cụ thể

```bash
npx playwright test grader-scoring --grep "TC-GS-05"
npx playwright test exam-schedule-management --grep "TC-ESM-15"
```

### 14.4. Cleanup khi cần làm lại Flow 3

```bash
npx playwright test setup-grader-mock-data --grep "CLEANUP"
```
→ Xóa kế hoạch `Kiểm thử phần mềm` (kéo theo phòng + thí sinh + phiên chấm bị xóa cascade) → có thể chạy lại `setup-grader-mock-data` từ đầu.

### 14.5. Debug

```bash
npx playwright test exam-schedule-management --debug      # mở Inspector
npx playwright show-report                                # xem HTML report
npx playwright show-trace path/to/trace.zip               # xem trace fail
```

---

## 📊 Số liệu tổng hợp

| Hạng mục | Số lượng |
|----------|---------:|
| Spec test chính | 3 |
| Spec setup mock | 2 |
| Helper file | 2 (`auth.helper.ts`, `search-select.helper.ts`) |
| Global setup | 1 (`global-setup.ts`) |
| File cấu hình Playwright | 1 (`playwright.config.ts`) |
| File mock PDF | 3 (`valid.pdf`, `greater-20-mb.pdf`, `change.pdf`) |
| File mock Excel | 3 (`Invalid.xlsx`, `VALID.xlsx`, `INVALID.xlsx`) |
| Tài khoản test | 5 |
| TC `exam-schedule-management` | 16 (TC-ESM-00 → 15) |
| TC `subject-submission` | 15 (TC-SS-01 → 15) |
| TC `grader-scoring` | 17 (TC-GS-01 → 17) |
| TC `setup-grader-mock-data` | 8 (SETUP-01 → 08) + 1 CLEANUP |
| TC `setup-subject-submission-data` | 3 (SETUP-SS-01 → 03) |
| **Tổng test case** | **60** |
