import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";
import bcrypt from "bcryptjs";
import {
  parseSpreadsheet, pick, parseBool, normalizePhone,
  CUSTOMER_ALIASES, emptyResult, type ImportResult,
} from "@/lib/import-export";

export const dynamic = "force-dynamic";

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("لم يتم إرفاق ملف");

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: Record<string, unknown>[];
    try {
      rows = parseSpreadsheet(buffer);
    } catch {
      return badRequest("تعذّر قراءة الملف. تأكد أنه Excel أو CSV صالح");
    }
    if (rows.length === 0) return badRequest("الملف فارغ");

    const result: ImportResult = emptyResult();
    result.total = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2;
      try {
        let name = pick(row, CUSTOMER_ALIASES.name);
        if (!name) {
          const first = pick(row, CUSTOMER_ALIASES.firstName);
          const last = pick(row, CUSTOMER_ALIASES.lastName);
          name = [first, last].filter(Boolean).join(" ").trim() || undefined;
        }
        const email = pick(row, CUSTOMER_ALIASES.email)?.toLowerCase();
        const phone = normalizePhone(pick(row, CUSTOMER_ALIASES.phone));

        if (!email || !isEmail(email)) {
          result.skipped++;
          result.errors.push({ row: rowNo, message: "بريد إلكتروني مفقود أو غير صالح" });
          continue;
        }
        if (!name) name = email.split("@")[0];
        const isActive = parseBool(pick(row, CUSTOMER_ALIASES.active), true);

        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { name, phone: phone ?? existing.phone, isActive },
          });
          result.updated++;
        } else {
          const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
          await prisma.user.create({
            data: { name, email, phone: phone ?? null, isActive, role: "CUSTOMER", password: randomPassword },
          });
          result.created++;
        }
      } catch (e) {
        result.skipped++;
        result.errors.push({ row: rowNo, message: e instanceof Error ? e.message : "خطأ غير معروف" });
      }
    }

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "IMPORT_CUSTOMERS",
        entity: "User",
        details: { created: result.created, updated: result.updated, skipped: result.skipped, total: result.total },
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return serverError("POST /api/admin/customers/import", err);
  }
}
