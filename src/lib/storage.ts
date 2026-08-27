import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Persist an uploaded file and return a public URL.
 *
 * Vercel's serverless filesystem is ephemeral, so anything written to
 * `public/uploads` disappears between deploys/invocations. When a Blob store is
 * configured (BLOB_READ_WRITE_TOKEN), files go there and survive; otherwise we
 * fall back to local disk — fine for a persistent host or local dev.
 *
 * The returned URL is either an absolute Blob URL (https://…) or a site-relative
 * `/uploads/…` path. Callers must treat it as an opaque href, not assume a prefix.
 */
export async function saveUpload(file: File, ext: string): Promise<string> {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    // Dynamic import so the dependency is only pulled when a Blob store is used.
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, file, {
      access: "public",
      token,
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });
    return blob.url;
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}
