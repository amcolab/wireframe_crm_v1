# Technical Design Spec: SMOS-CP01 – 会社一覧・詳細 (Company List & Detail)

Category: 4. Specification (HOW)
Status: Draft
Platform: Web (Next.js 16 App Router) · State: React Query + React Context · Form: React Hook Form + Zod · Grid: AG Grid · BE: Rails 8 API REST `/api/v1`
Nguồn input: `Technique_Spec.md` (template), `FE.md`, `BE.md`, `docs/api-design.md`, `docs/db-notes.md`, `schema.txt`, wireframe `web/src/screens/company/cp01_list.js`.

> ⚠️ Lưu ý khác biệt nền tảng so với template demo (S2_001 Flutter/Firestore): **SMOS không có realtime**. Đây là CRM REST thuần (Rails). Vì vậy mục 7 "Realtime Design" được **chuyển thể thành Data-Sync / Cache Design** (React Query refetch + invalidate + optimistic update), mục 8 thành **List UX Protection** cho refetch. Mọi chỗ nói "realtime" trong template được hiểu lại theo nghĩa này.

---

## 1. Mục đích

Chốt cách implement màn **会社一覧・詳細** (danh sách công ty + panel chi tiết) của SMOS:

- Màn implement bằng kiến trúc nào (list + detail panel, AG Grid).
- FE chia component ra sao (container vs presentational).
- Data lấy từ đâu (REST `/api/v1/companies` qua React Query).
- API contract draft cần gì (đối chiếu `docs/api-design.md §2`).
- State quản lý ở đâu (server state vs UI state).
- Business rule implement ở FE hay BE (tenant scope, permission, filter/sort/search).
- **Đồng bộ dữ liệu** xử lý thế nào (cache invalidate sau mutation; không realtime).
- Error / fallback xử lý thế nào.
- Permission xử lý thế nào (role_permissions `company.*`).
- Điểm nào chưa rõ cần hỏi lại (Open Questions §15).

Story này **chỉ** xử lý màn 会社; logic chi tiết của 担当者/活動/案件 thuộc story riêng (CT01/AT01/PR01) — ở đây chỉ điều hướng/đọc dạng tab quan hệ.

---

## 2. Component Architecture

Platform: **Next.js 16 App Router** (`app/(tenant)/company/page.tsx`, `"use client"`). State: **React Query** (server) + **React Context/hooks** (UI). Form: **RHF + Zod**. Grid: **AG Grid enterprise**.

### 2.1. Component tree

```
CompanyPage (page.tsx)
└── CompanyScreen
    ├── CompanyListPanel
    │   ├── CompanyListHeader
    │   │   ├── CompanyQuickSearchBox        // 会社名 quick search (q)
    │   │   ├── AdvancedSearchButton         // mở CompanyAdvancedSearchDialog
    │   │   └── CreateCompanyButton          // mở CompanyCreateDialog
    │   ├── CompanyListToolbar
    │   │   ├── ColumnSettingsButton         // 列の設定
    │   │   ├── ExportCsvButton / ImportCsvButton
    │   │   └── BulkDeleteButton             // enable khi có selection
    │   ├── CompanyListBody
    │   │   ├── CompanyListLoadingView       // skeleton/overlay
    │   │   ├── CompanyListErrorView         // message + 再読み込み
    │   │   ├── CompanyListEmptyView         // no-data vs no-result
    │   │   └── CompanyGrid (AG Grid)
    │   │       ├── CompanyColumnFilterRow   // filter theo cột (set/text/date range)
    │   │       └── CompanyRow → cells
    │   └── CompanyPager                     // page / per_page / total
    ├── CompanyDetailPanel
    │   ├── CompanyDetailTabs                // 会社詳細 | 担当者 | 活動 | 案件
    │   ├── CompanyDetailForm (RHF+Zod)
    │   │   ├── CompanyBasicFields           // name*, tel, fax, post_code, prefecture, address
    │   │   ├── CompanyClassifyFields        // industry, industry_type, scale_rank, company_type, district
    │   │   ├── CompanyFinanceFields         // employee_count, fiscal_closing_month, revenue, capital
    │   │   ├── CompanyFlagFields            // is_tel_forbidden, is_brochure_forbidden
    │   │   ├── CompanyFreeFields            // custom_fields free1..free7
    │   │   ├── CompanyAuditFields           // created_at/by, updated_at/by (read-only)
    │   │   └── CompanyDetailActions         // 保存 / 削除 / キャンセル
    │   ├── RelatedContactsTab               // GET /contacts?filters[company_id]=
    │   ├── RelatedActivitiesTab             // GET /activities?filters[company_id]=
    │   └── RelatedProjectsTab               // GET /projects?filters[company_id]=
    └── (Dialogs – React Portal)
        ├── CompanyCreateDialog              // RHF+Zod (reuse CompanyDetailForm fields)
        ├── CompanyAdvancedSearchDialog      // multi-field filter form
        ├── ColumnSettingsDialog             // visible/order theo user
        └── ConfirmDeleteDialog              // xoá đơn / bulk
```

### 2.2. Component giữ state / gọi hook (Container)

| Component | Vai trò |
| --- | --- |
| `CompanyScreen` | Root. Giữ UI state cục bộ: `selectedId`, panel split width, tab đang mở. Cung cấp context cho dialog handlers. |
| `CompanyListPanel` | Gọi `useCompanyList(params)` (React Query). Sở hữu `listParams` (page, per_page, sort, order, q, filters). |
| `CompanyQuickSearchBox` | Giữ input cục bộ + debounce → cập nhật `listParams.q`. |
| `CompanyColumnFilterRow` | Cập nhật `listParams.filters[...]`. |
| `CompanyDetailPanel` | Gọi `useCompany(selectedId)` + `useUpdateCompany()` / `useDeleteCompany()`. |
| `CompanyDetailForm` | Giữ form state qua RHF (`useForm` + `zodResolver`). |
| `CompanyCreateDialog` | Giữ form riêng + `useCreateCompany()`. |
| `RelatedContactsTab` / `RelatedActivitiesTab` / `RelatedProjectsTab` | Gọi list hook tương ứng với `filters[company_id]` + phân trang con riêng. |

> Nguyên tắc: **UI không gọi thẳng `apiFetch`** (theo `FE.md §5`). Luồng: `Component → hook (React Query) → lib/api/company → api-client → BE`.

### 2.3. Component chỉ render UI (Presentational)

| Component | Nhận vào (props) | Render |
| --- | --- | --- |
| `CompanyListHeader` | callbacks | Bố cục search + nút advanced + nút tạo |
| `CompanyListLoadingView` | — | Skeleton rows / overlay |
| `CompanyListErrorView` | `onRetry` | Message lỗi + `再読み込み` |
| `CompanyListEmptyView` | `hasFilter: boolean` | `データがありません` / `該当する結果が見つかりません` |
| `CompanyGrid` | `rows: CompanyListItemVM[]`, `columns`, `onRowSelect`, `selectedId` | AG Grid render |
| `CompanyAuditFields` | `CompanyDetailVM` | created/updated read-only |
| `CompanyPager` | `meta`, `onPageChange`, `onPerPageChange` | First/Prev/Next/Last + page-size |

> Presentational chỉ nhận dữ liệu qua props, không đọc React Query, không chứa business logic.

### 2.4. Reuse / refactor từ wireframe & FE hiện có

| Component | Nguồn hiện tại | Hành động |
| --- | --- | --- |
| `CompanyGrid` | `cp01_list.js` (companyTable) + `lib/.../ag-grid` | Reuse AG Grid wrapper của FE; map cột từ wireframe |
| `CompanyColumnFilterRow` | `entityListColumnFilters.js` | Refactor sang React (set/text/date filter) |
| `CompanyPager` | `pager.js` | Refactor sang component dùng `meta` |
| `CompanyAdvancedSearchDialog` | `searchFilters.js` + `dlgCompanyAdvancedSearch` | Refactor sang RHF |
| `ColumnSettingsDialog` | `columnSettings.js` (localStorage) | Refactor sang API `/field_settings` (xem §6/§15) |
| `CompanyCreateDialog` | `dlgCompanyCreate` | Refactor; reuse field components của detail form |
| Related tabs | `entityTabTable.js` | Reuse pattern tab + empty state |

Reuse nguyên trạng từ FE: `apiFetch` (`lib/api-client.ts`), `useApiMutation`, `query-keys`, shadcn `ui/*`, toast (Sonner).

---

## 3. Data Type / View Model

FE render theo **View Model riêng**, không phụ thuộc trực tiếp DB/response. Hai context: **list item** (lưới) và **detail** (form).

### 3.1. Nguyên tắc

| Rule | Nội dung |
| --- | --- |
| Tách khỏi DB | BE trả `snake_case`; FE map về VM `camelCase` (1 nơi: `lib/utils/company-mappers`). |
| Nullable có fallback | Mọi field nullable có fallback rõ khi hiển thị (§3.5). |
| Không lộ raw | Không render `null/undefined/NaN` ra UI. |
| List ≠ Detail | List VM gọn (cột lưới); Detail VM đầy đủ + `customFields` + audit. |

### 3.2. View Model: `CompanyListItemVM`

| Field | Type | Nullable | Mục đích |
| --- | --- | --- | --- |
| `id` | number | No | Chọn row → load detail |
| `name` | string | No | Hiển thị + search (会社名) |
| `tel` | string | Yes | Hiển thị 代表TEL |
| `address` | string | Yes | Hiển thị 住所 |
| `industry` | string | Yes | Hiển thị + filter 業界 |
| `industryType` | string | Yes | Hiển thị + filter 業種 |
| `scaleRank` | string | Yes | Hiển thị + filter 規模ランク |
| `companyType` | string | Yes | Hiển thị + filter 種別 |
| `employeeCount` | number | Yes | Hiển thị 従業員数 |
| `district` | string | Yes | Hiển thị + filter 地区 (xem db-notes #2) |
| `prefecture` | string | Yes | Hiển thị + filter 都道府県 |
| `notes` | string | Yes | Hiển thị 会社備考 (cột remark) |

### 3.3. View Model: `CompanyDetailVM`

Gồm toàn bộ field của list + các field tài chính/cờ + free fields + audit:

| Nhóm | Field |
| --- | --- |
| Cơ bản | `id, name, tel, fax, postCode, prefecture, district, address` |
| Phân loại | `industry, industryType, scaleRank, companyType, corporateNum` |
| Tài chính | `employeeCount, fiscalClosingMonth, revenue, capital` |
| Cờ | `isTelForbidden, isBrochureForbidden` |
| Free | `customFields: { free1..free7 }` |
| Ghi chú | `notes` |
| Audit | `createdAt, updatedAt` (createdBy/updatedBy nếu BE trả) |

### 3.4. Mapping từ nguồn dữ liệu

Một nguồn (REST). Map theo `docs/api-design.md §2`:

| VM field | BE field (snake_case) |
| --- | --- |
| `id` | `id` |
| `name` | `name` |
| `tel` / `fax` | `tel` / `fax` |
| `postCode` | `post_code` |
| `prefecture` / `district` | `prefecture` / `district` |
| `address` | `address` |
| `industry` / `industryType` | `industry` / `industry_type` |
| `scaleRank` / `companyType` | `scale_rank` / `company_type` |
| `corporateNum` | `corporate_num` |
| `employeeCount` | `employee_count` |
| `fiscalClosingMonth` | `fiscal_closing_month` |
| `revenue` / `capital` | `revenue` / `capital` (parse số, bỏ dấu phẩy — db-notes #11) |
| `isTelForbidden` / `isBrochureForbidden` | `is_tel_forbidden` / `is_brochure_forbidden` |
| `customFields.freeN` | `custom_fields.freeN` |
| `notes` | `notes` |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` |

Quy ước:
- Response REST bọc trong `data` (list) / `data[] + meta` (theo `ApiClient`).
- `capital` (decimal) và `revenue` (bigint, đơn vị 百万円 — cần chốt db-notes #11): parse khi gửi/nhận; hiển thị có dấu phân cách hàng nghìn.
- `district` đang mang nghĩa "vùng lớn" (関東…) — xem db-notes #2 / Open Question §15.

### 3.5. Fallback cho field nullable

Fallback ở **tầng hiển thị**; VM giữ giá trị gốc cho search/sort.

| Field | Khi null / rỗng | Giá trị hiển thị |
| --- | --- | --- |
| `tel` / `fax` | thiếu | `-` |
| `address` | thiếu | `-` |
| `industry` / `industryType` / `scaleRank` / `companyType` | thiếu | (ô trống) |
| `employeeCount` / `revenue` / `capital` | thiếu / invalid | `-` |
| `prefecture` / `district` | thiếu | (ô trống) |
| `notes` | thiếu | ẩn / ô trống |
| `name` | **bắt buộc** | nếu thiếu → drop khỏi list + log (§10) |

---

## 4. API Contract Draft

Mục tiêu: chốt **FE cần gì từ BE** cho 会社. Đối chiếu `docs/api-design.md §2`.

### 4.1. Nguyên tắc

- S2 này dùng **1 kênh REST** (không realtime). Mọi cập nhật phản chiếu qua React Query refetch/invalidate.
- Khi BE chốt endpoint chính thức (Swagger `/api-docs`), đối chiếu & cập nhật.

### 4.2. Yêu cầu request (LIST)

```
GET /api/v1/companies?page=1&per_page=50&sort=name&order=asc&q=旭川
    &filters[industry]=製造業&filters[scale_rank]=1～30人
```

| Item | Rule | Hiện trạng |
| --- | --- | --- |
| Purpose | Lấy DS công ty render CP01 | `GET /companies` (api-design §2) |
| Auth | Required | `Authorization: Bearer <access>` (localStorage `mh_access_token`) |
| Permission | BE check `company.read` (403 nếu thiếu) | cần BE xác nhận (§15) |
| Tenant context | **Từ JWT**, không nhận từ client | api-design §0 (multi-tenant) |
| Paging | `page`, `per_page` (10/25/50/100) | api-design §0 |
| Sort | `sort` (cột), `order` asc/desc | api-design §0 |
| Search | `q` (full-text cột chính) | api-design §0 |
| Filters | `filters[industry, industry_type, scale_rank, company_type, district, prefecture]` | api-design §2 |
| Language | `ja` | (header nếu có) |

### 4.3. Response — field FE cần

Envelope list: `{ data: company[], meta: { page, per_page, total, total_pages } }`.
Object `company` đầy đủ field theo `docs/api-design.md §2`. FE map sang VM (§3.4). Field bắt buộc cho list: `id`, `name`, `status` các cột hiển thị; phần còn lại nullable.

CRUD/khác (theo api-design §2):

| Method | Path | Dùng cho |
| --- | --- | --- |
| GET | `/companies/:id` | Load detail panel |
| POST | `/companies` | CompanyCreateDialog (201 → company) |
| PATCH | `/companies/:id` | Lưu detail form |
| DELETE | `/companies/:id` | Xoá đơn |
| POST | `/companies/bulk_delete` | Xoá nhiều (`{ ids: [...] }`) |
| GET | `/companies/export` | Export CSV (cùng filter) |
| POST | `/companies/import` | Import CSV (multipart) |
| GET | `/contacts?filters[company_id]=` | Tab 担当者 |
| GET | `/activities?filters[company_id]=` | Tab 活動 |
| GET | `/projects?filters[company_id]=` | Tab 案件 |

### 4.4. Error handling

| Error | UI handling |
| --- | --- |
| 401 | Theo auth rule chung → refresh; fail → logout/về login |
| 403 | Message quyền; không render list/không cho lưu |
| 404 (detail) | "対象が見つかりません" + clear selection |
| 409 (conflict) | Thông báo trùng/đang bị sửa; reload detail |
| 422 (validation) | Map `error.details` → lỗi field RHF |
| 500 / network / timeout | Error state + `再読み込み` |

Message load list lỗi: `会社一覧を読み込めませんでした。時間をおいて再度お試しください。`

### 4.5. Open Questions cho BE

1. Permission: BE có trả **403** khi thiếu `company.read` / `company.write` không?
2. `created_by` / `updated_by` (tên người) BE có trả kèm không? (UI audit cần tên, không chỉ timestamp.)
3. `revenue` đơn vị 百万円? `capital` decimal — format gửi/nhận thống nhất? (db-notes #11)
4. `district` (地区) chuẩn hoá thành master `mst_options option_type=area` chứ? (db-notes #2/#3)
5. Bulk delete có trả per-item error (xoá được phần nào) hay all-or-nothing?

---

## 5. Initial Load Design

Flow load **lần đầu** khi mở `/company`.

### 5.1. Flow load lần đầu

| Step | Technical action | Nơi xử lý | UI result |
| --- | --- | --- | --- |
| 1 | Check auth + permission `company.read` | Route guard (middleware/client) + BE 403 | Allow, hoặc show permission message |
| 2 | Resolve context: tenant (từ JWT) | api-client tự gắn Bearer | — |
| 3 | Fetch list snapshot | `useCompanyList(params)` → `GET /companies` | `isLoading` → **skeleton** (không để lưới trống) |
| 4 | Map response → `CompanyListItemVM[]` | mapper | — |
| 5 | Render grid + pager | AG Grid | Hiển thị danh sách |
| 6 | (Empty) data rỗng | — | `データがありません` (hoặc no-result nếu có filter) |
| 7 | (Error) | — | Error view + `再読み込み` |
| 8 | Auto-select row đầu (tuỳ chọn) | `selectedId = data[0].id` | Mở detail panel → `useCompany(id)` |

> Sort & filter mặc định do **BE** thực hiện qua query params; FE chỉ gửi `listParams`. Không cần lọc lại client cho list chính (khác template Flutter — vì SMOS BE là nguồn sự thật và đã scope theo tenant).

### 5.2. Chuỗi state (React Query)

```
idle → isLoading            (fetch lần đầu)  → skeleton
     → isSuccess (data ≥1)                   → grid
     | isSuccess (data [])                   → empty view
     | isError                               → error view + retry
```

`empty` suy ra từ `isSuccess && data.length === 0`. Phân biệt **no-data** vs **no-result** dựa trên `listParams` có filter/q hay không.

### 5.3. Detail load

Khi `selectedId` đổi → `useCompany(id)` (`GET /companies/:id`). React Query cache theo `['company', id]`. Trong khi load: detail panel show skeleton; lỗi → error inline + nút thử lại.

### 5.4. Edge cases khi load

| Case | Xử lý |
| --- | --- |
| Không có quyền | Không render list, show permission message (EX/AC tương ứng) |
| Đang tải | Skeleton lưới + detail |
| Lỗi/timeout | Error state + `再読み込み` (retry = refetch) |
| Không có công ty | `データがありません` |
| Item thiếu `name` (bắt buộc) | Drop item + log invalid (§10) |
| Item thiếu field nullable | Fallback theo §3.5 |

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
| Filter (industry…) | **Required** (list) | Gửi params + per-column UI | BE lọc; FE dựng filter row |
| Quick search `q` | **Required** (list) | Debounce + gửi | BE full-text (pg_trgm) |
| Validation (create/update) | **Required** | Mirror (Zod) | BE là nguồn sự thật (422 → field error); FE validate sớm bằng Zod |
| Fallback UI | N/A | **Required** | §3.5 |
| Column visibility/order | FE (or BE) | **Required** | Hiện wireframe lưu localStorage; nên chuyển `/field_settings` (db-notes #8, §15) |
| Cache đồng bộ sau mutation | N/A | **Required** | Invalidate query keys (§7) |

> "Guard thêm" = defensive, không thay BE. BE đúng → FE no-op; BE/cache sai → FE chặn hiển thị sai.

### 6.2. FE implement từng rule

**Permission** — Guard ở router; nếu vào được mà BE 403 → permission message. Ẩn/disable nút `新規 / 保存 / 削除 / インポート` nếu thiếu `company.create/update/delete/import`. (Permission keys: `company.read|create|update|delete|export|import` — api-design §11.)

**Search (`q`)** — Debounce ~300ms input 会社名 → set `listParams.q` → refetch. Không lọc client cho list chính.

**Filter cột** — `CompanyColumnFilterRow` set `filters[field]` (set filter cho industry/scale_rank…, text cho name/address, range cho ngày nếu có) → refetch.

**Sort** — Click header AG Grid → `sort/order` → refetch (server-side sort).

**Validation** — `companySchema` (Zod) cho create/update: `name` required; `fiscal_closing_month` ∈ 1..12; `revenue/capital` numeric; email/tel format nếu áp dụng. BE 422 → map `error.details` về field RHF.

**Fallback UI** — Theo §3.5.

### 6.3. Gap so với wireframe hiện tại

| Rule | Wireframe (web/src) | Cần (production Next.js) |
| --- | --- | --- |
| Data | mockData.js (client) | React Query → `/companies` |
| Filter/sort/search | Client-side trên mock | Server-side qua query params |
| Column settings | localStorage | API `/field_settings` (db-notes #8) |
| Permission | Không có | Guard FE + BE 403 |
| Validation | Tối thiểu | Zod + BE 422 mapping |

---

## 7. Data-Sync / Cache Design *(thay cho "Realtime Design")*

> SMOS **không realtime**. Đồng bộ dữ liệu = React Query cache + invalidate sau mutation. Mục này chốt cách giữ list/detail nhất quán.

### 7.1. Query keys (đề xuất, theo `lib/query-keys.ts`)

```
['companies', 'list', listParams]      // danh sách (phụ thuộc page/sort/q/filters)
['company', id]                        // detail 1 công ty
['contacts','list',{company_id}]       // tab quan hệ
['activities','list',{company_id}]
['projects','list',{company_id}]
```

### 7.2. Invalidate sau mutation

| Mutation | Invalidate / update |
| --- | --- |
| Create company | `invalidate(['companies','list'])`; chọn record mới nếu cần |
| Update company | `invalidate(['company', id])` + `invalidate(['companies','list'])` (hoặc `setQueryData` optimistic cho row) |
| Delete / bulk delete | `invalidate(['companies','list'])`; clear `selectedId` nếu nằm trong tập xoá |
| Import CSV | `invalidate(['companies','list'])` |

### 7.3. Optimistic update (tuỳ chọn)

- Update form: `onMutate` set tạm row + detail; `onError` rollback; `onSettled` invalidate.
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
| User đang sửa detail | Refetch list **không** ghi đè form đang dirty; cảnh báo nếu rời khi chưa lưu |
| Đổi page/sort khi đang load | Disable pager trong lúc fetch hoặc cancel request cũ |
| Scroll vị trí | Giữ scroll khi data cùng kích thước; reset khi đổi filter/page |
| Mutation xong | Toast xác nhận, không tự nhảy selection trừ khi record bị xoá |

Debounce/thời gian cụ thể để implementation quyết.

---

## 9. State Management Design

| State | Loại | Rule |
| --- | --- | --- |
| Company list data | Server cache (React Query) | `['companies','list',params]` |
| Company detail data | Server cache | `['company', id]` |
| Related tab data | Server cache | theo `company_id` |
| `listParams` (page/sort/q/filters) | UI state (screen) | Giữ trong CompanyScreen; có thể sync URL query |
| `selectedId` | UI transient | Chọn row → load detail |
| Active tab | UI transient | 会社詳細/担当者/活動/案件 |
| Form state (create/detail) | Form state (RHF) | Local trong form |
| Dialog open/close | UI transient | Context dialog handlers |
| Column visibility/order | User setting | localStorage → API `/field_settings` (mục tiêu) |
| Panel split width | UI persistent | localStorage |

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
| Invalid row (thiếu `name`) | Drop row + log invalid data |
| Raw null/undefined/NaN | Never display (fallback §3.5) |

Fallback ví dụ:

| Missing | UI fallback |
| --- | --- |
| Tel / Fax / Address | `-` |
| Số (revenue/capital/employee) | `-` |
| Long text (notes) | Ellipsis + tooltip |
| Master rỗng (industry…) | ô trống |

---

## 11. Navigation Design

| Action | Target | Data |
| --- | --- | --- |
| Chọn row | Detail panel (cùng màn) | `company.id` |
| Tab 担当者 → click link | Màn CT01 (`/contact`) | prefilter `company_id` |
| Tab 活動 → click link | Màn AT01 (`/activity`) | prefilter `company_id` |
| Tab 案件 → click link | Màn PR01 (`/project`) | prefilter `company_id` |
| 新規作成 | CompanyCreateDialog (modal) | — |
| Tạo 担当/活動/案件 từ detail | Dialog tạo tương ứng | seed `company_id` (Create Dialog Seeds – FE.md §7) |
| 再読み込み | Cùng màn | refetch |

Route theo `lib/constants/path.ts` (`controlPaths`). Cross-screen prefilter qua query param / navigation context. Story này **không** xử lý logic của CT01/AT01/PR01.

---

## 12. Permission / Security Design

| Layer | Rule |
| --- | --- |
| FE route guard | Chặn vào `/company` nếu chưa đăng nhập / thiếu `company.read` |
| FE component guard | Ẩn/disable nút write nếu thiếu `company.create/update/delete/import/export` |
| BE/API guard | Reject API nếu thiếu permission (403) — **cần BE thực thi** (BE.md §11 ghi role_permissions "chưa thực thi") |
| Tenant boundary | BE scope theo `tenant_id` từ JWT; không nhận tenant từ client |
| Expired session | api-client tự refresh; fail → clear token → login |
| CSV import/export | Kiểm tra quyền `import/export`; validate file phía BE |

> Rủi ro hiện tại: `role_permissions` đã có schema nhưng BE **chưa enforce** (BE.md §11). FE guard là defensive — **không thay thế** BE enforcement. Đưa vào Risks §15.

---

## 13. Performance / UX Design

| Item | Target |
| --- | --- |
| Initial load | Show skeleton ngay; first paint < ~1s với cache |
| List size | Server-side pagination (mặc định 50); không load toàn bộ |
| Search | Debounce ~300ms; server-side `q` |
| Sort/filter | Server-side; `keepPreviousData` để mượt |
| Detail | Cache theo id; mở lại tức thì nếu còn fresh |
| Grid lớn | AG Grid virtualization; cân nhắc tắt refetch-on-focus |
| Navigation | Không bị block bởi refetch (request cancel/keepPrevious) |
| CSV export | Stream/async nếu dữ liệu lớn (Open Question quy mô) |

Nếu list rất lớn gây chậm → ghi vào Risks, không tự đổi scope (vd thêm server filter bắt buộc).

---

## 14. Audit / Logging Design

| Log type | Rule |
| --- | --- |
| Business audit | Create/Update/Delete company → log (ai, khi nào) — **BE** (cân nhắc bảng audit, BE.md §11 mục tương lai) |
| API error log | Log khi list/detail/mutation fail (FE telemetry + BE) |
| Permission log | Log khi BE trả 403 |
| Invalid data log | FE log khi row thiếu field bắt buộc (`name`) |
| Import log | Log kết quả import CSV (created/updated/errors) |
| Conflict log | Log khi 409 (nếu áp dụng) |

---

## 15. Open Questions / Risks

| No | Question / Risk | Owner | Impact |
| --- | --- | --- | --- |
| 1 | BE đã **enforce** `role_permissions` chưa? (hiện "chưa thực thi" – BE.md §11) | BE / TL | Bảo mật: FE guard không đủ |
| 2 | BE trả `created_by` / `updated_by` (tên) cho audit field không? | BE | Detail audit thiếu tên |
| 3 | `district`(地区) chuẩn hoá master `area` chưa? cột nghĩa là vùng hay 市区町村? | BA / BE | Filter/hiển thị 地区 sai (db-notes #2) |
| 4 | `revenue`/`capital` đơn vị & format gửi/nhận? | BE / BA | Hiển thị/parse số (db-notes #11) |
| 5 | Column settings lưu API `/field_settings` (có chiều submenu?) hay localStorage? | TL / BE | Đồng bộ cấu hình cột (db-notes #8) |
| 6 | Conflict đồng thời (2 user sửa 1 company) xử lý 409 theo `updated_at`? | BE | Mất dữ liệu ghi đè |
| 7 | Bulk delete all-or-nothing hay per-item error? | BE | UX báo lỗi xoá |
| 8 | CSV import: rule validate, giới hạn dòng, mapping cột? | BE / BA | Định hình màn import |
| 9 | Production FE chốt là Next.js (FE.md) — wireframe `web/src` (vanilla JS) chỉ là tham chiếu? | TL | Tránh hiểu nhầm stack |

---

## Phụ lục A — Áp dụng pattern cho 3 story còn lại

Các màn `CT01 担当者`, `AT01 活動`, `PR01 案件` dùng **cùng kiến trúc** (list+detail panel, AG Grid, React Query, RHF+Zod, dialog tạo, tab quan hệ). Khác biệt chính:

| Story | Endpoint | Filter chính | Tab quan hệ | Lưu ý DB |
| --- | --- | --- | --- | --- |
| CT01 担当者 | `/contacts` | `company_id, job_category, job_rank` | 活動, 案件 | đủ cột |
| AT01 活動 | `/activities` | `act_type, user_id, company_id, contact_id, project_id`, range `act_date` | (none) | thiếu `attendee_count`, リードID (db-notes #7) |
| PR01 案件 | `/projects` | `status, user_id, company_id, contact_id`, range ngày | 活動 | **thiếu nhiều cột** (db-notes #1/#5/#6) → cần mở rộng schema trước |

> PR01 phụ thuộc việc mở rộng bảng `projects` (motivation, method, competitor, 2 accuracy, các mốc ngày, 予実, stage links). **Nên ưu tiên chốt DB trước khi viết Tech Spec chi tiết PR01.**

