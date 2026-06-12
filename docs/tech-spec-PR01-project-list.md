# Technical Design Spec: SMOS-PR01 – 案件一覧・詳細 (Project / Sales-Opportunity List & Detail)

Category: 4. Specification (HOW)
Status: Draft — **🔴 Provisional: Phụ thuộc mở rộng schema `projects` (xem cảnh báo bên dưới)**
Platform: Web (Next.js 16 App Router) · State: React Query + React Context · Form: React Hook Form + Zod · Grid: AG Grid · BE: Rails 8 API REST `/api/v1`
Nguồn input: `Technique_Spec.md` (template), `FE.md`, `BE.md`, `docs/api-design.md`, `docs/db-notes.md`, `schema.txt`, wireframe `web/src/screens/project/pr01_list.js`.

> ⚠️ **Lưu ý khác biệt nền tảng so với template demo (S2_001 Flutter/Firestore):** SMOS không có realtime. Đây là CRM REST thuần (Rails). Vì vậy mục 7 "Realtime Design" được **chuyển thể thành Data-Sync / Cache Design** (React Query refetch + invalidate + optimistic update), mục 8 thành **List UX Protection** cho refetch. Mọi chỗ nói "realtime" trong template được hiểu lại theo nghĩa này.

> 🔴 **BLOCKER – PR01 bị chặn bởi DB schema chưa đủ.** Bảng `projects` hiện thiếu RẤT nhiều cột mà UI cần (motivation, inquiry_method, competitor, accuracy_initial/accuracy_revised, các mốc ngày 案件化/受注/失注, 予実 fields, và bảng nối project ↔ stage). **PR01 không thể implement đầy đủ cho đến khi schema được mở rộng theo đề xuất ở §3, §6.3 và §15.** Tài liệu này là bản **provisional** — cần cập nhật lại sau khi BE/BA chốt schema. Xem `docs/db-notes.md` #1, #5, #6 và Open Questions §15 để biết chi tiết.

---

## 1. Mục đích

Chốt cách implement màn **案件一覧・詳細** (danh sách cơ hội bán hàng / dự án + panel chi tiết) của SMOS:

- Màn implement bằng kiến trúc nào (list + detail panel, AG Grid).
- FE chia component ra sao (container vs presentational).
- Data lấy từ đâu (REST `/api/v1/projects` qua React Query).
- API contract draft cần gì (đối chiếu `docs/api-design.md §4`).
- State quản lý ở đâu (server state vs UI state).
- Business rule implement ở FE hay BE (tenant scope, permission, filter/sort/search).
- **Đồng bộ dữ liệu** xử lý thế nào (cache invalidate sau mutation; không realtime).
- Error / fallback xử lý thế nào.
- Permission xử lý thế nào (role_permissions `project.*`).
- **Điểm bị chặn do DB** chưa đủ cột (§3, §6.3, §15) — đây là mối quan tâm hàng đầu của spec này.
- Điểm nào chưa rõ cần hỏi lại (Open Questions §15).

Story này **chỉ** xử lý màn 案件; logic chi tiết của 会社/担当者 thuộc story riêng (CP01/CT01) — ở đây chỉ điều hướng/đọc dạng lookup và tab quan hệ. Tab 活動 trong detail là nested inline-edit theo pattern AT01.

---

## 2. Component Architecture

Platform: **Next.js 16 App Router** (`app/(tenant)/project/page.tsx`, `"use client"`). State: **React Query** (server) + **React Context/hooks** (UI). Form: **RHF + Zod**. Grid: **AG Grid enterprise**.

### 2.1. Component tree

```
ProjectPage (page.tsx)
└── ProjectScreen
    ├── ProjectListPanel
    │   ├── ProjectListHeader
    │   │   ├── ProjectStatusSelect              // ステータス quick filter
    │   │   ├── ProjectCompanySearchBox          // 会社名 quick search
    │   │   ├── ProjectSalesRepSelect            // 営業担当 quick filter
    │   │   ├── ProjectDateRangePicker           // 日付 range (sales_date / expected_closing_date)
    │   │   ├── AdvancedSearchButton             // mở ProjectAdvancedSearchDialog
    │   │   └── CreateProjectButton             // mở ProjectCreateDialog
    │   ├── ProjectListToolbar
    │   │   ├── ColumnSettingsButton             // 列の設定
    │   │   ├── ExportCsvButton / ImportCsvButton
    │   │   └── BulkDeleteButton                // enable khi có selection
    │   ├── ProjectListBody
    │   │   ├── ProjectListLoadingView           // skeleton/overlay
    │   │   ├── ProjectListErrorView             // message + 再読み込み
    │   │   ├── ProjectListEmptyView             // no-data vs no-result
    │   │   └── ProjectGrid (AG Grid)
    │   │       ├── ProjectColumnFilterRow       // filter theo cột (set/date)
    │   │       └── ProjectRow → cells
    │   └── ProjectPager                         // page / per_page / total
    ├── ProjectDetailPanel
    │   ├── ProjectDetailTabs                    // 詳細 | 活動
    │   ├── ProjectDetailForm (RHF+Zod)
    │   │   ├── ProjectIdField                   // 案件ID (read-only)
    │   │   ├── ProjectBasicFields               // name*, status, user_id(営業担当)
    │   │   ├── ProjectCompanyContactFields      // company lookup + 新規会社, contact lookup + 新規担当
    │   │   ├── ProjectSummaryField              // summary (概要)
    │   │   ├── ProjectDateFields                // sales_date(案件化日), expected_closing_date(フォロー予定)
    │   │   ├── ProjectStageFields               // ステージ1〜4 checkboxes → PATCH change_stage
    │   │   ├── ProjectAttachmentField           // 添付ファイル dropzone
    │   │   └── ProjectDetailActions             // 保存 / 削除
    │   └── RelatedActivitiesTab                 // GET /activities?filters[project_id]=
    └── (Dialogs – React Portal)
        ├── ProjectCreateDialog                  // RHF+Zod (reuse ProjectDetailForm fields)
        ├── ProjectAdvancedSearchDialog          // multi-field filter form
        ├── ColumnSettingsDialog                 // visible/order theo user
        ├── CompanyLookupDialog                  // chọn 会社 (shared)
        ├── ContactLookupDialog                  // chọn 担当者 (shared)
        └── ConfirmDeleteDialog                  // xoá đơn / bulk
```

### 2.2. Component giữ state / gọi hook (Container)

| Component | Vai trò |
| --- | --- |
| `ProjectScreen` | Root. Giữ UI state cục bộ: `selectedId`, panel split height (resizable), tab đang mở. Cung cấp context cho dialog handlers. |
| `ProjectListPanel` | Gọi `useProjectList(params)` (React Query). Sở hữu `listParams` (page, per_page, sort, order, q, filters). |
| `ProjectStatusSelect` / `ProjectSalesRepSelect` | Giữ giá trị chọn + cập nhật `listParams.filters[status]` / `filters[user_id]`. |
| `ProjectCompanySearchBox` | Giữ input cục bộ + debounce → cập nhật `listParams.filters[company_id]` (lookup company). |
| `ProjectDateRangePicker` | Giữ from/to → cập nhật `listParams.filters[sales_date][from/to]`. |
| `ProjectColumnFilterRow` | Cập nhật `listParams.filters[...]` theo cột (status/rep/company/contact/motivation dùng set filter; ngày dùng date range). |
| `ProjectDetailPanel` | Gọi `useProject(selectedId)` + `useUpdateProject()` / `useDeleteProject()` / `useChangeProjectStage()`. |
| `ProjectDetailForm` | Giữ form state qua RHF (`useForm` + `zodResolver`). |
| `ProjectCreateDialog` | Giữ form riêng + `useCreateProject()`. Seed `company_id`/`contact_id` khi tạo từ entity cha. |
| `RelatedActivitiesTab` | Gọi `useActivityList({ filters: { project_id } })` + phân trang con riêng; inline-edit qua `useUpdateActivity()`. |

> Nguyên tắc: **UI không gọi thẳng `apiFetch`** (theo `FE.md §5`). Luồng: `Component → hook (React Query) → lib/api/project → api-client → BE`.

### 2.3. Component chỉ render UI (Presentational)

| Component | Nhận vào (props) | Render |
| --- | --- | --- |
| `ProjectListHeader` | callbacks | Bố cục search header + nút advanced + nút tạo |
| `ProjectListLoadingView` | — | Skeleton rows / overlay |
| `ProjectListErrorView` | `onRetry` | Message lỗi + `再読み込み` |
| `ProjectListEmptyView` | `hasFilter: boolean` | `データがありません` / `該当する結果が見つかりません` |
| `ProjectGrid` | `rows: ProjectListItemVM[]`, `columns`, `onRowSelect`, `selectedId` | AG Grid render |
| `ProjectStageFields` | `stages: StageVM[]`, `onChange` | 4 checkbox rows theo stage master |
| `ProjectAuditFields` | `ProjectDetailVM` | created/updated read-only |
| `ProjectPager` | `meta`, `onPageChange`, `onPerPageChange` | First/Prev/Next/Last + page-size |

> Presentational chỉ nhận dữ liệu qua props, không đọc React Query, không chứa business logic.

### 2.4. Reuse / refactor từ wireframe & FE hiện có

| Component | Nguồn hiện tại | Hành động |
| --- | --- | --- |
| `ProjectGrid` | `pr01_list.js` (projectTable, 9 cột) + `lib/.../ag-grid` | Reuse AG Grid wrapper của FE; map cột từ wireframe |
| `ProjectColumnFilterRow` | `entityListColumnFilters.js` | Refactor sang React (set/date filter theo `PROJECT_MAIN_COLUMNS`) |
| `ProjectPager` | `pager.js` | Refactor sang component dùng `meta` |
| `ProjectAdvancedSearchDialog` | `searchFilters.js` + `dlgProjectAdvancedSearch` | Refactor sang RHF |
| `ColumnSettingsDialog` | `columnSettings.js` (localStorage `smos.pr01.colOrder/colWidths`) | Refactor sang API `/field_settings` (db-notes #8, §15) |
| `ProjectCreateDialog` | `projectCreateForm.js` | Refactor; reuse field components của detail form |
| `RelatedActivitiesTab` | `entityTabTable.js` + inline-edit logic `pr01_list.js` | Reuse pattern tab + empty state; inline-edit → `PATCH /activities/:id` |
| Panel resize | `initResizer()` trong `pr01_list.js` (localStorage `smos.pr01.listH`) | Port sang CSS resize / localStorage hook |

Reuse nguyên trạng từ FE: `apiFetch` (`lib/api-client.ts`), `useApiMutation`, `query-keys`, shadcn `ui/*`, toast (Sonner), `CompanyLookupDialog`, `ContactLookupDialog`.

---

## 3. Data Type / View Model

FE render theo **View Model riêng**, không phụ thuộc trực tiếp DB/response. Hai context: **list item** (lưới) và **detail** (form).

> 🔴 **Chú ý quan trọng:** Nhiều field trong VM bên dưới **chưa được hỗ trợ bởi DB hiện tại**. Mỗi field được đánh dấu rõ trạng thái: ✅ **CÓ trong DB** / ❌ **THIẾU trong DB** (cần mở rộng schema theo §6.3 và §15 trước khi implement).

### 3.1. Nguyên tắc

| Rule | Nội dung |
| --- | --- |
| Tách khỏi DB | BE trả `snake_case`; FE map về VM `camelCase` (1 nơi: `lib/utils/project-mappers`). |
| Nullable có fallback | Mọi field nullable có fallback rõ khi hiển thị (§3.5). |
| Không lộ raw | Không render `null/undefined/NaN` ra UI. |
| List ≠ Detail | List VM gọn (9 cột lưới); Detail VM đầy đủ + `stages[]` + `customFields` + audit. |

### 3.2. View Model: `ProjectListItemVM`

| Field | Type | Nullable | DB Status | Mục đích |
| --- | --- | --- | --- | --- |
| `id` | number | No | ✅ | Chọn row → load detail |
| `name` | string | No | ✅ | 案件名 (bắt buộc) |
| `status` | string | Yes | ✅ | ステータス (set filter) |
| `userId` | number | Yes | ✅ | 営業担当 FK |
| `salesRepName` | string | Yes | ✅ (join) | 営業担当名 hiển thị |
| `companyId` | number | Yes | ✅ | 会社 FK |
| `companyName` | string | Yes | ✅ (join) | 会社名 hiển thị + filter |
| `contactId` | number | Yes | ✅ | 担当者 FK |
| `contactName` | string | Yes | ✅ (join) | 担当(姓) hiển thị + filter |
| `salesDate` | string (ISO date) | Yes | ✅ | 案件化日 / 話題日 (cột `issueDate` trong wireframe) |
| `expectedClosingDate` | string (ISO date) | Yes | ✅ | フォロー予定 |
| `summary` | string | Yes | ✅ | 案件概要 (hiển thị cột lưới) |
| `motivation` | string | Yes | ❌ **THIẾU DB** | 発生動機 (set filter + cột lưới) |

### 3.3. View Model: `ProjectDetailVM`

Gồm toàn bộ field của list + các field chi tiết + stages + custom fields + audit:

| Nhóm | Field | DB Status |
| --- | --- | --- |
| Cơ bản | `id, name, status, userId, salesRepName` | ✅ |
| Liên kết | `companyId, companyName, contactId, contactName` | ✅ |
| Ngày | `salesDate` (案件化日), `expectedClosingDate` (フォロー予定) | ✅ |
| Ngày mốc mở rộng | `qualifiedDate` (案件化日 riêng), `orderedDate` (受注日), `lostDate` (失注日) | ❌ **THIẾU DB** |
| Xác suất | `accuracy` (確度 — DB có 1 cột chung) | ✅ (1 cột) |
| Xác suất tách | `accuracyInitial` (当初確度), `accuracyRevised` (見直確度) | ❌ **THIẾU DB** (DB chỉ có `accuracy`) |
| Nội dung | `summary` (案件概要), `notes` (備考) | ✅ |
| ステージ | `stages: StageVM[]` — `{ id, name, done }` × 4 stage | ❌ **THIẾU bảng nối** `project_stage_achievements` (DB có master `project_stages` nhưng thiếu join table) |
| Custom cốt lõi | `motivation` (発生動機), `method` (引合手段/inquiry_method), `competitor` (競合会社) | ❌ **THIẾU DB** (tạm nằm trong `custom_fields` — nhưng không lọc được) |
| 予実 kế hoạch | `plannedModel` (予定機種), `plannedQty` (予定台数), `plannedRevenue` (予定売上), `plannedPeriod` (予定時期) | ❌ **THIẾU DB** |
| 予実 thực tế | `actualModel` (実績機種), `actualQty` (実績台数), `actualRevenue` (実績売上), `actualRevenuePeriod` (実績売上時期) | ❌ **THIẾU DB** |
| Free | `customFields: { free1, free2, free3 }` | ✅ (custom_fields) |
| Audit | `createdAt, updatedAt` (createdBy/updatedBy nếu BE trả) | ✅ |

#### StageVM (nested)

```ts
interface StageVM {
  id: number;       // project_stage master ID
  name: string;     // ステージ名
  done: boolean;    // đã đạt chưa (từ bảng nối — THIẾU DB)
}
```

### 3.4. Mapping từ nguồn dữ liệu

Một nguồn (REST). Map theo `docs/api-design.md §4`:

| VM field | BE field (snake_case) | Ghi chú |
| --- | --- | --- |
| `id` | `id` | |
| `name` | `name` | |
| `status` | `status` | master `mst_options option_type=project_status` (db-notes #3) |
| `userId` / `salesRepName` | `user_id` / `user_name` (join) | |
| `companyId` / `companyName` | `company_id` / `company_name` | read-only join |
| `contactId` / `contactName` | `contact_id` / `contact_name` | read-only join |
| `salesDate` | `sales_date` | map ISO string |
| `expectedClosingDate` | `expected_closing_date` | |
| `accuracy` | `accuracy` | hiện 1 cột; khi tách: `accuracy_initial` / `accuracy_revised` |
| `summary` | `summary` | |
| `notes` | `notes` | |
| `stages` | `stages[]` | từ bảng nối (THIẾU) hoặc tạm dùng `stage1..4` boolean trên projects |
| `motivation` | `custom_fields.motivation` | tạm; đề xuất cột riêng (§6.3) |
| `method` | `custom_fields.method` | tạm; đề xuất cột `inquiry_method` |
| `competitor` | `custom_fields.competitor` | tạm; đề xuất cột riêng |
| `customFields.freeN` | `custom_fields.freeN` | |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` | |

Quy ước:
- Response REST bọc trong `data` (single) / `data[] + meta` (list) (theo `ApiClient`).
- `status` / `accuracy` / `method` nên là `mst_options` option_type tương ứng: `project_status`, `accuracy`, `inquiry_method` (db-notes #3) — không hardcode enum FE.
- `motivation` cũng là `mst_options option_type=motivation` (đã có trong 8 loại hiện tại).

### 3.5. Fallback cho field nullable

Fallback ở **tầng hiển thị**; VM giữ giá trị gốc cho search/sort.

| Field | Khi null / rỗng | Giá trị hiển thị |
| --- | --- | --- |
| `status` | thiếu / không nhận ra | không hiện badge / ô trống |
| `salesDate` / `expectedClosingDate` | thiếu | `-` |
| `salesRepName` | thiếu | `-` |
| `companyName` / `contactName` | thiếu | (ô trống) |
| `summary` | thiếu | (ô trống, ellipsis nếu dài) |
| `motivation` | thiếu | (ô trống) |
| `stages` | THIẾU DB / thiếu | render placeholder "ステージ情報なし" cho đến khi DB sẵn sàng |
| `accuracy` | thiếu | `-` |
| `name` | **bắt buộc** | nếu thiếu → drop khỏi list + log (§10) |

---

## 4. API Contract Draft

Mục tiêu: chốt **FE cần gì từ BE** cho 案件. Đối chiếu `docs/api-design.md §4`.

### 4.1. Nguyên tắc

- Story này dùng **1 kênh REST** (không realtime). Mọi cập nhật phản chiếu qua React Query refetch/invalidate.
- Khi BE chốt endpoint chính thức (Swagger `/api-docs`), đối chiếu & cập nhật.
- **Các endpoint liên quan đến field chưa có trong DB** (motivation, method, competitor, stage achievements…) sẽ trả partial data hoặc rỗng cho đến khi schema được mở rộng.

### 4.2. Yêu cầu request (LIST)

```
GET /api/v1/projects?page=1&per_page=50&sort=sales_date&order=desc
    &filters[status]=商談中&filters[user_id]=12&filters[company_id]=1141
    &filters[sales_date][from]=2026-01-01&filters[sales_date][to]=2026-12-31
```

| Item | Rule | Hiện trạng |
| --- | --- | --- |
| Purpose | Lấy DS案件 render PR01 | `GET /projects` (api-design §4) |
| Auth | Required | `Authorization: Bearer <access>` (localStorage `mh_access_token`) |
| Permission | BE check `project.read` (403 nếu thiếu) | cần BE xác nhận (§15) |
| Tenant context | **Từ JWT**, không nhận từ client | api-design §0 (multi-tenant) |
| Paging | `page`, `per_page` (10/25/50/100) | api-design §0 |
| Sort | `sort` (cột), `order` asc/desc | api-design §0 |
| Search | `q` (full-text: 案件名 + 会社名) | api-design §0 |
| Filters | `filters[status, user_id, company_id, contact_id]` | api-design §4 |
| Date filters | `filters[sales_date][from/to]`, `filters[expected_closing_date][from/to]` | api-design §0 |
| Language | `ja` | (header nếu có) |

### 4.3. Response — field FE cần

Envelope list: `{ data: project[], meta: { page, per_page, total, total_pages } }`.
Object `project` đầy đủ field theo `docs/api-design.md §4`. FE map sang VM (§3.4). Field bắt buộc cho list: `id`, `name`, `status`, `sales_date`, `expected_closing_date`, `user_id`, `company_name`, `contact_name`, `summary`; `motivation` (tạm từ `custom_fields`).

CRUD + endpoint đặc biệt (theo api-design §4):

| Method | Path | Dùng cho |
| --- | --- | --- |
| GET | `/projects` | List PR01 |
| GET | `/projects/:id` | Load detail panel |
| POST | `/projects` | ProjectCreateDialog (201 → project) |
| PATCH | `/projects/:id` | Lưu detail form |
| DELETE | `/projects/:id` | Xoá đơn |
| PATCH | `/projects/:id/change_stage` | Cập nhật stage checkbox (thay vì ghi trực tiếp vào form PATCH chung) |
| POST | `/projects/bulk_delete` | Xoá nhiều (`{ ids: [...] }`) |
| GET | `/projects/export` | Export CSV (cùng filter) |
| POST | `/projects/import` | Import CSV (multipart) |
| GET | `/activities?filters[project_id]=` | Tab 活動 |
| GET | `/project_stages` | Load stage master (tên stage 1..4) |
| GET | `/:resource/:id/documents` / POST / DELETE | Tab 添付ファイル |

**Endpoint `change_stage`** — request body đề xuất:
```jsonc
PATCH /api/v1/projects/:id/change_stage
{ "stage_id": 2, "done": true }
// hoặc bulk: { "stages": [{ "stage_id": 1, "done": true }, { "stage_id": 2, "done": false }] }
```
→ 200 `{ data: project }` (trả lại project với stages cập nhật).

> Endpoint `change_stage` cần **bảng nối `project_stage_achievements`** (db-notes #6 — THIẾU). Tạm thời có thể dùng 4 boolean column (`stage1..4`) trên `projects` như wireframe — nhưng kém linh hoạt. Đề xuất dứt khoát chọn hướng trước khi code.

### 4.4. Error handling

| Error | UI handling |
| --- | --- |
| 401 | Theo auth rule chung → refresh; fail → logout/về login |
| 403 | Message quyền; không render list/không cho lưu |
| 404 (detail) | "対象が見つかりません" + clear selection |
| 409 (conflict) | Thông báo trùng/đang bị sửa; reload detail |
| 422 (validation) | Map `error.details` → lỗi field RHF |
| 500 / network / timeout | Error state + `再読み込み` |

Message load list lỗi: `案件一覧を読み込めませんでした。時間をおいて再度お試しください。`

### 4.5. Open Questions cho BE

1. `change_stage` sẽ dùng bảng nối `project_stage_achievements` hay 4 boolean cột trên `projects`? Khi nào available?
2. Các field `motivation, inquiry_method, competitor` — BE sẽ thêm cột thật hay giữ trong `custom_fields`? Nếu `custom_fields` thì filter server-side có hỗ trợ không?
3. `accuracy` tách 2 cột (`accuracy_initial`, `accuracy_revised`) hay giữ 1 cột? Timeline?
4. `sales_date` mapping: đây là "話題日" hay "案件化日"? `qualified_date` / `ordered_date` / `lost_date` có được thêm không?
5. Endpoint `export`/`import` sẽ include các field mới (motivation, method, competitor, accuracies, stage) hay chỉ các field hiện có?
6. BE có trả `created_by` / `updated_by` (tên) cho audit không?
7. Permission: BE có trả **403** khi thiếu `project.read` / `project.write` không?
8. Bulk delete: all-or-nothing hay per-item error?

---

## 5. Initial Load Design

Flow load **lần đầu** khi mở `/project`.

### 5.1. Flow load lần đầu

| Step | Technical action | Nơi xử lý | UI result |
| --- | --- | --- | --- |
| 1 | Check auth + permission `project.read` | Route guard (middleware/client) + BE 403 | Allow, hoặc show permission message |
| 2 | Resolve context: tenant (từ JWT) | api-client tự gắn Bearer | — |
| 3 | Fetch stage master (song song) | `useProjectStages()` → `GET /project_stages` | Cần có trước khi render ステージ checkboxes |
| 4 | Fetch list snapshot | `useProjectList(params)` → `GET /projects` | `isLoading` → **skeleton** (không để lưới trống) |
| 5 | Map response → `ProjectListItemVM[]` | mapper | — |
| 6 | Render grid + pager | AG Grid | Hiển thị danh sách |
| 7 | (Empty) data rỗng | — | `データがありません` (hoặc no-result nếu có filter) |
| 8 | (Error) | — | Error view + `再読み込み` |
| 9 | Auto-select row đầu (tuỳ chọn) | `selectedId = data[0].id` | Mở detail panel → `useProject(id)` |
| 10 | Áp dụng pending search (cross-screen) | `takePendingProjectSearch()` (screenNavigation) | Pre-filter nếu navigate từ CP01/CT01 |

> Sort & filter mặc định do **BE** thực hiện qua query params; FE chỉ gửi `listParams`. Không cần lọc lại client cho list chính (khác template Flutter — vì SMOS BE là nguồn sự thật và đã scope theo tenant).
>
> **Pending search**: khi navigate từ CP01/CT01 với `company_id` hay `contact_id` prefilter, FE đọc navigation context → seed `listParams.filters` → trigger fetch ngay.

### 5.2. Chuỗi state (React Query)

```
idle → isLoading            (fetch lần đầu)  → skeleton
     → isSuccess (data ≥1)                   → grid
     | isSuccess (data [])                   → empty view
     | isError                               → error view + retry
```

`empty` suy ra từ `isSuccess && data.length === 0`. Phân biệt **no-data** vs **no-result** dựa trên `listParams` có filter/q hay không.

### 5.3. Detail load

Khi `selectedId` đổi → `useProject(id)` (`GET /projects/:id`). React Query cache theo `['project', id]`. Trong khi load: detail panel show skeleton; lỗi → error inline + nút thử lại.

### 5.4. Stage master load

`useProjectStages()` cache theo `['project_stages']`. Stale lâu (master ít thay đổi) — `staleTime` ~5 phút. Stage master dùng để render tên checkbox (ステージ1..4 hay tên tuỳ chỉnh theo tenant).

### 5.5. Edge cases khi load

| Case | Xử lý |
| --- | --- |
| Không có quyền | Không render list, show permission message |
| Đang tải | Skeleton lưới + detail |
| Lỗi/timeout | Error state + `再読み込み` (retry = refetch) |
| Không có案件 | `データがありません` |
| Item thiếu `name` (bắt buộc) | Drop item + log invalid (§10) |
| Item thiếu field nullable | Fallback theo §3.5 |
| Stage master fail | Render checkbox với label fallback "ステージN"; log warning |
| Field THIẾU DB (motivation v.v.) | Render "-" / ô trống; không crash |

---

## 6. Business Rule Implementation

Quyết định mỗi rule nằm ở BE hay FE.

### 6.1. Bảng ownership

| Rule type | BE | FE | Ghi chú |
| --- | --- | --- | --- |
| Permission | **Required** | Guard thêm | BE 403 theo `role_permissions`; FE guard router + ẩn nút write nếu thiếu quyền |
| Tenant scope | **Required** | — | BE scope theo `tenant_id` từ JWT |
| Pagination | **Required** | Gửi params | BE phân trang (Pagy) |
| Sort | **Required** (list) | Gửi params | FE chỉ chọn cột/hướng |
| Filter (status/user/company/contact/date) | **Required** (list) | Gửi params + per-column UI | BE lọc; FE dựng filter row |
| Quick search `q` | **Required** (list) | Debounce + gửi | BE full-text |
| Validation (create/update) | **Required** | Mirror (Zod) | BE là nguồn sự thật (422 → field error); FE validate sớm bằng Zod |
| Stage change | **Required** (PATCH change_stage) | Checkbox → gọi hook | BE update bảng nối; FE optimistic update checkbox |
| Fallback UI | N/A | **Required** | §3.5 |
| Column visibility/order | FE (or BE) | **Required** | Hiện wireframe lưu localStorage; nên chuyển `/field_settings` |
| Cache đồng bộ sau mutation | N/A | **Required** | Invalidate query keys (§7) |

> "Guard thêm" = defensive, không thay BE.

### 6.2. FE implement từng rule

**Permission** — Guard ở router; nếu vào được mà BE 403 → permission message. Ẩn/disable nút `新規 / 保存 / 削除 / インポート` nếu thiếu `project.create/update/delete/import`. (Permission keys: `project.read|create|update|delete|export|import`.)

**Status quick filter** — Select ステータス (từ `mst_options option_type=project_status`) → `filters[status]` → refetch.

**Sales rep filter** — Select 営業担当 (từ `GET /users`) → `filters[user_id]` → refetch.

**Company search** — Debounce ~300ms input 会社名 → lookup `company_id` hoặc `q` → refetch.

**Date range** — DatePicker from/to → `filters[sales_date][from]` + `[to]` → refetch.

**Filter cột** — `ProjectColumnFilterRow` set `filters[field]` (set filter cho status/rep/company/contact/motivation, date range cho ngày) → refetch.

**Sort** — Click header AG Grid → `sort/order` → refetch (server-side sort).

**Stage checkbox** — Click checkbox trong detail form → `useChangeProjectStage()` → `PATCH /projects/:id/change_stage`. Optimistic: check ngay; rollback nếu lỗi.

**Validation** — `projectSchema` (Zod) cho create/update: `name` required; `status` từ master enum; `sales_date` / `expected_closing_date` format ISO date; `company_id` required khi tạo. BE 422 → map `error.details` về field RHF.

**Cross-screen prefilter** — Khi navigate từ CP01 (Tab 案件) hoặc CT01 (Tab 案件) → set `listParams.filters[company_id]` / `filters[contact_id]` trước fetch đầu tiên.

**Fallback UI** — Theo §3.5.

### 6.3. Gap so với wireframe hiện tại

| Rule / Field | Wireframe (`web/src`) | Cần (production Next.js) | DB Status |
| --- | --- | --- | --- |
| Data | `mockData.js` (client) | React Query → `/projects` | — |
| Filter/sort/search | Client-side trên mock | Server-side qua query params | — |
| Column settings | `localStorage smos.pr01.*` | API `/field_settings` (db-notes #8) | — |
| Permission | Không có | Guard FE + BE 403 | — |
| Validation | Tối thiểu | Zod + BE 422 mapping | — |
| `motivation` (発生動機) | `p.motivation` (mock) | `custom_fields.motivation` → cột thật (khuyến nghị) | ❌ THIẾU cột riêng |
| `method` (引合手段) | Không có trong mock | `custom_fields.method` → cột `inquiry_method` (khuyến nghị) | ❌ THIẾU |
| `competitor` (競合会社) | Không có trong mock | `custom_fields.competitor` → cột thật (khuyến nghị) | ❌ THIẾU |
| `accuracyInitial` / `accuracyRevised` | Không phân biệt | 2 field riêng | ❌ DB chỉ có 1 cột `accuracy` |
| `qualifiedDate` / `orderedDate` / `lostDate` | Không có trong mock | 3 cột date milestone | ❌ THIẾU |
| `plannedModel/Qty/Revenue/Period` | Không có trong mock | Cột 予定 | ❌ THIẾU |
| `actualModel/Qty/Revenue/Period` | Không có trong mock | Cột 実績 | ❌ THIẾU |
| Stage checkboxes | `stage1..4` boolean trực tiếp trên project mock | Bảng nối `project_stage_achievements` (linh hoạt) | ❌ THIẾU bảng nối |
| `change_stage` endpoint | `stage1..4` ghi thẳng | `PATCH /projects/:id/change_stage` | ❌ THIẾU bảng nối |
| `status` / `accuracy` master | Hardcode array `PROJECT_SET_OPTIONS` trong wireframe | `mst_options` option_type (db-notes #3) | 🟡 Cần seed data |

> **Khuyến nghị phân loại theo db-notes #1:**
> - **(A) Thêm cột thật vào `projects`** cho các field hay lọc/sort: `motivation` (string, FK `mst_options`), `inquiry_method` (string, FK `mst_options`), `competitor` (string), `accuracy_initial` (string), `accuracy_revised` (string), `qualified_date` (date), `ordered_date` (date), `lost_date` (date). **Đây là đề xuất ưu tiên** vì các field này xuất hiện trong filter của lưới.
> - **(B) Giữ trong `custom_fields`** cho phần 予実 chi tiết (予定/実績 機種/台数/売上/時期) nếu chưa chốt nhu cầu báo cáo/lọc. `custom_fields` đủ để hiển thị form nhưng không filter server-side được.
> - **Bảng nối `project_stage_achievements`** (`project_id, project_stage_id, is_done:bool`) — cần dứt khoát, ảnh hưởng trực tiếp đến endpoint `change_stage`.

---

## 7. Data-Sync / Cache Design *(thay cho "Realtime Design")*

> SMOS **không realtime**. Đồng bộ dữ liệu = React Query cache + invalidate sau mutation. Mục này chốt cách giữ list/detail nhất quán.

### 7.1. Query keys (đề xuất, theo `lib/query-keys.ts`)

```
['projects', 'list', listParams]          // danh sách (phụ thuộc page/sort/q/filters)
['project', id]                           // detail 1 案件
['project_stages']                        // stage master (ít thay đổi)
['activities','list',{project_id}]        // tab 活動 quan hệ
['projects','list',{company_id}]          // tab 案件 từ CP01
['projects','list',{contact_id}]          // tab 案件 từ CT01
```

### 7.2. Invalidate sau mutation

| Mutation | Invalidate / update |
| --- | --- |
| Create project | `invalidate(['projects','list'])`; chọn record mới nếu cần |
| Update project | `invalidate(['project', id])` + `invalidate(['projects','list'])` (hoặc `setQueryData` optimistic cho row) |
| Change stage | `setQueryData(['project', id], ...)` (optimistic); `onError` rollback; `onSettled` invalidate |
| Delete / bulk delete | `invalidate(['projects','list'])`; clear `selectedId` nếu nằm trong tập xoá |
| Import CSV | `invalidate(['projects','list'])` |
| Create activity (từ tab 活動) | `invalidate(['activities','list',{project_id}])` |
| Update activity (inline-edit) | `invalidate(['activities','list',{project_id}])` (hoặc optimistic cell update) |

### 7.3. Optimistic update (tuỳ chọn)

- **Stage checkbox**: `onMutate` set `done` tạm trên `['project', id]`; `onError` rollback; `onSettled` invalidate. Đây là ưu tiên vì user expect checkbox phản hồi ngay.
- **Inline-edit activity tab**: `onMutate` cập nhật cell tạm; `onError` rollback; `onSettled` invalidate.
- **Update form project**: `onMutate` set tạm; rollback nếu lỗi.
- **Bulk delete**: optimistic remove rows; rollback nếu lỗi.

### 7.4. Stale/refetch

- `staleTime` list ~30–60s (theo FE.md cache hit < 60s).
- `staleTime` stage master ~5 phút (ít thay đổi).
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
| User đang sửa inline-edit tab 活動 | Không cancel edit khi refetch activity tab |
| Đổi page/sort khi đang load | Disable pager trong lúc fetch hoặc cancel request cũ |
| Scroll vị trí | Giữ scroll khi data cùng kích thước; reset khi đổi filter/page |
| Mutation xong | Toast xác nhận, không tự nhảy selection trừ khi record bị xoá |
| Stage checkbox đang pending | Disable checkbox trong lúc `change_stage` đang gọi; enable lại sau resolve |
| Panel resize | Lưu height vào localStorage (`smos.pr01.listH`); restore khi load lại |

Debounce/thời gian cụ thể để implementation quyết.

---

## 9. State Management Design

| State | Loại | Rule |
| --- | --- | --- |
| Project list data | Server cache (React Query) | `['projects','list',params]` |
| Project detail data | Server cache | `['project', id]` |
| Stage master | Server cache | `['project_stages']` |
| Activity tab data | Server cache | theo `project_id` |
| `listParams` (page/sort/q/filters) | UI state (screen) | Giữ trong ProjectScreen; có thể sync URL query |
| `selectedId` | UI transient | Chọn row → load detail |
| Active tab | UI transient | 詳細/活動 |
| Form state (create/detail) | Form state (RHF) | Local trong form |
| Dialog open/close | UI transient | Context dialog handlers |
| Column visibility/order | User setting | localStorage → API `/field_settings` (mục tiêu) |
| Panel split height | UI persistent | localStorage (`smos.pr01.listH`) |
| Pending cross-screen search | Navigation context | từ CP01/CT01 → seed `listParams` lần đầu |

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
| Field THIẾU DB (motivation v.v.) | Hiển thị "-" / ô trống; không crash; log warning |
| Stage master load fail | Fallback label "ステージN"; không block render form |
| Change stage fail | Rollback checkbox optimistic; toast lỗi |
| Inline-edit activity fail | Rollback cell; toast lỗi |

Fallback ví dụ:

| Missing | UI fallback |
| --- | --- |
| `status` không nhận ra | Không hiện badge / ô trống |
| `salesDate` / `expectedClosingDate` | `-` |
| `motivation` / `method` / `competitor` (THIẾU DB) | `-` / ô trống |
| `stages` (THIẾU bảng nối) | Placeholder "ステージ情報なし" |
| Long text (summary/notes) | Ellipsis + tooltip |

---

## 11. Navigation Design

| Action | Target | Data |
| --- | --- | --- |
| Chọn row | Detail panel (cùng màn) | `project.id` |
| Click 会社名 trong lưới | Màn CP01 (`/company`) | prefilter `company_id` |
| Click 担当(姓) trong lưới | Màn CT01 (`/contact`) | prefilter `company_id` + `contact_name` |
| Tab 活動 → click link タイプ | Màn AT01 (`/activity`) | prefilter theo context |
| 新規作成 | ProjectCreateDialog (modal) | — |
| 新規活動 (từ tab 活動) | ActivityCreateDialog | seed `project_id`, `project_name`, `company_id` |
| Quick-add row (tab 活動) | Inline row mới trong tab | seed `project_id` + defaults |
| 会社 lookup button | CompanyLookupDialog | chọn → set `company_id` + `company_name` |
| 担当 lookup button | ContactLookupDialog | chọn → set `contact_id` + `contact_name` |
| 新規会社 button | CompanyCreateDialog | tạo company mới → seed vào form |
| 新規担当 button | ContactCreateDialog | tạo contact mới → seed vào form |
| 再読み込み | Cùng màn | refetch |

Route theo `lib/constants/path.ts` (`controlPaths`). Cross-screen prefilter qua query param / navigation context (dùng `takePendingProjectSearch()` pattern từ `screenNavigation.js`).

---

## 12. Permission / Security Design

| Layer | Rule |
| --- | --- |
| FE route guard | Chặn vào `/project` nếu chưa đăng nhập / thiếu `project.read` |
| FE component guard | Ẩn/disable nút write nếu thiếu `project.create/update/delete/import/export` |
| BE/API guard | Reject API nếu thiếu permission (403) — **cần BE thực thi** (BE.md §11 ghi role_permissions "chưa thực thi") |
| Tenant boundary | BE scope theo `tenant_id` từ JWT; không nhận tenant từ client |
| Expired session | api-client tự refresh; fail → clear token → login |
| CSV import/export | Kiểm tra quyền `project.import`/`project.export`; validate file phía BE |
| Stage change | Kiểm tra `project.update` trước khi enable checkbox |

> Rủi ro hiện tại: `role_permissions` đã có schema nhưng BE **chưa enforce** (BE.md §11). FE guard là defensive — **không thay thế** BE enforcement. Đưa vào Risks §15.

---

## 13. Performance / UX Design

| Item | Target |
| --- | --- |
| Initial load | Show skeleton ngay; first paint < ~1s với cache |
| List size | Server-side pagination (mặc định 50); không load toàn bộ |
| Search/filter | Debounce ~300ms; server-side `q` và `filters` |
| Sort/filter | Server-side; `keepPreviousData` để mượt |
| Detail | Cache theo id; mở lại tức thì nếu còn fresh |
| Stage master | Cache ~5 phút; prefetch khi vào màn |
| Grid lớn | AG Grid virtualization; cân nhắc tắt refetch-on-focus |
| Navigation | Không bị block bởi refetch (request cancel/keepPrevious) |
| Panel resize | Draggable divider; lưu state localStorage |
| Stage checkbox | Optimistic update → < 50ms phản hồi visual |
| CSV export | Stream/async nếu dữ liệu lớn (Open Question quy mô) |

Nếu list rất lớn gây chậm → ghi vào Risks, không tự đổi scope.

---

## 14. Audit / Logging Design

| Log type | Rule |
| --- | --- |
| Business audit | Create/Update/Delete project → log (ai, khi nào) — **BE** (cân nhắc bảng audit) |
| Stage change audit | Log khi `change_stage` thay đổi done status (ai, stage nào, khi nào) — **BE** |
| API error log | Log khi list/detail/mutation fail (FE telemetry + BE) |
| Permission log | Log khi BE trả 403 |
| Invalid data log | FE log khi row thiếu field bắt buộc (`name`) |
| Missing DB field log | FE log warning khi field THIẾU DB trả về undefined (để phát hiện khi schema được mở rộng) |
| Import log | Log kết quả import CSV (created/updated/errors) |
| Conflict log | Log khi 409 (nếu áp dụng) |

---

## 15. Open Questions / Risks

| No | Question / Risk | Owner | Impact |
| --- | --- | --- | --- |
| 1 | 🔴 **[TOP BLOCKER]** Bảng `projects` thiếu nhiều cột: `motivation, inquiry_method, competitor, accuracy_initial, accuracy_revised, qualified_date, ordered_date, lost_date` + tất cả 予実 fields. Chọn hướng A (cột thật) hay B (custom_fields) và thực hiện migration — **cần chốt trước khi code PR01** | BE / BA | PR01 implement sai/thiếu dữ liệu; không filter được; db-notes #1 |
| 2 | 🔴 **[TOP BLOCKER]** Bảng nối `project_stage_achievements` (hoặc `project_stage_links`) chưa có. Stage checkbox UI dùng cột boolean `stage1..4` hay bảng nối? — ảnh hưởng trực tiếp `change_stage` endpoint và data model | BE / BA | Không implement được stage UI đúng; db-notes #6 |
| 3 | 🔴 `accuracy` hiện 1 cột — cần tách `accuracy_initial` + `accuracy_revised`? Timeline? | BE / BA | Form chi tiết hiển thị sai xác suất; db-notes #5 |
| 4 | 🔴 `sales_date` mapping: đây là "話題日" hay "案件化日"? Có thêm `qualified_date` riêng không? | BA / BE | Nhãn hiển thị sai; logic lọc ngày nhầm; db-notes #5 |
| 5 | 🟡 `status` / `accuracy` / `inquiry_method` đã có seed data trong `mst_options` chưa? Tên option_type chính xác? | BA / BE | Dropdown rỗng; filter set rỗng; db-notes #3 |
| 6 | 🔴 BE đã **enforce** `role_permissions` chưa? (hiện "chưa thực thi" – BE.md §11) | BE / TL | Bảo mật: FE guard không đủ; ảnh hưởng tất cả màn |
| 7 | 🟡 BE trả `created_by` / `updated_by` (tên) cho audit field không? | BE | Detail audit thiếu tên người thay đổi |
| 8 | 🟡 `change_stage` endpoint body: gửi 1 stage hay tất cả stages một lúc? | BE | Thiết kế hook + optimistic |
| 9 | 🟡 Conflict đồng thời (2 user sửa 1 project) xử lý 409 theo `updated_at`? | BE | Mất dữ liệu ghi đè |
| 10 | 🟡 Bulk delete all-or-nothing hay per-item error? | BE | UX báo lỗi xoá |
| 11 | 🟡 CSV import: mapping cột khi schema mở rộng? Validate rule cho `motivation`/`method`/`competitor`? | BE / BA | Định hình màn import |
| 12 | 🟡 Column settings lưu API `/field_settings` hay localStorage? `screen_key` cho PR01 là gì? | TL / BE | Đồng bộ cấu hình cột; db-notes #8 |
| 13 | 🟡 予実 fields (予定/実績 機種/台数/売上/時期) — khi nào có nhu cầu báo cáo/lọc? Quyết định hướng A hay B | BA | Ảnh hưởng migration scope |
| 14 | 🟢 Production FE chốt là Next.js (FE.md) — wireframe `web/src` (`pr01_list.js` vanilla JS) chỉ là tham chiếu | TL | Tránh hiểu nhầm stack |

---

## Phụ lục A — Áp dụng pattern cho story PR01 và toàn hệ thống

PR01 dùng **cùng kiến trúc** với CP01/CT01/AT01 (list + detail panel, AG Grid, React Query, RHF+Zod, dialog tạo, tab quan hệ, attachment, cross-screen prefilter). Pattern đã được chốt ở CP01 và tái sử dụng nguyên mẫu — xem `docs/tech-spec-CP01-company-list.md` §2–§14.

| Story | Endpoint | Filter chính | Tab quan hệ | Lưu ý DB |
| --- | --- | --- | --- | --- |
| CP01 会社 | `/companies` | `industry, scale_rank, company_type, district` | 担当者, 活動, 案件 | Đủ cột ✅ |
| CT01 担当者 | `/contacts` | `company_id, job_category, job_rank` | 活動, 案件 | Đủ cột ✅ |
| AT01 活動 | `/activities` | `act_type, user_id, company_id, contact_id, project_id`, range `act_date` | (none) | Thiếu `attendee_count`, リードID (db-notes #7) 🟡 |
| **PR01 案件** | `/projects` | `status, user_id, company_id, contact_id`, range `sales_date`/`expected_closing_date` | 活動 | **Thiếu NHIỀU cột + bảng nối stage** (db-notes #1/#5/#6) 🔴 |

**Điểm khác biệt chính PR01 so với CP01:**

| Khác biệt | CP01 | PR01 |
| --- | --- | --- |
| Tab quan hệ | 担当者 / 活動 / 案件 (read-only nested) | 活動 (inline-edit + quick-add) |
| Endpoint đặc biệt | — | `PATCH change_stage`, `GET /project_stages` |
| Stage master | — | Cần load `project_stages` song song khi mở màn |
| Blocked bởi DB | Không | **Có** (🔴 nhiều field + bảng nối) |
| Inline-edit tab | — | 活動 tab: dblclick cell → edit in-place → `PATCH /activities/:id` |
| Cross-screen prefilter | Nhận từ CT01/AT01/PR01 | Nhận từ CP01 (company_id) / CT01 (contact_id); gửi đến AT01 (project_id) |

> **Lưu ý quan trọng:** Spec PR01 này là **provisional** — nhiều phần §3 (VM Detail), §4 (API Contract), §6.3 (Gap table) sẽ thay đổi sau khi BE/BA chốt schema. Ưu tiên chốt các blocker #1/#2/#3/#4 ở §15 trước khi bắt đầu code.
>
> Pattern shared với CP01/CT01/AT01: `CompanyLookupDialog`, `ContactLookupDialog`, `ColumnSettingsDialog`, `ConfirmDeleteDialog`, `apiFetch`, `useApiMutation`, `query-keys`, toast (Sonner), AG Grid wrapper, `entityTabTable` pattern.
