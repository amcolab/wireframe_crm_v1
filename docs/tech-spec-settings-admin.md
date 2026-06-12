# Technical Design Spec: SMOS – Settings & Admin Screens

Category: 4. Specification (HOW)
Status: Draft
Platform: Web (Next.js 16 App Router) · State: React Query + React Context · Form: React Hook Form + Zod · BE: Rails 8 API REST `/api/v1`
Nguồn input: `docs/tech-spec-CP01-company-list.md` (tham chiếu tone/style), `docs/api-design.md` (§1.6, §8–§12), `docs/db-notes.md` (#3, #8, #9), `docs/screen-requirements.md` (§7, §8), wireframe `web/src/screens/settings/tn01_list.js`.

> ⚠️ Lưu ý khác biệt nền tảng so với template demo (S2_001 Flutter/Firestore): **SMOS không có realtime**. Đây là CRM REST thuần (Rails). Mọi đồng bộ dữ liệu thực hiện qua **React Query invalidate/refetch**. Không có WebSocket, không có subscription. Wireframe `web/src` (vanilla JS + mockData) chỉ là **tài liệu tham chiếu UI** — production FE là **Next.js 16 App Router** (FE.md). Đừng copy logic state/filter/mock của wireframe sang production code.

---

## 1. Mục đích & phạm vi

Tài liệu này chốt cách implement **6 màn Settings & Admin** của SMOS:

| ID | Màn hình | Nhóm | Route / Vị trí |
|---|---|---|---|
| ST01 | 列の設定 (Column Settings) | Cấu hình cá nhân | Dialog từ toolbar của mỗi lưới |
| MS01 | 各種マスター (General Master) | Master data | Dialog/Screen từ Settings menu |
| US01 | 社員マスター (Employee Master) | Quản trị tenant | Dialog từ Settings menu |
| RL01 | 権限・グループ (Roles & Permissions) | Quản trị tenant | Dialog từ Settings menu |
| PW01 | パスワード設定 (Change Password) | Cá nhân | Dialog từ User menu / topbar |
| TN01 | テナント・会社マスタ (System Admin / Tenant Mgmt) | **System Admin realm riêng** | Route `/tenant` (system admin login) |

> **Lưu ý quan trọng về TN01**: màn TN01 thuộc **realm system admin** — đăng nhập bằng bảng `system_admins` (login_code + password), tách hoàn toàn khỏi JWT tenant thông thường. System admin **không có quyền** truy cập dữ liệu nghiệp vụ của từng tenant (companies/contacts/projects/activities). Đây là realm quản lý hạ tầng thuần túy.

---

## 2. Kiến trúc & nguyên tắc chung

### 2.1 Stack

- **FE**: Next.js 16 App Router, `"use client"` cho dialog/interactive components.
- **State**: React Query (server cache) + React Context/hooks (UI state). Dialog dùng **React Portal** (`createPortal`) để render ngoài DOM tree chứa, tránh z-index/overflow bị clip.
- **Form**: React Hook Form + Zod cho mọi form create/edit/validation.
- **UI**: shadcn/ui component library (Button, Input, Select, Checkbox, Switch, Dialog, Table...).
- **Toast**: Sonner cho thông báo thành công/lỗi.
- **BE**: Rails 8 REST `/api/v1`, envelope chuẩn `{data}` / `{data[], meta}` / `{error}`.

### 2.2 Dialogs là React Portal

Tất cả dialog trong nhóm Settings (MS01, US01, RL01, PW01, TN01 detail dialogs) implement bằng **React Portal** mount vào `document.body`. Không dùng native `<dialog>` HTML như wireframe vanilla JS. Sử dụng shadcn `Dialog` component (wrapper Radix UI).

### 2.3 React Query — query key convention

```
// Column settings
['field_settings', { target_model, screen_key? }]

// Master options
['mst_options', { option_type }]
['mst_options', { option_type, include_inactive: true }]
['project_stages']

// Users
['users', 'list', { q?, include_deleted? }]
['users', id]

// Roles
['roles', 'list']
['roles', id]
['permission_keys']

// System admin — tenants (realm riêng, prefix 'system')
['system', 'tenants', 'list', listParams]
['system', 'tenants', id]
['system', 'tenants', id, 'admin_user']
```

Sau mỗi mutation: invalidate key liên quan theo nguyên tắc **tối thiểu cần thiết** (tránh invalidate quá rộng gây refetch không cần thiết).

### 2.4 RHF + Zod

- Mỗi form có schema Zod riêng (vd `columnSettingsSchema`, `mstOptionSchema`, `userSchema`, `roleSchema`, `passwordSchema`, `tenantSchema`).
- BE 422 → map `error.details` về field errors trong RHF (`setError`).
- FE validate sớm bằng Zod nhưng **BE là nguồn sự thật** về validation.

### 2.5 Permission guard

- FE guard: ẩn/disable nút write nếu thiếu permission key tương ứng.
- BE guard: từ chối API nếu thiếu permission (403).
- **FE guard là defensive, không thay thế BE enforcement**.
- Permission keys theo convention `{resource}.{action}` (xem §RL01 chi tiết).

### 2.6 Envelope & error handling chuẩn

| HTTP Status | Xử lý FE |
|---|---|
| 401 | api-client tự refresh token; fail → clear token → redirect login |
| 403 | Hiển thị thông báo thiếu quyền; không render nội dung |
| 404 | Thông báo "対象が見つかりません"; xóa selection nếu có |
| 422 | Map `error.details` → field errors trong RHF |
| 500 / network | Error state + nút `再読み込み` |

> **No realtime**: sau mọi mutation thành công, đồng bộ qua `queryClient.invalidateQueries(key)`. Không có WebSocket hay polling. `再読み込み` thủ công = `queryClient.refetch()`.

---

## 3. ST01 – 列の設定 (Column Settings)

### 3.a Mục đích

Cho phép mỗi user chọn **cột hiển thị** và **thứ tự cột** cho từng lưới (会社/担当者/活動/案件). Cấu hình là **per-user** (lưu trên server, không phải localStorage). Wireframe hiện dùng localStorage — production cần chuyển sang API `/field_settings`.

### 3.b Component / UI

```
ColumnSettingsButton (toolbar của CompanyListPanel / ContactListPanel / …)
└── ColumnSettingsDialog (React Portal)
    ├── TargetModelTabs          // tab: 会社 | 担当者 | 活動 | 案件
    ├── FieldList                // danh sách checkbox + drag handle
    │   └── FieldItem            // checkbox visible + label + drag handle (dnd-kit)
    ├── ResetDefaultsButton      // DELETE /field_settings → confirm
    └── SaveButton               // PUT /field_settings
```

**Fields trong dialog:**

| Field | Kiểu | Mô tả |
|---|---|---|
| `field_name` | string (read-only) | Tên cột kỹ thuật (hiển thị nhãn tiếng Nhật) |
| `is_visible` | boolean (checkbox) | Hiển thị cột hay ẩn |
| `row_order` | number (drag-reorder) | Thứ tự cột trong lưới |

Drag-reorder dùng **dnd-kit** (`@dnd-kit/sortable`). Khi kéo thả, cập nhật `row_order` theo vị trí mới; chưa gửi API — submit khi user bấm **保存**.

### 3.c Data Type / ViewModel

```typescript
// Response GET /field_settings?target_model=company
interface FieldSettingItem {
  field_name: string;
  label: string;          // nhãn tiếng Nhật (BE merge default label)
  is_visible: boolean;
  row_order: number;
  is_default: boolean;    // true = default system, false = user override
}

// ViewModel FE (camelCase)
interface FieldSettingVM {
  fieldName: string;
  label: string;
  isVisible: boolean;
  rowOrder: number;
  isDefault: boolean;
}
```

Mapping `snake_case → camelCase` trong `lib/utils/field-settings-mappers.ts`. BE trả **list đã merge với default** (nếu user chưa có setting cho 1 field → dùng default). FE không tự merge.

**Fallback:** nếu list rỗng hoặc API lỗi → hiển thị cột mặc định (hard-code fallback trong `lib/constants/default-columns.ts` theo `target_model`).

### 3.d API Contract

| Method | Path | Payload | Response |
|---|---|---|---|
| GET | `/api/v1/field_settings?target_model=company` | — | `{ data: FieldSettingItem[] }` |
| PUT | `/api/v1/field_settings?target_model=company` | `{ "fields": [{ "field_name", "is_visible", "row_order" }] }` | `{ data: FieldSettingItem[] }` (updated) |
| DELETE | `/api/v1/field_settings?target_model=company` | — | 204 (reset về default) |

`target_model` ∈ `company` | `contact` | `project` | `activity`.

Sau PUT thành công: `invalidateQueries(['field_settings', { target_model }])` + `invalidateQueries(['companies', 'list'])` (tương ứng với model) để grid cập nhật visible columns.

### 3.e State

| State | Loại | Nơi lưu |
|---|---|---|
| Field list (server) | Server cache (React Query) | `['field_settings', { target_model }]` |
| Dialog open/close | UI transient | `useState` trong ColumnSettingsButton |
| Active tab (target_model) | UI transient | `useState` trong ColumnSettingsDialog |
| Draft edits (reorder + visible) | Form state (RHF array field) | Local trong dialog, submit khi bấm 保存 |

### 3.f Permission

- Không cần permission đặc biệt — mọi user đã login đều được cấu hình cột của mình.
- Cấu hình là per-user, không ảnh hưởng user khác.

### 3.g Error / Fallback

- GET lỗi → fallback cột mặc định (hard-code); hiển thị toast warning.
- PUT lỗi → toast error; không đóng dialog; giữ nguyên draft state.
- DELETE (reset) → confirm dialog trước khi gọi API.

### 3.h Gap so với schema/wireframe + Open Questions

| # | Vấn đề | Mức |
|---|---|---|
| ST01-1 | **DB gap (db-notes #8)**: `user_field_settings` chỉ có `target_model` (1 chiều). UI wireframe lưu theo `{menu}.{sub}` — cùng model `contact` hiển thị ở tab 担当者 trong màn CP01 và màn CT01 chính không phân biệt được. Cần chốt: (A) **dùng chung 1 cấu hình** cho mọi nơi hiển thị cùng model (đơn giản, chấp nhận được nếu cột giống nhau), hoặc (B) **thêm cột `screen_key`** vào `user_field_settings` và điều chỉnh API nhận thêm param `screen_key`. | 🟡 |
| ST01-2 | API `GET /field_settings` cần trả cả `label` tiếng Nhật — BE phải maintain bảng mapping `field_name → label` hoặc trả kèm trong response. Nếu BE không trả label, FE cần hard-code mapping. | 🟡 |
| ST01-3 | Thứ tự cột **mặc định** cho mỗi model khi user chưa từng cấu hình là gì? BE hay FE định nghĩa? | 🟡 |

---

## 4. MS01 – 各種マスター (General Master)

### 4.a Mục đích

CRUD các loại master option (mst_options) dùng xuyên suốt hệ thống: dropdown 業種/業界/規模/種別/職種/職位/発生動機/活動目的 và các loại đề xuất thêm. Đồng thời quản lý **案件ステージ master** (project_stages). Cấu hình là **per-tenant**.

### 4.b Component / UI

```
MasterMenuButton (Settings menu)
└── MasterScreen (hoặc MasterDialog — React Portal)
    ├── OptionTypeSelector       // dropdown chọn loại master
    │   // 業種 | 業界 | 規模ランク | 種別 | 職種 | 職位 | 発生動機 | 活動目的
    │   // + đề xuất: 地区 | 案件ステータス | 引合手段 | 活動タイプ | 確度
    ├── OptionList               // list theo sort_order, sortable (dnd-kit)
    │   └── OptionRow            // tên + trạng thái (有効/無効) + edit + delete button
    │       └── drag handle
    ├── AddOptionButton          // mở AddEditOptionDialog (mode=create)
    └── ProjectStageMasterSection  // section riêng cho 案件ステージ
        ├── StageList            // name + value, sortable
        └── AddStageButton

AddEditOptionDialog (React Portal)
    ├── name (text, required)
    ├── is_active (switch: 有効/無効)
    └── Save / Cancel

ConfirmDeleteDialog              // soft-delete (is_active=false)
```

**Chú ý UX**: soft-delete không xóa record — chỉ set `is_active=false`. Record đã inactive vẫn hiển thị (mờ/gạch) khi `include_inactive=true`. Khi dropdown của entity (company/contact/project/activity) load options, chỉ lấy `is_active=true` (không gửi `include_inactive`).

### 4.c Data Type / ViewModel

```typescript
// Response GET /mst_options?option_type=industry_type
interface MstOptionItem {
  id: number;
  option_type: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ViewModel FE
interface MstOptionVM {
  id: number;
  optionType: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

// Project stage
interface ProjectStageVM {
  id: number;
  name: string;
  value: string;      // giá trị kỹ thuật / slug
}
```

Fallback: `name` rỗng → bỏ qua render; `is_active` null → treat as `true`.

**Danh sách `option_type` đầy đủ (đề xuất):**

| option_type | Nhãn UI | Trạng thái |
|---|---|---|
| `industry` | 業界 | Đã có |
| `industry_type` | 業種 | Đã có |
| `scale_rank` | 規模ランク | Đã có |
| `company_type` | 種別 | Đã có |
| `job_category` | 職種 | Đã có |
| `job_rank` | 職位 | Đã có |
| `motivation` | 発生動機 | Đã có |
| `purpose` | 活動目的 | Đã có |
| `area` | 地区 | 🟡 Đề xuất thêm (db-notes #3) |
| `project_status` | 案件ステータス | 🟡 Đề xuất thêm |
| `inquiry_method` | 引合手段 | 🟡 Đề xuất thêm |
| `activity_type` | 活動タイプ | 🟡 Đề xuất thêm |
| `accuracy` | 確度 | 🟡 Đề xuất thêm |

Không cần thêm `option_type` mới vào schema DB — chỉ thêm rows dữ liệu trong `mst_options`.

### 4.d API Contract

**mst_options:**

| Method | Path | Payload | Response |
|---|---|---|---|
| GET | `/api/v1/mst_options?option_type=industry_type` | — | `{ data: MstOptionItem[] }` |
| GET | `/api/v1/mst_options?option_type=industry_type&include_inactive=true` | — | `{ data: MstOptionItem[] }` (kể cả inactive) |
| POST | `/api/v1/mst_options` | `{ "option_type", "name", "sort_order" }` | 201 `{ data: MstOptionItem }` |
| PATCH | `/api/v1/mst_options/:id` | `{ "name"?, "is_active"? }` | `{ data: MstOptionItem }` |
| PUT | `/api/v1/mst_options/reorder` | `{ "option_type", "ordered_ids": [3,1,2] }` | 200 |
| DELETE | `/api/v1/mst_options/:id` | — | 204 (soft-delete: `is_active=false`) |

**project_stages:**

| Method | Path | Payload | Response |
|---|---|---|---|
| GET | `/api/v1/project_stages` | — | `{ data: ProjectStageItem[] }` |
| POST | `/api/v1/project_stages` | `{ "name", "value" }` | 201 |
| PATCH | `/api/v1/project_stages/:id` | `{ "name"?, "value"? }` | `{ data: ... }` |
| DELETE | `/api/v1/project_stages/:id` | — | 204 |

**Invalidate sau mutation:**

- Create/Edit/Delete mst_option: `invalidateQueries(['mst_options', { option_type }])`.
- Reorder: `invalidateQueries(['mst_options', { option_type }])`.
- Create/Edit/Delete project_stage: `invalidateQueries(['project_stages'])`.
- Lưu ý: các dropdown entity (company/contact/project/activity) cũng cache mst_options — nếu dùng cùng query key thì tự được invalidate; nếu dùng key khác cần invalidate thêm.

### 4.e State

| State | Loại | Nơi lưu |
|---|---|---|
| Option list (server) | Server cache | `['mst_options', { option_type }]` |
| Project stages (server) | Server cache | `['project_stages']` |
| Đang chọn option_type | UI transient | `useState` trong MasterScreen |
| Dialog open/mode (create/edit) | UI transient | `useState` |
| Draft edit form | Form state (RHF) | Local trong AddEditOptionDialog |
| Draft reorder | UI transient | Local optimistic list; submit khi confirm |

### 4.f Permission

- Xem master list: cần `master.read`.
- Thêm/sửa/xóa: cần `master.create` / `master.update` / `master.delete`.
- FE ẩn nút Add/Edit/Delete nếu thiếu quyền tương ứng.

### 4.g Error / Fallback

- List lỗi → toast error + empty state "データがありません".
- POST/PATCH 422 → field errors trong RHF.
- Delete confirm trước khi gọi; lỗi delete → toast error.
- Reorder: optimistic UI (cập nhật local list ngay) + rollback nếu API lỗi.

### 4.h Gap + Open Questions

| # | Vấn đề | Mức |
|---|---|---|
| MS01-1 | Cần chốt danh sách `option_type` chính thức với BA: 5 loại đề xuất (area/project_status/inquiry_method/activity_type/accuracy) có được thêm vào không? Ảnh hưởng dropdown CP01/CT01/PR01/AT01. | 🟡 |
| MS01-2 | `project_stages.value` (slug kỹ thuật) — UI có cho phép sửa `value` sau khi tạo không? Nếu có thể sửa, cần kiểm tra references (project_stage_achievements nếu có). | 🟡 |
| MS01-3 | Thứ tự hiển thị `option_type` trong selector — cố định hay BE trả danh sách? Nên hard-code FE theo danh sách đã chốt. | 🟢 |
| MS01-4 | DELETE `/mst_options/:id` là soft-delete (set `is_active=false`) hay hard-delete? Cần chốt với BE — nếu hard-delete thì data entity cũ đang dùng option đó bị mất reference. | 🟡 |

---

## 5. US01 – 社員マスター (Employee Master)

### 5.a Mục đích

CRUD danh sách user (nhân viên) trong tenant. Admin có thể tạo user mới, gán role, reset password. Soft-delete (không xóa cứng). Xem được user đã xóa (`include_deleted=true`).

### 5.b Component / UI

```
EmployeeMenuButton (Settings menu)
└── EmployeeDialog (React Portal, fullscreen hoặc large dialog)
    ├── EmployeeSearchBar         // q (tên), include_deleted toggle
    ├── EmployeeTable             // list users
    │   └── EmployeeRow          // code, tên, kana, bộ phận, role, login_id, trạng thái
    │       └── EditButton / DeleteButton
    ├── AddEmployeeButton         // mở AddEditEmployeeDialog (mode=create)
    └── Pager

AddEditEmployeeDialog (React Portal)
    ├── login_id (text, required)
    ├── user_name (text, required)
    ├── user_kana (text)
    ├── department (text hoặc select — db-notes #9)
    ├── role_id (select từ GET /roles)
    ├── is_admin_default (checkbox)
    ├── password (text, required khi create; ẩn khi edit)
    └── Save / Cancel

ResetPasswordDialog              // chỉ cho admin, nhập password mới
ConfirmDeleteDialog
```

**Cột hiển thị trong EmployeeTable:**

| Cột | BE field | Ghi chú |
|---|---|---|
| コード (ID) | `id` | |
| 社員名 | `user_name` | |
| フリガナ | `user_kana` | |
| 部署 | `department` | 🔴 DB gap — cần thêm cột |
| メールアドレス | `email` | 🔴 DB gap — cần thêm cột |
| 所属グループ | `role_name` | join từ `role_id` |
| ログインID | `login_id` | |
| 最終ログイン | `last_login_at` | 🔴 DB gap — cần thêm cột |
| 状態 | `is_deleted` | 有効 / 削除済み |

### 5.c Data Type / ViewModel

```typescript
// Response GET /users
interface UserItem {
  id: number;
  login_id: string;
  user_name: string;
  user_kana: string | null;
  department: string | null;      // 🔴 chưa có cột DB
  email: string | null;           // 🔴 chưa có cột DB
  role_id: number | null;
  role_name: string | null;       // join BE
  is_admin_default: boolean;
  is_deleted: boolean;
  last_login_at: string | null;   // 🔴 chưa có cột DB
  created_at: string;
  updated_at: string;
}

// ViewModel FE (camelCase)
interface UserVM {
  id: number;
  loginId: string;
  userName: string;
  userKana: string;
  department: string;
  email: string;
  roleId: number | null;
  roleName: string;
  isAdminDefault: boolean;
  isDeleted: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
```

Fallback: `department` null → `-`; `email` null → `-`; `lastLoginAt` null → `未ログイン`; `roleName` null → `(グループ未設定)`.

### 5.d API Contract

| Method | Path | Payload | Response |
|---|---|---|---|
| GET | `/api/v1/users?q=&include_deleted=false` | — | `{ data: UserItem[], meta }` |
| GET | `/api/v1/users/:id` | — | `{ data: UserItem }` |
| POST | `/api/v1/users` | `{ "login_id", "user_name", "user_kana"?, "department"?, "email"?, "role_id"?, "password", "is_admin_default"? }` | 201 `{ data: UserItem }` |
| PATCH | `/api/v1/users/:id` | fields cần sửa (không có `password`) | `{ data: UserItem }` |
| PATCH | `/api/v1/users/:id/password` | `{ "password": "..." }` | 204 (admin reset) |
| DELETE | `/api/v1/users/:id` | — | 204 (soft-delete: `is_deleted=true`) |

Invalidate sau mutation: `invalidateQueries(['users', 'list'])`. Nếu sửa role: có thể ảnh hưởng permission ở nơi khác (không cần invalidate nhưng lưu ý user cần logout/login lại để nhận permission mới — xem §RL01).

### 5.e State

| State | Loại | Nơi lưu |
|---|---|---|
| User list (server) | Server cache | `['users', 'list', { q, include_deleted }]` |
| User detail (server) | Server cache | `['users', id]` |
| Search params (q, include_deleted) | UI transient | `useState` trong EmployeeDialog |
| Dialog open/mode | UI transient | `useState` |
| Form state (create/edit) | Form state (RHF) | Local trong AddEditEmployeeDialog |
| Role list (server) | Server cache | `['roles', 'list']` (dùng cho select role_id) |

### 5.f Permission

- Xem danh sách user: cần `user.read`.
- Tạo/sửa user: cần `user.create` / `user.update`.
- Xóa (soft-delete): cần `user.delete`.
- Admin reset password: `user.update` (hoặc cần xác nhận thêm permission key riêng `user.reset_password`).
- FE ẩn nút tương ứng nếu thiếu quyền.

### 5.g Error / Fallback

- POST 422 khi `login_id` trùng → field error "ログインIDが既に使用されています".
- DELETE user đang là user hiện tại → cần cảnh báo / ngăn (FE check `currentUser.id === target.id`).
- Password reset: confirm dialog trước; 422 nếu password không đủ mạnh → field error.

### 5.h Gap + Open Questions

| # | Vấn đề | Mức |
|---|---|---|
| US01-1 | **🔴 DB gap (db-notes #9)**: `users` thiếu 3 cột: `department`, `email`, `last_login_at`. Cần thêm vào schema trước khi code. `department` nên là string tự do hay FK vào `mst_options option_type=department`? | 🔴 |
| US01-2 | `last_login_at` — BE cần track và update khi user login thành công (trong auth controller). Confirm BE sẽ làm? | 🔴 |
| US01-3 | Password policy: độ dài tối thiểu, ký tự đặc biệt? Cần rule để dựng Zod schema và hiển thị hint. | 🟡 |
| US01-4 | Khi user bị soft-delete, `refresh_token` của họ có bị revoke ngay không? Cần BE xử lý. | 🟡 |
| US01-5 | `is_admin_default` — nghĩa chính xác? Phân biệt với `role.is_admin`? Admin mặc định của tenant hay chỉ flag để nhận biết? | 🟡 |

---

## 6. RL01 – 権限・グループ (Roles & Permissions)

### 6.a Mục đích

CRUD roles (グループ) và gán permission keys cho từng role. Mỗi user được gán 1 role. Role có thể có `full_permission=true` (bypass mọi check) hoặc danh sách `permission_key[]` cụ thể.

> ⚠️ **Rủi ro hàng đầu**: BE hiện **chưa enforce** `role_permissions` ở controller level (ghi nhận trong BE.md §11). UI phân quyền ở RL01 **vô nghĩa cho đến khi BE thực thi**. Đây là risk bảo mật cao nhất của toàn hệ thống — xem §4 Open Questions / Risks (bảng tổng hợp).

### 6.b Component / UI

```
RolesMenuButton (Settings menu)
└── RolesDialog (React Portal, large)
    ├── RoleList                  // list roles của tenant
    │   └── RoleRow               // tên role, is_admin badge, số user, edit/delete
    ├── AddRoleButton             // mở AddEditRoleDialog (mode=create)
    └── (chọn role → hiện PermissionPanel bên phải hoặc trong dialog)

AddEditRoleDialog (React Portal)
    ├── name (text, required)
    ├── is_admin (checkbox: "管理者権限を付与")
    └── Save / Cancel

PermissionEditDialog (mở khi click 権限設定 trên 1 role)
    ├── FullPermissionToggle       // switch: "すべての権限を付与"
    └── PermissionMatrix           // resource × action grid (checkbox)
        // Rows: 会社 | 担当者 | 案件 | 活動 | マスター | ユーザー | ロール | テナント
        // Cols: 閲覧 | 作成 | 更新 | 削除 | エクスポート | インポート
    └── Save / Cancel
```

**Khi `full_permission=true`**: toàn bộ checkbox disabled + checked (visual feedback). Switch tắt `full_permission` → uncheck tất cả, cho chọn từng cái.

### 6.c Data Type / ViewModel

```typescript
// Response GET /roles/:id
interface RoleDetail {
  id: number;
  name: string;
  is_admin: boolean;
  is_deleted: boolean;
  permissions: {
    full_permission: boolean;
    permission_key: string[];  // e.g. ["company.read","company.create","activity.read"]
  };
  user_count: number;           // số user đang dùng role này
  created_at: string;
  updated_at: string;
}

// Response GET /permission_keys
interface PermissionKeyItem {
  key: string;     // e.g. "company.read"
  resource: string; // e.g. "company"
  action: string;   // e.g. "read"
  label: string;    // e.g. "会社 閲覧"
}

// ViewModel FE
interface RoleVM {
  id: number;
  name: string;
  isAdmin: boolean;
  isDeleted: boolean;
  fullPermission: boolean;
  permissionKeys: string[];
  userCount: number;
}
```

**Permission key convention**: `{resource}.{action}`

| Resource | Actions |
|---|---|
| `company` | `read`, `create`, `update`, `delete`, `export`, `import` |
| `contact` | `read`, `create`, `update`, `delete`, `export`, `import` |
| `project` | `read`, `create`, `update`, `delete`, `export`, `import` |
| `activity` | `read`, `create`, `update`, `delete`, `export`, `import` |
| `master` | `read`, `create`, `update`, `delete` |
| `user` | `read`, `create`, `update`, `delete` |
| `role` | `read`, `create`, `update`, `delete` |
| `tenant` | `read`, `update` |

### 6.d API Contract

| Method | Path | Payload | Response |
|---|---|---|---|
| GET | `/api/v1/roles` | — | `{ data: RoleItem[] }` (is_deleted=false) |
| GET | `/api/v1/roles/:id` | — | `{ data: RoleDetail }` (kèm permissions) |
| POST | `/api/v1/roles` | `{ "name", "is_admin"? }` | 201 `{ data: RoleDetail }` |
| PATCH | `/api/v1/roles/:id` | `{ "name"?, "is_admin"? }` | `{ data: RoleDetail }` |
| PUT | `/api/v1/roles/:id/permissions` | `{ "full_permission": false, "permission_key": ["company.read", ...] }` | `{ data: RoleDetail }` |
| DELETE | `/api/v1/roles/:id` | — | 204 (soft-delete) |
| GET | `/api/v1/permission_keys` | — | `{ data: PermissionKeyItem[] }` |

Invalidate sau mutation: `invalidateQueries(['roles', 'list'])`. Khi sửa permissions: `invalidateQueries(['roles', id])`. Lưu ý: **permissions của user hiện tại không tự động cập nhật** trong session đang chạy — cần logout/login lại hoặc `/auth/me` để reload permissions (xem §6.h).

### 6.e State

| State | Loại | Nơi lưu |
|---|---|---|
| Role list (server) | Server cache | `['roles', 'list']` |
| Role detail (server) | Server cache | `['roles', id]` |
| Permission key catalog (server) | Server cache (staleTime dài) | `['permission_keys']` |
| Selected role ID | UI transient | `useState` trong RolesDialog |
| Dialog open/mode | UI transient | `useState` |
| Form state | Form state (RHF) | Local trong dialog |
| Permission matrix draft | Form state (RHF) | Local trong PermissionEditDialog |

### 6.f Permission

- Xem role list: cần `role.read`.
- Tạo/sửa/xóa role: cần `role.create` / `role.update` / `role.delete`.
- FE ẩn nút tương ứng nếu thiếu.

### 6.g Error / Fallback

- DELETE role đang có user → 409 conflict hoặc BE từ chối → toast "このグループには所属ユーザーがいます".
- PUT permissions 422 → field error (permission_key không hợp lệ).
- `permission_keys` GET lỗi → fallback hard-code list permission keys trong `lib/constants/permission-keys.ts`.

### 6.h Gap + Open Questions

| # | Vấn đề | Mức |
|---|---|---|
| RL01-1 | **🔴 BE chưa enforce permissions**: `role_permissions` đã có schema nhưng Rails controllers chưa check (BE.md §11). Toàn bộ phân quyền FE hiện chỉ là cosmetic. **Must-fix trước go-live.** | 🔴 |
| RL01-2 | Permission của **user hiện tại** được load lúc login (`/auth/me`). Khi admin thay đổi role/permission của user đang online, session của user đó vẫn dùng quyền cũ. Cần chiến lược: (A) force logout khi quyền thay đổi, (B) `/auth/me` polling định kỳ, (C) chấp nhận lag 1 session. | 🟡 |
| RL01-3 | `is_admin` trên role có nghĩa gì khác `full_permission`? Nếu `is_admin=true` thì tự động bypass permission check không? Cần định nghĩa rõ. | 🟡 |
| RL01-4 | Tenant admin built-in role (tạo cùng tenant) — có bị edit/delete không? BE có guard không? | 🟡 |
| RL01-5 | `GET /permission_keys` — BE trả tĩnh hay dynamic? Nếu tĩnh, staleTime có thể set rất dài (Infinity) để tránh refetch không cần thiết. | 🟢 |

---

## 7. PW01 – パスワード設定 (Change Password)

### 7.a Mục đích

Cho user đang đăng nhập tự thay đổi mật khẩu của mình. Yêu cầu nhập mật khẩu hiện tại để xác thực. Khác với admin reset password (US01) — đây là self-service.

### 7.b Component / UI

```
UserMenuButton (topbar) → "パスワード設定"
└── ChangePasswordDialog (React Portal)
    ├── current_password (input type=password, toggle show/hide)
    ├── new_password (input type=password, toggle show/hide)
    ├── new_password_confirmation (input type=password)
    ├── (password strength indicator — tuỳ chọn)
    └── 保存 (submit) / キャンセル
```

Tất cả 3 field đều required. Validation FE (Zod):
- `current_password`: required.
- `new_password`: required, minLength (chốt với BE, gợi ý ≥8 ký tự), không được trùng `current_password`.
- `new_password_confirmation`: phải bằng `new_password` (`.refine()`).

Nút 保存 show loading state khi đang gọi API. Sau thành công: đóng dialog + toast "パスワードを変更しました" + (tuỳ chọn) redirect về login nếu BE invalidate token.

### 7.c Data Type / ViewModel

Form state only — không có server cache. Không lưu password dưới bất kỳ dạng nào sau khi submit.

```typescript
interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

// Zod schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(8, "8文字以上で入力してください"),
  newPasswordConfirmation: z.string(),
}).refine(
  (data) => data.newPassword === data.newPasswordConfirmation,
  { message: "新しいパスワードが一致しません", path: ["newPasswordConfirmation"] }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: "新しいパスワードは現在と異なるものにしてください", path: ["newPassword"] }
);
```

### 7.d API Contract

| Method | Path | Payload | Response |
|---|---|---|---|
| PATCH | `/api/v1/auth/password` | `{ "current_password", "new_password", "new_password_confirmation" }` | 204 |

- 422 nếu `current_password` sai: `error.details.current_password = ["が正しくありません"]` → setError RHF.
- 422 nếu `new_password` không đủ mạnh: `error.details.new_password = [...]` → setError.
- Không có query key cần invalidate (stateless — không cache password).

### 7.e State

| State | Loại | Nơi lưu |
|---|---|---|
| Dialog open/close | UI transient | `useState` trong UserMenu |
| Form state | Form state (RHF) | Local trong ChangePasswordDialog |

Dialog đóng → `reset()` form để clear field (không để lộ mật khẩu cũ).

### 7.f Permission

- Không cần permission key đặc biệt — mọi user đã login đều được đổi mật khẩu của chính mình.
- API `PATCH /auth/password` chỉ áp dụng cho token hiện tại (không thể đổi password của user khác qua endpoint này).

### 7.g Error / Fallback

| Lỗi | Xử lý |
|---|---|
| 422 current_password sai | setError("currentPassword") + message |
| 422 new_password invalid | setError("newPassword") + message từ BE |
| Network/500 | toast error; không đóng dialog |
| ZodError (FE) | Inline field error trước khi gọi API |

### 7.h Gap + Open Questions

| # | Vấn đề | Mức |
|---|---|---|
| PW01-1 | Sau đổi mật khẩu thành công, BE có **invalidate refresh_token hiện tại** không? Nếu có → FE cần clear token + redirect login. Nếu không → tiếp tục session bình thường. Cần BE xác nhận. | 🟡 |
| PW01-2 | Password policy cụ thể (độ dài, ký tự đặc biệt, không dùng lại N lần gần đây)? Cần chốt để validate Zod và hiển thị hint. | 🟡 |

---

## 8. TN01 – テナント・会社マスタ (System Admin / Tenant Management)

### 8.a Mục đích

Quản lý toàn bộ tenant trong hệ thống: tạo tenant mới, sửa thông tin, bật/tắt (有効/無効), xem và quản lý tài khoản admin đầu tiên của từng tenant.

**Realm riêng**: đăng nhập bằng `system_admins` table (login_code + password), JWT riêng (không phải tenant JWT). Không có quyền truy cập dữ liệu nghiệp vụ (companies/contacts/projects). Route: `/tenant` (hoặc `/system/tenant`).

### 8.b Component / UI

```
SystemAdminApp (route /tenant, "use client")
└── SystemAdminShell             // layout riêng (không dùng tenant sidebar)
    ├── SystemAdminLoginPage     // nếu chưa có system admin token
    │   ├── login_code input
    │   ├── password input
    │   └── ログイン button
    └── TenantListPage           // sau khi login
        ├── TenantSearchBar
        │   ├── tenantSearchId   // tìm theo tenant ID
        │   ├── tenantSearchName // tìm theo tên tenant
        │   └── tenantSearchStatus (select: すべて/有効/無効)
        ├── TenantTable          // list tenant (AG Grid hoặc plain table)
        │   └── TenantRow
        │       ├── ID (link-style)
        │       ├── テナント名
        │       ├── ログインコード (code tag)
        │       ├── 状態 (select: 有効/無効, inline change)
        │       ├── 登録日
        │       └── 管理ユーザー (button 詳細 / label 未作成)
        ├── AddTenantButton      // mở TenantDetailDialog (mode=create)
        └── Pager

TenantDetailDialog (React Portal)
    ├── テナントID (read-only khi edit; auto-generate khi create)
    ├── テナント名 (text, required)
    ├── ログインコード (text, required)     // = tenants.login_code
    ├── 有効/無効 (switch: is_active)
    └── 保存 / キャンセル

TenantAdminAccountDialog (read-only view, React Portal)
    ├── テナントID (read-only)
    ├── テナント名 (read-only)
    ├── 社員コード (read-only)
    ├── 社員名 (read-only)
    ├── フリガナ (read-only)
    ├── 部署 (read-only)
    ├── 所属グループ (read-only)
    ├── ログインID (read-only)
    ├── パスワード (masked, eye-toggle show/hide)   // chỉ show khi system admin xem
    ├── 登録日時 (read-only)
    ├── メールアドレス (read-only)                  // 🔴 DB gap
    └── 最終ログイン (read-only)                    // 🔴 DB gap
```

**Wireframe observation** (từ `tn01_list.js`): state `tenants` + `filtered` (client-side filter trên mock). Production: filter qua query params gửi BE, không client-side filter.

**Password toggle trong TenantAdminAccountDialog**: wireframe đã implement `EYE_ON/EYE_OFF` toggle với `currentAdminPassword` local var. Production: password không lưu ở FE — BE trả `password` field chỉ khi system admin xem (`GET /system/tenants/:id/admin_user`). Toggle show/hide là pure UI (không gọi thêm API).

### 8.c Data Type / ViewModel

```typescript
// Response GET /system/tenants
interface TenantItem {
  id: string;             // e.g. "T001"
  name: string;
  login_code: string;
  is_active: boolean;
  created_at: string;
  admin_user: AdminUserSummary | null;  // null = 未作成
}

interface AdminUserSummary {
  id: number;
  login_id: string;
  user_name: string;
  user_kana: string | null;
  department: string | null;   // 🔴 DB gap
  email: string | null;        // 🔴 DB gap
  last_login_at: string | null; // 🔴 DB gap
}

// Response GET /system/tenants/:id
interface TenantDetail extends TenantItem {
  admin_user: AdminUserDetail | null;
}

interface AdminUserDetail extends AdminUserSummary {
  password: string;   // chỉ trả trong system admin context (masked hoặc cleartext — cần BE xác nhận)
  role_name: string | null;
  created_at: string;
}

// ViewModels (camelCase)
interface TenantVM {
  id: string;
  name: string;
  loginCode: string;
  isActive: boolean;
  createdAt: string;
  adminUser: AdminUserSummaryVM | null;
}

interface AdminUserSummaryVM {
  id: number;
  loginId: string;
  userName: string;
  userKana: string;
  department: string;
  email: string;
  lastLoginAt: string | null;
}
```

Fallback: `adminUser` null → hiển thị "未作成" thay button 詳細. `department` null → `-`. `lastLoginAt` null → `未ログイン`.

### 8.d API Contract

**System Admin Auth:**

| Method | Path | Payload | Response |
|---|---|---|---|
| POST | `/api/v1/system/auth/login` | `{ "login_code", "password" }` | `{ data: { access_token, ... } }` |
| GET | `/api/v1/system/auth/me` | — | `{ data: { system_admin info } }` |
| DELETE | `/api/v1/system/auth/logout` | — | 204 |

System admin token lưu **tách biệt** khỏi tenant token (vd localStorage key `smos_system_access_token` vs `mh_access_token`). Api-client cho `/system/*` dùng token này.

**Tenants:**

| Method | Path | Payload | Response |
|---|---|---|---|
| GET | `/api/v1/system/tenants?q=&filters[is_active]=true&page=1&per_page=50` | — | `{ data: TenantItem[], meta }` |
| GET | `/api/v1/system/tenants/:id` | — | `{ data: TenantDetail }` (kèm admin_user) |
| POST | `/api/v1/system/tenants` | `{ "name", "login_code", "is_active", "admin_user": { "login_id", "user_name", "user_kana"?, "department"?, "email"?, "password" } }` | 201 `{ data: TenantDetail }` |
| PATCH | `/api/v1/system/tenants/:id` | `{ "name"?, "login_code"?, "is_active"? }` | `{ data: TenantDetail }` |
| GET | `/api/v1/system/tenants/:id/admin_user` | — | `{ data: AdminUserDetail }` (kèm password) |

**Inline status change** (select 有効/無効 trực tiếp trong row): `PATCH /system/tenants/:id` với `{ "is_active": boolean }` → optimistic update row + invalidate list.

Invalidate sau mutation: `invalidateQueries(['system', 'tenants', 'list'])`. Sau tạo tenant: cũng invalidate + (tuỳ chọn) select tenant mới.

### 8.e State

| State | Loại | Nơi lưu |
|---|---|---|
| System admin auth token | Persistent | localStorage (`smos_system_access_token`) |
| Tenant list (server) | Server cache | `['system', 'tenants', 'list', listParams]` |
| Tenant detail (server) | Server cache | `['system', 'tenants', id]` |
| Admin user detail (server) | Server cache | `['system', 'tenants', id, 'admin_user']` |
| Search params (q, is_active, page) | UI state | `useState` trong TenantListPage |
| Dialog open/mode | UI transient | `useState` |
| Form state (create/edit tenant) | Form state (RHF) | Local trong TenantDetailDialog |
| Password visible state | UI transient | `useState` trong TenantAdminAccountDialog |

**Không** persist search params vào URL query string của route (không cần — admin tool internal use; nếu cần, dùng Next.js `searchParams`).

### 8.f Permission

- Chỉ `system_admins` (bảng riêng) có quyền truy cập `/system/*`.
- Route guard: kiểm tra có system admin token không; nếu không → redirect `/tenant/login` (hoặc `/system/login`).
- Tenant users **không bao giờ** có quyền gọi `/system/*` (BE guard hard-coded, không dựa role_permissions).

### 8.g Error / Fallback

- Login sai → 401 toast "ログインIDまたはパスワードが正しくありません".
- 403 khi gọi `/system/*` bằng tenant token → redirect `/tenant/login`.
- POST tenant 422 khi `login_code` trùng → field error.
- Inline status change lỗi → rollback optimistic + toast.

### 8.h Gap + Open Questions

| # | Vấn đề | Mức |
|---|---|---|
| TN01-1 | **🔴 DB gap (db-notes #9)**: `users` thiếu `department`, `email`, `last_login_at`. Dialog admin account hiển thị cả 3 field này. Cần thêm cột trước khi implement. | 🔴 |
| TN01-2 | BE trả `password` của admin user trong `GET /system/tenants/:id/admin_user` ở dạng gì? Cleartext (chỉ hiện khi system admin xem) hay không bao giờ trả? Nếu không trả → bỏ password field khỏi dialog (hoặc chỉ cho **reset** password). Đây là **security decision quan trọng**. | 🔴 |
| TN01-3 | Khi tạo tenant mới (`POST /system/tenants`), `admin_user` là **required hay optional**? Wireframe có nút "管理ユーザー作成" riêng cho tenant chưa có admin (hiển thị "未作成"). Cần chốt flow: tạo cùng lúc hay tạo sau. | 🟡 |
| TN01-4 | Tenant ID format: wireframe dùng `T001/T002/...` (auto-generate FE trong mock). Production: BE tự generate ID hay FE gửi? Khuyến nghị BE tự generate (auto-increment hoặc UUID). | 🟡 |
| TN01-5 | Có endpoint `DELETE /system/tenants/:id` không? Nếu có, xử lý dữ liệu nghiệp vụ của tenant (cascade hay soft-delete)? Rủi ro data loss cao → cần policy rõ. | 🟡 |
| TN01-6 | System admin có thể tạo nhiều admin user cho 1 tenant không? Hay chỉ 1 "initial admin"? Hiện API chỉ có `admin_user` (singular). | 🟡 |

---

## 9. Tổng hợp Open Questions / Risks

| No | Question / Risk | Màn ảnh hưởng | Owner | Mức |
|---|---|---|---|---|
| 1 | **BE chưa enforce `role_permissions` ở controller level** (BE.md §11). Toàn bộ phân quyền FE là cosmetic. **Must-fix trước go-live — đây là risk bảo mật cao nhất.** | Tất cả | BE / TL | 🔴 |
| 2 | `users` thiếu cột `department`, `email`, `last_login_at` (db-notes #9). Chặn implement US01 + TN01 admin dialog. | US01, TN01 | BE | 🔴 |
| 3 | TN01: BE trả `password` của admin user ở dạng gì? Security decision — cleartext chỉ cho system admin xem hay không bao giờ trả? | TN01 | BE / Security | 🔴 |
| 4 | `user_field_settings` thiếu chiều `screen_key` (db-notes #8). Cùng model hiển thị ở nhiều submenu không phân biệt được. Cần chốt: shared config hay per-submenu. | ST01 | TL / BE | 🟡 |
| 5 | Danh sách `option_type` chính thức cho mst_options: 5 loại đề xuất (area/project_status/inquiry_method/activity_type/accuracy) có được thêm không? | MS01, CP01, PR01, AT01 | BA / BE | 🟡 |
| 6 | Password của admin user trong TN01 — flow khi chưa biết password: chỉ cho reset (không hiển thị)? Cần thiết kế lại dialog. | TN01 | TL / BA | 🟡 |
| 7 | Permission user hiện tại trong session không tự update khi admin đổi role. Strategy: (A) force logout, (B) periodic `/auth/me`, (C) chấp nhận lag. | RL01, Tất cả | BE / TL | 🟡 |
| 8 | Password policy (độ dài min, ký tự đặc biệt). Cần chốt để validate Zod + UI hint. Ảnh hưởng US01 (create/reset) + PW01. | US01, PW01 | BA / BE | 🟡 |
| 9 | Sau đổi mật khẩu (PW01), BE có invalidate refresh_token không? → Ảnh hưởng post-success flow (tiếp tục session hay redirect login). | PW01 | BE | 🟡 |
| 10 | Soft-delete `mst_options` vs hard-delete: nếu hard-delete thì entity cũ đang dùng option đó bị mất reference. Cần chốt với BE. | MS01 | BE / BA | 🟡 |
| 11 | `is_admin` trên Role vs `full_permission` — định nghĩa rõ sự khác biệt và cách BE xử lý. | RL01 | BA / BE | 🟡 |
| 12 | Tenant ID format — BE tự generate hay FE gửi? Khuyến nghị BE generate. | TN01 | BE | 🟡 |
| 13 | `GET /permission_keys` — static hay dynamic? staleTime có thể set `Infinity` nếu static. | RL01 | BE | 🟢 |
| 14 | Production FE là Next.js 16 (FE.md) — wireframe `web/src` vanilla JS chỉ là reference UI. Không port logic mock/state từ wireframe sang production. | Tất cả | TL | 🟢 |
| 15 | Column settings default columns (fallback khi API lỗi hoặc user chưa cấu hình) — BE trả trong response hay FE hard-code? | ST01 | TL / BE | 🟢 |
