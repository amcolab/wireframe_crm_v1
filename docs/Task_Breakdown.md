# 4) Task Breakdown (AI) – SMOS CRM

Category: 4. Specification (HOW)
Status: Draft
Last updated: 2026-06-09

> Tách task từ bộ Tech Spec đã viết (`docs/tech-spec-*.md`) + `docs/api-design.md` + `docs/db-notes.md` + `schema.txt`.
> Quy ước: cột **Quy mô** = độ phức tạp tương đối (S/M/L/XL), **không** phải estimate thời gian. Cột **Spec** trỏ tài liệu/mục nguồn.
>
> ⚠️ Khác template demo (S2_001 Flutter/Firestore): SMOS **không realtime**. Nhóm "Realtime/Sync" được thay bằng **DB / Schema** (workstream chặn đặc thù của SMOS) + đồng bộ dữ liệu bằng React Query (invalidate/refetch). Stack thật: Next.js 16 + React Query + RHF/Zod + AG Grid (FE) · Rails 8 REST `/api/v1` (BE).

---

## 1. Scope Summary

SMOS là CRM tiếng Nhật đa tenant: **会社 → 担当者 → 案件 → 活動** + cấu hình (列設定/master/権限) + quản trị tenant (system admin). Mỗi màn nghiệp vụ theo pattern **list (AG Grid) + detail panel + dialog tạo + tab quan hệ**.

**Trong scope:** Foundation (auth, api-client, shell, permission), DB schema fixes, BE API + enforce permission, FE shared infra, 4 màn thực thể (CP01/CT01/AT01/PR01), settings & admin (ST01/MS01/US01/RL01/PW01/TN01), cross-cutting (CSV/attachment/audit/perf).

**Ngoài scope (giai đoạn này):** báo cáo/dashboard, notification realtime, mobile app (`mobile/`), i18n đa ngôn ngữ ngoài `ja`, automated test suite (theo convention — chỉ test khi yêu cầu).

---

## 2. Task Breakdown (tổng quan nhóm)

| Nhóm | ID | Phụ thuộc chính |
| --- | --- | --- |
| Foundation | F-1 → F-7 | — |
| DB / Schema | DB-1 → DB-9 | BA chốt nghiệp vụ (DB-1) |
| BE | BE-0 → BE-11 | F-7, DB-* |
| FE – Shared infra | S-1 → S-11 | F-*, BE param |
| FE – Screens | CP/CT/AT/PR-* · SET-* | S-*, BE-* |
| Integration | INT-1 → INT-7 | FE + BE |
| QA Support | QA-1 → QA-10 | Integration |

---

## 3. Foundation Tasks

| ID | Task | Spec | Quy mô |
| --- | --- | --- | --- |
| F-1 | Khởi tạo Next.js 16 (App Router, group `(auth)`/`(tenant)`, Tailwind, shadcn, RQ provider) | FE.md | M |
| F-2 | `lib/api-client.ts`: Bearer + refresh (chủ động/bị động) + unwrap envelope `{data,meta}` + parse `{error}` | FE.md §6.3, api-design §0 | M |
| F-3 | Auth LG01→LG02: `/auth/access`, `/auth/login`, token localStorage, `useMe`, logout | api-design §1, settings-admin spec | M |
| F-4 | App shell: Sidebar (会社/担当/活動/案件 + Settings) + Topbar (breadcrumb/ngày/user) | screen-requirements §0 | M |
| F-5 | Route guard + permission context (đọc `user.permissions`, chặn route, ẩn nút write) | CP01 §12 | M |
| F-6 | `lib/query-keys.ts` factory cho 4 entity + master | CP01 §7.1 | S |
| F-7 | BE: chuẩn hoá envelope + error handler + pagination (Pagy) khớp api-design §0 | api-design §0 | M |

---

## 4. DB / Schema Tasks *(thay nhóm "Realtime/Sync")*

> Chi tiết & lý do: `docs/db-notes.md`. 🔴 = chặn code API/màn liên quan.

| ID | Task | Spec | Chặn | Quy mô |
| --- | --- | --- | --- | --- |
| DB-1 | BA chốt: `district`(地区) vùng hay 市区町村; `revenue/capital` đơn vị; `sales_date` nghĩa; có module Lead?; nhãn free field theo tenant? | db-notes #2,#5,#7,#4,#11 | DB-2..DB-8 | M |
| DB-2 | Migration `projects` +cột: motivation, inquiry_method, competitor, accuracy_initial/revised, qualified_date, ordered_date, lost_date (+予実 nếu phương án A) | db-notes #1,#5 / PR01 §3 | 🔴 PR01 | L |
| DB-3 | Migration bảng nối `project_stage_achievements` (thay stage1..4 cứng) | db-notes #6 / PR01 §3 | 🔴 PR01 | M |
| DB-4 | Migration `users` +cột: department, email, last_login_at | db-notes #9 | 🔴 US01/TN01 | S |
| DB-5 | Migration `activities` +cột: attendee_count (+ quyết định リードID) | db-notes #7 / AT01 §3 | 🟡 AT01 | S |
| DB-6 | Migration `user_field_settings` +cột `screen_key` + unique index | db-notes #8 / ST01 | 🟡 ST01 | S |
| DB-7 | Seed `mst_options` option_type mới: area, project_status, inquiry_method, activity_type, accuracy | db-notes #3 | 🟡 MS01 | S |
| DB-8 | (Tuỳ chọn) bảng `custom_field_defs` (nhãn free field theo tenant) | db-notes #4 | 🟢 | M |
| DB-9 | (Tuỳ chọn) bảng `audit_logs` | BE.md §11 | 🟢 | M |

---

## 5. BE Tasks

| ID | Task | Spec | Quy mô |
| --- | --- | --- | --- |
| BE-0 | **Enforce permission** ở controller theo `role_permissions` (403 thiếu `{resource}.{action}`) | RL01 / CP01 §12, BE.md §11 | L |
| BE-1 | Companies API: list(filter/sort/q/paging) + CRUD + bulk_delete + export + import | api-design §2 / CP01 §4 | L |
| BE-2 | Contacts API: list + CRUD + bulk_delete + export + import; join company_name; q theo 姓+名+会社名 | api-design §3 / CT01 §4 | L |
| BE-3 | Activities API: list + CRUD(PATCH inline) + bulk_delete + export + import; project_name snapshot | api-design §5 / AT01 §4 | L |
| BE-4 | Projects API: list + CRUD + change_stage + bulk_delete + export + import (cột mới sau DB-2/DB-3) | api-design §4 / PR01 §4 | XL |
| BE-5 | Documents API (đa hình): GET/POST `/:resource/:id/documents`, download, delete | api-design §6 | M |
| BE-6 | field_settings API: GET/PUT/DELETE `?target_model=` (+screen_key nếu DB-6) | api-design §8 / ST01 | M |
| BE-7 | mst_options API (+reorder, include_inactive); project_stages API | api-design §9 / MS01 | M |
| BE-8 | users API (+password reset, soft-delete); roles API (+permissions, permission_keys) | api-design §10,§11 / US01,RL01 | L |
| BE-9 | search_conditions API (lưu bộ lọc) | api-design §7 | S |
| BE-10 | system/* realm: system_admins auth + tenants CRUD + admin_user | api-design §12 / TN01 | L |
| BE-11 | Conflict 409 theo `updated_at` cho PATCH detail (nếu chốt) | CP01 §7.5,§15 | M |

---

## 6. FE Tasks

### 6.1 Shared infra

| ID | Task | Spec | Quy mô |
| --- | --- | --- | --- |
| S-1 | AG Grid wrapper: server sort/filter/paging, `keepPreviousData`, loading/empty/error overlay, resize/reorder | CP01 §2,§5,§8,§13 | L |
| S-2 | Pager component dùng `meta` (10/25/50/100) | CP01 §2 | S |
| S-3 | Per-column filter row (set/text/date-range) → `filters[...]` | CP01 §6.2 | M |
| S-4 | Quick search (debounce ~300ms) → `q` | CP01 §6.2 | S |
| S-5 | Dialog system (portal) + create-dialog handlers/seeds context | FE.md §7 / CP01 §11 | M |
| S-6 | Lookup dialog (company/contact/project) | screen-requirements §9 | M |
| S-7 | Attachment field (dropzone) → documents API | api-design §6 | M |
| S-8 | ViewModel + mapper (snake→camel, fallback) + Zod base | CP01 §3 | M |
| S-9 | Column settings: localStorage → API field_settings | ST01 | M |
| S-10 | Toast + confirm-delete + error→field(422) util | CP01 §10 | S |
| S-11 | Detail panel layout (split + resizer + tabs + RHF skeleton) | CP01 §2 | M |

### 6.2 Screens

| ID | Task | Spec | Quy mô |
| --- | --- | --- | --- |
| CP-1..5 | **会社**: hooks/VM/Zod · list panel(12 cột) · detail form+audit · tab quan hệ · dialog tạo/advanced/列設定 | tech-spec-CP01 | M·M·M·M·M |
| CT-1..4 | **担当者**: hooks/VM(姓*/名*,company lookup) · list(13 cột, keyboard nav) · tabs 基本/活動(inline)/案件 · dialog tạo+copy新規 | tech-spec-CT01 | M·M·L·M |
| AT-1..4 | **活動**: hooks/VM(act_type enum,HH:MM,snapshot) · list(badge+date range) · detail+lookup+attachment · (sau DB-5) field 面談人数/リードID | tech-spec-AT01 | M·M·M·S |
| PR-1..4 | **案件** 🔴: hooks/VM(đủ cột sau DB-2) · list(9 cột) · tabs 詳細(stage→change_stage)/活動 · dialog+予実 | tech-spec-PR01 | L·M·L·M |
| SET-1 | ST01 列の設定 dialog (visible/order theo grid) | tech-spec-settings | M |
| SET-2 | MS01 各種マスター CRUD + drag reorder | tech-spec-settings | M |
| SET-3 | US01 社員マスター CRUD + password reset (sau DB-4) | tech-spec-settings | M |
| SET-4 | RL01 権限・グループ: role CRUD + ma trận permission_key | tech-spec-settings | L |
| SET-5 | PW01 パスワード設定 form | tech-spec-settings | S |
| SET-6 | TN01 System Admin: realm login + tenant list/detail + admin dialog | tech-spec-settings | L |

---

## 7. Integration Tasks

| ID | Task | Phụ thuộc |
| --- | --- | --- |
| INT-1 | Wire CP01 ↔ companies API (list params + CRUD + invalidate) | CP-1..3, BE-1 |
| INT-2 | Tab quan hệ company → contacts/activities/projects + cross-screen prefilter | CP-4, BE-2/3/4 |
| INT-3 | CT01/AT01/PR01 ↔ API tương ứng (inline-edit 活動 → PATCH /activities) | CT-3, AT-1, BE-2/3 |
| INT-4 | PR01 ↔ projects API đầy đủ cột + change_stage (sau DB-2/DB-3, BE-4) | PR-1..3, BE-4 |
| INT-5 | Permission end-to-end: BE 403 ↔ FE guard/ẩn nút write | BE-0, F-5 |
| INT-6 | Settings/admin ↔ API (field_settings, mst_options, users, roles, system/tenants) | SET-*, BE-6/7/8/10 |
| INT-7 | CSV export/import + attachment end-to-end | X-01, S-7, BE-1..5 |

---

## 8. QA Support Tasks

| ID | Task | Spec / AC |
| --- | --- | --- |
| QA-1 | List: paging/sort/filter/q server-side đúng + `keepPreviousData` không nháy | CP01 §5,§8,§13 |
| QA-2 | Detail CRUD: create/update/delete + invalidate cache + toast | CP01 §7 |
| QA-3 | Validation: Zod sớm + BE 422 → field error mapping | CP01 §4.4,§10 |
| QA-4 | Fallback hiển thị: null/`-`/`--:--`, ẩn note rỗng, không raw NaN | CP01 §3.5,§10 |
| QA-5 | Tab quan hệ + cross-screen prefilter (company→contact/activity/project) | CP01 §11 |
| QA-6 | Permission: route guard, ẩn nút write, BE 403 message | CP01 §12, INT-5 |
| QA-7 | 活動 inline-edit + quick-add (CT01/PR01) lưu đúng | CT01/PR01 §6 |
| QA-8 | PR01 cột mới + ステージ change_stage (sau schema) | PR01 §3,§4 |
| QA-9 | Settings: 列設定 lưu API, master reorder, role permission matrix | settings spec |
| QA-10 | System admin realm tách biệt; tenant CRUD + admin account | TN01 |

---

## 9. Implementation Order

| Phase | Nội dung | Task |
| --- | --- | --- |
| P0 – Foundation | Auth, api-client, shell, permission, envelope/paging | F-1→F-7 · BE-0, BE-7(seed) |
| P1 – DB fixes | BA chốt + migration chặn | DB-1→DB-7 |
| P2 – Shared infra + 会社 | Grid/pager/filter/dialog/VM + CP01 chạy thật | S-1→S-11 · BE-1 · CP-1→CP-5 · INT-1 |
| P3 – Core entities | 担当者 + 活動 + tab quan hệ | BE-2/3 · CT-1→4, AT-1→3 · INT-2,3 |
| P4 – 案件 (sau DB) | Projects full sau schema | BE-4 · PR-1→4 · INT-4 |
| P5 – Settings & Admin | 列設定/master/社員/権限/tenant | BE-6/7/8/10 · SET-1→6 · INT-6 |
| P6 – Cross-cutting + QA | CSV, attachment, audit, perf, test | X-01→06 · BE-5/9/11 · INT-7 · QA-1→10 |

---

## 10. Parallel Work Plan

| Track | Task chạy song song được | Ghi chú |
| --- | --- | --- |
| BE | BE-1→BE-4, BE-7, BE-8, BE-10 | Độc lập FE; ưu tiên BE-0 (permission) + BE-1 sớm cho INT |
| DB | DB-2→DB-7 | Sau DB-1 (BA chốt); chặn PR01/US01/TN01 |
| FE – infra | S-1→S-11 | Nền cho mọi screen; dựng với mock VM trước khi API xong |
| FE – screens | CP→CT→AT→PR, SET | Tách dev: 会社/担当 một nhánh, 活動/案件 một nhánh |

→ FE infra (S-*) và BE (BE-*) chạy song song, đồng bộ qua **ViewModel + api contract (api-design.md)** làm hợp đồng. UI dựng trên mock VM trước, ghép API khi BE sẵn sàng.

---

## 11. Dependency Map

```
BA chốt (DB-1) ─→ DB-2/DB-3 ─→ BE-4 ─→ PR-1..3 ─→ INT-4
              └→ DB-4 ─→ BE-8/BE-10 ─→ SET-3/SET-6
F-2 (api-client) ─→ tất cả FE
F-7 + BE-0 (permission) ─→ BE-1..BE-10 ─→ INT-5
S-1..S-11 (infra) ─→ CP/CT/AT/PR/SET screens
BE-1 ─→ CP-1 ─→ INT-1 ; BE-2/3 ─→ CT/AT ─→ INT-2/3
BE-6 ─→ S-9 ─→ SET-1
mọi screen + INT ─→ QA-1..10
```

---

## 12. Open Questions / Blockers

| Item | Loại | Owner | Chặn task? |
| --- | --- | --- | --- |
| BE enforce `role_permissions` chưa? | 🔴 Risk | BE/TL (BE-0) | **Có** — phân quyền vô nghĩa tới khi xong; FE guard chỉ là defensive |
| `projects` thiếu cột + bảng nối stage | 🔴 Blocker | BE/BA (DB-2/3) | **Có** — PR01 không code đủ tới khi schema mở rộng |
| `users` thiếu department/email/last_login_at | 🔴 Blocker | BE (DB-4) | **Có** — US01/TN01 hiển thị thiếu |
| `district`(地区) nghĩa & master hoá | 🔴 Confirm | BA (DB-1) | Một phần — filter/hiển thị 地区 CP01 |
| activities `attendee_count`/リードID | 🟡 Confirm | BA/BE (DB-5) | Không — AT01 tạm bỏ field, thêm sau |
| field_settings chiều submenu | 🟡 Confirm | TL/BE (DB-6) | Không — ST01 mặc định dùng chung model |
| `revenue/capital` đơn vị & format | 🟡 Confirm | BE/BA | Không — parse có dấu phẩy, chốt nhãn sau |
| Conflict đồng thời (409 theo updated_at) | 🟢 Defer | BE (BE-11) | Không — last-write tạm chấp nhận |
| Stack: Next.js (FE.md) vs wireframe vanilla JS | 🟢 Note | TL | Không — wireframe chỉ là tham chiếu màn hình |

> **Blocker cứng:** permission enforcement (BE-0) + projects schema (DB-2/3) + users schema (DB-4). Phải chốt/triển khai trước P4–P5. Phần còn lại confirm nhẹ / defer.

---

## 13. Notes

- **api contract** (`docs/api-design.md`) + **ViewModel** (mỗi Tech Spec §3) là hợp đồng giữa BE và FE — ưu tiên chốt sớm, đổi schema phải cập nhật cả hai.
- 4 màn thực thể dùng **chung** shared infra (Phase 3 / S-*). Xây 1 lần, không lặp.
- Wireframe `web/src` (vanilla JS) chỉ là **tham chiếu màn hình**; code thật là Next.js theo `FE.md`.
- SMOS **không realtime**: đồng bộ dữ liệu = React Query invalidate/refetch sau mutation (mỗi Tech Spec §7).
- Quy mô S/M/L/XL = độ phức tạp tương đối để xếp song song, **không** dùng làm estimate thời gian.
- Không tạo file test trừ khi được yêu cầu (theo convention dự án); QA tasks là test plan/manual.
- Chi tiết từng task: tra `docs/tech-spec-*.md` (mục tương ứng) và `docs/db-notes.md`.
