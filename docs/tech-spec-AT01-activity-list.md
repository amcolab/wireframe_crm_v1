# Technical Design Spec: SMOS-AT01 – 活動一覧・詳細 (Activity List & Detail)

Category: 4. Specification (HOW)
Status: Draft
Platform: Web (Next.js 16 App Router) · State: React Query + React Context · Form: React Hook Form + Zod · Grid: AG Grid · BE: Rails 8 API REST `/api/v1`
Nguồn input: `Technique_Spec.md` (template), `FE.md`, `BE.md`, `docs/api-design.md`, `docs/db-notes.md`, `schema.txt`, wireframe `web/src/screens/activity/at01_list.js`.

> ⚠️ Lưu ý khác biệt nền tảng so với template demo (S2_001 Flutter/Firestore): **SMOS không có realtime**. Đây là CRM REST thuần (Rails). Vì vậy mục 7 "Realtime Design" được **chuyển thể thành Data-Sync / Cache Design** (React Query refetch + invalidate + optimistic update), mục 8 thành **List UX Protection** cho refetch. Mọi chỗ nói "realtime" trong template được hiểu lại theo nghĩa này.

---

## 1. Mục đích

Chốt cách implement màn **活動一覧・詳細** (danh sách hoạt động + panel chi tiết) của SMOS:

- Màn implement bằng kiến trúc nào (list + detail panel, AG Grid, không có sub-tab trong detail).
- FE chia component ra sao (container vs presentational).
- Data lấy từ đâu (REST `/api/v1/activities` qua React Query).
- API contract draft cần gì (đối chiếu `docs/api-design.md §5`).
- State quản lý ở đâu (server state vs UI state).
- Business rule implement ở FE hay BE (tenant scope, permission, filter/sort/search, badge act_type).
- **Đồng bộ dữ liệu** xử lý thế nào (cache invalidate sau mutation; không realtime).
- Error / fallback xử lý thế nào.
- Permission xử lý thế nào (role_permissions `activity.*`).
- **Gap DB quan trọng**: UI hiển thị `面談人数 (attendee_count)` và `リードID` nhưng schema hiện **không có** cột tương ứng — cần quyết định trước khi code (§3, §6.3, §15).
- Điểm nào chưa rõ cần hỏi lại (Open Questions §15).

Story này **chỉ** xử lý màn 活動; logic chi tiết của 会社/担当者/案件 thuộc story riêng (CP01/CT01/PR01) — ở đây chỉ nhận FK khi tạo từ màn cha và liên kết cross-screen qua navigation.

---

## 2. Component Architecture

Platform: **Next.js 16 App Router** (`app/(tenant)/activity/page.tsx`, `"use client"`). State: **React Query** (server) + **React Context/hooks** (UI). Form: **RHF + Zod**. Grid: **AG Grid enterprise**.

### 2.1. Component tree

```
ActivityPage (page.tsx)
└── ActivityScreen
    ├── ActivityListPanel
    │   ├── ActivityListHeader
    │   │   ├── ActivityTypeSelect              // タイプ dropdown (TEL/訪問/メール/Web面談/その他)
    │   │   ├── ActivitySalesRepInput           // 営業担当 quick search
    │   │   ├── ActivityCompanyInput            // 会社 quick search
    │   │   ├── ActivityDateRangeInput          // 活動日 from/to
    │   │   ├── AdvancedSearchButton            // mở ActivityAdvancedSearchDialog
    │   │   └── CreateActivityButton           // mở ActivityCreateDialog
    │   ├── ActivityListToolbar
    │   │   ├── ColumnSettingsButton            // 列の設定
    │   │   ├── ExportCsvButton / ImportCsvButton
    │   │   └── BulkDeleteButton               // enable khi có selection
    │   ├── ActivityListBody
    │   │   ├── ActivityListLoadingView         // skeleton/overlay
    │   │   ├── ActivityListErrorView           // message + 再読み込み
    │   │   ├── ActivityListEmptyView           // no-data vs no-result
    │   │   └── ActivityGrid (AG Grid)
    │   │       ├── ActivityColumnFilterRow     // filter theo cột (set/text/date range)
    │   │       └── ActivityRow → cells (badge タイプ, blue-link 会社/担当)
    │   └── ActivityPager                       // page / per_page / total
    └── ActivityDetailPanel
        ├── ActivityDetailForm (RHF+Zod)        // không có sub-tab, hiển thị trực tiếp
        │   ├── ActivityIdField                 // 活動ID (read-only)
        │   ├── ActivityTypeSelect              // タイプ (select, master act_type)
        │   ├── ActivityPurposeField            // 目的 (text)
        │   ├── ActivityContactLookup           // 担当者 lookup + 新規担当
        │   ├── ActivitySalesRepSelect          // 営業担当 (select users)
        │   ├── ActivityProjectLookup           // 案件名 lookup
        │   ├── ActivityDateField               // 活動日 (date)
        │   ├── ActivityTimeFields              // 開始時刻 / 終了時刻 / 活動時間(分)
        │   ├── ActivityCommentField            // コメント (textarea)
        │   ├── ActivityCompanyNameField        // 会社名 (read-only từ contact_id)
        │   ├── ActivityFlagFields              // アポ / クレーム / フォロー完了 (checkbox)
        │   ├── ActivityFreeFields              // 自由使用欄 free1..free3
        │   ├── ActivityAuditFields             // created_at / updated_at (read-only)
        │   └── ActivityDetailActions          // 保存 / 削除
        └── ActivityAttachmentSection          // dropzone → /activities/:id/documents
    (Dialogs – React Portal)
        ├── ActivityCreateDialog               // RHF+Zod (reuse ActivityDetailForm fields); seed FK
        ├── ActivityAdvancedSearchDialog       // multi-field filter form
        ├── ColumnSettingsDialog               // visible/order theo user (target_model=activity)
        └── ConfirmDeleteDialog                // xoá đơn / bulk
```

> **Khác biệt với CP01**: AT01 **không có sub-tab** trong detail panel. Chi tiết hoạt động (form fields + đính kèm) được hiển thị ngay dưới dưới grid, không có tab 担当者/活動/案件 bên trong. Wireframe xác nhận `syncEntityDetailTabLayout(card, 'detail')` — chỉ 1 mode `detail`.

### 2.2. Component giữ state / gọi hook (Container)

| Component | Vai trò |
| --- | --- |
| `ActivityScreen` | Root. Giữ UI state cục bộ: `selectedId`, panel split height (resizer), `listParams`. Cung cấp context cho dialog handlers. |
| `ActivityListPanel` | Gọi `useActivityList(params)` (React Query). Sở hữu `listParams` (page, per_page, sort, order, q, filters). |
| `ActivityTypeSelect` (header) | Giữ giá trị chọn cục bộ + cập nhật `listParams.filters[act_type]`. |
| `ActivitySalesRepInput` | Debounce input → cập nhật `listParams.filters[user_id]` (hoặc `q` nếu full-text). |
| `ActivityCompanyInput` | Debounce input → cập nhật `listParams.filters[company_id]` (hoặc `q`). |
| `ActivityDateRangeInput` | Cập nhật `listParams.filters[act_date][from]` / `[to]`. |
| `ActivityColumnFilterRow` | Cập nhật `listParams.filters[...]` (set filter cho 担当/タイプ). |
| `ActivityDetailPanel` | Gọi `useActivity(selectedId)` + `useUpdateActivity()` / `useDeleteActivity()`. |
| `ActivityDetailForm` | Giữ form state qua RHF (`useForm` + `zodResolver`). |
| `ActivityCreateDialog` | Giữ form riêng + `useCreateActivity()`. Nhận seed props (`companyId`, `contactId`, `projectId`, `projectName`). |
| `ActivityAttachmentSection` | Gọi `useActivityDocuments(id)` + `useUploadDocument()` / `useDeleteDocument()`. |

> Nguyên tắc: **UI không gọi thẳng `apiFetch`** (theo `FE.md §5`). Luồng: `Component → hook (React Query) → lib/api/activity → api-client → BE`.

### 2.3. Component chỉ render UI (Presentational)

| Component | Nhận vào (props) | Render |
| --- | --- | --- |
| `ActivityListHeader` | `listParams`, callbacks | Bố cục search header (タイプ + 担当 + 会社 + 日付 range + advanced + 新規) |
| `ActivityListLoadingView` | — | Skeleton rows / overlay |
| `ActivityListErrorView` | `onRetry` | Message lỗi + `再読み込み` |
| `ActivityListEmptyView` | `hasFilter: boolean` | `データがありません` / `該当する結果が見つかりません` |
| `ActivityGrid` | `rows: ActivityListItemVM[]`, `columns`, `onRowSelect`, `selectedId` | AG Grid render; badge タイプ; blue-link 会社/担当 |
| `ActivityTypeBadge` | `actType: ActTypeEnum` | Badge màu theo loại hoạt động |
| `ActivityAuditFields` | `ActivityDetailVM` | created/updated read-only |
| `ActivityPager` | `meta`, `onPageChange`, `onPerPageChange` | First/Prev/Next/Last + page-size |

> Presentational chỉ nhận dữ liệu qua props, không đọc React Query, không chứa business logic.

### 2.4. Reuse / refactor từ wireframe & FE hiện có

| Component | Nguồn hiện tại | Hành động |
| --- | --- | --- |
| `ActivityGrid` | `at01_list.js` (renderActivityTable + ACTIVITY_MAIN_COLUMNS) + `lib/.../ag-grid` | Reuse AG Grid wrapper của FE; map cột từ wireframe |
| `ActivityColumnFilterRow` | `entityListColumnFilters.js` | Refactor sang React (set filter cho rep/type) |
| `ActivityPager` | `pager.js` | Refactor sang component dùng `meta` |
| `ActivityAdvancedSearchDialog` | `searchFilters.js` + `dlgActivityAdvancedSearch` | Refactor sang RHF |
| `ColumnSettingsDialog` | `columnSettings.js` (localStorage, key `smos.at01.*`) | Refactor sang API `/field_settings?target_model=activity` |
| `ActivityCreateDialog` | `activityCreateForm.js` + `openActivityCreateDialog()` | Refactor; reuse field components của detail form; seed FK |
| `ActivityAttachmentSection` | `attachField.js` (`bindAttachField('activityDetailAttachList')`) | Refactor sang dropzone + API `/activities/:id/documents` |
| `ActivityContextMenu` | `entityContextMenu.js` (copy / new-activity) | Refactor sang AG Grid context menu |
| Resizer panel | `initResizer()` localStorage `smos.at01.listH` | Giữ lại; persist height vào localStorage |
| Cross-screen links | `screenNavigation.js` (`takePendingActivitySearch`, `bindCrossScreenLinks`) | Refactor sang Next.js router + query params |

Reuse nguyên trạng từ FE: `apiFetch` (`lib/api-client.ts`), `useApiMutation`, `query-keys`, shadcn `ui/*`, toast (Sonner).

---

## 3. Data Type / View Model

FE render theo **View Model riêng**, không phụ thuộc trực tiếp DB/response. Hai context: **list item** (lưới) và **detail** (form).

### 3.1. Nguyên tắc

| Rule | Nội dung |
| --- | --- |
| Tách khỏi DB | BE trả `snake_case`; FE map về VM `camelCase` (1 nơi: `lib/utils/activity-mappers`). |
| Nullable có fallback | Mọi field nullable có fallback rõ khi hiển thị (§3.5). |
| Không lộ raw | Không render `null/undefined/NaN` ra UI. |
| List ≠ Detail | List VM gọn (cột lưới 7 cột mặc định); Detail VM đầy đủ + time fields + flags + `customFields` + audit. |
| Snapshot project_name | Luôn lưu `projectName` song song `projectId`; tên project có thể đổi sau khi ghi hoạt động (db-notes #10). |
| Enum ActType | `act_type` map sang TypeScript enum `ActType` để render badge có màu. |

### 3.2. Enum `ActType`

```typescript
export enum ActType {
  TEL = 'TEL',
  VISIT = '訪問',
  EMAIL = 'メール',
  WEB_MEETING = 'Web面談',
  OTHER = 'その他',
}
```

Giá trị chuỗi khớp giá trị BE. Badge màu đề xuất: TEL → xanh, 訪問 → cam, メール → xanh lá, Web面談 → tím, その他 → xám. Master `mst_options option_type=activity_type` (đề xuất, db-notes #3) cần được load khi khởi động để populate dropdown; fallback cứng nếu API master chưa có.

### 3.3. View Model: `ActivityListItemVM`

| Field | Type | Nullable | Mục đích |
| --- | --- | --- | --- |
| `id` | number | No | Chọn row → load detail |
| `actDate` | string (YYYY-MM-DD) | No | Hiển thị 活動日 |
| `startTime` | string (HH:MM) | Yes | Hiển thị 開始時刻 |
| `salesRepName` | string | Yes | Hiển thị 営業担当 (join từ `user_id`) |
| `actType` | ActType | Yes | Badge タイプ |
| `companyName` | string | Yes | Hiển thị 会社名 (blue-link → CP01) |
| `contactLastName` | string | Yes | Hiển thị 担当(姓) (blue-link → CT01) |
| `comment` | string | Yes | Hiển thị コメント (ellipsis + tooltip) |

### 3.4. View Model: `ActivityDetailVM`

Gồm toàn bộ field của list + các field thời gian/cờ/quan hệ + free fields + audit:

| Nhóm | Field |
| --- | --- |
| Định danh | `id, companyId, companyName, contactId, contactName` |
| Quan hệ | `projectId (nullable), projectName (snapshot string)` |
| Phân công | `userId, salesRepName` |
| Thời gian | `actDate, startTime, endTime, duration` |
| Phân loại | `actType` |
| Nội dung | `purpose, motivation, comment` |
| Cờ | `hasAppointment, isClaim, isFollowUpCompleted` |
| Free | `customFields: { free1, free2, free3 }` |
| Audit | `createdAt, updatedAt` |

### 3.5. Mapping từ nguồn dữ liệu

Một nguồn (REST). Map theo `docs/api-design.md §5`:

| VM field | BE field (snake_case) | Ghi chú |
| --- | --- | --- |
| `id` | `id` | — |
| `companyId` | `company_id` | — |
| `companyName` | `company_name` | read-only, join từ companies |
| `contactId` | `contact_id` | bắt buộc |
| `contactName` | `contact_name` | read-only, join từ contacts |
| `projectId` | `project_id` | nullable |
| `projectName` | `project_name` | snapshot string (db-notes #10) |
| `userId` | `user_id` | 営業担当 FK users |
| `salesRepName` | *(join từ users)* | BE trả sẵn hoặc FE lookup |
| `actDate` | `act_date` | bắt buộc |
| `startTime` | `start_time` | "HH:MM" (db-notes #11) |
| `endTime` | `end_time` | "HH:MM" (db-notes #11) |
| `duration` | `duration` | int (phút) |
| `actType` | `act_type` | map → ActType enum |
| `purpose` | `purpose` | — |
| `motivation` | `motivation` | — |
| `comment` | `comment` | — |
| `hasAppointment` | `has_appointment` | boolean |
| `isClaim` | `is_claim` | boolean |
| `isFollowUpCompleted` | `is_follow_up_completed` | boolean |
| `customFields.freeN` | `custom_fields.freeN` | free1..free3 |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` | — |

> **Mapping note — DB GAP (db-notes #7)**: UI master list (66 cột) bao gồm `面談人数` và `リードID`, nhưng bảng `activities` **không có cột** `attendee_count` (int) và không có khái niệm Lead/FK leads. **Hai field này không được đưa vào VM và không được render** cho đến khi BA/BE quyết định:
> - Phương án A: thêm `attendee_count:int` vào `activities` + quyết định có module leads hay không.
> - Phương án B: loại bỏ hai cột này khỏi danh sách 66 cột của UI.
> Xem thêm §6.3 và §15.

### 3.6. Fallback cho field nullable

Fallback ở **tầng hiển thị**; VM giữ giá trị gốc cho search/sort.

| Field | Khi null / rỗng | Giá trị hiển thị |
| --- | --- | --- |
| `startTime` / `endTime` | thiếu | `--:--` |
| `duration` | thiếu / 0 | `-` |
| `comment` / `purpose` / `motivation` | thiếu | `-` hoặc ô trống (ẩn trong detail) |
| `projectName` / `projectId` | thiếu | `-` (活動不要案件) |
| `salesRepName` | thiếu | `-` |
| `companyName` | thiếu | `-` |
| `contactLastName` | thiếu | (ô trống) |
| `actType` | thiếu / giá trị lạ | badge "その他" + log warning |
| `contactId` / `actDate` | **bắt buộc** | nếu thiếu → drop khỏi list + log (§10) |

---

## 4. API Contract Draft

Mục tiêu: chốt **FE cần gì từ BE** cho 活動. Đối chiếu `docs/api-design.md §5`.

### 4.1. Nguyên tắc

- AT01 dùng **1 kênh REST** (không realtime). Mọi cập nhật phản chiếu qua React Query refetch/invalidate.
- PATCH hỗ trợ inline edit ô (ngày/担当/type/comment/purpose) — gửi chỉ field đã thay đổi.
- Khi tạo từ màn cha (CP01/CT01/PR01): client gửi sẵn FK (`company_id`, `contact_id`, `project_id`) và `project_name` snapshot.
- Khi BE chốt endpoint chính thức (Swagger `/api-docs`), đối chiếu & cập nhật.

### 4.2. Yêu cầu request (LIST)

```
GET /api/v1/activities
  ?page=1&per_page=50&sort=act_date&order=desc
  &filters[act_type]=TEL
  &filters[user_id]=12
  &filters[company_id]=1141
  &filters[contact_id]=10001
  &filters[project_id]=3042
  &filters[act_date][from]=2026-01-01
  &filters[act_date][to]=2026-06-30
```

| Item | Rule | Hiện trạng |
| --- | --- | --- |
| Purpose | Lấy DS hoạt động render AT01 | `GET /activities` (api-design §5) |
| Auth | Required | `Authorization: Bearer <access>` (localStorage `mh_access_token`) |
| Permission | BE check `activity.read` (403 nếu thiếu) | cần BE xác nhận (§15) |
| Tenant context | **Từ JWT**, không nhận từ client | api-design §0 (multi-tenant) |
| Paging | `page`, `per_page` (10/25/50/100) | api-design §0 |
| Sort | `sort` (cột), `order` asc/desc | api-design §0 |
| Search | `q` (full-text: コメント, 会社名, 担当者名 — cần BE chốt) | api-design §0 |
| Filters | `filters[act_type, user_id, company_id, contact_id, project_id]` + `filters[act_date][from/to]` | api-design §5 |
| Language | `ja` | (header nếu có) |

### 4.3. Response — field FE cần

Envelope list: `{ data: activity[], meta: { page, per_page, total, total_pages } }`.
Object `activity` đầy đủ field theo `docs/api-design.md §5`. FE map sang VM (§3.5). Field bắt buộc cho list: `id`, `act_date`, `contact_id`; phần còn lại nullable.

CRUD/khác (theo api-design §5):

| Method | Path | Dùng cho |
| --- | --- | --- |
| GET | `/activities/:id` | Load detail panel |
| POST | `/activities` | ActivityCreateDialog (201 → activity) |
| PATCH | `/activities/:id` | Lưu detail form hoặc inline edit ô |
| DELETE | `/activities/:id` | Xoá đơn |
| POST | `/activities/bulk_delete` | Xoá nhiều (`{ ids: [...] }`) |
| GET | `/activities/export` | Export CSV (cùng filter) |
| POST | `/activities/import` | Import CSV (multipart) |
| GET | `/activities/:id/documents` | Load danh sách đính kèm |
| POST | `/activities/:id/documents` | Upload file đính kèm |
| DELETE | `/documents/:id` | Xoá file đính kèm |

> **Tạo từ màn cha**: khi mở `ActivityCreateDialog` từ CP01/CT01/PR01, client gửi sẵn `company_id`, `contact_id`, `project_id` (nullable), **và `project_name` snapshot** (chuỗi hiện tại của tên case — BE lưu vào `activities.project_name` như ghi chú db-notes #10).

### 4.4. Error handling

| Error | UI handling |
| --- | --- |
| 401 | Theo auth rule chung → refresh; fail → logout/về login |
| 403 | Message quyền; không render list/không cho lưu |
| 404 (detail) | `対象が見つかりません` + clear selection |
| 409 (conflict) | Thông báo trùng/đang bị sửa; reload detail |
| 422 (validation) | Map `error.details` → lỗi field RHF |
| 500 / network / timeout | Error state + `再読み込み` |

Message load list lỗi: `活動一覧を読み込めませんでした。時間をおいて再度お試しください。`

### 4.5. Open Questions cho BE

1. Permission: BE có trả **403** khi thiếu `activity.read` / `activity.write` không?
2. `act_type` có được load từ `mst_options option_type=activity_type` không, hay cứng enum phía BE? (db-notes #3)
3. BE trả sẵn `user_name` (tên 営業担当) trong object activity không? Hay FE phải join riêng từ `/users`?
4. `q` (quick search) full-text trên những cột nào của activities? (コメント? 会社名? 担当者名?)
5. Bulk delete có trả per-item error hay all-or-nothing?
6. **DB GAP**: quyết định về `attendee_count` và `リードID` (§3.5, §15)?

---

## 5. Initial Load Design

Flow load **lần đầu** khi mở `/activity`.

### 5.1. Flow load lần đầu

| Step | Technical action | Nơi xử lý | UI result |
| --- | --- | --- | --- |
| 1 | Check auth + permission `activity.read` | Route guard (middleware/client) + BE 403 | Allow, hoặc show permission message |
| 2 | Resolve context: tenant (từ JWT) | api-client tự gắn Bearer | — |
| 3 | Fetch list snapshot (sort mặc định `act_date desc`) | `useActivityList(params)` → `GET /activities` | `isLoading` → **skeleton** (không để lưới trống) |
| 4 | Map response → `ActivityListItemVM[]` | mapper (activity-mappers) | — |
| 5 | Render grid + pager | AG Grid | Hiển thị danh sách |
| 6 | (Empty) data rỗng | — | `データがありません` (hoặc no-result nếu có filter) |
| 7 | (Error) | — | Error view + `再読み込み` |
| 8 | Auto-select row đầu | `selectedId = data[0].id` | Mở detail panel → `useActivity(id)` |
| 9 | Pending search từ màn cha | `takePendingActivitySearch()` (cross-screen nav) | Pre-fill search params → refetch |

> **Pending search / cross-screen prefilter**: khi điều hướng từ CP01 (tab 活動 → click link) hoặc CT01, PR01, FE truyền `filters[company_id]`/`filters[contact_id]`/`filters[project_id]` qua Next.js router query params. `ActivityScreen` đọc params trên mount → set `listParams.filters` → fetch ngay với filter đó.

### 5.2. Chuỗi state (React Query)

```
idle → isLoading            (fetch lần đầu)  → skeleton
     → isSuccess (data ≥1)                   → grid
     | isSuccess (data [])                   → empty view
     | isError                               → error view + retry
```

`empty` suy ra từ `isSuccess && data.length === 0`. Phân biệt **no-data** vs **no-result** dựa trên `listParams` có filter/q hay không.

### 5.3. Detail load

Khi `selectedId` đổi → `useActivity(id)` (`GET /activities/:id`). React Query cache theo `['activity', id]`. Trong khi load: detail panel show skeleton; lỗi → error inline + nút thử lại. Detail panel **không có sub-tab** — hiển thị trực tiếp form fields + attachment section.

### 5.4. Edge cases khi load

| Case | Xử lý |
| --- | --- |
| Không có quyền | Không render list, show permission message |
| Đang tải | Skeleton lưới + detail |
| Lỗi/timeout | Error state + `再読み込み` (retry = refetch) |
| Không có hoạt động | `データがありません` |
| Item thiếu `contact_id` hoặc `act_date` (bắt buộc) | Drop item + log invalid (§10) |
| Item thiếu field nullable | Fallback theo §3.6 |
| `act_type` là giá trị không trong enum | Map về `その他` + log warning |
| Cross-screen prefilter từ màn cha | Áp filter ngay trên mount → hiển thị list đã lọc sẵn |

---

## 6. Business Rule Implementation

Quyết định mỗi rule nằm ở BE hay FE.

### 6.1. Bảng ownership

| Rule type | BE | FE | Ghi chú |
| --- | --- | --- | --- |
| Permission | **Required** | Guard thêm | BE 403 theo `role_permissions`; FE guard router + ẩn nút write nếu thiếu quyền |
| Tenant scope | **Required** | — | BE scope theo `tenant_id` từ JWT; client không gửi tenant |
| Pagination | **Required** | Gửi params | BE phân trang (Pagy) |
| Sort | **Required** (list) | Gửi params | FE chỉ chọn cột/hướng; mặc định `act_date desc` |
| Filter (act_type, user_id, company_id…) | **Required** (list) | Gửi params + per-column UI | BE lọc; FE dựng filter row |
| Date range filter (act_date) | **Required** | Gửi `from`/`to` | BE lọc khoảng ngày |
| Quick search `q` | **Required** (list) | Debounce + gửi | BE xử lý (cần chốt cột áp dụng — §4.5) |
| Validation (create/update) | **Required** | Mirror (Zod) | BE nguồn sự thật (422 → field error); FE validate sớm |
| project_name snapshot | **Required** (BE lưu) | Gửi khi tạo | FE gửi `project_name` hiện tại; BE lưu snapshot (db-notes #10) |
| act_type enum | **Required** | Mirror + badge | FE render badge màu; FE validate theo enum trước khi submit |
| Fallback UI | N/A | **Required** | §3.6 |
| Column visibility/order | FE (or BE) | **Required** | Nên chuyển `/field_settings?target_model=activity` (db-notes #8) |
| Cache đồng bộ sau mutation | N/A | **Required** | Invalidate query keys (§7) |

> "Guard thêm" = defensive, không thay BE. BE đúng → FE no-op; BE/cache sai → FE chặn hiển thị sai.

### 6.2. FE implement từng rule

**Permission** — Guard ở router; nếu vào được mà BE 403 → permission message. Ẩn/disable nút `新規 / 保存 / 削除 / インポート` nếu thiếu `activity.create/update/delete/import`. Ẩn export nếu thiếu `activity.export`.

**Search header** — `ActivityTypeSelect` → `filters[act_type]` (server-side, không debounce). `ActivitySalesRepInput` debounce ~300ms → `filters[user_id]` (hoặc tên nếu BE hỗ trợ). `ActivityCompanyInput` debounce ~300ms → `filters[company_id]`. Date range → `filters[act_date][from/to]`.

**Filter cột** — `ActivityColumnFilterRow` set `filters[rep]` (set filter), `filters[type]` (set filter). Refetch server-side.

**Sort** — Click header AG Grid → `sort/order` → refetch (server-side). Mặc định sort `act_date desc`.

**act_type badge** — `ActivityTypeBadge` nhận `ActType` → render badge màu. Nếu giá trị ngoài enum → hiển thị badge xám `その他` + log warning.

**project_name snapshot** — Khi tạo/cập nhật activity: FE gửi cả `project_id` và `project_name` (lấy từ lookup result). Khi hiển thị detail: luôn show `projectName` (snapshot), không re-fetch tên từ projects.

**Validation (Zod)** — `activitySchema`:
- `contact_id`: required (số nguyên dương).
- `act_date`: required (date string YYYY-MM-DD, không phải tương lai xa).
- `act_type`: required, phải thuộc `ActType` enum.
- `user_id`: required.
- `start_time` / `end_time`: optional, format "HH:MM"; nếu cả hai có giá trị thì `end_time ≥ start_time`.
- `duration`: optional, int ≥ 0.
- `company_id`: required (kế thừa từ contact).

BE 422 → map `error.details` về field RHF.

**Inline edit** — PATCH `/activities/:id` với chỉ field thay đổi (ngày/担当/type/comment/purpose). Sau thành công: `invalidate(['activity', id])` + `invalidate(['activities','list'])`.

### 6.3. Gap so với wireframe hiện tại

| Rule | Wireframe (web/src) | Cần (production Next.js) |
| --- | --- | --- |
| Data | mockActivities (mockData.js, client) | React Query → `/activities` |
| Filter/sort/search | Client-side trên mock (`filterRowsWithColumnFilters`) | Server-side qua query params |
| Column settings | localStorage (`smos.at01.colOrder`, `smos.at01.colWidths`) | API `/field_settings?target_model=activity` |
| Permission | Không có | Guard FE + BE 403 |
| Validation | Tối thiểu (alert/confirm) | Zod + BE 422 mapping |
| Cross-screen nav | `takePendingActivitySearch` / `bindCrossScreenLinks` vanilla JS | Next.js router query params |
| **面談人数 / リードID** | **Có trong danh sách 66 cột wireframe** | **Chưa có cột DB → PHẢI quyết định trước khi code (db-notes #7)** |

> **DB GAP nghiêm trọng cho AT01**: bảng `activities` **không có** cột `attendee_count` (面談人数) và không có `lead_id`/bảng `leads` (リードID). Hai field này xuất hiện trong danh sách 66 cột của màn AT01. Cần BA/BE quyết định phương án trước khi implement (xem §15 #2 và #3).

---

## 7. Data-Sync / Cache Design *(thay cho "Realtime Design")*

> SMOS **không realtime**. Đồng bộ dữ liệu = React Query cache + invalidate sau mutation. Mục này chốt cách giữ list/detail nhất quán.

### 7.1. Query keys (đề xuất, theo `lib/query-keys.ts`)

```
['activities', 'list', listParams]         // danh sách (phụ thuộc page/sort/q/filters)
['activity', id]                           // detail 1 hoạt động
['activity', id, 'documents']             // đính kèm của hoạt động
['activities', 'list', { company_id }]    // dùng cho tab 活動 trong CP01
['activities', 'list', { contact_id }]    // dùng cho tab 活動 trong CT01
['activities', 'list', { project_id }]    // dùng cho tab 活動 trong PR01
```

### 7.2. Invalidate sau mutation

| Mutation | Invalidate / update |
| --- | --- |
| Create activity | `invalidate(['activities','list'])`; chọn record mới nếu cần |
| Update activity (detail form hoặc inline) | `invalidate(['activity', id])` + `invalidate(['activities','list'])` |
| Delete / bulk delete | `invalidate(['activities','list'])`; clear `selectedId` nếu nằm trong tập xoá |
| Import CSV | `invalidate(['activities','list'])` |
| Upload document | `invalidate(['activity', id, 'documents'])` |
| Delete document | `invalidate(['activity', id, 'documents'])` |

> Lưu ý cross-screen: khi tạo/xoá activity từ màn AT01, cần `invalidate` thêm query key tương ứng trong tab quan hệ của CP01/CT01/PR01 nếu đang mở đồng thời. Thực hiện bằng cách invalidate broad key `['activities','list']` (không có param) — React Query sẽ invalidate tất cả query cùng prefix.

### 7.3. Optimistic update (tuỳ chọn)

- Update inline edit: `onMutate` set tạm row; `onError` rollback; `onSettled` invalidate.
- Bulk delete: optimistic remove rows; rollback nếu lỗi.
- Tạo mới: không optimistic (cần `id` từ BE để cache detail).

### 7.4. Stale/refetch

- `staleTime` list ~30–60s (theo FE.md cache hit < 60s).
- `staleTime` detail ~60s.
- Refetch on window focus: cân nhắc tắt cho lưới lớn (66 cột, nhiều dữ liệu).
- `再読み込み` thủ công = `refetch()`.

### 7.5. Conflict (last-write nhẹ)

Không có version realtime. Nếu cần chống ghi đè: dựa `updated_at`; nếu BE trả 409 khi `updated_at` không khớp → reload detail + báo người dùng. (Open Question §15 #7.)

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
| Panel resizer (chiều cao) | Persist height vào localStorage `smos.at01.listH` (giữ nguyên pattern wireframe) |

Debounce/thời gian cụ thể để implementation quyết.

---

## 9. State Management Design

| State | Loại | Rule |
| --- | --- | --- |
| Activity list data | Server cache (React Query) | `['activities','list',params]` |
| Activity detail data | Server cache | `['activity', id]` |
| Activity documents | Server cache | `['activity', id, 'documents']` |
| `listParams` (page/sort/q/filters) | UI state (screen) | Giữ trong ActivityScreen; có thể sync URL query |
| `selectedId` | UI transient | Chọn row → load detail |
| Form state (create/detail) | Form state (RHF) | Local trong form |
| Dialog open/close | UI transient | Context dialog handlers |
| Column visibility/order | User setting | localStorage → API `/field_settings` (mục tiêu) |
| Panel split height | UI persistent | localStorage `smos.at01.listH` |
| Pending cross-screen filter | UI transient (on mount) | Đọc từ router query params → set `listParams.filters` → clear sau khi apply |

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
| Invalid row (thiếu `contact_id` hoặc `act_date`) | Drop row + log invalid data |
| `act_type` ngoài enum | Hiển thị badge `その他` + log warning |
| Raw null/undefined/NaN | Never display (fallback §3.6) |

Fallback ví dụ:

| Missing | UI fallback |
| --- | --- |
| startTime / endTime | `--:--` |
| duration | `-` |
| comment / purpose | `-` hoặc ẩn |
| projectName | `-` |
| salesRepName / companyName | `-` |
| Long text (comment) | Ellipsis + tooltip (AG Grid `tooltipField`) |

---

## 11. Navigation Design

| Action | Target | Data |
| --- | --- | --- |
| Chọn row | Detail panel (cùng màn) | `activity.id` |
| Blue-link 会社名 | Màn CP01 (`/company`) | prefilter `company_id` |
| Blue-link 担当(姓) | Màn CT01 (`/contact`) | prefilter `company_id` + `contact_id` |
| 担当者 lookup trong detail | Dialog lookup contact | seed `company_id` hiện tại |
| 案件名 lookup trong detail | Dialog lookup project | seed `company_id` + `contact_id` |
| 新規担当者 từ detail | Dialog tạo contact | seed `company_id` |
| 新規案件 từ detail | Dialog tạo project | seed `company_id` + `contact_id` |
| 新規作成 (header) | ActivityCreateDialog (modal) | — |
| Từ CP01 tab 活動 → link | AT01 (`/activity`) | prefilter `filters[company_id]` |
| Từ CT01 tab 活動 → link | AT01 (`/activity`) | prefilter `filters[contact_id]` |
| Từ PR01 tab 活動 → link | AT01 (`/activity`) | prefilter `filters[project_id]` |
| Context menu 新規 | ActivityCreateDialog | — |
| `再読み込み` | Cùng màn | refetch |

Route theo `lib/constants/path.ts` (`controlPaths`). Cross-screen prefilter qua Next.js router query params (thay thế `takePendingActivitySearch` + `bindCrossScreenLinks` của wireframe vanilla JS). Story này **không** xử lý logic của CP01/CT01/PR01.

---

## 12. Permission / Security Design

| Layer | Rule |
| --- | --- |
| FE route guard | Chặn vào `/activity` nếu chưa đăng nhập / thiếu `activity.read` |
| FE component guard | Ẩn/disable nút write nếu thiếu `activity.create/update/delete/import/export` |
| BE/API guard | Reject API nếu thiếu permission (403) — **cần BE thực thi** (BE.md §11 ghi role_permissions "chưa thực thi") |
| Tenant boundary | BE scope theo `tenant_id` từ JWT; không nhận tenant từ client |
| Expired session | api-client tự refresh; fail → clear token → login |
| CSV import/export | Kiểm tra quyền `import/export`; validate file phía BE |
| File attachment | BE kiểm tra quyền `activity.update` trước khi nhận upload; validate MIME/size |

> **Rủi ro hiện tại**: `role_permissions` đã có schema nhưng BE **chưa enforce** (BE.md §11). FE guard là defensive — **không thay thế** BE enforcement. Đây là rủi ro bảo mật cấp hệ thống, không chỉ riêng AT01. Đưa vào Risks §15.

Permission keys cho AT01: `activity.read | activity.create | activity.update | activity.delete | activity.export | activity.import`.

---

## 13. Performance / UX Design

| Item | Target |
| --- | --- |
| Initial load | Show skeleton ngay; first paint < ~1s với cache |
| List size | Server-side pagination (mặc định 50); không load toàn bộ 66 cột data về một lúc |
| Search header | Dropdown タイプ không cần debounce; text fields debounce ~300ms |
| Date range | Validate `from ≤ to` phía FE trước khi gửi request |
| Sort/filter | Server-side; `keepPreviousData` để mượt |
| Detail | Cache theo id; mở lại tức thì nếu còn fresh |
| Grid lớn | AG Grid virtualization; 7 cột mặc định; cột phụ qua column settings |
| Navigation | Không bị block bởi refetch (request cancel/keepPrevious) |
| Keyboard nav | ArrowUp/ArrowDown trên tbody navigate row + load detail (giữ pattern wireframe) |
| Panel resize | Persist height localStorage `smos.at01.listH`; min 160px; max 55vh |
| CSV export | Stream/async nếu dữ liệu lớn |

---

## 14. Audit / Logging Design

| Log type | Rule |
| --- | --- |
| Business audit | Create/Update/Delete activity → log (ai, khi nào) — **BE** (cân nhắc bảng audit) |
| API error log | Log khi list/detail/mutation fail (FE telemetry + BE) |
| Permission log | Log khi BE trả 403 |
| Invalid data log | FE log khi row thiếu `contact_id` hoặc `act_date` (bắt buộc) |
| act_type warning | FE log khi `act_type` ngoài enum (map về `その他`) |
| Import log | Log kết quả import CSV (created/updated/errors) |
| Attachment log | Log upload/delete file (filename, size, user) |
| Conflict log | Log khi 409 (nếu áp dụng) |

---

## 15. Open Questions / Risks

| No | Question / Risk | Owner | Impact |
| --- | --- | --- | --- |
| 1 | BE đã **enforce** `role_permissions` chưa? (hiện "chưa thực thi" – BE.md §11) | BE / TL | 🔴 Bảo mật: FE guard không đủ |
| 2 | **DB GAP**: `面談人数 (attendee_count)` — thêm cột `attendee_count:int` vào `activities`, hay loại bỏ khỏi UI 66 cột? | BE / BA | 🟡 Ảnh hưởng 66-cột master list của AT01 |
| 3 | **DB GAP**: `リードID` — SMOS có module Lead không? Nếu không → loại bỏ khỏi UI; nếu có → cần bảng `leads` + FK `activities.lead_id`. | BE / BA | 🟡 Ảnh hưởng 66-cột master list + model Lead mới |
| 4 | `act_type` load từ `mst_options option_type=activity_type` hay enum cứng? Nếu từ master → cần seed data + FE cache master list khi khởi động. | BE / BA | 🟡 Dropdown/badge タイプ |
| 5 | BE trả sẵn `user_name` (tên 営業担当) trong object activity không? Hay FE join từ `/users`? | BE | 🟡 Hiển thị cột 営業担当 trong grid |
| 6 | `q` (quick search) full-text trên những cột nào của activities? コメント? 会社名? 担当者名? | BE | 🟡 UX tìm kiếm nhanh |
| 7 | Conflict đồng thời (2 user sửa 1 activity) xử lý 409 theo `updated_at`? | BE | 🟡 Mất dữ liệu ghi đè |
| 8 | Bulk delete all-or-nothing hay per-item error? | BE | 🟡 UX báo lỗi xoá |
| 9 | Column settings lưu API `/field_settings?target_model=activity` hay localStorage? Chiều `screen_key` (db-notes #8)? | TL / BE | 🟡 Đồng bộ cấu hình cột |
| 10 | Production FE chốt là Next.js (FE.md) — wireframe `web/src` (vanilla JS) chỉ là tham chiếu? | TL | 🟢 Tránh hiểu nhầm stack |

---

## Phụ lục A — Quan hệ với các story CP01, CT01, PR01

AT01 dùng **cùng kiến trúc** với CP01/CT01/PR01 (list+detail panel, AG Grid, React Query, RHF+Zod, dialog tạo). Khác biệt chính so với CP01:

| Khía cạnh | CP01 (会社) | AT01 (活動) |
| --- | --- | --- |
| Detail panel | 4 sub-tab (会社詳細/担当者/活動/案件) | **Không có sub-tab** — form trực tiếp |
| Sort mặc định | `name asc` | `act_date desc` |
| Badge | Không | `ActType` badge có màu |
| Snapshot field | Không | `project_name` snapshot |
| Cross-screen | Điều hướng sang CT01/AT01/PR01 | Nhận prefilter từ CP01/CT01/PR01 |
| DB gap | Không | `attendee_count`, `リードID` (🟡) |
| Resizer | Không | Panel resize height (localStorage) |

AT01 **không có** tab quan hệ bên trong — đây là điểm khác biệt lớn nhất so với CP01. Toàn bộ thông tin hiển thị trực tiếp trong detail panel.

Các màn dùng chung pattern:

| Story | Endpoint | Filter chính | Tab quan hệ trong detail | Lưu ý DB |
| --- | --- | --- | --- | --- |
| CP01 会社 | `/companies` | `industry, scale_rank, district` | 担当者 / 活動 / 案件 | Đủ cột (db-notes #2 地区 cần làm rõ) |
| CT01 担当者 | `/contacts` | `company_id, job_category, job_rank` | 活動 / 案件 | Đủ cột |
| **AT01 活動** | `/activities` | `act_type, user_id, company_id, contact_id, project_id`, range `act_date` | **Không có** | 🟡 thiếu `attendee_count`, `リードID` (db-notes #7) |
| PR01 案件 | `/projects` | `status, user_id, company_id, contact_id`, range ngày | 活動 | 🔴 thiếu nhiều cột (db-notes #1/#5/#6) — **cần chốt DB trước khi code** |

> AT01 đã **sẵn sàng code** sau khi chốt 2 điểm: (1) quyết định về `attendee_count`/`リードID`, (2) BE enforce permission. PR01 cần ưu tiên mở rộng schema trước.
