# SMOS – Yêu cầu màn hình (Screen Requirements)

> Tổng hợp toàn bộ màn hình của SMOS CRM, suy ra từ wireframe (`web/src/screens`), `docs/api-design.md`, `schema.txt`. Mỗi màn: mục đích, thành phần chính, data/API, dialog, permission, open question. Dùng kèm `docs/tech-spec-CP01-company-list.md` (Tech Spec mẫu cho 1 story).

Quy ước: 🔴 chặn (cần làm rõ/sửa trước khi code) · 🟡 cân nhắc · 🟢 lưu ý.

---

## 0. Bản đồ màn hình

| ID | Màn hình | Route | Nhóm | Trạng thái |
| --- | --- | --- | --- | --- |
| LG01 | テナント認証 (Access code) | `/access` | Auth | Wireframe có |
| LG02 | ログイン (Login) | `/login` | Auth | Wireframe có |
| CP01 | 会社一覧・詳細 | `/company` | Nghiệp vụ | Wireframe có · Tech Spec ✅ |
| CT01 | 担当者一覧・詳細 | `/contact` | Nghiệp vụ | Wireframe có |
| AT01 | 活動一覧・詳細 | `/activity` | Nghiệp vụ | Wireframe có |
| PR01 | 案件一覧・詳細 | `/project` | Nghiệp vụ | Wireframe có · 🔴 chờ DB |
| ST01 | 列の設定 (Column settings) | dialog | Cấu hình | Wireframe (localStorage) |
| MS01 | 各種マスター (General master) | dialog/screen | Master | Wireframe có |
| US01 | 社員マスター (Employee master) | dialog | Quản trị | Wireframe có |
| RL01 | 権限・グループ (Roles & permissions) | dialog | Quản trị | 🟡 cần dựng |
| PW01 | パスワード設定 (Change password) | dialog | Cá nhân | Wireframe có |
| TN01 | テナント・会社マスタ (System admin) | `/tenant` | System admin | Wireframe có |

Shell chung: **Sidebar** (会社/担当/活動/案件 + Settings menu) + **Topbar** (breadcrumb, ngày, user menu) — `web/public/components/layout.html`.

---

## 1. LG01 – テナント認証 (Access code)

- **Mục đích**: nhập access code = `tenants.login_code` để xác định tenant trước khi login.
- **Thành phần**: input access code, nút 次へ, error inline (404 không tồn tại / 403 inactive).
- **API**: `POST /auth/access` → `{ tenant_id, tenant_name, is_active }` (api-design §1.1).
- **State**: lưu tạm `access_code` + `tenant_name` để hiển thị ở LG02.
- **Open Q**: nhớ tenant cho lần sau (cookie/localStorage)?

## 2. LG02 – ログイン (Login)

- **Mục đích**: đăng nhập trong tenant đã chọn.
- **Thành phần**: hiển thị tenant_name (read-only), input `login_id`, `password` (toggle hiện/ẩn), checkbox `remember`, nút ログイン (loading state), shake animation khi sai.
- **API**: `POST /auth/login` → `{ access_token, refresh_token, expires_in, user{...permissions} }` (api-design §1.2).
- **Sau login**: lưu token (localStorage `mh_access_token/mh_refresh_token/mh_expires_at`), load `user.permissions` → quyết định menu/route guard, điều hướng `/company`.
- **Error**: 401 sai mật khẩu; 403 tenant/đa user khoá.

---

## 3. CP01 – 会社一覧・詳細 → xem `docs/tech-spec-CP01-company-list.md`

Tóm tắt thành phần: search header (会社名 + advanced + 新規), toolbar (列設定/CSV/一括削除), AG Grid (12 cột, filter/sort/resize/reorder), pager (10/25/50/100), detail panel 4 tab (会社詳細/担当者/活動/案件), dialog tạo + advanced search + column settings + confirm delete.

---

## 4. CT01 – 担当者一覧・詳細

- **Mục đích**: quản lý người liên hệ thuộc công ty.
- **Search header**: 会社名 + 担当者名 + advanced search.
- **Grid** (13 cột): company_id, 会社名(join), 部署, 姓, 名, フリガナ, TEL, 携帯, Email, 職種, 職位, 役職名, 住所. Filter set theo 職種/職位; resize/reorder; keyboard navigation.
- **Detail tab**: 基本情報 | 活動 | 案件.
  - 基本情報: form (姓*,名*,フリガナ, 会社 lookup + 新規会社, 部署, TEL/内線/FAX/携帯, Email, 職種/職位/役職, 備考). Nút 保存/削除/コピー新規/新規活動/新規案件.
  - 活動 tab: bảng inline-edit (dblclick) + quick-add row.
  - 案件 tab: bảng read-only.
- **API**: `/contacts` (CRUD + bulk_delete + export/import); `filters[company_id, job_category, job_rank]`, `q` theo 姓+名+会社名. Tab: `/activities?filters[contact_id]=`, `/projects?filters[contact_id]=` (api-design §3).
- **Permission**: `contact.*`.
- **Open Q**: inline-edit tab 活動 ghi nhận qua `PATCH /activities/:id` ngay hay gom lưu?

## 5. AT01 – 活動一覧・詳細

- **Mục đích**: nhật ký hoạt động (TEL/訪問/メール/Web面談/その他).
- **Search header**: タイプ (dropdown) + 営業担当 + 会社 + 活動日 range + advanced.
- **Grid** (≥7 cột hiển thị, master 66 cột): 活動日, 時刻, 営業担当, タイプ(badge), 会社, 担当(姓), コメント. Filter set theo 担当/タイプ; context menu copy/新規.
- **Detail form**: 活動ID, タイプ(select), 目的, 担当者 lookup + 新規, 営業担当(select), 案件名 lookup, 活動日, コメント, 会社名. Đính kèm file. Nút 保存/削除.
- **API**: `/activities` (CRUD + bulk_delete + export/import); `filters[act_type, user_id, company_id, contact_id, project_id]`, range `act_date` (api-design §5). Tạo từ company/contact/project → seed FK + `project_name` snapshot.
- **🟡 DB gap (db-notes #7)**: `面談人数 (attendee_count)` và `リードID` UI có nhưng schema chưa có → cần bổ sung cột hoặc bỏ khỏi UI.
- **Permission**: `activity.*`.

## 6. PR01 – 案件一覧・詳細  🔴 (chờ mở rộng DB)

- **Mục đích**: quản lý dự án / cơ hội bán hàng.
- **Search header**: ステータス + 会社 + 営業担当 + 日付 range + advanced.
- **Grid** (9 cột): 案件化日, フォロー予定, ステータス, 営業担当, 会社, 担当, 案件名, 概要, 発生動機. Filter set theo status/rep/company/contact/motivation; date filter.
- **Detail tab**: 詳細 | 活動.
  - 詳細: 案件ID, 案件名*, ステータス, 営業担当, 会社/担当 (lookup + 新規), 概要, 案件化日, フォロー予定, ステージ1〜4 (checkbox). Đính kèm. 保存/削除.
  - 活動 tab: bảng inline-edit + quick-add.
- **API**: `/projects` (CRUD + change_stage + bulk_delete + export/import); `filters[status, user_id, company_id, contact_id]`, range ngày (api-design §4). Tab 活動: `/activities?filters[project_id]=`.
- **🔴 DB gap (db-notes #1/#5/#6)**: bảng `projects` thiếu nhiều cột UI cần — `motivation, inquiry_method, competitor, accuracy_initial/revised, các mốc 案件化/受注/失注, 予実 (予定/実績 機種/台数/売上/時期)`, và **bảng nối project↔stage** (thay cho stage1..4 cứng). **Cần chốt schema trước khi viết Tech Spec chi tiết & code PR01.**
- **Permission**: `project.*`.

---

## 7. Cấu hình & Master

### ST01 – 列の設定 (Column settings)
- Chọn cột hiển thị + thứ tự cho từng lưới (会社/担当/活動/案件).
- **API mục tiêu**: `GET/PUT/DELETE /field_settings?target_model=company` (api-design §8). Hiện wireframe lưu **localStorage**.
- **🟡 DB gap (db-notes #8)**: `user_field_settings` thiếu chiều `screen_key/submenu` → cùng model hiển thị ở nhiều submenu không phân biệt được. Cần chốt: dùng chung hay tách theo submenu.

### MS01 – 各種マスター (General master)
- CRUD 8+ loại option: 業種/業界/規模/種別/職種/職位/発生動機/活動目的 (+ đề xuất: area/案件ステータス/引合手段/活動タイプ/確度 — db-notes #3).
- Thành phần: chọn `option_type`, list theo `sort_order`, thêm/sửa/xoá-mềm, **kéo-thả reorder**.
- **API**: `/mst_options` (+ `PUT /reorder`), `/project_stages` (api-design §9).

### US01 – 社員マスター (Employee master)
- CRUD user trong tenant; assign `role_id`; reset password.
- **API**: `/users` (+ `PATCH /:id/password`) (api-design §10).
- **🔴 DB gap (db-notes #9)**: `users` thiếu `department`, `email`, `last_login_at` mà UI hiển thị → cần thêm cột.

### RL01 – 権限・グループ (Roles & permissions)  🟡
- CRUD role; gán `permission_key[]` / `full_permission`.
- **API**: `/roles` (+ `PUT /:id/permissions`), `/permission_keys` (api-design §11).
- **🔴 Risk (BE.md §11)**: BE hiện **chưa enforce** permission ở controller → cần bổ sung trước khi tin cậy phân quyền.

### PW01 – パスワード設定 (Change password)
- Form current/new/confirm.
- **API**: `PATCH /auth/password` (api-design §1.6).

---

## 8. TN01 – テナント・会社マスタ (System Admin)

- **Realm riêng**: đăng nhập bằng `system_admins` (login_code + password), không truy cập dữ liệu tenant.
- **Mục đích**: quản lý tenant (tạo/sửa/bật-tắt) + tài khoản admin đầu tiên của tenant.
- **Thành phần**: search (tenant id/name/status), list tenant, dialog 詳細 (name/code/active), dialog tài khoản admin (code/name/kana/dept/login/password toggle/最終ログイン).
- **API**: `POST /system/auth/login`, `/system/tenants` (CRUD), `/system/tenants/:id/admin_user` (api-design §12).
- **🔴 DB gap (db-notes #9)**: dialog admin hiển thị `email`/`last_login_at`/`department` mà `users` chưa có cột.

---

## 9. Thành phần dùng chung (mọi màn list+detail)

| Thành phần | Mô tả |
| --- | --- |
| Search header | quick search + advanced search dialog |
| AG Grid | sort, per-column filter (set/text/date), resize, reorder, cell copy, context menu |
| Pager | first/prev/next/last + page-size (10/25/50/100) + meta total |
| Detail panel | tabs + form (RHF+Zod) + audit read-only + actions |
| Tab quan hệ | nested grid + pager con; click link → cross-screen prefilter |
| Dialog tạo | reuse field của detail form; seed FK khi tạo từ entity cha |
| Lookup dialog | chọn company/contact/project |
| Attachment | dropzone → `/:resource/:id/documents` (api-design §6) |
| Toast | xác nhận thành công/lỗi (Sonner) |
| Confirm delete | xoá đơn / bulk |

---

## 10. Tổng hợp Open Questions / Risks toàn hệ thống

| No | Vấn đề | Màn ảnh hưởng | Owner | Mức |
| --- | --- | --- | --- | --- |
| 1 | BE chưa enforce permission (`role_permissions`) | Tất cả | BE / TL | 🔴 |
| 2 | `projects` thiếu nhiều cột + bảng nối stage | PR01 | BE / BA | 🔴 |
| 3 | `users` thiếu `department/email/last_login_at` | US01, TN01 | BE | 🔴 |
| 4 | `district` (地区) nghĩa & master hoá | CP01 | BA / BE | 🔴 |
| 5 | `activities` thiếu `attendee_count`, リードID | AT01 | BE / BA | 🟡 |
| 6 | `user_field_settings` thiếu chiều submenu | ST01 | BE / TL | 🟡 |
| 7 | Bổ sung `mst_options` cho area/status/method/type/accuracy | MS01, CP01, PR01, AT01 | BA / BE | 🟡 |
| 8 | Nhãn free field theo tenant (custom_field_defs)? | CP01, CT01… | BA | 🟡 |
| 9 | Stack production = Next.js (FE.md); wireframe `web/src` vanilla JS chỉ tham chiếu | Tất cả | TL | 🟢 |
| 10 | Conflict đồng thời (2 user sửa 1 record) → 409 theo `updated_at`? | Tất cả detail | BE | 🟡 |

> Ưu tiên chốt #1–#4 (🔴) trước khi code API/PR01.
