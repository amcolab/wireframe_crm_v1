# SMOS CRM — Web UI Redesign Guide

> Mục tiêu: hiện đại hoá look & feel cho web app, **giữ nguyên IA, vị trí, flow** của desktop app cũ.
> Đối tượng: B2B CRM cho doanh nghiệp nhỏ tại Nhật. Người dùng quen desktop app.
> Phạm vi mockup: màn `会社` (sidebar + search + table list + pagination + tabs + detail form).

---

## 1. Tổng quan 2 variant

| Variant | File | Khi nào chọn |
|---|---|---|
| **Modern-light** (khuyến nghị) | `会社_modern_light.html` | Khi muốn giao diện sạch, nhiều khoảng trắng vừa phải, dễ đọc, phù hợp hệ thống "thay thế lâu dài" cho desktop. Phù hợp người dùng mới + nâng cấp brand. |
| **Compact-business** | `会社_compact_business.html` | Khi user power-user yêu cầu mật độ thông tin **giữ nguyên như desktop** (1 màn xem tối đa), chỉ "bớt cổ" về font/border/màu. Thay đổi visual là tối thiểu. |

Cả 2 đều **giữ y nguyên**:
- Sidebar trái (会社 / 担当 / 活動 / 案件) cùng vị trí + thứ tự.
- Search row với 検索 / 詳細検索 / クリア + CTA `＋新規会社` ở góc phải trên.
- Table list ở giữa, pagination + page size (100件…) bên dưới.
- Tabs `会社詳細 / 担当者 / 活動 / 案件` ngay dưới list.
- Detail form chiếm phần dưới.

Không có hành vi nào của user thay đổi — họ vẫn thao tác đúng như cũ.

---

## 2. Design tokens (mini design system)

### 2.1 Color palette

| Token | Modern-light | Compact-business | Dùng cho |
|---|---|---|---|
| `--brand-500` | `#3B6BF1` | `#1E5BD6` | Link, focus ring, tab active |
| `--brand-600` | `#2D5AE0` | `#1448B6` | Button primary, row selected accent |
| `--brand-700` | `#1E47C2` | `#0E3892` | Button primary hover, header active |
| `--accent-500` | `#F2691A` | `#E25D14` | CTA `＋新規会社` (orange) |
| `--accent-600` | `#DA5710` | `#C84F0E` | CTA hover |
| `--bg` (page) | `#F6F7F9` | `#ECEEF2` | Body background |
| `--surface` | `#FFFFFF` | `#FFFFFF` | Card/panel |
| `--surface-2` | `#FAFBFC` | `#F5F6F8` | Toolbar, form footer |
| `--border` | `#E5E8EE` | `#C9CFD9` | Border chính |
| `--border-strong` / `--border-2` | `#D2D7E0` | `#DDE1EA` | Border input/cell |
| `--hover` | `#F2F5FA` | `#EEF2F8` | Row hover, ghost button hover |
| `--row-zebra` | `#FAFBFC` | `#F7F8FB` | Zebra row even |
| `--row-selected` | `#E8F0FE` | `#DCE7FA` | Selected row |
| `--text-1` | `#0F1B2D` | `#0E1424` | Text chính |
| `--text-2` | `#475467` | `#3F4A60` | Text phụ, label |
| `--text-3` | `#7A8499` | `#7A8499` | Placeholder, disabled |
| `--success` | `#16A34A` | `#15803D` | Status OK, badge xanh |
| `--warning` | `#D97706` | `#B45309` | Cảnh báo |
| `--danger`  | `#DC2626` | `#B91C1C` | Lỗi, button delete |
| `--nav-bg` | `#1B2236` | `#1F2A44` | Sidebar background (flat, no gradient nặng) |
| `--nav-active-bar` | `#5A8DFF` | `#67A0FF` | Accent bar bên trái nav item active |

### 2.2 Typography

```
Font stack:
  -apple-system, BlinkMacSystemFont, "Segoe UI",
  "Hiragino Kaku Gothic ProN", "Noto Sans JP",
  "Yu Gothic UI", Meiryo, Arial, sans-serif

Sizes:
  --fs-xs   11px   (badge, micro label)
  --fs-sm   12px   (label, helper, pagination)
  --fs-md   13px   (body, input, table cell)        ← Modern-light
  --fs-md   12.5px (body)                            ← Compact-business
  --fs-base 14px   (form input default — Modern)
  --fs-lg   16px   (page section title)
  --fs-xl   18px   (rare)
  Page title  20px / weight 700

Weights: 400 / 500 (label, button) / 600 (header, section title) / 700 (page title)
Line-height: 1.5 body, 1.35 dense table
```

### 2.3 Spacing scale (4px base)

`4 / 8 / 12 / 16 / 20 / 24 / 32` — đặt biến `--sp-1 … --sp-8`.

- Modern-light: padding card 16–18px, gap form 14×22px, table cell 9×12px.
- Compact-business: padding card 8–10px, gap form 6×14px, table cell 5×8px.

### 2.4 Radii & shadow

```
--r-sm 4px    (input filter, badge nhỏ)
--r-md 6px    (input, button)
--r-lg 8px    (card, panel)
--r    3px    (Compact — gọn hơn)

--shadow-1: 0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)
--shadow-2: 0 4px 12px rgba(16,24,40,.06)   (hover popover, dropdown)
```

---

## 3. Component spec

### Buttons

| Loại | Modern-light | Compact-business | Dùng cho |
|---|---|---|---|
| Primary | nền `--brand-600`, h=32, r=6 | h=26, r=3 | 検索, 保存 |
| Secondary | nền trắng, border `--border-strong` | h=26 | 詳細検索, 出力, CSV取込 |
| Ghost | trong suốt, hover bg | | クリア, キャンセル, các nút phụ |
| Accent | nền `--accent-500` | | `＋新規会社` (chỉ dùng cho 1 CTA chính, không lạm dụng) |
| Danger | text `--danger`, border đỏ nhạt | | 削除 |

States bắt buộc: default / hover / focus (3px ring `rgba(brand,.18-.25)`) / active / disabled (opacity .55, cursor not-allowed).

### Inputs

- Height: 32 (Modern), 26 (Compact).
- Border: `--border-strong` / `--border`. Hover sậm hơn 1 step. Focus: border `--brand-500` + ring 2-3px.
- Placeholder: `--text-3`.
- Select dùng SVG arrow custom (xem CSS) cho đồng bộ cross-browser.
- Search box: cùng style input, button `検索` đặt cuối row (đừng "ghép dính" — giữ rời để dễ tab focus).
- Checkbox: `accent-color: var(--brand-600)`.

### Table

- Border-collapse `separate` + border-spacing 0 → kiểm soát border từng cell.
- Header sticky (`position: sticky; top:0`) để khi cuộn vẫn thấy column.
- Header: nền `--surface-2` (Modern) hoặc gradient nhẹ (Compact). Font 12px, weight 600, color `--text-2`.
- Row: padding 9×12 (Modern) / 5×8 (Compact). Border-bottom `--border` mảnh.
- Zebra: `tr:nth-child(even) td { background: --row-zebra }`.
- Hover: `tr:hover td { background: --hover }`.
- Selected: class `.selected` → bg `--row-selected`, text `#0B2A66`.
- Numeric column: `text-align:right; font-variant-numeric: tabular-nums`.
- Modern-light: **bỏ vertical border** giữa các cột → cảm giác "bớt grid dày". Compact giữ vertical border mảnh `--border-2` để giúp scan dòng dài.
- Sortable header: hiện mũi tên `↑/↓` bên cạnh, click toggle.

### Tabs

- Modern: underline tab — text `--text-2`, active `--brand-700` + border-bottom 2px `--brand-600`. Có badge số lượng `担当者 5`, `活動 23`.
- Compact: classic "folder tab" — tab active có nền trắng + border bao quanh, đè lên panel bên dưới (cảm giác desktop tab quen thuộc).

### Pagination

- Layout: trái = meta `全 12,548件 中 1〜100件を表示`, giữa = page numbers (« ‹ 1 2 … 126 › »), phải = `表示件数 [100件 ▾]`.
- Button: 30×30 (Modern) / 24×24 (Compact). Active = nền brand, text trắng.
- Giữ logic " «  ‹  …  ›  » " như desktop để user khỏi bỡ ngỡ.

### Badges / chips

- 4 màu mặc định: brand (info), gray (neutral), green (success), amber (warning).
- Padding 2×8, radius 999px (pill), font 11px, weight 500.
- Dùng cho 規模ランク (A/B/C), tag thuộc tính khách hàng, status.

### Sidebar

- Width 80px (Modern) / 64px (Compact) — icon + label tiếng Nhật ngắn (会社 / 担当 / 活動 / 案件).
- Item active: nền tối hơn 1 chút + accent bar 2-3px bên trái (`--nav-active-bar`). Text trắng.
- Bỏ gradient nặng cũ → flat color sạch hơn.
- Footer sidebar: icon settings + avatar (initial trên nền gradient).

### Form

- Modern: grid 4 cột, label trên field (`flex-direction: column`), gap 14px×22px. Field có thể `colspan-2/3/4`.
- Compact: grid `label | field | label | field | …` 4 cặp/ngang (giống desktop), label phải-aligned, text 12px.
- Required: thêm `*` đỏ sau label (`label.req::after { content: " *"; color: var(--danger) }`).
- Read-only field (vd 会社ID): dùng `.static` (background `--surface-2`, border nhạt) — phân biệt rõ với input editable.
- Section grouping bằng tiêu đề `<h3>基本情報</h3>` + `<hr>` mảnh thay vì group-box dày như desktop.
- Footer form sticky-able: nút 保存 (primary) bên phải, 削除 (danger) cạnh, キャンセル/複製 ghost/secondary.

---

## 4. Khuyến nghị "Column search" trên table

### Phương án chọn: **Option A — hàng filter inputs ngay dưới header table**

Lý do:
1. **Giữ IA cũ nhất**: user desktop quen "filter = đánh chữ vào ô của cột" (Excel-like). Không tạo concept UI mới.
2. **Không phá layout**: đã có thanh search ở trên (filter "thô" theo 会社ID/TEL/FAX) → row filter dưới header bổ sung filter chi tiết theo từng cột mà không thêm panel hay popover.
3. **Hiển thị state rõ**: ô nào có giá trị filter là user thấy ngay — không cần mở popover để check.
4. **Dễ dùng phím**: Tab di chuyển giữa các cột nhanh, Enter trigger filter.

Implementation note (xem trong cả 2 mockup, class `.filter-row`):
```
- 1 row TR ngay sau header, mỗi TD chứa <input class="filter-input">.
- Input height 22-26px, font 12px, placeholder "全て" (Modern) hoặc "contains" / "=" (Compact, gợi ý kiểu match).
- Background row hơi xám (#F2F4F8) để phân biệt với header và data row.
- Debounce 300ms khi gõ → fire request.
- Cột không filter được (checkbox, action) để TD trống.
- Có nút "Reset filter" trong toolbar trên table (có thể tích hợp vào nút クリア sẵn có).
```

**Nâng cao**: với cột enum (種別, 業種, 都道府県), filter input có thể là `<select>` hoặc multi-select dropdown. Với cột số (会社ID, 従業員数), cho phép syntax `>100`, `100-200`. Với cột date, mở popover mini-calendar khi focus.

### Tại sao không chọn Option B (panel/popover bên phải):

- Phá thói quen desktop user (họ kỳ vọng filter "ngay tại cột").
- Tốn thêm 1 cú click để mở panel.
- Phải nhớ filter đang áp gì → dễ "ẩn state".
- Nếu sau này muốn có "Saved views" hoặc "Advanced filter builder" thì panel phù hợp — nhưng nên là **bổ sung**, không thay thế filter row.

---

## 5. Cải thiện cụ thể so với màn cũ

| Vấn đề màn cũ | Giải pháp |
|---|---|
| Border table dày, cảm giác "lưới" | Modern: bỏ border dọc giữa cột, dùng zebra + border ngang mảnh. Compact: giữ border dọc nhưng dùng `--border-2` mảnh hơn. |
| Search box & button khác chiều cao | Đồng bộ 32px (Modern) / 26px (Compact). |
| CTA `＋新規会社` cam quá tươi, lệch hệ màu | Dùng `--accent-500` cam dịu hơn, đồng bộ với hệ token. |
| Sidebar gradient + bóng nặng | Flat dark navy, accent bar 3px bên trái khi active. |
| Form group-box + label chật | Section title `<h3>` + `<hr>` mảnh, label trên field (Modern) hoặc label-right (Compact). |
| Pagination gồm nhiều control rời | Group thành 3 cụm: meta — pages — page-size, cùng baseline. |
| Tab phẳng, không feedback | Underline 2px brand + count badge (Modern) / folder tab (Compact). |
| Hover row mờ | Hover `--hover` rõ + selected row `--row-selected` màu brand nhạt. |
| Required field không nổi bật | `*` đỏ sau label, focus ring rõ. |
| Read-only và editable nhìn giống nhau | Read-only dùng `.static` background xám, editable nền trắng. |
| Trạng thái UI (focus, disabled) chưa rõ | Định nghĩa đầy đủ default/hover/focus/active/disabled cho mọi component. |

---

## 6. Responsive (web 1366+)

- Min width 1366: layout grid `[sidebar 80] [content 1fr]`. Padding content 20px.
- 1280–1366 (fallback): sidebar collapse sang 64px, padding content 12px, table giữ `overflow-x: auto`.
- ≥1600: form grid mở rộng từ 4 cột sang 6 cột (rule: cột thêm vào sau cột cuối, không xếp lại để không phá quen thuộc).
- Table luôn `overflow-x: auto` + sticky header để cuộn dọc/ngang không mất context.

Không cần thiết kế mobile theo yêu cầu.

---

## 7. Accessibility tối thiểu

- Color contrast text/bg ≥ 4.5:1 (đã pass với `--text-1` trên `--surface`/`--row-zebra`).
- Focus ring ≥ 2px, màu khác border default — không bị che.
- Mọi `<input>` có `<label>` (Modern: trên field; Compact: trái field — dùng `<label for="…">`).
- Table có `<th scope="col">` (chưa thêm trong demo, cần thêm khi dev).
- Keyboard: Tab qua search → table → pagination → tabs → form. Enter trên row = mở chi tiết (giữ hành vi desktop nếu có).
- Sidebar item dùng `<a>` hoặc `<button>` với `aria-current="page"` cho item active.

---

## 8. Hand-off cho dev

- Token CSS đã đặt sẵn trong `<style>` của 2 file mockup → có thể bê thẳng sang `tokens.css` / Tailwind config.
- Component có thể implement bằng React/Vue — mỗi card section là 1 component (`<SearchBar/>`, `<DataTable/>`, `<Pagination/>`, `<Tabs/>`, `<DetailForm/>`).
- Khuyến nghị library: TanStack Table (filter/sort/sticky), React Hook Form (form), Headless UI hoặc Radix (tabs/dropdown/checkbox).
- Khi dựng Figma: tạo Color/Text/Spacing variables theo bảng token mục 2, build component variant Default/Hover/Focus/Disabled cho Button và Input trước, rồi assemble màn.

---

## 9. Checklist khi áp lên các màn còn lại (担当 / 活動 / 案件)

1. Sidebar item tương ứng → `active`.
2. Page title + subtitle đổi.
3. Search row: thay field theo entity (vd 担当: 担当者ID, 氏名, 所属会社).
4. Table cột đổi, **giữ filter-row** dưới header.
5. Pagination + page size giữ nguyên.
6. Tabs: tuỳ entity (担当 có thể là `基本 / 連絡履歴 / 担当案件`).
7. Detail form: dùng cùng grid + section title + footer toolbar.

Mọi thay đổi nội dung không đụng đến design system → đổi rất nhanh.
