# BÁO CÁO KIỂM THỬ PHẦN MỀM

## Hệ thống: Cổng thông tin Học viện Hành chính và Quản trị Công (APAG)
## URL: https://hcqtc.vn
## Framework kiểm thử: Playwright (End-to-End Automation Testing)
## Ngôn ngữ: TypeScript
## Ngày thực hiện: Tháng 5/2026

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu kiểm thử
Kiểm thử tự động 3 chức năng chính của hệ thống quản lý thi cử trực tuyến:
1. Chức năng Nộp đơn thi trực tuyến & Duyệt đơn (Exam Form Submission & Review)
2. Chức năng Quản lý Kế hoạch thi (Exam Schedule Management)
3. Chức năng Nộp bài tập lớn trực tuyến (Subject Submission)

### 1.2 Phạm vi kiểm thử
- Kiểm thử chức năng (Functional Testing)
- Kiểm thử giao diện người dùng (UI Testing)
- Kiểm thử validation form (Form Validation Testing)
- Kiểm thử luồng nghiệp vụ end-to-end (E2E Flow Testing)
- Kiểm thử negative/boundary (Negative & Boundary Testing)

### 1.3 Môi trường kiểm thử
- Hệ điều hành: Windows 11
- Trình duyệt: Chromium (Playwright built-in)
- Framework: Playwright v1.x
- Ngôn ngữ test script: TypeScript
- Frontend: Angular 16+ với PrimeNG
- Backend: Spring Boot (Java)
- Database: MySQL

### 1.4 Tài khoản kiểm thử
| Role | Username | Mô tả |
|------|----------|--------|
| Sinh viên | CT070218 | Sinh viên lớp CT07, dùng cho nộp đơn & nộp bài |
| Admin/Secretary | lamtung | Quản trị viên, dùng cho duyệt đơn & quản lý kế hoạch thi |

---

## 2. CHỨC NĂNG 1: NỘP ĐƠN THI TRỰC TUYẾN & DUYỆT ĐƠN

### 2.1 Mô tả chức năng
Cho phép sinh viên nộp đơn đăng ký dự thi trực tuyến (VD: Phiếu đăng ký dự thi Công nghệ thông tin, Tiếng Anh bậc 3). Hệ thống render form dạng A4 document với các trường thông tin, ảnh chân dung, chữ ký điện tử. Admin có thể duyệt/từ chối đơn, xuất PDF/ZIP.

### 2.2 Luồng nghiệp vụ
1. Sinh viên đăng nhập → Chọn loại đơn → Điền thông tin → Upload ảnh → Ký tên → Nộp
2. Admin đăng nhập → Tìm đơn → Xem chi tiết → Duyệt/Từ chối → Xuất PDF/ZIP

### 2.3 URL
- Sinh viên: `/dashboard-student/exam-forms`
- Lịch sử đơn: `/dashboard-student/exam-form-history`
- Admin duyệt: `/dashboard/exam-form-review`

### 2.4 Danh sách Test Case

#### Phần 1: Sinh viên nộp đơn (Happy Path)

| Mã TC | Tên Test Case | Mô tả | Kết quả mong đợi |
|--------|--------------|--------|-------------------|
| TC-EFS-01 | Đăng nhập sinh viên | Nhập username/password đúng, nhấn Đăng nhập | Chuyển hướng đến dashboard sinh viên |
| TC-EFS-02 | Hiển thị danh sách loại đơn | Truy cập trang nộp hồ sơ | Hiển thị tiêu đề "Nộp hồ sơ trực tuyến", danh sách loại đơn > 0 |
| TC-EFS-03 | Chọn loại đơn CNTT | Tìm kiếm "CÔNG NGHỆ THÔNG TIN", click chọn, nhấn Tiếp tục | Card được highlight, chuyển sang step 2 với banner hiển thị tên đơn |
| TC-EFS-04 | Điền thông tin + upload ảnh + ký tên | Điền 10 trường text, upload 2 ảnh 3x4, vẽ chữ ký | Tất cả input được fill, ảnh hiển thị preview, chữ ký hiển thị |
| TC-EFS-05 | Nộp hồ sơ thành công | Điền đầy đủ → nhấn "Nộp hồ sơ ngay" | Chuyển sang step 3, hiển thị "Nộp hồ sơ thành công!", card chi tiết đơn |
| TC-EFS-05B | Xem chi tiết đơn trong lịch sử | Navigate sang lịch sử, click Chi tiết | Dialog hiển thị thông tin đơn đầy đủ |
| TC-EFS-05C | Tải PDF đơn từ lịch sử | Mở chi tiết → click "Tải PDF" | File PDF được download thành công |
| TC-EFS-06 | Đăng xuất sinh viên | Click menu user → Đăng xuất | Chuyển về trang login |

#### Phần 1B: Kiểm thử Negative — Validation

| Mã TC | Tên Test Case | Mô tả | Kết quả mong đợi |
|--------|--------------|--------|-------------------|
| TC-EFS-N01 | Chưa chọn loại đơn | Không click chọn loại đơn nào | Nút "Tiếp tục hồ sơ" bị disabled |
| TC-EFS-N02 | Bỏ trống toàn bộ | Chọn loại đơn, không điền gì | Nút "Nộp hồ sơ ngay" bị disabled |
| TC-EFS-N03 | Chỉ điền 1-2 trường | Điền Nam/Nữ và Dân tộc, bỏ trống còn lại | Nút submit disabled |
| TC-EFS-N04 | Thiếu ảnh chân dung | Điền đủ text + ký tên, không upload ảnh | Nút submit disabled |
| TC-EFS-N05 | Thiếu ảnh chân dung 2 | Điền đủ + ký + upload ảnh 1, thiếu ảnh 2 | Nút submit disabled |
| TC-EFS-N06 | Nút Quay lại | Ở step 2, nhấn "Quay lại" | Quay về step 1, hiển thị danh sách loại đơn |
| TC-EFS-N07 | Tìm kiếm không tồn tại | Nhập từ khóa random vào ô tìm kiếm | Hiển thị "Không tìm thấy loại hình đơn phù hợp" |
| TC-EFS-N08 | Thiếu trường Nơi sinh | Điền tất cả trừ Nơi sinh + ký + ảnh | Nút submit disabled, input Nơi sinh có viền đỏ |
| TC-EFS-N09 | Thiếu trường Email | Điền tất cả trừ Email + ký + ảnh | Nút submit disabled |
| TC-EFS-N10 | Xóa ảnh đã upload | Upload 2 ảnh → xóa ảnh 1 | Nút submit disabled trở lại |

#### Phần 2: Admin duyệt đơn (Happy Path)

| Mã TC | Tên Test Case | Mô tả | Kết quả mong đợi |
|--------|--------------|--------|-------------------|
| TC-EFS-07 | Đăng nhập admin | Nhập tài khoản admin | Chuyển hướng đến dashboard admin |
| TC-EFS-08 | Tìm đơn vừa nộp | Nhập mã SV CT070218, nhấn Tìm kiếm | Hiển thị đơn CNTT trong bảng |
| TC-EFS-09 | Mở chi tiết đơn | Click "Chi tiết" trên dòng đầu | Dialog hiển thị thông tin sinh viên + nội dung đơn |
| TC-EFS-09B | Tải PDF từ admin | Mở chi tiết → click "Xuất PDF" | File PDF download thành công |
| TC-EFS-09C | Tải ZIP từ admin | Mở chi tiết → click "Xuất ZIP" | File ZIP download thành công |
| TC-EFS-10 | Duyệt đơn (APPROVED) | Chọn "Đồng ý duyệt" → Xác nhận | Đơn chuyển trạng thái APPROVED |
| TC-EFS-11 | Đăng xuất admin | Click Đăng xuất | Chuyển về login |

#### Phần 2B: Admin Negative

| Mã TC | Tên Test Case | Mô tả | Kết quả mong đợi |
|--------|--------------|--------|-------------------|
| TC-EFS-N11 | Từ chối đơn với lý do | Chọn "Từ chối" + điền ghi chú | Đơn chuyển REJECTED, ghi chú được lưu |
| TC-EFS-N12 | Tìm mã SV không tồn tại | Nhập "MAKHONGTONTAI999" | Hiển thị "Không có đơn nào" |
| TC-EFS-N13 | Lọc kết hợp không kết quả | Mã SV sai + trạng thái CANCELLED | Danh sách trống |
| TC-EFS-N14 | Nút Xóa lọc | Điền bộ lọc → nhấn "Xóa lọc" | Tất cả field reset về rỗng |
| TC-EFS-N15 | Đóng dialog bằng nút X | Mở chi tiết → click X | Dialog biến mất |

### 2.5 Validation đặc biệt
- Email: Phải có format hợp lệ (VD: ten@gmail.com). Hiển thị lỗi đỏ nếu sai.
- Số điện thoại: Phải bắt đầu bằng 0, chỉ chứa số, 10-11 ký tự. Hiển thị lỗi đỏ nếu sai.
- Trường bắt buộc: Khi focus rồi blur mà không điền → hiển thị tooltip đỏ "Vui lòng nhập {tên trường}".
- Ảnh chân dung: Bắt buộc upload 2 ảnh 3x4 cm.
- Chữ ký: Phải vẽ cả ký tên + ghi rõ họ tên trên 2 canvas riêng.

---

## 3. CHỨC NĂNG 2: QUẢN LÝ KẾ HOẠCH THI

### 3.1 Mô tả chức năng
Cho phép Secretary/Admin tạo, sửa, xóa kế hoạch thi theo quyết định. Hỗ trợ import Excel, phân trang, sắp xếp, ẩn/hiện cột, xem chi tiết danh sách thí sinh, xuất Excel, sync bản mã.

### 3.2 URL
- `/dashboard/exam-schedules`

### 3.3 Danh sách Test Case

| Mã TC | Tên Test Case | Loại | Mô tả | Kết quả mong đợi |
|--------|--------------|------|--------|-------------------|
| TC-ESM-00 | Đăng nhập Secretary | Setup | Đăng nhập và lưu session | Redirect dashboard |
| TC-ESM-01 | Hiển thị trang ban đầu | Happy | Kiểm tra title, nút, filter bar | Hiển thị đầy đủ UI elements |
| TC-ESM-02 | Tìm kiếm theo quyết định | Happy | Chọn quyết định → load data | Bảng hiển thị kế hoạch thi hoặc empty state |
| TC-ESM-03 | Thêm mới kế hoạch thi | Happy | Chọn QĐ → điền form → submit | Record mới xuất hiện trong bảng |
| TC-ESM-04 | Hủy xóa kế hoạch thi | Happy | Click Xóa → Hủy | Record vẫn còn nguyên |
| TC-ESM-05 | Sửa thông tin | Happy | Mở form sửa → đổi tên → Cập nhật | Tên mới hiển thị trong bảng |
| TC-ESM-06 | Xóa kế hoạch thi | Happy | Click Xóa → Xác nhận | Record biến mất khỏi bảng |
| TC-ESM-07 | Bỏ trống tên môn học | Negative | Không điền tên môn | Nút submit disabled |
| TC-ESM-08 | Bỏ trống lớp | Negative | Không điền lớp | Nút submit disabled |
| TC-ESM-09 | Thời gian sai format | Negative | Nhập "ngày 01 tháng 12 năm 2025" | Nút disabled + hiện lỗi "dd/mm/yyyy HH:mm" |
| TC-ESM-10 | Điền đầy đủ đúng format | Happy | Điền đủ 3 trường bắt buộc | Nút submit enabled |
| TC-ESM-11 | Ẩn/hiện cột | UI | Mở panel → Ẩn tất cả → Đóng | Panel hoạt động đúng |
| TC-ESM-12 | Phân trang | UI | Đổi 5 dòng/trang → chuyển trang | Dữ liệu thay đổi đúng |
| TC-ESM-13 | Auto-fill giờ 07:00 | Happy | Nhập "Từ ngày 13/05/2026 tới 25/12/2027" | Tự format thành "13/05/2026 07:00 đến 25/12/2027 07:00" |
| TC-ESM-14 | Format linh hoạt | Happy | Nhập "14/05 00:00 -> 15/05 23:59" | Tự thêm năm hiện tại + format chuẩn |
| TC-ESM-15 | Ngày kết thúc trước ngày bắt đầu | Negative | Nhập "25/12/2026 đến 01/01/2026" | Hiện lỗi "Ngày kết thúc phải sau ngày bắt đầu", submit disabled |

### 3.4 Tính năng đặc biệt được kiểm thử
- Auto-parse thời gian: Hỗ trợ nhiều format nhập liệu (dấu "đến", "->", "tới", thiếu năm, thiếu giờ)
- Validation ngày: Ngày kết thúc phải sau ngày bắt đầu
- minDate trên date picker: Khi chọn ngày bắt đầu, ngày kết thúc tự disable các ngày trước đó
- Column selector: Ẩn/hiện cột linh hoạt
- Inline confirm: Xác nhận xóa ngay trong bảng

---

## 4. CHỨC NĂNG 3: NỘP BÀI TẬP LỚN TRỰC TUYẾN

### 4.1 Mô tả chức năng
Cho phép sinh viên nộp bài tập lớn (file PDF) cho các môn thi online. Hỗ trợ chọn chủ đề, validate file (định dạng, dung lượng), xem lịch sử, xóa bài nộp.

### 4.2 URL
- Nộp bài: `/dashboard-student/subjects`
- Lịch sử: `/dashboard-student/history`

### 4.3 Danh sách Test Case

| Mã TC | Tên Test Case | Loại | Mô tả | Kết quả mong đợi |
|--------|--------------|------|--------|-------------------|
| TC-SS-01 | Đăng nhập sinh viên | Setup | Đăng nhập CT070218 | Redirect dashboard-student/subjects |
| TC-SS-02 | Hiển thị danh sách môn thi | Happy | Truy cập trang | Bảng hiển thị danh sách môn |
| TC-SS-03 | Xem chi tiết môn thi | Happy | Click nút View | Modal hiển thị "Chi tiết môn thi" |
| TC-SS-04 | Mở form nộp bài | Happy | Click nút Submit | Modal hiển thị form với dropdown 10 chủ đề, dropzone file |
| TC-SS-05 | Nút Nộp bài disabled | Negative | Mở form, không chọn file | Nút "Nộp bài" disabled |
| TC-SS-06 | Validate định dạng file | Negative | Upload file .xlsx | Toast cảnh báo "PDF" |
| TC-SS-07 | Validate dung lượng > 20MB | Negative | Upload file > 20MB | Toast cảnh báo "20MB" |
| TC-SS-08 | Chọn file PDF hợp lệ | Happy | Upload valid.pdf | Hiển thị "Sẵn sàng nộp", nút enabled |
| TC-SS-09 | Thay đổi/xóa file | Happy | Upload → đổi file → xóa | File card biến mất, dropzone hiện lại |
| TC-SS-10 | Validate chủ đề bắt buộc | Negative | Chọn file nhưng không chọn chủ đề → Nộp | Toast "chủ đề", error text hiển thị |
| TC-SS-11 | Nộp bài thành công | Happy | Chọn chủ đề + file → Nộp | Toast success, processing toast |
| TC-SS-12 | Xóa bài từ lịch sử | Happy | Vào lịch sử → Xóa → Xác nhận | Toast success |
| TC-SS-13 | Trạng thái sau xóa | Happy | Quay lại danh sách môn | Nút submit hiện lại (chưa nộp) |
| TC-SS-14 | Dialog hỗ trợ | UI | Click Help → đóng | Modal mở/đóng đúng |
| TC-SS-15 | Đăng xuất | Happy | Click Đăng xuất → Xác nhận | Redirect /login |

### 4.4 Dữ liệu kiểm thử (Mock Files)
| File | Đường dẫn | Mục đích |
|------|-----------|----------|
| valid.pdf | e2e/mock-file/valid.pdf | File PDF hợp lệ < 20MB |
| greater-20-mb.pdf | e2e/mock-file/greater-20-mb.pdf | File quá dung lượng |
| Invalid.xlsx | e2e/mock-file/Invalid.xlsx | File sai định dạng |
| change.pdf | e2e/mock-file/change.pdf | File thay thế |

---

## 5. TỔNG KẾT

### 5.1 Thống kê Test Case

| Chức năng | Happy Path | Negative | UI/Boundary | Tổng |
|-----------|-----------|----------|-------------|------|
| Nộp đơn thi & Duyệt | 13 | 15 | 0 | 28 |
| Quản lý Kế hoạch thi | 9 | 4 | 2 | 15 |
| Nộp bài tập lớn | 9 | 4 | 2 | 15 |
| **Tổng cộng** | **31** | **23** | **4** | **58** |

### 5.2 Kỹ thuật kiểm thử áp dụng
1. **Equivalence Partitioning**: Chia dữ liệu thành nhóm hợp lệ/không hợp lệ (email đúng/sai, file PDF/non-PDF)
2. **Boundary Value Analysis**: Kiểm tra giới hạn (file đúng 20MB, số điện thoại 9/10/11/12 số)
3. **State Transition Testing**: Kiểm tra chuyển trạng thái (PENDING → APPROVED/REJECTED, step 1 → 2 → 3)
4. **Error Guessing**: Dự đoán lỗi phổ biến (bỏ trống field, ngày ngược, mã SV không tồn tại)
5. **End-to-End Testing**: Kiểm tra luồng hoàn chỉnh từ đăng nhập đến kết quả cuối cùng

### 5.3 Công cụ sử dụng
- **Playwright**: Framework kiểm thử tự động E2E, hỗ trợ multi-browser
- **TypeScript**: Ngôn ngữ viết test script, type-safe
- **Node.js**: Runtime environment
- **VS Code / Kiro**: IDE phát triển test

### 5.4 Cách chạy kiểm thử
```bash
# Cài đặt dependencies
npm install

# Chạy từng chức năng
npx playwright test exam-form-submission --headed
npx playwright test exam-schedule-management --headed
npx playwright test subject-submission --headed

# Chạy setup mock data trước khi test nộp bài
npx playwright test setup-subject-submission-data --headed

# Chạy tất cả
npx playwright test --headed
```

### 5.5 Cấu trúc thư mục kiểm thử
```
e2e/
├── exam-form-submission.spec.ts      # 28 TC - Nộp đơn thi & Duyệt
├── exam-schedule-management.spec.ts  # 15 TC - Quản lý Kế hoạch thi
├── subject-submission.spec.ts        # 15 TC - Nộp bài tập lớn
├── setup-subject-submission-data.spec.ts  # Setup mock data
├── helpers/
│   └── auth.helper.ts                # Helper đăng nhập & test data
├── images/
│   ├── anh_ho_so_1.jpg              # Ảnh chân dung 1
│   ├── anh_ho_so_2.jpg              # Ảnh chân dung 2
│   ├── anh_ho_so_3.jpg              # Ảnh đính kèm
│   └── signature.png                 # Chữ ký điện tử
├── mock-file/
│   ├── valid.pdf                     # PDF hợp lệ
│   ├── greater-20-mb.pdf            # PDF quá dung lượng
│   ├── Invalid.xlsx                  # File sai định dạng
│   └── change.pdf                    # PDF thay thế
└── downloads/                        # Thư mục lưu file tải về khi test
```

---

## 6. PHỤ LỤC

### 6.1 Nguyên tắc thiết kế Test Case
- Mỗi TC kiểm tra đúng 1 điều kiện (Single Assertion Principle)
- TC chạy tuần tự (serial mode) để TC sau kế thừa dữ liệu TC trước
- Session được lưu và tái sử dụng để tránh đăng nhập lại mỗi TC
- Sử dụng waitForTimeout hợp lý để chờ Angular render
- Fallback mechanism cho các thao tác không ổn định (inject signature)

### 6.2 Phân loại kết quả
- ✅ PASS: Test case thực hiện đúng kết quả mong đợi
- ❌ FAIL: Test case cho kết quả khác mong đợi → phát hiện bug
- ⚠️ SKIP: Test case bị bỏ qua do thiếu dữ liệu hoặc điều kiện tiên quyết

### 6.3 Thông tin hệ thống được kiểm thử
- Tên hệ thống: Cổng thông tin APAG
- Phiên bản: Production (hcqtc.vn)
- Frontend: Angular 16+ / PrimeNG / SCSS
- Backend: Spring Boot / Java 17
- Database: MySQL 8
- Storage: Google Drive API (lưu file đính kèm)
- Authentication: JWT Token-based
