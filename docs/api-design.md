# SMOS – Đặc tả API (Backend Rails)

> Tài liệu mô tả toàn bộ đầu API cần thiết để chạy UI web/mobile đã chốt, suy ra từ wireframe (`web/src`) và schema DB (`schema.txt`).
> Field trong request/response đặt tên theo **cột DB** (snake_case). Nhãn tiếng Nhật để trong ngoặc để dễ map với màn hình.
> Phần đề xuất chỉnh sửa DB nằm riêng ở `docs/db-notes.md`.

---

## 0. Quy ước chung

### Base URL
```
/api/v1
```

### Định dạng & header
- `Content-Type: application/json` (trừ upload file dùng `multipart/form-data`).
- `Authorization: Bearer <access_token>` cho mọi API cần đăng nhập.
- Mọi response bọc theo chuẩn:

```jsonc
// Thành công - 1 bản ghi
{ "data": { ... } }

// Thành công - danh sách
{
  "data": [ ... ],
  "meta": { "page": 1, "per_page": 50, "total": 1234, "total_pages": 25 }
}

// Lỗi
{
  "error": {
    "code": "validation_error",       // unauthorized | forbidden | not_found | validation_error | conflict ...
    "message": "Thông báo chung",
    "details": { "name": ["を入力してください"] }  // lỗi theo field (optional)
  }
}
```

### Multi-tenant
- `tenant_id` **KHÔNG** nhận từ client. Server lấy từ JWT (claim `tenant_id`) và tự scope mọi query.
- Tài khoản **system admin** (bảng `system_admins`) là realm riêng, chỉ dùng cho nhóm API `/system/*` (quản lý tenant). Không truy cập dữ liệu nghiệp vụ của tenant.

### Phân trang / sắp xếp / tìm kiếm (áp dụng cho mọi endpoint LIST)
| Query param | Kiểu | Mô tả |
|---|---|---|
| `page` | int | Mặc định 1 |
| `per_page` | int | Mặc định 50 (UI cho chọn 10/25/50/100) |
| `sort` | string | Tên cột, ví dụ `name` |
| `order` | `asc`\|`desc` | Mặc định `asc` |
| `q` | string | Từ khoá tìm nhanh (full-text các cột chính) |
| `filters[<field>]` | string/array | Lọc theo cột. VD `filters[industry]=製造業`, `filters[status][]=受注&filters[status][]=商談中` |
| `filters[<field>][from]` / `[to]` | date | Lọc khoảng ngày. VD `filters[act_date][from]=2026-01-01` |

### Mã trạng thái HTTP
`200` OK · `201` Created · `204` No Content · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `422` Unprocessable Entity.

---

## 1. Xác thực (Auth) – user trong tenant

UI có 2 bước: **LG01 nhập access code (= `tenants.login_code`)** → **LG02 nhập login id + password**.

### 1.1 Kiểm tra access code (テナント認証)
```
POST /api/v1/auth/access
```
Request:
```json
{ "access_code": "KH-8821-X" }
```
Response 200:
```json
{ "data": { "tenant_id": 1, "tenant_name": "株式会社 建設第一", "is_active": true } }
```
- 404 nếu không tồn tại, 403 nếu `is_active = false`.
- Trả `tenant_id`/`tenant_name` để bước login hiển thị và gắn kèm.

### 1.2 Đăng nhập (ログイン)
```
POST /api/v1/auth/login
```
Request:
```json
{ "access_code": "KH-8821-X", "login_id": "yamada.kenichi", "password": "secret", "remember": true }
```
Response 200:
```json
{
  "data": {
    "access_token": "<JWT>",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "<opaque>",
    "user": {
      "id": 12, "login_id": "yamada.kenichi", "user_name": "山田 健一",
      "user_kana": "ヤマダ ケンイチ", "is_admin_default": false,
      "role": { "id": 3, "name": "一般ユーザー", "is_admin": false },
      "permissions": { "full_permission": false, "permission_key": ["company.read", "..."] },
      "tenant": { "id": 1, "name": "株式会社 建設第一" }
    }
  }
}
```
- `refresh_token` lưu vào bảng `refresh_tokens` (token_digest, session_id, expires_at). `remember=true` → expires_at dài hơn.

### 1.3 Refresh token
```
POST /api/v1/auth/refresh
```
Request: `{ "refresh_token": "<opaque>" }` → Response giống 1.2 (access_token mới, có thể rotate refresh_token).

### 1.4 Đăng xuất (終了)
```
DELETE /api/v1/auth/logout
```
- Đưa `jti` của access token vào `jwt_denylist`, set `revoked_at` cho refresh_token. Response 204.

### 1.5 Thông tin user hiện tại
```
GET /api/v1/auth/me
```
Response: object `user` như 1.2 (UI topbar hiển thị tên + email).

### 1.6 Đổi mật khẩu (パスワード設定)
```
PATCH /api/v1/auth/password
```
Request: `{ "current_password": "...", "new_password": "...", "new_password_confirmation": "..." }` → 204.

---

## 2. Companies (会社) – `/api/v1/companies`

### Object `company`
```jsonc
{
  "id": 1141,
  "name": "旭川エレクトロニクスサービス株式会社",   // 会社名 *
  "tel": "077-589-2569",                            // 代表TEL
  "fax": "089-5996-4084",                           // 代表FAX
  "post_code": "7059306",                           // 郵便番号
  "prefecture": "北海道",                            // 都道府県
  "district": "関東",                                // 地区 (xem db-notes #2)
  "address": "北海道旭川市東区4丁目18-30",            // 住所
  "industry": "製造業",                              // 業界
  "industry_type": "金属製品",                       // 業種
  "scale_rank": "1～30人",                           // 規模ランク
  "company_type": "その他",                          // 種別
  "corporate_num": "0209176547839",                 // 法人番号
  "employee_count": 1909,                            // 従業員数
  "fiscal_closing_month": 9,                         // 決算月
  "revenue": 11,                                     // 売上高(百万円)
  "capital": "10000.00",                             // 資本金額(百万円)
  "is_brochure_forbidden": false,                    // 資料禁止
  "is_tel_forbidden": false,                         // TEL禁止
  "notes": "主要取引先：旭川重工",                    // 会社備考
  "custom_fields": { "free1": "", "free2": "" },     // 会社自由使用欄1～7 (xem db-notes #4)
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-20T15:30:00Z"
}
```

### Endpoints
| Method | Path | Mô tả | I/O |
|---|---|---|---|
| GET | `/companies` | Danh sách (列一覧 CP01) | Query chuẩn §0. `filters[industry,industry_type,scale_rank,company_type,district,prefecture]`. Trả `data[] + meta` |
| GET | `/companies/:id` | Chi tiết | → `company` |
| POST | `/companies` | Tạo mới | Body = company (không có id/audit). 201 → `company` |
| PATCH | `/companies/:id` | Sửa | Body field cần sửa. → `company` |
| DELETE | `/companies/:id` | Xoá | 204 |
| POST | `/companies/bulk_delete` | Xoá nhiều (chọn checkbox) | `{ "ids": [1,2,3] }` → 204 |
| GET | `/companies/export` | Xuất CSV | Nhận cùng filter của list, trả `text/csv` |
| POST | `/companies/import` | Nhập CSV | `multipart` file → `{ "data": { "created": n, "updated": n, "errors": [...] } }` |

### Tab trong màn chi tiết công ty
UI chi tiết công ty có tab 担当者 / 活動 / 案件. Dùng lại list endpoint của entity con với filter:
```
GET /api/v1/contacts?filters[company_id]=1141
GET /api/v1/activities?filters[company_id]=1141
GET /api/v1/projects?filters[company_id]=1141
```

---

## 3. Contacts (担当者) – `/api/v1/contacts`

### Object `contact`
```jsonc
{
  "id": 10001,
  "company_id": 1141,                          // 会社ID *
  "company_name": "旭川エレクトロニクス...",    // (read-only, join từ companies)
  "department": "ロジスティクス部",             // 部署名
  "last_name": "渡辺",                          // 担当(姓) *
  "first_name": "沙織",                         // 担当(名) *
  "last_name_kana": "ワタナベ",                 // フリガナ(姓)
  "first_name_kana": "サオリ",                  // フリガナ(名)
  "tel": "012-4294-2357",                       // TEL
  "extension_number": "",                       // 内線
  "fax": "",                                     // FAX
  "mobile_tel": "070-7122-8116",                // 携帯電話
  "email": "watanabe.saori@c10250.co.jp",       // Email
  "job_category": "管理",                        // 職種 (master: role)
  "job_rank": "次長",                            // 職位 (master: rank)
  "job_title": "ロジスティクス部次長",          // 役職名
  "post_code": "",                               // 郵便番号
  "address": "北海道旭川市東区4丁目18-30",       // 住所
  "follow_date": "2026-05-01",                  // フォロー予定
  "remarks": "展示会での名刺交換による登録。",   // 担当者備考
  "tel_forbidden": false,                        // TEL禁止
  "tel_caution": false,                          // TEL注意
  "brochure_forbidden": false,                   // 資料禁止
  "user_id": 12,                                 // 登録者
  "custom_fields": { "free1": "" },              // 担当者自由使用欄1～3
  "created_at": "...", "updated_at": "..."
}
```

### Endpoints (giống pattern §2)
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/contacts` | `filters[company_id, job_category, job_rank]`; `q` tìm theo họ+tên+会社名 |
| GET | `/contacts/:id` | |
| POST | `/contacts` | Khi tạo từ màn công ty: client gửi sẵn `company_id` |
| PATCH | `/contacts/:id` | Hỗ trợ inline edit (tab 活動 sửa nhanh) |
| DELETE | `/contacts/:id` | |
| POST | `/contacts/bulk_delete` | |
| GET | `/contacts/export` · POST `/contacts/import` | CSV |

> Tab 活動/案件 trong chi tiết contact: `GET /activities?filters[contact_id]=...`, `GET /projects?filters[contact_id]=...`.

---

## 4. Projects (案件) – `/api/v1/projects`

### Object `project`
```jsonc
{
  "id": 3042,
  "company_id": 1141,                 // 会社ID *
  "company_name": "...",              // read-only
  "contact_id": 10001,                // 担当者ID
  "contact_name": "渡辺",             // read-only
  "name": "金型更新プロジェクト",      // 案件名 *
  "status": "失注",                    // 案件ステータス (master/enum)
  "user_id": 12,                       // 営業担当 (FK users)
  "sales_date": "2026-04-01",          // 話題日/案件化日 (xem db-notes #5)
  "expected_closing_date": "2026-08-01", // フォロー予定/予定時期
  "accuracy": "見込高",                // 確度 (xem db-notes #5: cần当初/見直 riêng)
  "summary": "金型更新プロジェクト...", // 案件概要
  "notes": "",                         // 備考
  "stages": [                          // ステージ1～4 (xem db-notes #6)
    { "id": 1, "name": "ステージ1", "done": true }
  ],
  "custom_fields": {                   // 発生動機/引合手段/競合/予実 ... (xem db-notes #5)
    "motivation": "引合", "method": "展示会", "competitor": "Fソリューション",
    "free1": "", "free2": "", "free3": ""
  },
  "created_at": "...", "updated_at": "..."
}
```

### Endpoints
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/projects` | `filters[status, user_id, company_id, contact_id]`, khoảng ngày `sales_date`/`expected_closing_date` |
| GET | `/projects/:id` | |
| POST | `/projects` | Tạo từ contact/company → gửi sẵn `company_id`/`contact_id` |
| PATCH | `/projects/:id` | |
| DELETE | `/projects/:id` | |
| POST | `/projects/bulk_delete` | |
| GET `/projects/export` · POST `/projects/import` | CSV |

> Tab 活動 trong chi tiết案件: `GET /activities?filters[project_id]=...`.

---

## 5. Activities (活動) – `/api/v1/activities`

### Object `activity`
```jsonc
{
  "id": 29193,
  "company_id": 1141,            // 会社ID *
  "company_name": "...",         // read-only
  "contact_id": 10001,           // 担当者ID *
  "contact_name": "渡辺",        // read-only
  "project_id": 3042,            // 案件ID (nullable)
  "project_name": "金型更新...", // 案件名 (snapshot)
  "user_id": 12,                 // 営業担当 *
  "act_date": "2026-04-29",      // 活動日 *
  "start_time": "10:15",         // 開始時刻
  "end_time": "10:45",           // 終了時刻
  "duration": 30,                // 活動時間(分)
  "act_type": "TEL",             // タイプ (master/enum: TEL/訪問/メール/Web面談/その他)
  "purpose": "売り後フォロー",    // 目的/活動目的
  "motivation": "",              // 動機
  "comment": "見積の件",          // コメント
  "has_appointment": false,      // アポ
  "is_claim": false,             // クレーム
  "is_follow_up_completed": false, // フォロー完了
  "custom_fields": { "free1": "" }, // 活動自由使用欄1～3
  "created_at": "...", "updated_at": "..."
}
```
> 面談人数 (số người dự) và リードID xuất hiện trên UI nhưng chưa có cột — xem `db-notes.md` #7.

### Endpoints
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/activities` | `filters[act_type, user_id, company_id, contact_id, project_id]`, khoảng ngày `act_date` |
| GET | `/activities/:id` | |
| POST | `/activities` | Tạo từ company/contact/project → gửi sẵn các FK + `project_name` snapshot |
| PATCH | `/activities/:id` | Inline edit ô (ngày/担当/type/comment/purpose) |
| DELETE | `/activities/:id` | |
| POST | `/activities/bulk_delete` | |
| GET `/activities/export` · POST `/activities/import` | CSV |

---

## 6. Attachments / Documents (添付ファイル)

Map `documents` (polymorphic `documentable`) + Active Storage. Dùng cho company/contact/project/activity (UI có dropzone đính kèm).

| Method | Path | I/O |
|---|---|---|
| GET | `/:resource/:id/documents` | `resource` ∈ companies/contacts/projects/activities → list document |
| POST | `/:resource/:id/documents` | `multipart/form-data` field `file` (nhiều file) → 201 |
| GET | `/documents/:id/download` | Trả file (redirect signed URL) |
| DELETE | `/documents/:id` | 204 |

Object `document`:
```jsonc
{ "id": 5, "filename": "見積書.pdf", "content_type": "application/pdf",
  "byte_size": 102400, "url": "<signed-url>", "user_id": 12,
  "uploaded_by": "山田 健一", "created_at": "..." }
```

---

## 7. Saved Search Conditions (検索条件保存) – `/api/v1/search_conditions`

Map bảng `search_conditions` (per user, có thể share). UI lưu/áp dụng bộ lọc theo màn.

| Method | Path | I/O |
|---|---|---|
| GET | `/search_conditions?screen_type=company` | Bộ lọc đã lưu (của mình + share) |
| POST | `/search_conditions` | `{ "condition_name": "関東の製造業", "screen_type": "company", "filter_params": {...}, "share": false }` |
| PATCH | `/search_conditions/:id` | Sửa tên/điều kiện/share |
| DELETE | `/search_conditions/:id` | |

`screen_type` ∈ `company` | `contact` | `project` | `activity`.

---

## 8. Column / Field Settings (列の設定) – `/api/v1/field_settings`

Map `user_field_settings` (per user, per `target_model`, `field_name`, `is_visible`, `row_order`). UI hiện đang lưu localStorage → cần chuyển sang API.

| Method | Path | I/O |
|---|---|---|
| GET | `/field_settings?target_model=company` | Danh sách field + visible + order (đã merge default) |
| PUT | `/field_settings?target_model=company` | Lưu toàn bộ: `{ "fields": [ { "field_name": "name", "is_visible": true, "row_order": 0 }, ... ] }` |
| DELETE | `/field_settings?target_model=company` | Reset về mặc định |

`target_model` ∈ `company` | `contact` | `project` | `activity` (UI có thêm chiều submenu — xem db-notes #8).

---

## 9. Master Options (各種マスター) – `/api/v1/mst_options`

Map `mst_options` (tenant, `option_type`, `name`, `sort_order`, `is_active`). 8 loại đang dùng:
`industry_type(業種)`, `industry(業界)`, `scale_rank(規模)`, `company_type(種別)`, `job_category(職種)`, `job_rank(職位)`, `motivation(発生動機)`, `purpose(活動目的)`.
(Đề xuất bổ sung thêm loại: `area(地区)`, `project_status(案件ステータス)`, `inquiry_method(引合手段)`, `activity_type(活動タイプ)`, `accuracy(確度)` — xem db-notes #3.)

| Method | Path | I/O |
|---|---|---|
| GET | `/mst_options?option_type=industry_type` | List theo `sort_order`. `?include_inactive=true` để hiện cả đã xoá mềm |
| POST | `/mst_options` | `{ "option_type": "industry_type", "name": "機械", "sort_order": 0 }` |
| PATCH | `/mst_options/:id` | Sửa `name`/`is_active` |
| PUT | `/mst_options/reorder` | `{ "option_type": "industry_type", "ordered_ids": [3,1,2] }` (kéo-thả) |
| DELETE | `/mst_options/:id` | Xoá mềm → `is_active=false` |

### Project stages master (案件ステージ)
Bảng riêng `project_stages` (tenant, `name`, `value`):
```
GET    /api/v1/project_stages
POST   /api/v1/project_stages
PATCH  /api/v1/project_stages/:id
DELETE /api/v1/project_stages/:id
```

---

## 10. Users / Employee Master (社員マスター) – `/api/v1/users`

Map bảng `users` (trong tenant). Dialog 社員マスター.

### Object `user`
```jsonc
{
  "id": 1022, "login_id": "test1",           // ログインID *
  "user_name": "澤 貴彦",                     // 社員名 *
  "user_kana": "サワタカヒコ",                // フリガナ
  "department": "企画部",                     // 部署 (xem db-notes #9: chưa có cột)
  "role_id": 2, "role_name": "管理者",        // 所属グループ
  "is_admin_default": false, "is_deleted": false,
  "created_at": "...", "updated_at": "..."
}
```

| Method | Path | I/O |
|---|---|---|
| GET | `/users` | `q` theo tên; `?include_deleted=true` |
| GET | `/users/:id` | |
| POST | `/users` | Gồm `password` (社員新規) |
| PATCH | `/users/:id` | Sửa thông tin / đổi `role_id` (assign group) |
| PATCH | `/users/:id/password` | Admin reset mật khẩu |
| DELETE | `/users/:id` | Xoá mềm `is_deleted=true` |

---

## 11. Roles & Permissions (権限/グループ) – `/api/v1/roles`

Map `roles` + `role_permissions`.

| Method | Path | I/O |
|---|---|---|
| GET | `/roles` | List role của tenant (`is_deleted=false`) |
| GET | `/roles/:id` | Kèm `permissions` (full_permission, permission_key[]) |
| POST | `/roles` | `{ "name": "営業", "is_admin": false }` |
| PATCH | `/roles/:id` | Sửa tên / `is_admin` |
| PUT | `/roles/:id/permissions` | `{ "full_permission": false, "permission_key": ["company.read","company.write","activity.write", ...] }` |
| DELETE | `/roles/:id` | Xoá mềm |
| GET | `/permission_keys` | (tiện ích) trả danh mục permission key + nhãn để render UI phân quyền |

> Gợi ý bộ `permission_key`: `{resource}.{action}` với resource ∈ company/contact/project/activity/master/user/role/tenant, action ∈ read/create/update/delete/export/import.

---

## 12. System Admin – Tenant Management (テナント・会社マスタ) – `/api/v1/system/*`

Realm riêng, đăng nhập bằng bảng `system_admins` (login_code + password).

### Auth system admin
```
POST /api/v1/system/auth/login   { "login_code": "...", "password": "..." }  → access_token
GET  /api/v1/system/auth/me
DELETE /api/v1/system/auth/logout
```

### Tenants
Object `tenant`:
```jsonc
{ "id": 1, "name": "株式会社 建設第一", "login_code": "KH-8821-X",
  "is_active": true, "created_at": "...",
  "admin_user": { "id": 9, "login_id": "admin_t001", "user_name": "山田 太郎",
                  "user_kana": "...", "department": "管理部", "email": "...",
                  "last_login_at": "..." }  // null nếu 未作成
}
```

| Method | Path | I/O |
|---|---|---|
| GET | `/system/tenants` | `filters[is_active]`, `q` theo id/tên; per_page 10/25/50/100 |
| GET | `/system/tenants/:id` | Kèm `admin_user` |
| POST | `/system/tenants` | `{ "name": "...", "login_code": "...", "is_active": true, "admin_user": { "login_id","user_name","user_kana","department","password","email" } }` (tạo tenant + user admin đầu tiên) |
| PATCH | `/system/tenants/:id` | Sửa tên/login_code/is_active (bật-tắt 有効/無効) |
| GET | `/system/tenants/:id/admin_user` | Xem chi tiết tài khoản admin (dialog 詳細) |
| DELETE | `/system/tenants/:id` | (nếu cho phép) |

> Lưu ý: bảng `users` hiện chưa có cột `email`/`last_login_at` nhưng UI admin có hiển thị — xem db-notes #9.

---

## 13. Tổng hợp danh mục endpoint

```
# Auth (user)
POST   /auth/access
POST   /auth/login
POST   /auth/refresh
DELETE /auth/logout
GET    /auth/me
PATCH  /auth/password

# Nghiệp vụ (CRUD + bulk_delete + export + import cho mỗi cái)
/companies      /contacts      /projects      /activities

# Tab quan hệ → dùng filters[...] trên list tương ứng

# Đính kèm
GET/POST  /:resource/:id/documents
GET       /documents/:id/download
DELETE    /documents/:id

# Cấu hình cá nhân
GET/POST/PATCH/DELETE  /search_conditions
GET/PUT/DELETE         /field_settings

# Master
/mst_options (+ PUT /reorder)    /project_stages

# Quản trị tenant
/users  /roles (+ PUT /:id/permissions)  /permission_keys

# System admin
POST /system/auth/login ...  /system/tenants
```

---

Xem `docs/db-notes.md` để biết các điểm schema cần bổ sung/sửa trước khi hiện thực các API trên.
