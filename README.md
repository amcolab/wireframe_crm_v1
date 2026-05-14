# wireframe_smos

Hai phiên bản **web** và **mobile** (cùng logic, khác giao diện) trong **một kho Git**. Mỗi thư mục là một ứng dụng Vite riêng.

## Chạy khi phát triển

```bash
npm run dev:web
npm run dev:mobile
```

## Build bản chạy thật

```bash
npm run build:web
npm run build:mobile
```

Thư mục build: `web/dist`, `mobile/dist`.

## Đưa lên host (một Git, hai địa chỉ nếu cần)

1. **Vercel / Netlify / Cloudflare Pages:** tạo **hai dự án** (hoặc một dự án nếu chỉ cần bản web), cùng một kho Git.
2. Trong phần cấu hình build của từng dự án:
   - Bản web: **thư mục gốc** = `web`, lệnh build = `npm run build`, thư mục publish = `dist`.
   - Bản mobile: **thư mục gốc** = `mobile`, lệnh build = `npm run build`, thư mục publish = `dist`.
3. Gán tên miền khác nhau (ví dụ `app...` và `m...`) nếu muốn hai URL.

Không cần tách thành hai kho Git trừ khi team hoặc quy trình release bắt buộc tách.
