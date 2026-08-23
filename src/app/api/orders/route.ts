import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { createPayPalOrder, getPayPalConfig } from "@/lib/paypal";
import { createTamaraCheckoutSession, getTamaraConfig } from "@/lib/tamara";
import { notifyOrderCreated } from "@/lib/hayyak";
import { reserveStock, restoreStock, type StockLine } from "@/lib/stock";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } }, payment: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: orders });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // NOTE: do NOT reject unauthenticated requests here — guest checkout is handled below

  // Stock reserved for this order; restored if creation fails downstream.
  let reservedLines: StockLine[] | null = null;

  try {
    const body = await req.json();
    const { items, paymentMethod, couponCode, notes, proofImageUrl, guestName, guestEmail, shipName, shipPhone, shipCity, shipAddress } = body;

    if (!items?.length || !paymentMethod) {
      return NextResponse.json({ success: false, error: "بيانات ناقصة" }, { status: 400 });
    }

    // Validate PayPal credentials BEFORE touching the DB — avoids orphaned orders
    if (paymentMethod === "PAYPAL") {
      const paypalConfig = await getPayPalConfig();
      if (!paypalConfig.enabled || !paypalConfig.clientId || !paypalConfig.clientSecret) {
        return NextResponse.json(
          { success: false, error: "PayPal غير مهيأ بشكل صحيح. يرجى التواصل مع الدعم أو اختيار طريقة دفع أخرى." },
          { status: 400 }
        );
      }
    }

    // Validate Tamara credentials BEFORE touching the DB
    if (paymentMethod === "TAMARA") {
      const tamaraConfig = await getTamaraConfig();
      if (!tamaraConfig.enabled || !tamaraConfig.apiToken) {
        return NextResponse.json(
          { success: false, error: "تمارا غير مهيأة بشكل صحيح. يرجى التواصل مع الدعم أو اختيار طريقة دفع أخرى." },
          { status: 400 }
        );
      }
    }

    // Resolve user — session or guest
    let userId: string;
    if (session) {
      userId = session.user.id;
    } else {
      // Guest checkout — check if enabled
      const guestSetting = await prisma.setting.findUnique({ where: { key: "guest_checkout" } });
      if (!guestSetting || guestSetting.value !== "true") {
        return NextResponse.json({ success: false, error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
      }
      if (!guestName?.trim() || !guestEmail?.trim()) {
        return NextResponse.json({ success: false, error: "الاسم والبريد الإلكتروني مطلوبان للشراء كضيف" }, { status: 400 });
      }
      // Find existing user or create a guest account
      let guestUser = await prisma.user.findUnique({ where: { email: guestEmail.trim().toLowerCase() } });
      if (!guestUser) {
        const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
        guestUser = await prisma.user.create({
          data: {
            name: guestName.trim(),
            email: guestEmail.trim().toLowerCase(),
            password: randomPassword,
            role: "CUSTOMER",
          },
        });
      }
      userId = guestUser.id;
    }

    // Validate products and get prices
    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ success: false, error: "بعض المنتجات غير متاحة" }, { status: 400 });
    }

    // Pre-fetch matrix variants referenced by the cart (server-side price source of truth)
    const variantIds = items
      .map((i: { variantId?: string }) => i.variantId)
      .filter((v: string | undefined): v is string => !!v);
    const dbVariants = variantIds.length
      ? await prisma.productVariant.findMany({ where: { id: { in: variantIds }, isActive: true } })
      : [];
    const variantMap = new Map(dbVariants.map((v) => [v.id, v]));

    // Calculate totals — validate variant price server-side to prevent manipulation
    let subtotal = 0;
    const orderItems = items.map((item: { productId: string; quantity: number; price: number; variantLabel?: string; variantId?: string }) => {
      const product = products.find((p) => p.id === item.productId)!;

      let price: number;
      let variantId: string | undefined;

      if (item.variantId) {
        // Matrix (multi-option) variant — price comes strictly from the DB
        const v = variantMap.get(item.variantId);
        if (!v || v.productId !== item.productId) {
          throw new Error(`خيار المنتج غير متاح`);
        }
        price = parseFloat(String(v.price));
        variantId = v.id;
      } else {
        const tags = (product.tags || []) as string[];
        const variantTags = tags.filter((t) => t.startsWith("variant:"));

        if (item.variantLabel && variantTags.length > 0) {
          // Find the matching variant tag and use its server-stored price
          const matched = variantTags.find((t) => t.split(":")[1] === item.variantLabel);
          if (!matched) {
            throw new Error(`الفاريانت "${item.variantLabel}" غير موجود`);
          }
          price = parseFloat(matched.split(":")[2]);
        } else if (variantTags.length > 0) {
          // Product has variants but none selected — use first variant price
          price = parseFloat(variantTags[0].split(":")[2]);
        } else {
          // No variants — use base product price from DB
          price = parseFloat(String(product.price));
        }
      }

      subtotal += price * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price,
        variantLabel: item.variantLabel,
        variantId,
      };
    });

    // Validate coupon
    let discount = 0;
    let couponId: string | undefined;
    let validatedCoupon: Awaited<ReturnType<typeof prisma.coupon.findFirst>> | null = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
      });

      const withinLimit = coupon && (coupon.maxUses === null || coupon.usedCount < coupon.maxUses);

      if (withinLimit && coupon) {
        if (!coupon.minOrderAmount || subtotal >= parseFloat(String(coupon.minOrderAmount))) {
          couponId = coupon.id;
          validatedCoupon = coupon;
          if (coupon.discountType === "PERCENTAGE") {
            discount = subtotal * (parseFloat(String(coupon.discountValue)) / 100);
          } else {
            discount = parseFloat(String(coupon.discountValue));
          }
        }
      }
    }

    const total = Math.max(0, subtotal - discount);

    // Reserve stock for tracked products before creating the order (prevents overselling)
    const stockLines: StockLine[] = orderItems.map((i: { productId: string; quantity: number; variantId?: string }) => ({
      productId: i.productId,
      variantId: i.variantId ?? null,
      quantity: i.quantity,
    }));
    try {
      await reserveStock(stockLines);
      reservedLines = stockLines;
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "الكمية المطلوبة غير متوفرة في المخزون" },
        { status: 409 },
      );
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        status: (paymentMethod === "BANK_TRANSFER" || paymentMethod === "TABBY" || paymentMethod === "TAMARA")
        ? "PENDING"
        : "PENDING_PAYMENT_REVIEW",
        subtotal,
        discount,
        total,
        couponId,
        notes,
        shipName: shipName || null,
        shipPhone: shipPhone || null,
        shipCity: shipCity || null,
        shipAddress: shipAddress || null,
        items: { create: orderItems },
        payment: {
          create: {
            method: paymentMethod,
            status: proofImageUrl ? "UPLOADED" : "PENDING",
            amount: total,
            proofImage: proofImageUrl,
          },
        },
      },
      include: {
        items: { include: { product: true } },
        payment: true,
        user: { select: { name: true, phone: true, email: true } },
      },
    });

    // Atomic coupon increment — re-check the limit in the WHERE to guard against races
    if (couponId && validatedCoupon) {
      const maxUses = validatedCoupon.maxUses;
      await prisma.coupon.updateMany({
        where: {
          id: couponId,
          ...(maxUses !== null ? { usedCount: { lt: maxUses } } : {}),
        },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Send notification
    await prisma.notification.create({
      data: {
        userId,
        title: "تم إنشاء طلبك",
        body: `تم إنشاء طلبك ${order.orderNumber} بنجاح. يرجى إكمال الدفع لمعالجته.`,
        type: "ORDER_UPDATE",
        orderId: order.id,
      },
    });

    let paypalApproveLink: string | undefined;

    // Handle PayPal Checkout integration
    if (paymentMethod === "PAYPAL" && total > 0) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const returnUrl = `${baseUrl}/api/payments/paypal/capture?orderId=${order.id}`;
        const cancelUrl = `${baseUrl}/dashboard/orders/${order.id}`;

        const paypalOrder = await createPayPalOrder(total, returnUrl, cancelUrl);

        if (paypalOrder.approveLink) {
          paypalApproveLink = paypalOrder.approveLink;

          // Save the PayPal Order ID in our payment record
          await prisma.payment.update({
            where: { orderId: order.id },
            data: { transactionId: paypalOrder.id },
          });
        }
      } catch (err) {
        console.error("Error integrating PayPal:", err);
        // Rollback: delete the order so the DB stays clean
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
        return NextResponse.json(
          { success: false, error: "فشل الاتصال بـ PayPal. تحقق من بيانات الاعتماد أو اختر طريقة دفع أخرى." },
          { status: 400 }
        );
      }
    }

    // Handle Tamara Checkout integration
    let tamaraCheckoutUrl: string | undefined;
    if (paymentMethod === "TAMARA" && total > 0) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const currencySetting = await prisma.setting.findUnique({ where: { key: "currency" } });
        const currency = currencySetting?.value || "SAR";

        const nameParts = (order.user?.name || "Customer").trim().split(/\s+/);
        const firstName = nameParts[0] || "Customer";
        const lastName = nameParts.slice(1).join(" ") || "-";

        const session = await createTamaraCheckoutSession({
          orderNumber: order.orderNumber,
          amount: total,
          subtotal,
          discount,
          currency,
          description: `طلب رقم ${order.orderNumber}`,
          consumer: {
            firstName,
            lastName,
            phone: order.user?.phone || "500000000",
            email: order.user?.email || guestEmail || "customer@example.com",
          },
          items: order.items.map((it) => ({
            id: it.productId,
            name: it.product.nameAr || it.product.name,
            sku: it.product.slug || it.productId,
            quantity: it.quantity,
            unitPrice: parseFloat(String(it.price)),
          })),
          urls: {
            success:      `${baseUrl}/api/payments/tamara/callback?orderId=${order.id}&status=success`,
            failure:      `${baseUrl}/api/payments/tamara/callback?orderId=${order.id}&status=failure`,
            cancel:       `${baseUrl}/api/payments/tamara/callback?orderId=${order.id}&status=cancel`,
            notification: `${baseUrl}/api/payments/tamara/webhook`,
          },
        });

        if (session.checkoutUrl) {
          tamaraCheckoutUrl = session.checkoutUrl;
          await prisma.payment.update({
            where: { orderId: order.id },
            data: { transactionId: session.tamaraOrderId },
          });
        }
      } catch (err) {
        console.error("Error integrating Tamara:", err);
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
        if (reservedLines) await restoreStock(reservedLines).catch(() => {});
        reservedLines = null;
        return NextResponse.json(
          { success: false, error: "فشل الاتصال بتمارا. تحقق من البيانات أو اختر طريقة دفع أخرى." },
          { status: 400 }
        );
      }
    }

    // إشعار حياك: تم إنشاء الطلب → رسالة تأكيد واتساب للعميل (لا يوقف الاستجابة عند الفشل)
    await notifyOrderCreated(order);

    return NextResponse.json({ success: true, data: order, paypalApproveLink, tamaraCheckoutUrl });
  } catch (error) {
    console.error(error);
    if (reservedLines) await restoreStock(reservedLines).catch(() => {});
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
