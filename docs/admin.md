# Admin CMS & Stats Manual

## 1. Environment Setup
To run the Admin efficiently and enable all features (Stats, Image Uploads, Persistent Storage), ensure these environment variables are set in your Vercel project settings:

- `KV_URL` (or `REDIS_URL`): Connection string for Vercel KV (Redis).
- `KV_REST_API_URL`: REST URL for KV (if using HTTP client).
- `KV_REST_API_TOKEN`: REST Token.
- `BLOB_READ_WRITE_TOKEN`: Token for Vercel Blob storage (Images).
- `ADMIN_USER` & `ADMIN_PASS`: Basic Auth credentials for API routes security.

## 2. Key/Value Data Structure (Architecture)
We use Vercel KV as the primary database. The schema is simple and document-based:

- **Landing Config**: `landing:home`
  - Stores the list of sections, their order, and enabled status.
- **Section Data**: `landing:section:{id}`
  - Stores the actual content (JSON) for each section.
  - Formats are strictly validated by Zod schemas in `lib/sections/schemas.ts`.
- **Stats**:
  - `stats:search:count:day:{Date}`: Daily search volume.
  - `stats:cta:{ctaId}:count:day:{Date}`: Daily CTA click volume.
  - `stats:admin:save:day:{Date}`: Admin save operations count.
  - `stats:admin:image_upload:day:{Date}`: Image upload count.

## 3. Admin Panel Usage
Access the admin panel at `/admin`.

### Dashboard
- View real-time statistics for the last 30 days.
- Monitor search trends and CTA performance.

### Content Editor (Section Management)
- **Reordering**: Drag and drop sections in the sidebar to change their order on the landing page.
- **Toggle Visibility**: Use the toggle switch to show/hide sections instantly.
- **Editing**: Click "Edit" to open the section editor.
  - **Text Fields**: Edit titles, subtitles, descriptions.
  - **Images**: Use the "Upload Image" button to upload directly to Vercel Blob. The URL is automatically saved.
  - **Lists (Repeaters)**: Add/Remove items for cards, steps, or FAQs.
  - **Save**: Click "Save & Reflect" to persist changes to KV and trigger an immediate revalidation of the landing page.

### Policy & Segments
- Manage pricing policies and audience segments data.
- These specific tabs save to their respective JSON files or KV keys depending on the configuration (currently optimized for hybrid usage).

## 4. Recovery & Migration
### Seeding Data
If the KV database is empty (e.g., fresh deploy), you can seed it with the local JSON files found in `content/`.
- **API**: `POST /api/admin/seed`
- This reads `content/*.json` and populates `landing:home` and `landing:section:*`.

## 5. Hand-off & Maintenance
- **Repo**: Ensure the GitHub repository is connected to Vercel.
- **Builds**: The project uses Next.js App Router. Run `npm run build` to verify integrity before pushing.
- **Logs**: Check Vercel Runtime Logs for API errors.

---
**© 2026 KOBACO Addressable TV Team**
