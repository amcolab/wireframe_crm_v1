# Technical Design Spec: SMOS-CT01 – 担当者一覧・詳細 (Contact List & Detail)

Category: 4. Specification (HOW)
Status: Draft
Platform: Web (Next.js 16 App Router) · State: React Query + React Context · Form: React Hook Form + Zod · Grid: AG Grid · BE: Rails 8 API REST `/api/v1`
Nguồn input: `Technique_Spec.md` (template), `FE.md`, `BE.md`, `docs/api-design.md`, `docs/db-notes.md`, `schema.txt`, wireframe `web/src/screens/contact/ct01_list.js`.

> ⚠️ Lưu ý khác biệt nền tảng so với template demo (S2_001 Flutter/Firestore): **SMOS không có realtime**. Đây là CRM REST thuần (Rails). Vì vậy mục 7 "Realtime Design" được **chuyển thể thành Data-Sync / Cache Design** (React Query refetch + invalidate + optimistic update), mục 8 thành **List UX Protection** cho refetch. Mọi chỗ nói "realtime" trong template được hiểu lại theo nghĩa này.

---

## 1. Mục đích

Chốt cách implement màn **担当者一覧・詳細** (danh sách người liên hệ + panel chi tiết) của SMOS:

- Màn implement bằng kiến trúc nào (list + detail panel, AG Grid).
- FE chia component ra sao (container vs presentational).
- Data lấy từ đâu (REST `/api/v1/contacts` qua React Query).
- API contract draft cần gì (đối chiếu `docs/api-design.md §3`).
- State quản lý ở đâu (server state vs UI state).
- Business rule implement ở FE hay BE (tenant scope, permission, filter/sort/search).
- **Đồng bộ dữ liệu** xử lý thế nào (cache invalidate sau mutation; không realtime).
- Error / fallback xử lý thế nào.
- Permission xử lý thế nào (role_permissions `contact.*`).
- Điểm nào chưa rõ cần hỏi lại (Open Questions §15).

Story này **chỉ** xử lý màn 担当者; logic chi tiết của 会社/活動/案件 thuộc story riêng (CP01/AT01/PR01) — ở đây chỉ điều hướng/đọc dạng tab quan hệ.

---

## 2. Component Architecture

Platform: **Next.js 16 App Router** (`app/(tenant)/contact/page.tsx`, `"use client"`). State: **React Query** (server) + **React Context/hooks** (UI). Form: **RHF + Zod**. Grid: **AG Grid enterprise**.

### 2.1. Component tree

```
ContactPage (page.tsx)
└── ContactScreen
    ├── ContactListPanel
    │   ├── ContactListHeader
    │   │   ├── ContactQuickSearchBox        // 会社名 + 担当者名 quick search (q)
    │   │   ├── AdvancedSearchButton         // mở ContactAdvancedSearchDialog
    │   │   └── CreateContactButton          // mở ContactCreateDialog
    │   ├── ContactListToolbar
    │   │   ├── ColumnSettingsButton         // 列の設定
    │   │   ├── ExportCsvButton / ImportCsvButton
    │   │   └── BulkDeleteButton             // enable khi có selection
    │   ├── ContactListBody
    │   │   ├── ContactListLoadingView       // skeleton/overlay
    │   │   ├── ContactListErrorView         // message + 再読み込み
    │   │   ├── ContactListEmptyView         // no-data vs no-result
    │   │   └── ContactGrid (AG Grid)
    │   │       ├── ContactColumnFilterRow   // filter theo cột (set/text)
    │   │       └── ContactRow → cells
    │   └── ContactPager                     // page / per_page / total
    ├── ContactDetailPanel
    │   ├── ContactDetailTabs                // 基本情報 | 活動 | 案件
    │   ├── ContactBasicInfoForm (RHF+Zod)
    │   │   ├── ContactNameFields            // 姓*, 名*, フリガナ(姓・名)
    │   │   ├── ContactCompanyFields         // 会社 lookup + 新規会社 button
    │   │   ├── ContactDeptFields            // 部署名
    │   │   ├── ContactTelFields             // TEL, 内線, FAX, 携帯電話
    │   │   ├── ContactEmailFields           // Email
    │   │   ├── ContactJobFields             // 職種 (master), 職位 (master), 役職名
    │   │   ├── ContactAddressFields         // 郵便番号, 住所
    │   │   ├── ContactFollowFields          // フォロー予定
    │   │   ├── ContactFlagFields            // TEL禁止, TEL注意, 資料禁止
    │   │   ├── ContactFreeFields            // custom_fields free1..free3
    │   │   ├── ContactRemarkFields          // 担当者備考
    │   │   ├── ContactAuditFields           // created_at/by, updated_at/by (read-only)
    │   │   └── ContactDetailActions         // 保存 / 削除 / コピー新規 / 新規活動 / 新規案件
    │   ├── RelatedActivitiesTab             // GET /activities?filters[contact_id]=
    │   │   ├── ActivityInlineEditTable      // bảng inline-edit (dblclick)
    │   │   └── ActivityQuickAddRow          // quick-add row
    │   └── RelatedProjectsTab               // GET /projects?filters[contact_id]=
    │       └── ProjectReadOnlyTable         // bảng read-only
    └── (Dialogs – React Portal)
        ├── ContactCreateDialog              // RHF+Zod (reuse ContactBasicInfoForm fields)
        ├── ContactAdvancedSearchDialog      // multi-field filter form
        ├── CompanyLookupDialog              // chọn 会社 (lookup)
        ├── CompanyCreateDialog              // tạo 新規会社 từ màn contact
        ├── ColumnSettingsDialog             // visible/order theo user
        └── ConfirmDeleteDialog              // xoá đơn / bulk
```

### 2.2. Component giữ state / gọi hook (Container)

| Component | Vai trò |
| --- | --- |
| `ContactScreen` | Root. Giữ UI state cục bộ: `selectedId`, panel split width, tab đang mở. Cung cấp context cho dialog handlers. |
| `ContactListPanel` | Gọi `useContactList(params)` (React Query). Sở hữu `listParams` (page, per_page, sort, order, q, filters). |
| `ContactQuickSearchBox` | Giữ input 会社名 + 担当者名 cục bộ + debounce → cập nhật `listParams.q`. |
| `ContactColumnFilterRow` | Cập nhật `listParams.filters[...]` (set filter cho 職種/職位). |
| `ContactDetailPanel` | Gọi `useContact(selectedId)` + `useUpdateContact()` / `useDeleteContact()`. |
| `ContactBasicInfoForm` | Giữ form state qua RHF (`useForm` + `zodResolver`). |
| `ContactCreateDialog` | Giữ form riêng + `useCreateContact()`. Nhận seed `company_id` nếu mở từ màn công ty. |
| `RelatedActivitiesTab` | Gọi `useActivityList({ filters: { contact_id } })`. Quản lý inline-edit state + `useUpdateActivity()`. Phân trang con riêng. |
| `RelatedProjectsTab` | Gọi `useProjectList({ filters: { contact_id } })`. Phân trang con riêng. Read-only. |

> Nguyên tắc: **UI không gọi thẳng `apiFetch`** (theo `FE.md §5`). Luồng: `Component → hook (React Query) → lib/api/contact → api-client → BE`.

### 2.3. Component chỉ render UI (Presentational)

| Component | Nhận vào (props) | Render |
| --- | --- | --- |
| `ContactListHeader` | callbacks | Bố cục search (会社名 + 担当者名) + nút advanced + nút tạo |
| `ContactListLoadingView` | — | Skeleton rows / overlay |
| `ContactListErrorView` | `onRetry` | Message lỗi + `再読み込み` |
| `ContactListEmptyView` | `hasFilter: boolean` | `データがありません` / `該当する結果が見つかりません` |
| `ContactGrid` | `rows: ContactListItemVM[]`, `columns`, `onRowSelect`, `selectedId` | AG Grid render 13 cột |
| `ActivityInlineEditTable` | `rows`, `onCellEdit`, `onAddRow` | Bảng 活動 với dblclick inline-edit |
| `ProjectReadOnlyTable` | `rows` | Bảng 案件 read-only |
| `ContactAuditFields` | `ContactDetailVM` | created/updated read-only |
| `ContactPager` | `meta`, `onPageChange`, `onPerPageChange` | First/Prev/Next/Last + page-size |

> Presentational chỉ nhận dữ liệu qua props, không đọc React Query, không chứa business logic.

### 2.4. Reuse / refactor từ wireframe & FE hiện có

| Component | Nguồn hiện tại | Hành động |
| --- | --- | --- |
| `ContactGrid` | `ct01_list.js` (contactTable, 13 cột) + `lib/.../ag-grid` | Reuse AG Grid wrapper của FE; map cột từ wireframe |
| `ContactColumnFilterRow` | `entityListColumnFilters.js` | Refactor sang React (set filter 職種/職位, text filter các cột khác) |
| `ContactPager` | `pager.js` | Refactor sang component dùng `meta` |
| `ContactAdvancedSearchDialog` | `searchFilters.js` + `dlgContactAdvancedSearch` | Refactor sang RHF |
| `CompanyLookupDialog` | `dlgCompanyLookup` + `contactCreateForm.js` (`resolveCompanyFromContact`) | Refactor sang React dialog |
| `ActivityInlineEditTable` | `ct01_list.js` (`startCellEditing`, `addContactActivityRow`) | Refactor sang React; gọi `PATCH /activities/:id` |
| `ColumnSettingsDialog` | `columnSettings.js` (localStorage) | Refactor sang API `/field_settings` (xem §6/§15) |
| `ContactCreateDialog` | `contactCreateForm.js` (`openContactCreateDialog`) | Refactor; reuse field components của detail form |
| Related tabs | `entityTabTable.js` | Reuse pattern tab + empty state |

Reuse nguyên trạng từ FE: `apiFetch` (`lib/api-client.ts`), `useApiMutation`, `query-keys`, shadcn `ui/*`, toast (Sonner).

---

## 3. Data Type / View Model

FE render theo **View Model riêng**, không phụ thuộc trực tiếp DB/response. Hai context: **list item** (lưới) và **detail** (form).

### 3.1. Nguyên tắc

| Rule | Nội dung |
| --- | --- |
| Tách khỏi DB | BE trả `snake_case`; FE map về VM `camelCase` (1 nơi: `lib/utils/contact-mappers`). |
| Nullable có fallback | Mọi field nullable có fallback rõ khi hiển thị (§3.5). |
| Không lộ raw | Không render `null/undefined/NaN` ra UI. |
| List ≠ Detail | List VM gọn (13 cột lưới); Detail VM đầy đủ + `customFields` + audit. |

### 3.2. View Model: `ContactListItemVM`

| Field | Type | Nullable | Mục đích |
| --- | --- | --- | --- |
| `id` | number | No | Chọn row → load detail |
| `companyId` | number | No | Hiển thị 会社ID |
| `companyName` | string | Yes | Hiển thị 会社名 (join read-only) + link cross-screen |
| `department` | string | Yes | Hiển thị 部署名 |
| `lastName` | string | No | Hiển thị 担当(姓) |
| `firstName` | string | No | Hiển thị 担当(名) |
| `fullNameKana` | string | Yes | Hiển thị フリガナ (ghép last + first kana) |
| `tel` | string | Yes | Hiển thị TEL |
| `mobileTel` | string | Yes | Hiển thị 携帯電話 |
| `email` | string | Yes | Hiển thị Email |
| `jobCategory` | string | Yes | Hiển thị + set filter 職種 |
| `jobRank` | string | Yes | Hiển thị + set filter 職位 |
| `jobTitle` | string | Yes | Hiển thị 役職名 |
| `address` | string | Yes | Hiển thị 住所 |

### 3.3. View Model: `ContactDetailVM`

Gồm toàn bộ field của list + các field liên hệ/cờ/theo dõi + free fields + audit:

| Nhóm | Field |
| --- | --- |
| Định danh | `id` |
| Tên | `lastName, firstName, lastNameKana, firstNameKana` |
| Công ty | `companyId, companyName` (read-only join) |
| Công việc | `department, jobCategory, jobRank, jobTitle` |
| Liên lạc | `tel, extensionNumber, fax, mobileTel, email` |
| Địa chỉ | `postCode, address` |
| Theo dõi | `followDate` |
| Cờ | `telForbidden, telCaution, brochureForbidden` |
| Ghi chú | `remarks` |
| Free | `customFields: { free1, free2, free3 }` |
| Đăng ký | `userId` (登録者) |
| Audit | `createdAt, updatedAt` (createdBy/updatedBy nếu BE trả) |

### 3.4. Mapping từ nguồn dữ liệu

Một nguồn (REST). Map theo `docs/api-design.md §3`:

| VM field | BE field (snake_case) |
| --- | --- |
| `id` | `id` |
| `companyId` | `company_id` |
| `companyName` | `company_name` (read-only join) |
| `department` | `department` |
| `lastName` / `firstName` | `last_name` / `first_name` |
| `lastNameKana` / `firstNameKana` | `last_name_kana` / `first_name_kana` |
| `fullNameKana` | ghép `last_name_kana + ' ' + first_name_kana` (mapper) |
| `tel` / `extensionNumber` / `fax` | `tel` / `extension_number` / `fax` |
| `mobileTel` | `mobile_tel` |
| `email` | `email` |
| `jobCategory` / `jobRank` / `jobTitle` | `job_category` / `job_rank` / `job_title` |
| `postCode` | `post_code` |
| `address` | `address` |
| `followDate` | `follow_date` |
| `remarks` | `remarks` |
| `telForbidden` / `telCaution` / `brochureForbidden` | `tel_forbidden` / `tel_caution` / `brochure_forbidden` |
| `userId` | `user_id` |
| `customFields.freeN` | `custom_fields.freeN` |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` |

Quy ước:
- Response REST bọc trong `data` (single) / `data[] + meta` (list) theo `ApiClient`.
- `jobCategory` / `jobRank` lấy từ master `mst_options option_type=job_category/job_rank` — cần chốt (Open Question §15).
- `company_name` là read-only join từ BE; FE **không** tự tra cứu tên công ty.

### 3.5. Fallback cho field nullable

Fallback ở **tầng hiển thị**; VM giữ giá trị gốc cho search/sort.

| Field | Khi null / rỗng | Giá trị hiển thị |
| --- | --- | --- |
| `tel` / `mobileTel` / `fax` | thiếu | `-` |
| `email` | thiếu | `-` |
| `address` | thiếu | `-` |
| `companyName` | thiếu | `-` |
| `department` | thiếu | (ô trống) |
| `jobCategory` / `jobRank` / `jobTitle` | thiếu | (ô trống) |
| `fullNameKana` | thiếu | (ô trống) |
| `remarks` | thiếu | ẩn / ô trống |
| `lastName` / `firstName` | **bắt buộc** | nếu thiếu → drop khỏi list + log (§10) |

---

## 4. API Contract Draft

Mục tiêu: chốt **FE cần gì từ BE** cho 担当者. Đối chiếu `docs/api-design.md §3`.

### 4.1. Nguyên tắc

- Story này dùng **1 kênh REST** (không realtime). Mọi cập nhật phản chiếu qua React Query refetch/invalidate.
- Khi BE chốt endpoint chính thức (Swagger `/api-docs`), đối chiếu & cập nhật.

### 4.2. Yêu cầu request (LIST)

```
GET /api/v1/contacts?page=1&per_page=50&sort=last_name&order=asc&q=渡辺
    &filters[company_id]=1141&filters[job_category]=管理&filters[job_rank]=次長
```

| Item | Rule | Hiện trạng |
| --- | --- | --- |
| Purpose | Lấy DS người liên hệ render CT01 | `GET /contacts` (api-design §3) |
| Auth | Required | `Authorization: Bearer <access>` (localStorage `mh_access_token`) |
| Permission | BE check `contact.read` (403 nếu thiếu) | cần BE xác nhận (§15) |
| Tenant context | **Từ JWT**, không nhận từ client | api-design §0 (multi-tenant) |
| Paging | `page`, `per_page` (10/25/50/100) | api-design §0 |
| Sort | `sort` (cột), `order` asc/desc | api-design §0 |
| Search | `q` (họ+tên+会社名) | api-design §3 |
| Filters | `filters[company_id, job_category, job_rank]` | api-design §3 |
| Language | `ja` | (header nếu có) |

### 4.3. Response — field FE cần

Envelope list: `{ data: contact[], meta: { page, per_page, total, total_pages } }`.
Object `contact` đầy đủ field theo `docs/api-design.md §3`. FE map sang VM (§3.4). Field bắt buộc cho list: `id`, `company_id`, `last_name`, `first_name`; phần còn lại nullable.

CRUD/khác (theo api-design §3):

| Method | Path | Dùng cho |
| --- | --- | --- |
| GET | `/contacts/:id` | Load detail panel |
| POST | `/contacts` | ContactCreateDialog (201 → contact); seed `company_id` nếu mở từ màn công ty |
| PATCH | `/contacts/:id` | Lưu detail form |
| DELETE | `/contacts/:id` | Xoá đơn |
| POST | `/contacts/bulk_delete` | Xoá nhiều (`{ ids: [...] }`) |
| GET | `/contacts/export` | Export CSV (cùng filter) |
| POST | `/contacts/import` | Import CSV (multipart) |
| GET | `/activities?filters[contact_id]=` | Tab 活動 |
| PATCH | `/activities/:id` | Inline-edit ô trong tab 活動 |
| GET | `/projects?filters[contact_id]=` | Tab 案件 (read-only) |

### 4.4. Error handling

| Error | UI handling |
| --- | --- |
| 401 | Theo auth rule chung → refresh; fail → logout/về login |
| 403 | Message quyền; không render list/không cho lưu |
| 404 (detail) | "対象が見つかりません" + clear selection |
| 409 (conflict) | Thông báo trùng/đang bị sửa; reload detail |
| 422 (validation) | Map `error.details` → lỗi field RHF |
| 500 / network / timeout | Error state + `再読み込み` |

Message load list lỗi: `担当者一覧を読み込めませんでした。時間をおいて再度お試しください。`

### 4.5. Open Questions cho BE

1. Permission: BE có trả **403** khi thiếu `contact.read` / `contact.write` không?
2. `created_by` / `updated_by` (tên người) BE có trả kèm không? (UI audit cần tên, không chỉ timestamp.)
3. `job_category` / `job_rank` pull từ `mst_options` với `option_type` nào? Tên option_type chính thức?
4. Bulk delete có trả per-item error (xoá được phần nào) hay all-or-nothing?
5. Inline-edit tab 活動: `PATCH /activities/:id` ghi ngay (immediate) hay gom lưu batch? (xem §15)

---

## 5. Initial Load Design

Flow load **lần đầu** khi mở `/contact`.

### 5.1. Flow load lần đầu

| Step | Technical action | Nơi xử lý | UI result |
| --- | --- | --- | --- |
| 1 | Check auth + permission `contact.read` | Route guard (middleware/client) + BE 403 | Allow, hoặc show permission message |
| 2 | Resolve context: tenant (từ JWT) | api-client tự gắn Bearer | — |
| 3 | Fetch list snapshot | `useContactList(params)` → `GET /contacts` | `isLoading` → **skeleton** (không để lưới trống) |
| 4 | Map response → `ContactListItemVM[]` | mapper | — |
| 5 | Render grid 13 cột + pager | AG Grid | Hiển thị danh sách |
| 6 | (Empty) data rỗng | — | `データがありません` (hoặc no-result nếu có filter) |
| 7 | (Error) | — | Error view + `再読み込み` |
| 8 | Auto-select row đầu (tuỳ chọn) | `selectedId = data[0].id` | Mở detail panel → `useContact(id)` |
| 9 | Apply pending search (cross-screen) | `takePendingContactSearch()` (screenNavigation) | Pre-fill filter 会社名 / 担当者名 nếu điều hướng từ màn khác |

> Sort & filter mặc định do **BE** thực hiện qua query params; FE chỉ gửi `listParams`. Không cần lọc lại client cho list chính.

### 5.2. Chuỗi state (React Query)

```
idle → isLoading            (fetch lần đầu)  → skeleton
     → isSuccess (data ≥1)                   → grid
     | isSuccess (data [])                   → empty view
     | isError                               → error view + retry
```

`empty` suy ra từ `isSuccess && data.length === 0`. Phân biệt **no-data** vs **no-result** dựa trên `listParams` có filter/q hay không.

### 5.3. Detail load

Khi `selectedId` đổi → `useContact(id)` (`GET /contacts/:id`). React Query cache theo `['contact', id]`. Trong khi load: detail panel show skeleton; lỗi → error inline + nút thử lại.

### 5.4. Tab quan hệ load

- Tab 活動: `useActivityList({ filters: { contact_id } })` — load khi tab active lần đầu (lazy). Khi `selectedId` thay đổi → invalidate + refetch.
- Tab 案件: `useProjectList({ filters: { contact_id } })` — tương tự, read-only.

### 5.5. Edge cases khi load

| Case | Xử lý |
| --- | --- |
| Không có quyền | Không render list, show permission message |
| Đang tải | Skeleton lưới + detail |
| Lỗi/timeout | Error state + `再読み込み` (retry = refetch) |
| Không có 担当者 | `データがありません` |
| Item thiếu `last_name`/`first_name` (bắt buộc) | Drop item + log invalid (§10) |
| Item thiếu field nullable | Fallback theo §3.5 |
| Cross-screen pending search | Apply filter 会社名 / 担当者名 trước khi fetch đầu tiên |

---

## 6. Business Rule Implementation

Quyết định mỗi rule nằm ở BE hay FE.

### 6.1. Bảng ownership

| Rule type | BE | FE | Ghi chú |
| --- | --- | --- | --- |
| Permission | **Required** | Guard thêm | BE 403 theo `role_permissions`; FE guard router + ẩn nút write nếu thiếu quyền |
| Tenant scope | **Required** | — | BE scope theo `tenant_id` từ JWT; client **không** gửi tenant |
| Pagination | **Required** | Gửi params | BE phân trang (Pagy) |
| Sort | **Required** (list) | Gửi params | FE chỉ chọn cột/hướng |
| Filter (job_category, job_rank, company_id) | **Required** (list) | Gửi params + per-column UI | BE lọc; FE dựng filter row |
| Quick search `q` | **Required** (list) | Debounce + gửi | BE full-text (姓+名+会社名) |
| Validation (create/update) | **Required** | Mirror (Zod) | BE là nguồn sự thật (422 → field error); FE validate sớm bằng Zod |
| Inline-edit 活動 | **Required** | `PATCH /activities/:id` | FE không tự lưu local-only; BE xác nhận mỗi thay đổi (xem §15) |
| Fallback UI | N/A | **Required** | §3.5 |
| Column visibility/order | FE (or BE) | **Required** | Hiện wireframe lưu localStorage; nên chuyển `/field_settings` (db-notes #8, §15) |
| Cache đồng bộ sau mutation | N/A | **Required** | Invalidate query keys (§7) |

> "Guard thêm" = defensive, không thay BE. BE đúng → FE no-op; BE/cache sai → FE chặn hiển thị sai.

### 6.2. FE implement từng rule

**Permission** — Guard ở router; nếu vào được mà BE 403 → permission message. Ẩn/disable nút `新規 / 保存 / 削除 / インポート` nếu thiếu `contact.create/update/delete/import`. (Permission keys: `contact.read|create|update|delete|export|import` — api-design §11.)

**Search (`q`)** — Debounce ~300ms input 会社名 + 担当者名 → gộp thành `listParams.q` → refetch. Không lọc client cho list chính.

**Filter cột** — `ContactColumnFilterRow` set `filters[field]` (set filter cho 職種/職位, text filter cho 会社名/部署/姓/名/住所…) → refetch.

**Sort** — Click header AG Grid → `sort/order` → refetch (server-side sort).

**Validation** — `contactSchema` (Zod) cho create/update: `last_name` required; `first_name` required; `company_id` required; `email` format nếu có; `tel/mobile_tel` format nếu áp dụng; `follow_date` date valid. BE 422 → map `error.details` về field RHF.

**Company lookup** — Ô 会社 trong form mở `CompanyLookupDialog` (tìm theo tên → chọn → set `company_id`). Nút `新規会社` mở `CompanyCreateDialog` → tạo xong → seed `company_id` mới vào form.

**コピー新規** — Lấy dữ liệu contact hiện tại, clear `id/audit` fields, pre-fill form trong `ContactCreateDialog`. User sửa rồi lưu → POST mới.

**Inline-edit tab 活動** — Double-click ô (date/rep/type/comment/purpose) → `startCellEditing` → input/select inline. `blur` / `Enter` → gọi `PATCH /activities/:id` ngay (hoặc batch — xem §15). `Escape` → cancel, không lưu.

**Quick-add row 活動** — Nút `新規活動 (クイック)` → thêm row mới vào đầu bảng với default (date=today, rep=current user) → `POST /activities` với `contact_id` + `company_id` seeded.

**Fallback UI** — Theo §3.5.

### 6.3. Gap so với wireframe hiện tại

| Rule | Wireframe (web/src) | Cần (production Next.js) |
| --- | --- | --- |
| Data | mockData.js (client) | React Query → `/contacts` |
| Filter/sort/search | Client-side trên mock | Server-side qua query params |
| Inline-edit 活動 | Sửa trực tiếp `mockActivities` in-memory | `PATCH /activities/:id` với React Query invalidate |
| Column settings | localStorage | API `/field_settings` (db-notes #8) |
| Permission | Không có | Guard FE + BE 403 |
| Validation | Tối thiểu | Zod + BE 422 mapping |
| Company lookup | `resolveCompanyFromContact` (local mock) | Dialog lookup + POST /companies |

---

## 7. Data-Sync / Cache Design *(thay cho "Realtime Design")*

> SMOS **không realtime**. Đồng bộ dữ liệu = React Query cache + invalidate sau mutation. Mục này chốt cách giữ list/detail nhất quán.

### 7.1. Query keys (đề xuất, theo `lib/query-keys.ts`)

```
['contacts', 'list', listParams]           // danh sách (phụ thuộc page/sort/q/filters)
['contact', id]                            // detail 1 担当者
['activities', 'list', {contact_id}]       // tab 活動 quan hệ
['projects', 'list', {contact_id}]         // tab 案件 quan hệ
```

### 7.2. Invalidate sau mutation

| Mutation | Invalidate / update |
| --- | --- |
| Create contact | `invalidate(['contacts','list'])`; chọn record mới nếu cần |
| Update contact | `invalidate(['contact', id])` + `invalidate(['contacts','list'])` (hoặc `setQueryData` optimistic cho row) |
| Delete / bulk delete | `invalidate(['contacts','list'])`; clear `selectedId` nếu nằm trong tập xoá |
| Import CSV | `invalidate(['contacts','list'])` |
| PATCH activity (inline-edit) | `invalidate(['activities','list',{contact_id}])` (tab 活動); có thể `setQueryData` optimistic cho row |
| POST activity (quick-add) | `invalidate(['activities','list',{contact_id}])` |

### 7.3. Optimistic update (tuỳ chọn)

- Update form contact: `onMutate` set tạm row + detail; `onError` rollback; `onSettled` invalidate.
- Inline-edit ô 活動: `setQueryData` optimistic cho row trước khi PATCH về BE; rollback nếu lỗi.
- Bulk delete: optimistic remove rows; rollback nếu lỗi.

### 7.4. Stale/refetch

- `staleTime` list ~30–60s (theo FE.md cache hit < 60s).
- Refetch on window focus: cân nhắc tắt cho lưới lớn để tránh nháy.
- `再読み込み` thủ công = `refetch()`.

### 7.5. Conflict (last-write nhẹ)

Không có version realtime. Nếu cần chống ghi đè đồng thời: dựa `updated_at`; nếu BE trả 409 khi `updated_at` không khớp → reload detail + báo người dùng. (Open Question §15.)

---

## 8. List UX Protection *(thay cho "Realtime UX Protection")*

Vì không realtime, rủi ro "nhảy dòng" thấp. Vẫn cần bảo vệ thao tác trong lúc refetch:

| Case | Rule |
| --- | --- |
| Đang refetch list | Giữ data cũ (`keepPreviousData`), không clear lưới → tránh nháy/scroll jump |
| User đang sửa detail form | Refetch list **không** ghi đè form đang dirty; cảnh báo nếu rời khi chưa lưu |
| User đang inline-edit ô 活動 | Không trigger refetch tab 活動 khi ô đang có editor open |
| Đổi page/sort khi đang load | Disable pager trong lúc fetch hoặc cancel request cũ |
| Scroll vị trí | Giữ scroll khi data cùng kích thước; reset khi đổi filter/page |
| Mutation xong | Toast xác nhận, không tự nhảy selection trừ khi record bị xoá |
| Keyboard navigation ↑↓ | ArrowUp/Down trên grid → đổi `selectedId` + reload detail; bỏ qua khi focus đang trong input/select/textarea |

Debounce/thời gian cụ thể để implementation quyết.

---

## 9. State Management Design

| State | Loại | Rule |
| --- | --- | --- |
| Contact list data | Server cache (React Query) | `['contacts','list',params]` |
| Contact detail data | Server cache | `['contact', id]` |
| Activities tab data | Server cache | theo `contact_id` |
| Projects tab data | Server cache | theo `contact_id` |
| `listParams` (page/sort/q/filters) | UI state (screen) | Giữ trong ContactScreen; có thể sync URL query |
| `selectedId` | UI transient | Chọn row → load detail |
| Active tab | UI transient | 基本情報/活動/案件 |
| Form state (create/detail) | Form state (RHF) | Local trong form |
| Inline-edit cell state | UI transient | Local trong `ActivityInlineEditTable` |
| Dialog open/close | UI transient | Context dialog handlers |
| Column visibility/order | User setting | localStorage → API `/field_settings` (mục tiêu) |
| Panel split width / list height | UI persistent | localStorage (`smos.ct01.listH`) |
| Pending cross-screen search | UI transient | `takePendingContactSearch()` (screenNavigation) |

Không đưa state chỉ dùng trong màn vào global store.

---

## 10. Error / Fallback Design

| Case | UI behavior |
| --- | --- |
| Loading list/detail | Skeleton |
| Empty list (no data) | `データがありません` |
| Empty (no result, có filter) | `該当する結果が見つかりません` + nút clear filter |
| API error (500) | Error + `再読み込み` |
| Network/timeout | Error + `再読み込み` |
| 401 | Auth flow (refresh → fail → login) |
| 403 | Permission message; ẩn write actions |
| 422 | Field errors trong form (map `error.details`) |
| Invalid row (thiếu `last_name`/`first_name`) | Drop row + log invalid data |
| Inline-edit PATCH lỗi | Rollback ô về giá trị cũ + toast lỗi |
| Raw null/undefined/NaN | Never display (fallback §3.5) |

Fallback ví dụ:

| Missing | UI fallback |
| --- | --- |
| Tel / Mobile / Fax / Email | `-` |
| Address | `-` |
| Company name | `-` |
| Job category / rank / title | ô trống |
| Long text (remarks/address) | Ellipsis + tooltip |
| Kana | ô trống |

---

## 11. Navigation Design

| Action | Target | Data |
| --- | --- | --- |
| Chọn row | Detail panel (cùng màn) | `contact.id` |
| Click 会社名 (link) | Màn CP01 (`/company`) | prefilter `company_name` |
| Tab 活動 → click link タイプ | Màn AT01 (`/activity`) | prefilter `company + contact + type` |
| Tab 案件 → click link 案件名 | Màn PR01 (`/project`) | prefilter `company + rep + name` |
| 新規作成 | ContactCreateDialog (modal) | — |
| コピー新規 | ContactCreateDialog (modal) | pre-fill từ current contact |
| 新規活動 (từ detail) | ActivityCreateDialog | seed `contact_id + company_id` |
| 新規活動 (クイック) | Quick-add row trong tab 活動 | seed `contact_id + company_id` |
| 新規案件 (từ detail) | ProjectCreateDialog | seed `contact_id + company_id` |
| 新規会社 (từ form) | CompanyCreateDialog (modal) | seed mới; trả `company_id` về form |
| 再読み込み | Cùng màn | refetch |

Route theo `lib/constants/path.ts` (`controlPaths`). Cross-screen prefilter qua query param / navigation context (pattern `takePendingContactSearch`). Story này **không** xử lý logic của CP01/AT01/PR01.

---

## 12. Permission / Security Design

| Layer | Rule |
| --- | --- |
| FE route guard | Chặn vào `/contact` nếu chưa đăng nhập / thiếu `contact.read` |
| FE component guard | Ẩn/disable nút write nếu thiếu `contact.create/update/delete/import/export` |
| BE/API guard | Reject API nếu thiếu permission (403) — **cần BE thực thi** (BE.md §11 ghi role_permissions "chưa thực thi") |
| Tenant boundary | BE scope theo `tenant_id` từ JWT; không nhận tenant từ client |
| Expired session | api-client tự refresh; fail → clear token → login |
| CSV import/export | Kiểm tra quyền `import/export`; validate file phía BE |
| Inline-edit 活動 | Cần quyền `activity.update`; nếu thiếu → disable dblclick, ẩn quick-add row |

> Rủi ro hiện tại: `role_permissions` đã có schema nhưng BE **chưa enforce** (BE.md §11). FE guard là defensive — **không thay thế** BE enforcement. Đưa vào Risks §15.

---

## 13. Performance / UX Design

| Item | Target |
| --- | --- |
| Initial load | Show skeleton ngay; first paint < ~1s với cache |
| List size | Server-side pagination (mặc định 50); không load toàn bộ |
| Search | Debounce ~300ms; server-side `q` (姓+名+会社名) |
| Sort/filter | Server-side; `keepPreviousData` để mượt |
| Detail | Cache theo id; mở lại tức thì nếu còn fresh |
| Grid 13 cột | AG Grid virtualization; resize/reorder cột |
| Keyboard navigation | ArrowUp/Down trên ContactGrid → đổi row không re-render toàn bộ |
| Tab quan hệ | Lazy load (fetch khi tab active lần đầu); pagination con riêng |
| Inline-edit | Optimistic update + rollback; không block UI |
| CSV export | Stream/async nếu dữ liệu lớn (Open Question quy mô) |

Nếu list rất lớn gây chậm → ghi vào Risks, không tự đổi scope.

---

## 14. Audit / Logging Design

| Log type | Rule |
| --- | --- |
| Business audit | Create/Update/Delete contact → log (ai, khi nào) — **BE** (cân nhắc bảng audit, BE.md §11 mục tương lai) |
| API error log | Log khi list/detail/mutation fail (FE telemetry + BE) |
| Permission log | Log khi BE trả 403 |
| Invalid data log | FE log khi row thiếu field bắt buộc (`last_name`/`first_name`) |
| Import log | Log kết quả import CSV (created/updated/errors) |
| Inline-edit log | Log khi PATCH /activities/:id từ tab 活動 fail |
| Conflict log | Log khi 409 (nếu áp dụng) |

---

## 15. Open Questions / Risks

| No | Question / Risk | Owner | Impact |
| --- | --- | --- | --- |
| 1 | BE đã **enforce** `role_permissions` chưa? (hiện "chưa thực thi" – BE.md §11) | BE / TL | Bảo mật: FE guard không đủ |
| 2 | BE trả `created_by` / `updated_by` (tên) cho audit field không? | BE | Detail audit thiếu tên |
| 3 | `job_category` / `job_rank` pull từ `mst_options`? `option_type` chính thức là gì? | BA / BE | Dropdown 職種/職位 không có dữ liệu (db-notes #3) |
| 4 | Inline-edit tab 活動: save **ngay** (`PATCH /activities/:id` mỗi blur/Enter) hay **batch** (gom lưu khi rời tab)? | TL / BA | Architecture khác nhau: immediate → invalidate ngay; batch → cần dirty-tracking + confirm |
| 5 | Column settings lưu API `/field_settings` (có chiều submenu?) hay localStorage? | TL / BE | Đồng bộ cấu hình cột (db-notes #8) |
| 6 | Conflict đồng thời (2 user sửa 1 contact) xử lý 409 theo `updated_at`? | BE | Mất dữ liệu ghi đè |
| 7 | Bulk delete all-or-nothing hay per-item error? | BE | UX báo lỗi xoá |
| 8 | CSV import: rule validate, giới hạn dòng, mapping cột? | BE / BA | Định hình màn import |
| 9 | `company_name` trong list (join read-only): BE có luôn trả kèm không, hay FE phải tra thêm? | BE | Cột 会社名 trong grid trống nếu không có |
| 10 | Production FE chốt là Next.js (FE.md) — wireframe `web/src` (vanilla JS) chỉ là tham chiếu? | TL | Tránh hiểu nhầm stack |

---

## Phụ lục A — Áp dụng pattern cho các story liên quan

Màn CT01 dùng **cùng kiến trúc** với CP01/AT01/PR01 (list+detail panel, AG Grid, React Query, RHF+Zod, dialog tạo, tab quan hệ). Điểm khác biệt chính của CT01:

| Đặc điểm | CT01 担当者 | CP01 会社 | AT01 活動 | PR01 案件 |
| --- | --- | --- | --- | --- |
| Endpoint | `/contacts` | `/companies` | `/activities` | `/projects` |
| Filter chính | `company_id, job_category, job_rank` | `industry, scale_rank, district…` | `act_type, user_id, company_id, contact_id` | `status, user_id, company_id` |
| Tab quan hệ | 活動 (inline-edit), 案件 (read-only) | 担当者, 活動, 案件 | — | 活動 (inline-edit) |
| Đặc thù | Company lookup + 新規会社; コピー新規; inline-edit 活動 tab | Thêm nhiều field tài chính | Date range filter; seed FK snapshot | 🔴 chờ mở rộng DB |
| DB note | Đủ cột | Cần chốt district (#2) | Thiếu attendee_count (#7) | Thiếu nhiều cột (#1/#5/#6) |

> Pattern dùng chung: `apiFetch` → React Query hooks → VM mapper → AG Grid + RHF+Zod → dialog tạo + lookup → tab quan hệ + nested pager. Mọi story đều áp dụng cùng error/fallback/permission/cache-invalidate design.

> PR01 phụ thuộc việc mở rộng bảng `projects`. **Nên ưu tiên chốt DB trước khi viết Tech Spec chi tiết PR01.**
