import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";
import { generateOrderNumber } from "@/lib/utils";
import bcrypt from "bcryptjs";
import {
  parseSpreadsheet, pick, parseNumber, normalizePhone, mapOrderStatus,
  ORDER_ALIASES, emptyResult, type ImportResult,
} from "@/lib/import-export";

export const dynamic = "force-dynamic";

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * Imports order records at the header level (order number, customer, totals,
 * status, date). Line items are not reconstructed from the file — importing an
 * order links or creates its customer and records the order summary. Use the
 * products importer to bring in the catalog separately.
 */
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

    const resolveCustomer = async (email?: string, name?: string, phone?: string): Promise<string> => {
      const cleanEmail = email && isEmail(email) ? email.toLowerCase() : undefined;
      if (cleanEmail) {
        const found = await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } });
        if (found) return found.id;
      }
      const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
      const created = await prisma.user.create({
        data: {
          name: name || cleanEmail?.split("@")[0] || "عميل مستورد",
          email: cleanEmail || `imported-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@import.local`,
          phone: phone ?? null,
          role: "CUSTOMER",
          password: randomPassword,
        },
      });
      return created.id;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2;
      try {
        const total = parseNumber(pick(row, ORDER_ALIASES.total));
        if (total === undefined) {
          result.skipped++;
          result.errors.push({ row: rowNo, message: "إجمالي الطلب مفقود أو غير صالح" });
          continue;
        }
        const subtotal = parseNumber(pick(row, ORDER_ALIASES.subtotal)) ?? total;
        const discount = parseNumber(pick(row, ORDER_ALIASES.discount)) ?? 0;
        const status = mapOrderStatus(pick(row, ORDER_ALIASES.status));
        const notes = pick(row, ORDER_ALIASES.notes);
        const dateStr = pick(row, ORDER_ALIASES.createdAt);
        const parsedDate = dateStr ? new Date(dateStr) : undefined;
        const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : undefined;

        const userId = await resolveCustomer(
          pick(row, ORDER_ALIASES.customerEmail),
          pick(row, ORDER_ALIASES.customerName),
          normalizePhone(pick(row, ORDER_ALIASES.customerPhone)),
        );

        const orderNumber = pick(row, ORDER_ALIASES.orderNumber);
        const existing = orderNumber
          ? await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } })
          : null;

        if (existing) {
          await prisma.order.update({
            where: { id: existing.id },
            data: { userId, subtotal, discount, total, status: status as never, notes: notes ?? undefined },
          });
          result.updated++;
        } else {
          await prisma.order.create({
            data: {
              orderNumber: orderNumber || generateOrderNumber(),
              userId, subtotal, discount, total,
              status: status as never,
              notes: notes ?? undefined,
              ...(createdAt ? { createdAt } : {}),
            },
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
        action: "IMPORT_ORDERS",
        entity: "Order",
        details: { created: result.created, updated: result.updated, skipped: result.skipped, total: result.total },
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return serverError("POST /api/admin/orders/import", err);
  }
}
