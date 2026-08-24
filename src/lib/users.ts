import type { Prisma } from "@prisma/client";

/**
 * The only user fields that may ride along on another record.
 *
 * Several routes used `include: { user: true }`, which pulls EVERY column of
 * `User` — including the bcrypt `password` hash — and some of them returned
 * that object straight to the browser as JSON.
 *
 * Selecting explicitly fixes today's leak and prevents tomorrow's: a sensitive
 * column added to `User` later cannot silently start riding along in an order
 * or ticket payload.
 *
 * Never add `password`, and think twice before adding `adminNotes` — that one
 * is staff-only and must not reach a customer-facing page.
 */
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
} satisfies Prisma.UserSelect;
