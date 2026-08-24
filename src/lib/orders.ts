import type { OrderStatus } from "@prisma/client";

/**
 * Order statuses that count as money the store actually earned.
 *
 * PENDING and PENDING_PAYMENT_REVIEW are excluded because nothing has been
 * confirmed yet; CANCELLED and REFUNDED because the money went back.
 *
 * This is the single definition of "revenue" and "customer spend" in the app —
 * the accounting summary, the CRM panel and the customers screen all read it
 * from here, so a customer's total can never disagree with the books.
 */
export const PAID_STATUSES: OrderStatus[] = ["PAYMENT_APPROVED", "PROCESSING", "DELIVERED"];
