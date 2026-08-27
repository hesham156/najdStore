import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Customers may attach files to a product's custom fields (e.g. a design PDF).
// This purpose accepts documents in addition to images, with a larger cap.
const FIELD_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "ai", "psd", "svg", "zip"];
const FIELD_MAX_SIZE = 25 * 1024 * 1024; // 25MB — design files run large

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // ADMIN & STAFF: unrestricted upload (product images, etc.)
    // CUSTOMER (authenticated) / Guest: allowed for specific purposes only —
    // payment proof, or files attached to a product's custom fields.
    const formData = await req.formData();
    const purpose = formData.get("purpose") as string | null;
    const isFieldUpload = purpose === "product_field";

    // Only admins/staff can upload without a purpose restriction
    if (!session && purpose !== "payment_proof" && !isFieldUpload) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ success: false, error: "لا يوجد ملف" }, { status: 400 });

    const maxSize = isFieldUpload ? FIELD_MAX_SIZE : MAX_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: `حجم الملف يتجاوز ${Math.round(maxSize / 1024 / 1024)}MB` }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExt = isFieldUpload ? FIELD_ALLOWED_EXT : ALLOWED_EXT;
    if (!ext || !allowedExt.includes(ext)) {
      return NextResponse.json({ success: false, error: `امتداد الملف غير مسموح، المسموح: ${allowedExt.join(", ")}` }, { status: 400 });
    }
    // Images are validated by MIME too; documents are trusted by extension.
    if (!isFieldUpload && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "نوع الملف غير مسموح، الأنواع المقبولة: JPEG, PNG, WebP, GIF" }, { status: 400 });
    }

    const url = await saveUpload(file, ext);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
