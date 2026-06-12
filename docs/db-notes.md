# SMOS – Ghi chú & đề xuất sửa DB

> Đối chiếu `schema.txt` (Rails) với wireframe đã chốt (`web/src`). Liệt kê những chỗ schema **đủ dùng**, những chỗ **thiếu/cần sửa**, và đề xuất cụ thể. Mức độ: 🔴 nên sửa trước khi code API · 🟡 nên cân nhắc · 🟢 chỉ là lưu ý.

---

## Tổng quan: schema đã ổn ở đâu
- Multi-tenant + scope `tenant_id` xuyên suốt: tốt.
- Auth JWT có `jwt_denylist` + `refresh_tokens` (rotate/revoke theo session): tốt.
- `roles` + `role_permissions` (permission_key json, full_permission): đủ để làm phân quyền.
- `documents` polymorphic + Active Storage: đủ cho đính kèm mọi entity.
- `search_conditions`, `user_field_settings`, `mst_options`, `project_stages`: đã có sẵn cho lưu bộ lọc / cấu hình cột / master — rất khớp UI. Điểm cộng lớn.
- `custom_fields` polymorphic (customable + name + value): cơ chế tốt cho các ô “自由使用欄 / free fields”.

---

## 🔴 1. `projects` thiếu RẤT nhiều cột so với UI

Màn 案件 (PR01) và form tạo案件 dùng nhiều field mà bảng `projects` hiện không có. Bảng `projects` hiện chỉ có: `accuracy, status, name, summary, notes, sales_date, expected_closing_date, company_id, contact_id, user_id`.

UI đang dùng thêm:
| UI key | Nhãn | Hiện chưa có |
|---|---|---|
| `motivation` | 発生動機 | ❌ |
| `method` | 引合手段 | ❌ |
| `competitor` | 競合会社 | ❌ |
<!-- | `initial` | 当初確度 | ❌ (chỉ có 1 cột `accuracy`) | -->
| `revised` | 見直確度/修正確度 | ❌ |
<!-- | `stage1..4` | ステージ1～4 | ❌ (xem #6) | -->
| 予定機種/予定台数/予定時期/予定売上 | kế hoạch | ❌ |
| 実績機種/実績台数/実績売上/実績売上時期 | thực tế | ❌ |
| 案件化日 / 受注日 / 失注日 | mốc ngày | ❌ (chỉ có sales_date, expected_closing_date) |

**Đề xuất (chọn 1 trong 2):**
- **(A) Bổ sung cột thật** vào `projects`: `motivation, inquiry_method, competitor, accuracy_initial, accuracy_revised, planned_model, planned_qty:int, planned_period, planned_revenue:bigint, actual_model, actual_qty:int, actual_revenue:bigint, actual_revenue_date:date, qualified_date:date, ordered_date:date, lost_date:date`. → Truy vấn/lọc/sort dễ, khuyến nghị cho các field hay lọc (motivation, accuracy, các mốc ngày).
- **(B) Đẩy phần ít lọc (予実, free) vào `custom_fields`.** Giữ `projects` gọn. Nhược: khó filter/sort theo các field này.

Khuyến nghị: A cho các field cốt lõi (motivation, method, competitor, 2 accuracy, 3 mốc ngày), B cho phần 予実 chi tiết nếu chưa chốt báo cáo.

---

## 🔴 2. Lẫn lộn `district` (地区) vs 市区町村

UI dùng:
- `pref` = 都道府県 → map `companies.prefecture` ✅
- `area` = 地区 nhưng giá trị là **vùng lớn** (関東/関西/中部/九州...) → đang map tạm vào `companies.district`.

`district` theo tên thường hiểu là “quận/huyện (市区町村)”. Hai khái niệm khác nhau.

**Đề xuất:** đổi tên/định nghĩa rõ. Thêm cột `region` (地区/vùng: 関東…) và để `district` cho 市区町村 nếu sau này cần; hoặc đổi `district` → `area_block` và ghi rõ ý nghĩa = vùng. Đồng thời `area/region` nên là một `option_type` trong `mst_options` (xem #3).

---

## 🟡 3. `mst_options` cần thêm `option_type`

Wireframe quản lý 8 loại master (业种/业界/規模/種別/職種/職位/発生動機/活動目的). Nhưng các dropdown sau cũng cần master mà chưa được khai báo:
- `area / region` (地区)
- `project_status` (案件ステータス: 失注/商談中/受注/見積中/保留…)
- `inquiry_method` (引合手段: 展示会/電話/メール/SNS/Web広告…)
- `activity_type` (活動タイプ: TEL/訪問/メール/Web面談/その他)
- `accuracy` (確度ランク: Sランク/Aランク… hoặc 受注/失注/見込高)

**Đề xuất:** dùng luôn `mst_options` với `option_type` mới (không cần đổi schema, chỉ là dữ liệu). 都道府県 có thể để hằng số cố định (47 tỉnh) thay vì master.

Lưu ý naming: thống nhất một nguồn. Hiện code wireframe (`lookups.js`) đặt `biz=業種, industry=業界`; còn cột DB là `industry(業界)` + `industry_type(業種)`. Dễ nhầm → cần bảng map chuẩn (đã ghi trong `api-design.md` §2). Chốt: **業界→industry, 業種→industry_type**.

---

## 🟢 4. Free fields (自由使用欄) → `custom_fields`

UI: company `free1..free7`, contact `free1..free3`, activity `free1..free3`, project `free1..free3`.
`custom_fields` polymorphic đã đủ để chứa. Lưu `name='free1'... value=...`, `customable_type='Company'`.
**Lưu ý:** nếu cần đặt **nhãn riêng cho từng tenant** cho các ô free (vd free1 = “代理店コード”), thì cần thêm 1 bảng định nghĩa nhãn (vd `custom_field_defs`: tenant, target_model, field_key, label, sort_order). Hiện schema chưa có → nếu yêu cầu đặt tên cột tự do theo tenant thì 🔴.

---

## 🟡 5. `projects` – ngày tháng & accuracy

- Chỉ có `sales_date` + `expected_closing_date`. UI phân biệt 話題日 / フォロー予定 / 案件化日 / 受注日 / 失注日. Cần làm rõ `sales_date` đang là cái nào (話題日 hay 売上日). → Đặt tên cột rõ ràng (xem #1).
- `accuracy` 1 cột nhưng UI có **当初確度** và **見直確度**. → tách 2 cột.

---

## 🟡 6. Stage của project: bảng `project_stages` vs `stage1..4`

- `project_stages` (tenant, name, value) = **định nghĩa master các stage** dùng chung.
- UI lại thể hiện stage như **4 checkbox theo từng project** (stage1..4 = true/false).

→ Thiếu bảng nối **project ↔ stage đã đạt**. Đề xuất thêm bảng `project_stage_achievements` (hoặc `project_stage_links`): `project_id, project_stage_id, is_done:bool` (hoặc `achieved_at:date`). Khi đó UI checkbox map đúng từng stage master, số stage không cứng 4.
Nếu chấp nhận cứng tối đa 4 stage → có thể để 4 cột boolean trên `projects`, nhưng kém linh hoạt. Khuyến nghị bảng nối.

---

## 🟡 7. `activities` thiếu vài field UI

Cột activity list (66 cột) có:
- `面談人数` (số người dự họp) → ❌ chưa có cột. Đề xuất thêm `attendee_count:int`.
- `リードID` → ❌ chưa có khái niệm lead trong schema. Nếu hệ thống không có module Lead thì bỏ khỏi UI; nếu có thì cần bảng `leads` + FK. → Làm rõ với nghiệp vụ.

Còn lại `act_date, start_time, end_time, duration, act_type, purpose, motivation, comment, has_appointment, is_claim, is_follow_up_completed, project_name` đều đã có ✅.

---

## 🟡 8. `user_field_settings` thiếu chiều “submenu”

UI `columnSettings.js` lưu theo **menu × submenu** (vd: menu 会社 → submenu 担当者一覧 có cấu hình cột riêng), key `smos.columnSettings.{menu}.{sub}`.
Bảng `user_field_settings` chỉ có `target_model` (1 chiều). → Cùng 1 model `contact` nhưng hiển thị ở nhiều submenu khác nhau sẽ không phân biệt được.

**Đề xuất:** thêm cột `screen_key` (hoặc `context`) vào `user_field_settings` và đưa vào unique index thay/bổ sung cho `target_model`. Nếu nghiệp vụ chấp nhận cấu hình cột **dùng chung cho mọi nơi hiển thị 1 model** thì giữ nguyên (🟢).

---

## 🔴 9. `users` thiếu cột mà UI admin dùng

UI quản lý tenant + 社員マスター hiển thị:
- `department` (部署) — ❌ chưa có cột (UI có select 企画部/営業部/技術部/管理部).
- `email` — ❌ chưa có (dialog admin user của tenant hiển thị email).
- `last_login_at` (最終ログイン) — ❌ chưa có (UI tenant admin hiển thị 最終ログイン).

**Đề xuất:** thêm `department:string`, `email:string`, `last_login_at:datetime` vào `users`. (`department` có thể là master `mst_options option_type=department` nếu muốn chuẩn hoá.)

---

## 🟢 10. Snapshot tên trên `activities`

`activities.project_name` là chuỗi (snapshot) song song với `project_id`. Tốt cho lịch sử (tên dự án đổi vẫn giữ tên lúc ghi hoạt động). Lưu ý nhất quán: khi trả API nên trả cả `project_id` lẫn `project_name`. Tương tự company/contact nên join tên hiện tại để hiển thị (đã ghi trong api-design là read-only field).

---

## 🟢 11. Kiểu dữ liệu cần thống nhất với UI
- `companies.capital` decimal(15,2) nhưng UI nhập “10,000” có dấu phẩy → API phải parse bỏ dấu phẩy.
- `companies.revenue` bigint (đơn vị 百万円?) — UI ghi “11”, “120”. Cần chốt đơn vị (triệu yên) và ghi rõ ở nhãn.
- `fiscal_closing_month` int (1–12): validate range.
- Các field giờ (`start_time/end_time`) kiểu `time` → API trả "HH:MM".

---

## Tóm tắt việc cần làm trước khi code API (ưu tiên)
1. 🔴 Mở rộng bảng `projects` (motivation, method, competitor, 2 accuracy, các mốc ngày 案件化/受注/失注, 予実) — #1, #5.
2. 🔴 Thêm `users.department`, `users.email`, `users.last_login_at` — #9.
3. 🔴 Làm rõ `district` vs vùng (地区) — #2.
4. 🟡 Bảng nối project ↔ stage — #6.
5. 🟡 Thêm `activities.attendee_count`; quyết định có module Lead không — #7.
6. 🟡 Thêm chiều `screen_key` cho `user_field_settings` nếu cần cấu hình cột theo từng submenu — #8.
7. 🟡 Bổ sung dữ liệu `mst_options` cho area/status/method/activity_type/accuracy — #3.
8. 🟡 (Nếu cần đặt nhãn free field theo tenant) thêm bảng định nghĩa nhãn custom field — #4.
