# Goal Description

Implement an image upload and management feature for Memorina. This will allow users to upload images and access their personal image library when selecting images for cards later. The feature includes image compression, user-scoped access rules, backend storage management, and a seamless frontend selection interface.

## User Review Required

> [!WARNING]  
> Please review the storage recommendations (VPS vs AWS S3). The architecture choice impacts long-term operations. I recommend using an S3-compatible structure (like `minio-go`) so we can start on your VPS using local storage via MinIO (or simple disk I/O) and migrate to AWS S3 without changing code if you scale.

> [!IMPORTANT]  
> The compression methodology (frontend vs backend) and the unified "Media Library" UX proposal also require your review.

## Evaluation: VPS Storage vs. AWS Storage

### VPS Storage (Local Server File System)
- **Pros**: 
  - **Zero additional initial cost**: Leverages the storage you're already paying for.
  - **Simplicity**: Easy to implement locally with Go's `os` package or a simple static file server.
- **Cons**: 
  - **Scalability constraints**: Bound by the server's disk space. If the server goes down, images are inaccessible.
  - **Backup complexity**: You have to manually ensure the server volume is backed up.
  - **Server Load**: Serving hundreds of images stresses the same server that computes game logic.

### AWS S3 Storage (or similar Object Storage)
- **Pros**: 
  - **Infinite scalability & High Durability**: Built to handle massive amounts of files securely.
  - **Offloaded processing**: Taking the burden off your Go backend, improving game performance.
  - **CDN Integration**: Easily pair with CloudFront to serve images blazingly fast worldwide.
- **Cons**:
  - **Cost**: Introduces a variable cost (though S3 is inexpensive, bandwidth out adds up).
  - **Complexity**: Requires setting up IAM rules, AWS SDKs, and managing API keys in your `.env`.

**Recommendation**: Let's build the backend to use the Go `minio-go/v7` or the official `aws-sdk-go-v2`. This allows you to use a self-hosted S3 alternative (like MinIO) on your VPS right now, but gives you a 1-click transition to actual AWS S3 whenever you're ready. (Alternatively, if you want it ultra-simple now, we can build a plain Local Disk Storage service and swap it later).

## Research: Best Approaches for Image Compression
We need high quality with the smallest size.
1. **Frontend Compression (Chosen Approach)**: We can use a library like `compressor.js` or the native HTML5 Canvas `toBlob` method to compress images in Angular *before* sending them to the backend.
   - *Why?* It saves user upload bandwidth and takes the CPU-heavy compression work off your Go server.
2. **Backend Validation/Compression**: In Go, we use a lightweight library (like `github.com/disintegration/imaging`) to strip metadata (EXIF tags) and enforce a max width/height/quality boundary, preventing users from bypassing the frontend and uploading raw 20MB files.
3. **Format**: Converting images to `WebP` yields the best compression-to-quality ratio compared to JPEG/PNG.

## Proposal: How to Choose Files (Local vs. Storage)

We'll build a **Media Library Dialog Component** in Angular that pops up whenever the user needs to select an image for a card.

- **Tab 1: "Upload Media"**
  - A drag-and-drop zone that allows browsing the local computer.
  - After compressing and uploading, the image is automatically saved to the backend, selected, and the dialog closes.
- **Tab 2: "My Uploads" (Image Gallery)**
  - A grid view displaying all thumbnail versions of the images this user has previously uploaded (`GET /api/images` restricted by token ID).
  - The user simply clicks an image they already uploaded to select it.

## Proposed Changes

### Go Backend (Image API & Database)

#### [NEW] `backend/internal/database/migrations/..._create_images_table.sql`
- Add an `images` table: `id`, `user_id` (FK to users), `filename`, `s3_url`, `created_at`.

#### [NEW] `backend/internal/storage/`
- Set up an interface `StorageService` (methods: `Upload()`, `Delete()`, `GetURL()`).
- Implement the interface (either LocalFS or AWS S3).

#### [MODIFY] `backend/internal/api/...`
- **POST `/api/images/`**: Receives multipart data, validates token, compresses/converts to WebP, uploads to storage, and saves URL/User_id to DB.
- **GET `/api/images/`**: Returns JSON list of images `WHERE user_id = ?` (User ID retrieved securely from the JWT context injected by the auth middleware).

### Angular Frontend (UI & Services)

#### [NEW] `src/app/services/image.service.ts`
- Functions to handle `uploadImage(file)`, and `getUserImages()`.

#### [NEW] `src/app/components/media-library/...`
- A standalone dialog component acting as the Image Picker.
- Integrates the frontend compression logic via HTML Canvas/WebP conversion before upload.
- Displays responsive image grid fetching data from `getUserImages()`.

## Open Questions

1. **Storage Choice**: Do you want me to start with the simple local file system approach on your VPS, or directly set up the S3 API integration (which works for MinIO or AWS)?
2. **WebP Conversion**: Are you okay with automatically converting all uploaded images to WebP format for optimal storage savings?
3. **Image Dimensions**: Is there a maximum dimension (e.g., max width of 800px) that we should enforce for card images?

## Verification Plan

### Automated Tests
- Validate Go API boundaries: ensure a user cannot access or fetch an image linked to another `user_id`.
- Test Go API failure points (e.g. attempting to upload `.exe` or excessively large files).

### Manual Verification
1. Login as User A, open the Media Dialog, upload an image from my computer.
2. Select it. Check network tab to ensure it's sending a compressed WebP payload.
3. Open Card creation, open Media Dialog again, see "My Uploads" and visually confirm the image is there.
4. Login as User B, open the Media Dialog, and ensure the gallery is empty (cannot see User A's images).
