# wireframe_smos

Two versions, **web** and **mobile** (shared logic, different interfaces), contained within **a single Git repository**. Each directory represents a separate Vite application.

## Development

```bash
npm run dev:web
npm run dev:mobile
```

## Production Build

```bash
npm run build:web
npm run build:mobile
```

Build outputs: `web/dist`, `mobile/dist`.

## Hosting (Single Repo, Multiple Deployments)

1. **Vercel / Netlify / Cloudflare Pages:** Create **two separate projects** (or one if only web is needed) from the same Git repository.
2. In the build settings for each project:
   - **Web version:** Root directory = `web`, Build command = `npm run build`, Publish directory = `dist`.
   - **Mobile version:** Root directory = `mobile`, Build command = `npm run build`, Publish directory = `dist`.
3. Assign different domains (e.g., `app...` and `m...`) if you want distinct URLs.

There is no need to split this into two separate repositories unless required by specific team workflows or release procedures.
