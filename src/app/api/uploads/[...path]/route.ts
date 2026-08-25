import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Serves files that were uploaded after the build.
 *
 * Next.js only serves `public/` files that existed at BUILD time — anything
 * written there at runtime returns 404. So every uploaded logo, product image
 * and payment proof was written to disk successfully and then became
 * unreachable in production.
 *
 * A rewrite in next.config.js sends `/uploads/*` here, which means URLs already
 * stored in the database keep working without a data migration. Build-time
 * files are still served straight from `public/` — the rewrite only catches
 * what the static handler could not find.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const segments = params.path || [];
  if (segments.length === 0) return new NextResponse("Not found", { status: 404 });

  // Resolve, then confirm the result is still inside the uploads directory.
  // Without this, `/uploads/../../.env` would read whatever it liked.
  const target = path.resolve(UPLOAD_DIR, ...segments);
  const root = path.resolve(UPLOAD_DIR);
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(target).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  try {
    const info = await stat(target);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });

    const file = await readFile(target);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        // Never let a browser sniff an uploaded file into an executable type
        // (e.g. an image carrying HTML). The content-type above is authoritative.
        "X-Content-Type-Options": "nosniff",
        // User uploads are data, never a document to run in our origin.
        "Content-Disposition": "inline",
        // Filenames carry a timestamp, so a given URL never changes content.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
