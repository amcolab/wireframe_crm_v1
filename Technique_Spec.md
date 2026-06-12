# 3) Technique Spec

Created by: Trang
Created time: June 8, 2026 10:51 AM
Category: 4. Specification (HOW)
Last edited by: Tran Manh
Last updated time: June 9, 2026 5:51 PM
Status: Not started

# Technique Spec (demo)

## 1. Mục đích

Technical Lead cần tạo tài liệu:

`Technical Design Spec: [Story ID] – [Story Name]`

Tài liệu này phải chốt:

- Màn implement bằng kiến trúc nào
- FE chia component ra sao
- Data lấy từ đâu
- API contract draft cần gì
- State quản lý ở đâu
- Business rule implement ở FE hay BE
- Realtime xử lý thế nào
- Error / fallback xử lý thế nào
- Permission xử lý thế nào
- Điểm nào chưa rõ cần hỏi lại

## 2. Component Architecture

> Mục 2**. Component Architecture** trong Tech Spec của story **S2_001 – Booking List Left Panel**.
Input: `Spec_S2_001_Booking_List_Left_Panel_Notion_Safe.md`, `01_OVERVIEW_S2.md`, codebase `project_aiorder_s2`.
Platform: Flutter tablet · State: `flutter_bloc` (Cubit) · Model: `freezed` · Realtime: Firestore.
> 

---

---

## 1. Component tree

```
BookingListPanel
├── BookingListHeader
│   ├── BookingListTitle
│   ├── BookingSearchBox
│   └── CreateBookingButton
└── BookingListBody
    ├── BookingListLoadingView
    ├── BookingListErrorView
    ├── BookingListEmptyView
    └── BookingListView
        └── BookingCard
            ├── BookingCardHeaderRow
            ├── BookingCardMetaRow
            ├── BookingCardNote
            └── BookingStatusBadge
```

---

## 2. Component nào giữ state / gọi cubit (Container)

| Component | Vai trò |
| --- | --- |
| `BookingListPanel` | Root. Cung cấp `BookingListCubit`. Giữ UI state cục bộ: đóng/mở panel. |
| `BookingSearchBox` | Giữ `TextEditingController`. Gọi `cubit.search()` / `cubit.clearSearch()`. |
| `BookingListBody` | `BlocBuilder` đọc `state.status` để chọn view con. |
| `CreateBookingButton` | Bắn callback mở S2_002 (không giữ state). |
| `BookingCard` | Bắn callback `onTap` mở S2_003 (không giữ state). |

> Chỉ **một** cubit cho cả màn: `BookingListCubit`. Không widget nào gọi repo trực tiếp.
> 

---

## 3. Component nào chỉ render UI (Presentational)

| Component | Nhận vào | Render |
| --- | --- | --- |
| `BookingListHeader` | — | Bố cục title + search + button |
| `BookingListTitle` | — | Icon lịch + 「本日の予約」 |
| `BookingListLoadingView` | — | Skeleton |
| `BookingListErrorView` | `onRetry` | Message lỗi + `再試行` |
| `BookingListEmptyView` | `hasKeyword` | `本日の予約はまだありません` / `該当する結果が見つかりません` |
| `BookingListView` | `List<ReservationModel>`, `onTapBooking` | `ListView.builder` dựng card |
| `BookingCardHeaderRow` | `ReservationModel` | Giờ + tên khách |
| `BookingCardMetaRow` | `ReservationModel` | Số khách + SĐT |
| `BookingCardNote` | `String?` | Dòng note (ẩn nếu rỗng) |
| `BookingStatusBadge` | `status`, `tables` | Status label + 卓番号 |

> Component presentational chỉ nhận dữ liệu qua props, không đọc cubit, không chứa logic nghiệp vụ.
> 

---

## 4. Component reuse / refactor từ code hiện tại

| Component | Nguồn hiện tại | Hành động |
| --- | --- | --- |
| `BookingListPanel` | `reservations_widget.dart` | Refactor (giữ toggle, tách header/body) |
| `BookingListHeader` / `BookingSearchBox` / `CreateBookingButton` | inline trong `reservations_widget.dart` | Tách mới |
| `BookingListBody` | `BlocBuilder` inline | Refactor (thêm nhánh loading/error) |
| `BookingListLoadingView` / `BookingListErrorView` | — | Mới |
| `BookingListEmptyView` | `context.emptySmall(...)` | Refactor (phân biệt no-booking vs no-result) |
| `BookingListView` | `ListView.builder` inline | Tách mới |
| `BookingCard` + sub-rows | `item_reservations_widget.dart` | Refactor (đổi onTap sang S2_003) |
| `BookingStatusBadge` | `buildStatus()` trong item | Tách + bổ sung 卓番号 |

Reuse nguyên trạng từ `common/`: `ButtonPrimary`, `CustomTextField`, `common/theme`, các extension (`context_ext`, `num_ext`, `date_time_ext`, `reservation_ext`).

---

## 3. Data Type / View Model

> Mục **6. Data Type / View Model** của story **S2_001 – Booking List Left Panel**.
Chỉ định nghĩa: View Model FE dùng để render · mapping từ nguồn dữ liệu · fallback cho field nullable.
Logic filter/sort/normalize/realtime reconcile thuộc các mục khác.
> 

---

### 3.1. Nguyên tắc

FE render theo **View Model riêng** (`BookingItemViewModel`), không phụ thuộc trực tiếp DB / response API.

| Rule | Nội dung |
| --- | --- |
| Tách khỏi DB | API có thể `snake_case` hoặc đổi format; FE map về 1 View Model thống nhất. |
| 2 nguồn về 1 VM | Snapshot REST (`ReservationModel`) và realtime Firestore (`ReservationFirebaseModel`) cùng map về `BookingItemViewModel`. |
| Nullable có fallback | Mọi field nullable phải có fallback rõ khi hiển thị. |
| Không lộ raw | Không bao giờ render null / undefined / NaN ra UI. |

---

### 3.2. View Model: `BookingItemViewModel`

| Field | Type | Nullable | Mục đích |
| --- | --- | --- | --- |
| `bookingId` | string | No | Điều hướng sang S2_003 |
| `bookingTime` | DateTime | Yes | Hiển thị giờ + sort |
| `customerName` | string | Yes | Hiển thị + search |
| `phoneNumber` | string | Yes | Hiển thị + search |
| `guestCount` | int | Yes | Hiển thị số khách |
| `note` | string | Yes | Hiển thị note |
| `status` | BookingStatus (enum) | No | Filter + badge |
| `assignedTableCodes` | string[] | Yes | Hiển thị bàn đã gán |
| `createdAt` | DateTime | Yes | Tie-break sort khi cùng giờ |
| `updatedAt` | DateTime | Yes | Reconcile realtime (so timestamp để chọn bản mới hơn) |

Ghi chú điều chỉnh so với bản nháp:

- `bookingTime` / `createdAt` để **DateTime** thay vì string — cần so sánh để sort, format ra string là việc của tầng hiển thị.
- `bookingTime`: nếu nguồn chỉ trả giờ `HH:mm` (tách `visitDate` / `visitTime`), mapper **kết hợp giờ với business date** để tạo `DateTime` đầy đủ dùng cho sort. Không sort thuần trên chuỗi giờ.
- `status` để **enum** (`BookingStatus`) thay vì raw string — filter và badge cần giá trị type-safe, tránh so chuỗi. Raw status string từ API/Firebase được map sang enum ở bước mapping.
- `updatedVersion` đổi thành **`updatedAt` (DateTime)** — reconcile realtime bằng cách so timestamp, thống nhất một cách (không dùng version string mơ hồ). Nếu sau này BE cấp khoá version riêng thì đổi sang `String? versionKey`, nhưng chỉ chọn **một** cách.
- `createdOrder` đổi tên thành `createdAt` cho rõ nghĩa (vẫn dùng đúng mục đích: tie-break sort).

---

### 3.3. Type definition (shape, không phải code final)

Đây là **shape** của View Model. Code thực tế dùng `freezed` theo convention dự án.

```dart
enum BookingStatus { pending, confirmed, checkIn, seated, unknown }

@freezed
abstract class BookingItemViewModel with _$BookingItemViewModel {
  const factory BookingItemViewModel({
    required String bookingId,
    DateTime? bookingTime,
    String? customerName,
    String? phoneNumber,
    int? guestCount,
    String? note,
    @Default(BookingStatus.unknown) BookingStatus status,
    List<String>? assignedTableCodes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _BookingItemViewModel;
}
```

> VM **không** import model DB; nó là output của tầng mapping.
> 

---

### 3.4. Mapping từ nguồn dữ liệu

Hai nguồn có tên field khác nhau → quy về cùng VM:

| VM field | REST `ReservationModel` | Firebase `ReservationFirebaseModel` |
| --- | --- | --- |
| `bookingId` | `id` | `id` |
| `bookingTime` | `visitTime` | `visitTime` |
| `customerName` | `infoCustomer?.name` | `customerName` |
| `phoneNumber` | `infoCustomer?.phone` | `customerPhone` |
| `guestCount` | `numberOfPeople` | `numberOfPeople` |
| `note` | `note` | `note` |
| `status` | raw status string | raw status string |
| `assignedTableCodes` | `tables[].code` (hoặc `tableIds`) | (xem ghi chú reconcile) |
| `createdAt` | `createdAt` | (không có) |
| `updatedAt` | `updatedAt` | `updatedAt` / `eventTimestamp` / Firestore document update time |

Quy ước map dữ liệu (theo `01_OVERVIEW_S2.md` mục 9.2):

- API `snake_case` → Dart `camelCase` qua `@JsonKey(name: '...')` ở tầng model, **trước** khi vào VM.
- **Raw status string** (API/Firebase thường trả chuỗi) → map sang `BookingStatus` enum; giá trị lạ → `unknown`.
- `assignedTableCodes`: nếu realtime payload không có table codes thì **giữ giá trị hiện có khi merge** (chi tiết reconcile ở mục Realtime Design).
- `updatedAt` realtime: **không** dùng `visitTimeEnd` làm version. Dùng `updatedAt`, `eventTimestamp`, hoặc Firestore document update time.
- Realtime event thiếu field → **không** ghi đè field hiện có của VM.

---

### 3.5. Fallback cho field nullable

Fallback áp dụng ở **tầng hiển thị**; VM vẫn giữ giá trị gốc (kể cả null) để search/sort xử lý đúng.

| Field | Khi null / rỗng / sai format | Giá trị hiển thị |
| --- | --- | --- |
| `customerName` | thiếu | `名前未設定` |
| `phoneNumber` | thiếu | `-` |
| `guestCount` | missing / null / invalid before mapping | `-名` |
| `bookingTime` | thiếu / sai format | `--:--` + đẩy xuống cuối danh sách |
| `note` | thiếu | ẩn dòng note |
| `status` | không hợp lệ | `unknown` → không render badge |
| `assignedTableCodes` | thiếu / rỗng | chỉ hiển thị status label, không có `-` thừa |

Nguồn text fallback: mục 6 (UI Text) của BA Spec.

---

## 4. API Contract Draft

> Mục 4**. API Contract Draft** của story **S2_001 – Booking List Left Panel**.
Mục tiêu: chốt **FE cần gì từ BE**, không nhất thiết chốt endpoint cuối nếu API Spec chưa có.
Field render/fallback xem mục 6 (View Model).
> 

---

### 4.1. Nguyên tắc

- Draft này mô tả **yêu cầu FE đặt cho BE**, không khoá schema cuối.
- S2_001 dùng **2 kênh dữ liệu**: REST (snapshot ban đầu) + Firestore (realtime). Cả hai phải đủ field để dựng `BookingItemViewModel`.
- Khi API Spec chính thức có, đối chiếu và cập nhật draft này.

---

### 4.2. Yêu cầu request

| Item | Rule | Hiện trạng codebase |
| --- | --- | --- |
| API purpose | Lấy danh sách booking để render S2_001 | `GET /manager/reservations` |
| Auth | Required | Header `Authorization: Bearer` (secure storage) |
| Permission | BE phải check quyền Restaurant Board | (cần BE xác nhận) |
| Store context | Theo user session | `storeId` lấy sau login; Firestore nghe `stores/{storeId}/reservations` |
| Business context | Theo rule BA / Store Setting (ngày kinh doanh, ca qua đêm) | **chưa rõ filter ở BE hay FE** — xem Open Question |
| Language | `ja` (UI production tiếng Nhật) | Header `Language-Code` |
| Session | Theo session hiện tại | Header `X-Session-Code` |
| Cache key | Theo `store + business date` | (cần thống nhất) |

---

### 4.3. Response — field FE cần

Tên generic trong draft gốc map sang field thật (snake_case) và VM mục 6. Vì VM render đủ thông tin booking nên "tối thiểu" phải gồm cả phone / guest / note (BA bắt buộc search theo phone, hiển thị số khách).

| Generic (draft) | Field BE (snake_case) | Required | Nullable | Purpose | VM field |
| --- | --- | --- | --- | --- | --- |
| id | `id` | Yes | No | Identify + điều hướng S2_003 | `bookingId` |
| display_time | `visit_time` (+ `visit_date`) | Yes | Yes | Render + sort | `bookingTime` |
| display_name | `info_customer.name` | No | Yes | Render + search | `customerName` |
| — | `info_customer.phone` | No | Yes | Render + search (phone) | `phoneNumber` |
| — | `number_of_people` | No | Yes | Render số khách | `guestCount` |
| — | `note` | No | Yes | Render note | `note` |
| status | `status` | Yes | No | Filter + badge | `status` |
| related_codes | `tables[].code` (hoặc `table_ids`) | No | Yes | Badge mã bàn | `assignedTableCodes` |
| created_order | `created_at` | No | Yes | Stable sort khi cùng giờ | `createdAt` |
| updated_version | `updated_at` | No | Yes | Conflict handling realtime | `updatedAt` |

Ghi chú:

- Response REST chuẩn bọc trong field `data` (theo `ApiClient`).
- Realtime payload (Firestore) hiện **thiếu** `table codes`, `created_at`, `updated_at` → cần BE bổ sung hoặc FE giữ từ snapshot (xem Open Question).
- `status` BE trả raw string → FE map sang `BookingStatus` enum (mục 6.4).

---

### 4.4. Error handling

| Error | UI handling | Rule BA |
| --- | --- | --- |
| 401 | Theo auth rule chung (logout / về login) | mục 4 |
| 403 | Hiển thị message quyền theo rule chung | EX1, AC52 |
| 500 | Error state + `再試行` | EX4, AC8 |
| Network error / timeout | Error state + `再試行` | EX5 |
| Invalid response | Fallback + log + reload nếu cần (không ghi đè data hiện có) | EX15, 9.17 |

Error message load list: `予約一覧を読み込めませんでした。ネットワーク接続を確認して再度お試しください。`

---

### 4.5. Open Questions cho BE

1. **Filter business date ở đâu?** BE trả booking đã lọc theo ngày kinh doanh hiện tại (gồm ca qua đêm) hay FE tự lọc? (Code hiện tại FE lọc theo calendar day — chưa đúng BA 9.2/9.3.)
2. **Permission check**: BE có trả 403 khi user không có quyền Restaurant Board không?
3. **Realtime payload đủ field?** Firestore có cấp `table codes`, `created_at`, `updated_at` để reconcile + sort + badge không?
4. **Version để conflict handling**: dùng `updated_at` hay BE cấp khoá version riêng?

---

## 5. Initial Load Design

> Mục **5. Initial Load Design** của story **S2_001 – Booking List Left Panel**.
Mô tả flow load dữ liệu **lần đầu** khi mở màn. Realtime update (sau load) thuộc mục Realtime Design.
> 

---

### 5.1. Flow load lần đầu

| Step | Technical action | Nơi xử lý | UI result |
| --- | --- | --- | --- |
| 1 | Check permission Restaurant Board | Router guard (`redirect.dart`) + BE 403 | Allow vào, hoặc show permission message (không render S2_001) |
| 2 | Resolve context: `storeId` + business date | Shell inject `storeId`; `BusinessDateResolver` (Store Setting) | — (chuẩn bị, chưa đổi UI) |
| 3 | Fetch snapshot REST | `cubit.load()` → `GET /manager/reservations` | `status = loading` → show **skeleton** (không để panel trống) |
| 4 | Map response → View Model | mapper → `BookingItemViewModel` | — |
| 5 | Apply filter (chỉ giữ item hợp lệ) | cubit: current store + business date + status nhóm hiển thị | — |
| 6 | Apply sort | cubit: giờ tăng dần → `createdAt` tie-break → thiếu giờ xuống cuối | — |
| 7 | Success (có item) | `emit(success, filtered)` | Show `BookingListView` |
| 8 | Empty (không item hợp lệ) | `emit(success, filtered = [])` | Show `本日の予約はまだありません` |
| 9 | Error | `emit(error)` | Show error + `再試行` |
| 10 | Subscribe realtime | sau **initial snapshot success** → `_listenRealtime()` | Danh sách bắt đầu nhận update (mục Realtime Design) |

> Realtime **chỉ** subscribe sau khi initial snapshot **success** (không subscribe khi load lỗi). Nếu user `再試行` và **retry success**, thì subscribe ở thời điểm đó. Mục tiêu: tránh merge khi map gốc chưa sẵn sàng.
> 

---

### 5.2. Chuỗi state emit

```
initial
  → loading                         (step 3: bắt đầu fetch)
  → success + filtered (≥1)         (step 7: có booking)
  | success + filtered ([])         (step 8: empty)
  | error + errorMessage            (step 9: fail)
```

`empty` không phải status riêng — suy ra từ `status == success && filteredReservations.isEmpty` (theo `FeatureStatus` hiện có: `initial / loading / success / error`).

---

### 5.3. Quy tắc filter (step 5)

Giữ booking khi thỏa **đồng thời** (BA 9.4):

| Điều kiện | Giữ |
| --- | --- |
| Thuộc current store (**defensive guard**: dù API đã filter theo store, FE vẫn check lại) | Yes |
| Thuộc business date hiện tại | Yes |
| Status ∈ { `pending`, `confirmed`, `check_in`, `seated` } | Yes |

Loại bỏ: `completed`, `cancelled`, `no_show`.

> Dùng business/technical status (enum) ở Tech Spec; label JP (`確認待ち`…) chỉ dùng cho UI.
> 

> Chi tiết định nghĩa business date / mapping status thuộc mục 9 (Business Rule). Ở đây chỉ chỉ ra filter chạy **trong bước load**, trước khi sort.
> 

---

### 5.4. Quy tắc sort (step 6)

| Priority | Rule |
| --- | --- |
| 1 | `bookingTime` sớm hơn |
| 2 | `createdAt` sớm hơn (khi cùng giờ) |
| 3 | Thứ tự ổn định nếu vẫn trùng |

Booking thiếu / sai giờ → xuống cuối, hiển thị `--:--`, không crash (BA 9.6).

---

### 5.5. Edge cases khi load

| Case | Xử lý | Rule |
| --- | --- | --- |
| Không có quyền | Không render list, show permission message | EX1, AC52 |
| Đang tải | Skeleton, không để panel trống | EX3, AC7 |
| Load lỗi / timeout | Error state + `再試行`; retry gọi lại `load()` | EX4, EX5, AC8, AC9 |
| Không có booking hợp lệ | `本日の予約はまだありません` | EX2, AC6 |
| Response thiếu field **bắt buộc** (`bookingId`) | **Drop item** khỏi danh sách + log invalid data | mục 12 |
| Response thiếu field **nullable** | Fallback theo VM (mục 6.5), không crash | mục 12 |

---

## 6. Business Rule Implementation

### Guideline

TL phải quyết định business rule nằm ở đâu.

| Rule type | BE | FE |
| --- | --- | --- |
| Permission | Required | Guard thêm |
| Current store filter | Required | Guard thêm |
| Business date filter | Preferred | Guard thêm |
| Status display filter | Preferred | Guard thêm |
| Sort | Optional | Required sau realtime |
| Search | N/A | Required |
| Fallback UI | N/A | Required |
| Realtime conflict | Required | Required |

Nguyên tắc:

- BE bảo vệ dữ liệu và quyền.
- FE vẫn guard để tránh realtime/cached data sai.
- UI rule như fallback, search, display badge nằm ở FE.

> Mục **6. Business Rule Implementation** của story **S2_001 – Booking List Left Panel**.
Quyết định **mỗi business rule nằm ở BE hay FE**, và FE implement thế nào.
Chi tiết realtime conflict thuộc mục Realtime Design; search/sort/fallback chi tiết ở các mục tương ứng — ở đây chỉ chốt ownership.
> 

---

### 6.1. Nguyên tắc phân tầng

- **BE**: bảo vệ dữ liệu và quyền — là nguồn sự thật về permission, store, business date, status.
- **FE**: vẫn **guard lại** để tránh dữ liệu realtime/cached sai (defensive), và sở hữu các rule thuần UI.
- UI rule (fallback, search, display badge, sort sau realtime) nằm ở FE.

---

### 6.2. Bảng ownership

| Rule type | BE | FE | Ghi chú |
| --- | --- | --- | --- |
| Permission | Required | Guard thêm | BE check quyền Restaurant Board (403); FE guard qua router. |
| Current store filter | Required | Guard thêm | BE filter theo store; FE check lại trên cả snapshot lẫn realtime. |
| Business date filter | Preferred | Guard thêm | BE nên filter theo ngày kinh doanh; nếu không, FE tự lọc. |
| Status display filter | Preferred | Guard thêm | BE nên trả đúng nhóm status; FE vẫn lọc lại. |
| Sort | Optional | **Required** sau realtime | Thứ tự cuối do FE quyết, đặc biệt sau khi merge realtime. |
| Search | N/A | **Required** | Thuần FE, chạy trên data đã load. |
| Fallback UI | N/A | **Required** | Thuần FE (mục 3.5). |
| Realtime conflict | Required | Required | BE phát version/timestamp; FE reconcile. |

> "Guard thêm" = defensive check, không thay BE. Nếu BE đã đúng thì FE guard là no-op; nếu BE/realtime sai thì FE chặn không cho hiển thị sai.
> 

---

### 6.3. FE implement từng rule

### Permission (BE required + FE guard)

FE guard ở router (`redirect.dart`); nếu vào được mà BE trả 403 → show permission message, không render list. (BA EX1, AC52)

### Current store filter (BE required + FE guard)

FE chỉ giữ booking có `storeId == currentStoreId` — áp dụng trên **cả** snapshot REST và mỗi realtime event. Không xử lý cross-store. (BA 9.1)

### Business date filter (BE preferred + FE guard)

Giữ booking thuộc **ngày kinh doanh hiện tại** (theo Store Setting, hỗ trợ ca qua đêm — không reset theo mốc 00:00). FE dùng `BusinessDateResolver` để xác định khoảng ngày kinh doanh, không so thuần `DateTime.now()` calendar day. (BA 9.2, 9.3)

> ⚠️ Code hiện tại đang so calendar day (`visitDate.year/month/day == now`) → **chưa đúng** rule qua đêm. Cần thay bằng business-date range.
> 

### Status display filter (BE preferred + FE guard)

Giữ status ∈ `{ pending, confirmed, check_in, seated }`; loại `completed`, `cancelled`, `no_show`. Status lạ → `unknown` → không hiển thị badge. (BA 9.4)

### Sort (FE required sau realtime)

Sort: `bookingTime` tăng dần → `createdAt` tie-break → thiếu giờ xuống cuối. Áp dụng sau load **và** sau mỗi realtime merge. Bảo vệ chống nhảy dòng khi user thao tác → mục Realtime UX Protection. (BA 9.6, 9.16)

### Search (FE required)

Chạy trên data đã load; normalize tên (trim, lowercase, full/half-width, hiragana↔katakana) và phone (bỏ `-`, space, ngoặc); không hỗ trợ romaji. Chi tiết ở mục State Management / Search. (BA 9.8)

### Fallback UI (FE required)

Theo mục 3.5: tên `名前未設定`, phone `-`, số khách `-名`, giờ `--:--`, ẩn note rỗng, không render raw null/NaN.

### Status badge display (FE required)

Ghép status label + mã bàn theo format BA 9.5: 1 bàn `[label]-[卓番号]番テーブル`, nhiều bàn `[label]-[卓1],[卓2]番テーブル`; thiếu bàn → chỉ label, không có `-` thừa. Màu theo status, không theo trạng thái bàn.

### Realtime conflict (BE + FE)

BE phát timestamp/version; FE reconcile: chỉ ghi đè khi event mới hơn (`updatedAt`), event thiếu field không ghi đè, không chắc chắn thì reload. Chi tiết ở mục Realtime Design. (BA 9.15, 9.17)

---

### 6.4. Gap so với code hiện tại

| Rule | Hiện tại | Cần |
| --- | --- | --- |
| Business date | So calendar day | Business-date range (ca qua đêm) |
| Status filter | Chưa lọc rõ nhóm hiển thị | Lọc đúng 4 status, loại completed/cancelled/no_show |
| Search normalize | Chỉ trim + lowercase | Full/half-width, kana, phone normalize |
| Status badge | Chỉ label | Label + mã bàn theo format 9.5 |
| Realtime conflict | Ghi đè trực tiếp | Reconcile theo version/timestamp |

---

## 7. Realtime Design

### Guideline

Nếu story có realtime, TL phải chốt rõ event flow.

| Item | Rule |
| --- | --- |
| Subscribe timing | Khi component mount và có đủ context |
| Unsubscribe timing | Khi unmount hoặc context đổi |
| Event type | Create / update / delete |
| Create event | Add nếu hợp lệ |
| Update event | Update nếu còn hợp lệ |
| Hidden status | Remove khỏi list |
| Cross-store event | Ignore |
| Cross-date event | Ignore hoặc remove |
| Missing required data | Ignore và trigger reload |
| Delete event | Remove khỏi list |

Payload tối thiểu:

| Field | Purpose |
| --- | --- |
| id | Upsert/remove |
| store/context | Guard scope |
| business date/context | Guard date |
| status | Display/remove |
| updated data | Update UI |
| version/update time | Conflict handling |

> Mục **7. Realtime Design** của story **S2_001 – Booking List Left Panel**.
Chốt event flow realtime: subscribe/unsubscribe, xử lý từng loại event, payload tối thiểu, reconcile.
Chống nhảy dòng / layout shift khi user thao tác thuộc mục 8 (Realtime UX Protection).
> 

---

### 7.1. Nguồn realtime

Firestore `stores/{storeId}/reservations` (**theo codebase hiện tại**; nếu Realtime Spec đổi path thì cập nhật theo) qua `AppFirebaseService.watchReservationsChanges(storeId)`, trả `Stream<List<FirebaseChangeModel<ReservationModel>>>`.

`FirebaseChangeModel` wrap: `type` (`added` | `modified` | `removed`) + `id` + `data`.

---

### 7.2. Subscribe / Unsubscribe

| Item | Rule | Hiện trạng codebase |
| --- | --- | --- |
| Subscribe timing | Sau **initial snapshot success** (đủ context: store + business date). Ưu tiên `skipInitial: true` **nếu `AppFirebaseService` hỗ trợ**; nếu không, phải **dedupe theo `id` + version** để tránh nhận lại bản đã có. | `init()` → `getReservations()` rồi `_listenToReservations()` (đúng) |
| Unsubscribe timing | Khi cubit `close()` (unmount) **hoặc** `storeId` đổi | ⚠️ Cần lưu `StreamSubscription` và `cancel()` trong `close()` — code hiện chưa thấy hủy |
| Resubscribe | Khi retry load thành công, hoặc store/business date đổi | (theo mục 5 step 10) |

> Sai `storeId` → nghe sai collection (overview mục 14.2). Đổi store **không** thuộc scope S2_001 (BA 9.1) nhưng vẫn phải hủy/đăng ký lại đúng nếu shell đổi store.
> 

---

### 7.3. Xử lý event

| Event | Rule | BA |
| --- | --- | --- |
| Create (`added`) | Add vào list nếu **hợp lệ** (store + business date + status hiển thị) | 9.15 |
| Update (`modified`) | Update card nếu còn hợp lệ; nếu **đổi sang status ẩn / khác ngày** → remove | 9.15 |
| Delete (`removed`) | Remove khỏi list | 9.15 |
| Cross-store event | **Ignore** (guard `storeId`) | 9.1 |
| Cross-date event | **Ignore** (add) / **remove** (nếu đang có) | 9.2 |
| Thiếu business date trong event | **Không upsert**; nếu record đang tồn tại → trigger reload (không tự suy đoán còn hợp lệ) | 9.2, 9.17 |
| Hidden status (completed/cancelled/no_show) | Remove khỏi list | 9.4 |
| Missing required data (vd thiếu `id`) | **Ignore event** + trigger reload nếu cần | 9.17, EX15 |

Áp dụng **cùng bộ guard** (store + business date + status) như bước initial load — không có "đường tắt" cho realtime.

Khi đang search: cập nhật **data gốc**, giữ keyword hiện tại, kết quả filter đổi theo data mới. (BA 9.15)

---

### 7.4. Payload tối thiểu

| Field cần | Mục đích | `ReservationFirebaseModel` |
| --- | --- | --- |
| id | Upsert / remove | `id` ✅ |
| store / context | Guard scope | (ngầm theo path `stores/{storeId}/`) ✅ |
| business date | Guard date | `visit_date` ✅ |
| status | Display / remove | `status` ✅ |
| updated data (tên, phone, số khách, note) | Update UI | `customer_name`, `customer_phone`, `number_of_people`, `note` ✅ |
| assigned table codes | Update badge | ❌ **thiếu** → xem Gaps 7.7 |
| version / update time | Conflict handling | ❌ **thiếu** (`updatedAt`/`eventTimestamp`) → xem Gaps 7.7 |

Cách FE xử lý khi field thiếu (không chốt cứng yêu cầu BE trong mục này — đẩy sang Gaps/Open Questions):

- Thiếu `table codes` trong event → **giữ giá trị hiện có khi merge** (mục 3.4), không xóa badge.
- Thiếu version (`updatedAt`) → **chỉ merge field an toàn** (tên, phone, note); với thay đổi **nhạy cảm** (status, business date, table) → **trigger reload** thay vì ghi đè mù. Không reconcile dựa trên thứ tự event đến.

---

### 7.5. Reconcile (conflict handling)

| Trường hợp | Rule | BA |
| --- | --- | --- |
| Event có version mới hơn (`updatedAt`) | Ghi đè data hiện tại | 9.17 |
| Event cũ hơn / trùng version | Bỏ qua | 9.17 |
| Thiếu **field hiển thị** (tên, phone, số khách, note) | Giữ giá trị cũ, không ghi đè bằng null | 9.17, EX15 |
| Thiếu **field guard** (status, business date, store) | **Không** suy đoán còn hợp lệ → ignore / trigger reload | 9.17, EX15 |
| Data không chắc chắn | Trigger reload theo store + business date hiện tại | 9.17 |

Latency kỳ vọng: cập nhật UI trong vòng **2 giây** sau khi hệ thống xác nhận thay đổi (BA 9.15, mục 15).

---

### 7.6. Merge algorithm (tóm tắt)

```
// eventStoreId = storeId của collection đang subscribe (path), KHÔNG dựa data.storeId
on event(type, id, data):
  if data == null or id == null: ignore (+ reload nếu cần)
  if eventStoreId != currentSubscribedStore: ignore
  if missing businessDate(data): if exists(id) reload else ignore
  if not inBusinessDate(data): if exists(id) remove else ignore
  switch type:
    added/modified:
      if status in hiddenGroup: remove(id)
      else if isNewerVersion(data): upsert(id, merge(existing, data))
    removed:
      remove(id)
  re-filter theo keyword
  trigger sort   // cách & timing sort → mục 8 (Realtime UX Protection)
  emit state
```

> `merge(existing, data)`: field thiếu trong event giữ giá trị cũ (đặc biệt `assignedTableCodes`).
> 

---

### 7.7. Gap so với code hiện tại

| Điểm | Hiện tại | Cần |
| --- | --- | --- |
| Unsubscribe | Không thấy `cancel()` subscription | Lưu & hủy trong `close()` |
| Business date guard | So calendar day | Business-date range (ca qua đêm) |
| Reconcile version | Ghi đè trực tiếp added/modified | So `updatedAt` trước khi ghi đè |
| Merge giữ field | Gán nguyên `data` | Merge giữ `table codes` nếu event thiếu |
| Sort trigger | Sort ngay mỗi event | Chuyển sang mục 8 (timing/cách sort) |
| Payload `table codes` + `updatedAt` | Firestore document chưa có | Cần BE bổ sung — xem Open Questions |

---

## 8. Realtime UX Protection

### Guideline

TL cần thiết kế tránh UI nhảy gây click nhầm.

| Case | Rule |
| --- | --- |
| User không thao tác | Có thể apply sort ngay |
| User đang hover list | Delay sort |
| User đang scroll | Delay sort |
| User vừa click item | Ưu tiên navigation |
| Item bị hidden/delete | Remove khỏi list |
| Delay kết thúc | Apply sort lại |

Ghi chú:

- Tech Design chỉ cần chốt nguyên tắc UX.
- Thời gian debounce cụ thể có thể để implementation quyết định.

---

## 9. State Management Design

TL cần phân loại state.

| State | Loại | Rule |
| --- | --- | --- |
| Server data | Server cache | API + realtime update |
| Search keyword | UI state | Giữ/clear theo BA rule |
| Panel open/close | UI state | Giữ trong screen context |
| Loading/error | Query state | Theo API state |
| Hover/scroll | UI transient | Dùng cho sort protection |
| Selected item | UI transient | Dùng khi click/navigation |
| Realtime status | Optional | Log hoặc indicator nếu cần |

Không đưa tất cả state vào global store nếu chỉ dùng trong một màn.

## 10. Error / Fallback Design

TL cần chốt error và fallback đủ cụ thể.

| Case | UI behavior |
| --- | --- |
| Loading | Show skeleton/spinner |
| Empty list | Show empty message |
| Search empty | Show search empty message |
| API error | Show error + retry |
| Network error | Show error + retry |
| Permission error | Show permission message |
| Invalid data | Fallback UI + log |
| Missing required realtime data | Ignore + reload |
| Raw null/undefined/NaN | Never display |

Fallback example:

| Missing data | UI fallback |
| --- | --- |
| Name | `名前未設定` |
| Phone | `-` |
| Count | `-名` |
| Time | `--:--` |
| Long text | Ellipsis |
| Missing related code | Hide related code |

---

## 11. Navigation Design

TL cần chốt navigation theo flow, không tự hard-code route nếu chưa confirm.

| Action | Target | Data |
| --- | --- | --- |
| Click list item | Detail story | item id |
| Click create button | Create story | context nếu cần |
| Click retry | Current story | reload API |
| Return from detail | Current story | restore/clear state |

Rule:

- Route cụ thể theo routing hiện tại của dự án.
- Nếu route chưa rõ, đưa vào Open Questions.
- Story hiện tại không xử lý logic của target story.

---

## 12. Permission / Security Design

TL cần chốt guard ở cả FE và BE.

| Layer | Rule |
| --- | --- |
| FE route guard | Chặn user không có quyền |
| FE component guard | Không render component nếu không có quyền |
| BE/API guard | Reject direct API call nếu không có quyền |
| Store boundary | Không trả dữ liệu cross-store |
| Realtime boundary | Ignore event ngoài scope |
| Expired session | Xử lý theo auth rule chung |

---

## 13. Performance / UX Design

TL cần chốt target vừa đủ để dev hiểu.

| Item | Target |
| --- | --- |
| Initial load | Show loading ngay |
| Search | Client-side nếu data đã load |
| Clear search | Phản hồi nhanh |
| Scroll | Không phá layout screen |
| Realtime | Theo BA target |
| Navigation | Không bị block bởi sort/realtime |
| Long list | Không thêm pagination nếu BA out of scope |

Nếu có risk performance do list quá dài, ghi vào Risks, không tự đổi scope.

## 14. Audit / Logging Design

Ví dụ:

| **Log type** | **Rule** |
| --- | --- |
| Business audit | N/A nếu màn chỉ read-only |
| API error log | Log khi API fail |
| Permission log | Log khi user không có quyền |
| Realtime log | Log disconnect/reconnect/event thiếu dữ liệu |
| Invalid data log | Log khi data thiếu field quan trọng |
| Conflict log | Log khi nhiều user thao tác cùng dữ liệu |

---

## 15. Open Questions / Risks

TL không được tự đoán các điểm chưa rõ.

| No | Question / Risk | Owner | Impact |
| --- | --- | --- | --- |
| 1 | API endpoint chính thức là gì? | BE / TL | Không chốt được API call |
| 2 | Response có version/update time không? | BE | Khó xử lý conflict |
| 3 | Realtime payload là full hay partial? | BE | Không chốt merge logic |
| 4 | Business setting đã có chưa? | BA / BE | Không tính được business date |
| 5 | Route target chính thức là gì? | FE / TL | Không chốt navigation |
| 6 | Permission rule nằm ở đâu? | TL / BE | Không chốt guard |

---

---