import { PrismaClient, UserRole, DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus, DiscountType, TicketStatus, TicketPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Users
  const adminPassword = await bcrypt.hash("admin123", 12);
  const customerPassword = await bcrypt.hash("customer123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@store.com" },
    update: {},
    create: {
      name: "المدير العام",
      email: "admin@store.com",
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@store.com" },
    update: {},
    create: {
      name: "موظف الدعم",
      email: "staff@store.com",
      password: adminPassword,
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "أحمد محمد",
      email: "customer@example.com",
      password: customerPassword,
      role: UserRole.CUSTOMER,
      phone: "+966501234567",
      isActive: true,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: "sara@example.com" },
    update: {},
    create: {
      name: "سارة علي",
      email: "sara@example.com",
      password: customerPassword,
      role: UserRole.CUSTOMER,
      phone: "+966509876543",
      isActive: true,
    },
  });

  console.log("✅ Users created");

  // ─── Sample demo catalog — set SEED_SAMPLE=false to skip (e.g. real stores) ───
  if (process.env.SEED_SAMPLE !== "false") {

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "streaming" },
      update: {},
      create: {
        name: "Streaming Services",
        nameAr: "خدمات البث",
        slug: "streaming",
        description: "Streaming subscriptions for movies and TV",
        descriptionAr: "اشتراكات بث الأفلام والمسلسلات",
        icon: "📺",
        color: "#e50914",
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "software" },
      update: {},
      create: {
        name: "Software Licenses",
        nameAr: "تراخيص البرامج",
        slug: "software",
        description: "Professional software licenses",
        descriptionAr: "تراخيص البرامج الاحترافية",
        icon: "💻",
        color: "#0078d4",
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "ai-tools" },
      update: {},
      create: {
        name: "AI Tools",
        nameAr: "أدوات الذكاء الاصطناعي",
        slug: "ai-tools",
        description: "AI and machine learning tools",
        descriptionAr: "أدوات الذكاء الاصطناعي والتعلم الآلي",
        icon: "🤖",
        color: "#10a37f",
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: "vpn" },
      update: {},
      create: {
        name: "VPN Services",
        nameAr: "خدمات VPN",
        slug: "vpn",
        description: "Secure VPN subscriptions",
        descriptionAr: "اشتراكات VPN الآمنة",
        icon: "🔒",
        color: "#ff6900",
        sortOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { slug: "gaming" },
      update: {},
      create: {
        name: "Gaming",
        nameAr: "الألعاب",
        slug: "gaming",
        description: "Gaming subscriptions and gift cards",
        descriptionAr: "اشتراكات الألعاب وبطاقات الهدايا",
        icon: "🎮",
        color: "#107c10",
        sortOrder: 5,
      },
    }),
    prisma.category.upsert({
      where: { slug: "cloud" },
      update: {},
      create: {
        name: "Cloud Storage",
        nameAr: "التخزين السحابي",
        slug: "cloud",
        description: "Cloud storage solutions",
        descriptionAr: "حلول التخزين السحابي",
        icon: "☁️",
        color: "#1da1f2",
        sortOrder: 6,
      },
    }),
  ]);

  console.log("✅ Categories created");

  // Products
  const products = await Promise.all([
    // Streaming
    prisma.product.upsert({
      where: { slug: "netflix-premium-1month" },
      update: {},
      create: {
        name: "Netflix Premium - 1 Month",
        nameAr: "نتفليكس بريميوم - شهر",
        slug: "netflix-premium-1month",
        description: "Netflix Premium subscription for 1 month with 4K streaming",
        descriptionAr: "اشتراك نتفليكس بريميوم لمدة شهر مع بث 4K على 4 شاشات",
        price: 45.00,
        comparePrice: 55.00,
        categoryId: categories[0].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: true,
        features: ["4K Ultra HD", "4 Screens", "HDR", "Downloads"],
        tags: ["netflix", "streaming", "movies"],
        stockCount: 50,
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/1280px-Netflix_2015_logo.svg.png",
      },
    }),
    prisma.product.upsert({
      where: { slug: "spotify-premium-1month" },
      update: {},
      create: {
        name: "Spotify Premium - 1 Month",
        nameAr: "سبوتيفاي بريميوم - شهر",
        slug: "spotify-premium-1month",
        description: "Spotify Premium for ad-free music streaming",
        descriptionAr: "سبوتيفاي بريميوم للاستماع إلى الموسيقى بدون إعلانات",
        price: 25.00,
        comparePrice: 35.00,
        categoryId: categories[0].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: true,
        features: ["بدون إعلانات", "تحميل", "جودة عالية", "أجهزة متعددة"],
        tags: ["spotify", "music", "streaming"],
        stockCount: 30,
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/168px-Spotify_logo_without_text.svg.png",
      },
    }),
    // Software
    prisma.product.upsert({
      where: { slug: "microsoft-office-365" },
      update: {},
      create: {
        name: "Microsoft Office 365 - 1 Year",
        nameAr: "مايكروسوفت أوفيس 365 - سنة",
        slug: "microsoft-office-365",
        description: "Microsoft Office 365 annual subscription",
        descriptionAr: "اشتراك مايكروسوفت أوفيس 365 لمدة سنة كاملة",
        price: 199.00,
        comparePrice: 250.00,
        categoryId: categories[1].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: true,
        features: ["Word", "Excel", "PowerPoint", "OneDrive 1TB", "Teams"],
        tags: ["microsoft", "office", "productivity"],
        stockCount: 20,
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg/1200px-Microsoft_Office_logo_%282019%E2%80%93present%29.svg.png",
      },
    }),
    // AI Tools
    prisma.product.upsert({
      where: { slug: "chatgpt-plus-1month" },
      update: {},
      create: {
        name: "ChatGPT Plus - 1 Month",
        nameAr: "شات جي بي تي بلس - شهر",
        slug: "chatgpt-plus-1month",
        description: "ChatGPT Plus subscription with GPT-4 access",
        descriptionAr: "اشتراك ChatGPT Plus مع الوصول إلى GPT-4",
        price: 75.00,
        comparePrice: 90.00,
        categoryId: categories[2].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: true,
        features: ["GPT-4", "DALL-E 3", "أولوية الاستجابة", "ميزات متقدمة"],
        tags: ["chatgpt", "ai", "openai"],
        stockCount: 40,
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1200px-ChatGPT_logo.svg.png",
      },
    }),
    prisma.product.upsert({
      where: { slug: "midjourney-basic-1month" },
      update: {},
      create: {
        name: "Midjourney Basic - 1 Month",
        nameAr: "ميد جيرني بيسك - شهر",
        slug: "midjourney-basic-1month",
        description: "Midjourney Basic plan for AI image generation",
        descriptionAr: "خطة ميد جيرني الأساسية لتوليد الصور بالذكاء الاصطناعي",
        price: 30.00,
        comparePrice: 40.00,
        categoryId: categories[2].id,
        deliveryMethod: DeliveryMethod.MANUAL,
        isActive: true,
        isFeatured: false,
        features: ["200 صورة/شهر", "دقة عالية", "تنوع الأنماط"],
        tags: ["midjourney", "ai", "image"],
        stockCount: 15,
      },
    }),
    // VPN
    prisma.product.upsert({
      where: { slug: "nordvpn-1year" },
      update: {},
      create: {
        name: "NordVPN - 1 Year",
        nameAr: "نورد VPN - سنة",
        slug: "nordvpn-1year",
        description: "NordVPN annual subscription for secure browsing",
        descriptionAr: "اشتراك نورد VPN لسنة كاملة للتصفح الآمن",
        price: 120.00,
        comparePrice: 180.00,
        categoryId: categories[3].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: true,
        features: ["6 أجهزة", "5500+ خادم", "بدون سجلات", "Kill Switch"],
        tags: ["nordvpn", "vpn", "security"],
        stockCount: 25,
      },
    }),
    // Gaming
    prisma.product.upsert({
      where: { slug: "playstation-plus-3month" },
      update: {},
      create: {
        name: "PlayStation Plus - 3 Months",
        nameAr: "بلايستيشن بلس - 3 أشهر",
        slug: "playstation-plus-3month",
        description: "PlayStation Plus Essential for 3 months",
        descriptionAr: "بلايستيشن بلس إيسنشيال لمدة 3 أشهر",
        price: 85.00,
        comparePrice: 100.00,
        categoryId: categories[4].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: true,
        features: ["ألعاب مجانية شهرية", "اللعب الجماعي", "تخزين سحابي", "خصومات حصرية"],
        tags: ["playstation", "gaming", "sony"],
        stockCount: 35,
      },
    }),
    prisma.product.upsert({
      where: { slug: "xbox-game-pass-1month" },
      update: {},
      create: {
        name: "Xbox Game Pass Ultimate - 1 Month",
        nameAr: "إكس بوكس جيم باس ألتيميت - شهر",
        slug: "xbox-game-pass-1month",
        description: "Xbox Game Pass Ultimate monthly subscription",
        descriptionAr: "اشتراك إكس بوكس جيم باس ألتيميت الشهري",
        price: 55.00,
        comparePrice: 70.00,
        categoryId: categories[4].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: false,
        features: ["100+ لعبة", "EA Play", "Xbox Live Gold", "Cloud Gaming"],
        tags: ["xbox", "gaming", "microsoft"],
        stockCount: 30,
      },
    }),
    // Cloud
    prisma.product.upsert({
      where: { slug: "google-one-2tb-1year" },
      update: {},
      create: {
        name: "Google One 2TB - 1 Year",
        nameAr: "جوجل ون 2 تيرابايت - سنة",
        slug: "google-one-2tb-1year",
        description: "Google One 2TB cloud storage for 1 year",
        descriptionAr: "جوجل ون 2 تيرابايت تخزين سحابي لسنة كاملة",
        price: 150.00,
        comparePrice: 200.00,
        categoryId: categories[5].id,
        deliveryMethod: DeliveryMethod.AUTOMATIC,
        isActive: true,
        isFeatured: false,
        features: ["2TB تخزين", "مشاركة عائلية", "دعم متميز", "VPN مدمج"],
        tags: ["google", "cloud", "storage"],
        stockCount: 20,
      },
    }),
  ]);

  console.log("✅ Products created");

  // Subscription Stock
  for (const product of products) {
    if (product.deliveryMethod === DeliveryMethod.AUTOMATIC) {
      const stockItems = Array.from({ length: 10 }, (_, i) => ({
        productId: product.id,
        data: `ACCOUNT-${product.slug.toUpperCase()}-${Date.now()}-${i + 1}\nEmail: user${i + 1}@example.com\nPassword: Pass${Math.random().toString(36).substring(7)}`,
        isDelivered: false,
      }));

      await prisma.subscriptionStock.createMany({
        data: stockItems,
        skipDuplicates: true,
      });
    }
  }

  console.log("✅ Stock created");

  // Coupons
  await prisma.coupon.upsert({
    where: { code: "WELCOME20" },
    update: {},
    create: {
      code: "WELCOME20",
      description: "Welcome discount 20%",
      descriptionAr: "خصم الترحيب 20%",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderAmount: 50,
      maxUses: 100,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "SAVE50" },
    update: {},
    create: {
      code: "SAVE50",
      description: "Save 50 SAR on orders above 200",
      descriptionAr: "وفر 50 ريال على الطلبات فوق 200 ريال",
      discountType: DiscountType.FIXED,
      discountValue: 50,
      minOrderAmount: 200,
      maxUses: 50,
      isActive: true,
    },
  });

  console.log("✅ Coupons created");

  // Sample Order
  const orderNumber = `ORD-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: customer1.id,
      status: OrderStatus.DELIVERED,
      subtotal: 45.00,
      discount: 9.00,
      total: 36.00,
      items: {
        create: {
          productId: products[0].id,
          quantity: 1,
          price: 45.00,
          deliveredData: "Email: netflix@example.com\nPassword: Netflix2024!\nPlan: Premium 4K",
          deliveredAt: new Date(),
        },
      },
      payment: {
        create: {
          method: PaymentMethod.BANK_TRANSFER,
          status: PaymentStatus.APPROVED,
          amount: 36.00,
          transactionId: "TXN123456",
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        },
      },
    },
  });

  // Notification
  await prisma.notification.create({
    data: {
      userId: customer1.id,
      title: "تم تسليم طلبك",
      body: `تم تسليم طلبك #${orderNumber} بنجاح. يمكنك الوصول إلى بيانات الاشتراك من لوحة التحكم.`,
      type: "ORDER_UPDATE",
      orderId: order.id,
      isRead: false,
    },
  });

  // Support Ticket
  await prisma.supportTicket.create({
    data: {
      ticketNumber: `TKT-${Date.now()}`,
      userId: customer1.id,
      subject: "استفسار عن طريقة الدفع",
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      messages: {
        create: {
          userId: customer1.id,
          message: "هل يمكن الدفع بالبطاقة الائتمانية؟",
          isStaff: false,
        },
      },
    },
  });

  } // ─── end sample demo catalog (SEED_SAMPLE) ───

  // Settings
  const settings = [
    { key: "site_name", value: "نجد برنت", type: "text", label: "Site Name", labelAr: "اسم الموقع", group: "general" },
    { key: "site_email", value: "support@store.com", type: "text", label: "Support Email", labelAr: "بريد الدعم", group: "general" },
    // Branding / marketing copy — re-theme the store for any niche from Settings
    { key: "hero_badge",           value: "طباعة احترافية وتسليم سريع", type: "text", label: "Hero Badge", labelAr: "الهيرو — الشارة العلوية", group: "general" },
    { key: "hero_title",           value: "اطبع أفكارك باحتراف", type: "text", label: "Hero Title", labelAr: "الهيرو — العنوان الرئيسي", group: "general" },
    { key: "hero_title_highlight", value: "بأعلى جودة وأفضل سعر", type: "text", label: "Hero Title Highlight", labelAr: "الهيرو — العنوان المميّز (ملوّن)", group: "general" },
    { key: "hero_subtitle",        value: "مطبعة نجد برنت — نصمّم ونطبع كل ما تحتاجه: كروت، أكواب، علب، لوحات، وأكثر بجودة عالية وتسليم سريع.", type: "text", label: "Hero Subtitle", labelAr: "الهيرو — النص الفرعي", group: "general" },
    { key: "hero_stat_1_value",    value: "+5000", type: "text", label: "Stat 1 Value", labelAr: "إحصائية 1 — الرقم", group: "general" },
    { key: "hero_stat_1_label",    value: "عميل راضٍ", type: "text", label: "Stat 1 Label", labelAr: "إحصائية 1 — النص", group: "general" },
    { key: "hero_stat_2_value",    value: "+50", type: "text", label: "Stat 2 Value", labelAr: "إحصائية 2 — الرقم", group: "general" },
    { key: "hero_stat_2_label",    value: "منتج للطباعة", type: "text", label: "Stat 2 Label", labelAr: "إحصائية 2 — النص", group: "general" },
    { key: "hero_stat_3_value",    value: "+10K", type: "text", label: "Stat 3 Value", labelAr: "إحصائية 3 — الرقم", group: "general" },
    { key: "hero_stat_3_label",    value: "طلب مكتمل", type: "text", label: "Stat 3 Label", labelAr: "إحصائية 3 — النص", group: "general" },
    { key: "footer_description",   value: "مطبعة نجد برنت لتصميم وطباعة منتجاتك بأعلى جودة وتسليم سريع.", type: "text", label: "Footer Description", labelAr: "الفوتر — وصف المتجر", group: "general" },
    { key: "site_phone", value: "+966501234567", type: "text", label: "Phone", labelAr: "الهاتف", group: "general" },
    { key: "currency", value: "SAR", type: "text", label: "Currency", labelAr: "العملة", group: "general" },
    { key: "currency_symbol", value: "ر.س", type: "text", label: "Currency Symbol", labelAr: "رمز العملة", group: "general" },
    { key: "bank_name", value: "البنك الأهلي السعودي", type: "text", label: "Bank Name", labelAr: "اسم البنك", group: "payment" },
    { key: "bank_account", value: "SA0380000000608010167519", type: "text", label: "Bank Account", labelAr: "رقم الحساب", group: "payment" },
    { key: "bank_beneficiary", value: "شركة الاشتراكات الرقمية", type: "text", label: "Beneficiary", labelAr: "المستفيد", group: "payment" },
    { key: "maintenance_mode", value: "false", type: "boolean", label: "Maintenance Mode", labelAr: "وضع الصيانة", group: "general" },
    { key: "auto_delivery", value: "true", type: "boolean", label: "Auto Delivery", labelAr: "التسليم التلقائي", group: "orders" },
    // Payment Badges
    { key: "tabby_enabled", value: "false", type: "boolean", label: "Enable Tabby", labelAr: "تفعيل تابي", group: "payments" },
    { key: "tabby_installments", value: "4", type: "text", label: "Tabby Installments", labelAr: "عدد أقساط تابي", group: "payments" },
    { key: "tamara_enabled", value: "false", type: "boolean", label: "Enable Tamara", labelAr: "تفعيل تمارا", group: "payments" },
    { key: "tamara_installments", value: "3", type: "text", label: "Tamara Installments", labelAr: "عدد أقساط تمارا", group: "payments" },
    // Payment Methods (Gateways)
    { key: "pm_bank_transfer_enabled",       value: "true",                      type: "boolean", label: "Bank Transfer Enabled",   labelAr: "تفعيل التحويل البنكي", group: "payment_methods" },
    { key: "pm_bank_transfer_bank_name",     value: "البنك الأهلي السعودي",       type: "text",    label: "Bank Name",               labelAr: "اسم البنك",            group: "payment_methods" },
    { key: "pm_bank_transfer_account_name",  value: "شركة الاشتراكات الرقمية",   type: "text",    label: "Account Name",            labelAr: "اسم المستفيد",         group: "payment_methods" },
    { key: "pm_bank_transfer_iban",          value: "SA0380000000608010167519",   type: "text",    label: "IBAN",                    labelAr: "رقم الآيبان",          group: "payment_methods" },
    { key: "pm_bank_transfer_account_number",value: "608010167519",               type: "text",    label: "Account Number",          labelAr: "رقم الحساب",           group: "payment_methods" },
    { key: "pm_paypal_enabled",              value: "false",                      type: "boolean", label: "PayPal Enabled",          labelAr: "تفعيل PayPal",         group: "payment_methods" },
    { key: "pm_paypal_client_id",            value: "",                           type: "text",    label: "PayPal Client ID",        labelAr: "Client ID",            group: "payment_methods" },
    { key: "pm_paypal_client_secret",        value: "",                           type: "password",label: "PayPal Client Secret",    labelAr: "Client Secret",        group: "payment_methods" },
    { key: "pm_paypal_mode",                 value: "sandbox",                    type: "select",  label: "PayPal Mode",             labelAr: "بيئة التشغيل",         group: "payment_methods" },
    { key: "pm_paypal_currency",             value: "USD",                        type: "text",    label: "PayPal Currency Code",    labelAr: "عملة PayPal (USD/EUR)", group: "payment_methods" },
    { key: "pm_paypal_exchange_rate",        value: "1",                          type: "text",    label: "Exchange Rate to PayPal Currency", labelAr: "سعر التحويل للعملة (مثال: 0.27 لـ SAR→USD)", group: "payment_methods" },
    { key: "pm_tabby_enabled",               value: "false",                      type: "boolean", label: "Tabby Enabled",           labelAr: "تفعيل Tabby",          group: "payment_methods" },
    { key: "pm_tabby_public_key",            value: "",                           type: "text",    label: "Tabby Public Key",        labelAr: "Public Key",           group: "payment_methods" },
    { key: "pm_tabby_secret_key",            value: "",                           type: "password",label: "Tabby Secret Key",        labelAr: "Secret Key",           group: "payment_methods" },
    { key: "pm_tabby_merchant_code",         value: "",                           type: "text",    label: "Tabby Merchant Code",     labelAr: "Merchant Code",        group: "payment_methods" },
    { key: "pm_tamara_enabled",              value: "false",                      type: "boolean", label: "Tamara Enabled",          labelAr: "تفعيل Tamara",         group: "payment_methods" },
    { key: "pm_tamara_api_token",            value: "",                           type: "password",label: "Tamara Merchant Key",      labelAr: "Merchant Key",         group: "payment_methods" },
    { key: "pm_tamara_public_key",           value: "",                           type: "text",    label: "Tamara Public Key",        labelAr: "Public Key",           group: "payment_methods" },
    { key: "pm_tamara_notification_key",     value: "",                           type: "password",label: "Tamara Notification Key",  labelAr: "Notification Key",     group: "payment_methods" },
    { key: "pm_tamara_merchant_url",         value: "",                           type: "text",    label: "Tamara Merchant URL",     labelAr: "Merchant URL",         group: "payment_methods" },
    { key: "pm_tamara_mode",                 value: "sandbox",                    type: "select",  label: "Tamara Mode",             labelAr: "بيئة التشغيل",         group: "payment_methods" },
    { key: "pm_tamara_installments",         value: "3",                          type: "text",    label: "Tamara Installments",     labelAr: "عدد الدفعات",          group: "payment_methods" },
    { key: "pm_tamara_agreement",            value: "false",                      type: "boolean", label: "Tamara Agreement",        labelAr: "الموافقة على اتفاقية تمارا", group: "payment_methods" },
    // Tracking Pixels
    { key: "gtm_id", value: "", type: "text", label: "Google Tag Manager ID", labelAr: "معرف GTM", group: "tracking" },
    { key: "ga4_id", value: "", type: "text", label: "Google Analytics 4 ID", labelAr: "معرف GA4", group: "tracking" },
    { key: "meta_pixel_id", value: "", type: "text", label: "Meta Pixel ID", labelAr: "معرف ميتا بيكسل", group: "tracking" },
    { key: "tiktok_pixel_id", value: "", type: "text", label: "TikTok Pixel ID", labelAr: "معرف تيك توك بيكسل", group: "tracking" },
    { key: "snapchat_pixel_id", value: "", type: "text", label: "Snapchat Pixel ID", labelAr: "معرف سناب شات بيكسل", group: "tracking" },
    // Conversion Optimization
    { key: "live_activity_enabled",  value: "true",  type: "boolean", label: "Live Activity Toast",      labelAr: "إشعارات النشاط المباشر",      group: "conversion" },
    { key: "live_activity_interval", value: "12",    type: "number",  label: "Activity Interval (sec)", labelAr: "فترة ظهور الإشعار (ثانية)",   group: "conversion" },
    { key: "live_activity_names",    value: "أحمد,محمد,عبدالله,فيصل,سارة,نورة,ريم,خالد,عمر,يوسف,علي,مريم", type: "text", label: "Activity Names", labelAr: "أسماء عشوائية (مفصولة بفاصلة)", group: "conversion" },
    { key: "live_activity_cities",   value: "الرياض,جدة,الدمام,مكة,المدينة,أبوظبي,دبي,الكويت,الدوحة,مسقط", type: "text", label: "Activity Cities", labelAr: "مدن عشوائية (مفصولة بفاصلة)", group: "conversion" },
    { key: "flash_sale_enabled",     value: "false", type: "boolean", label: "Flash Sale Timer",         labelAr: "عداد العرض المحدود",          group: "conversion" },
    { key: "flash_sale_ends_at",     value: "",      type: "text",    label: "Flash Sale End Date",      labelAr: "تاريخ انتهاء العرض (ISO)",    group: "conversion" },
    { key: "flash_sale_label",       value: "⚡ ينتهي العرض خلال", type: "text", label: "Flash Sale Label", labelAr: "نص عداد العرض", group: "conversion" },
    { key: "scarcity_enabled",       value: "false", type: "boolean", label: "Stock Scarcity Bar",       labelAr: "شريط الندرة",                 group: "conversion" },
    { key: "scarcity_max",           value: "20",    type: "number",  label: "Max Stock Display",        labelAr: "الحد الأقصى للمخزون المعروض", group: "conversion" },
    { key: "live_viewers_enabled",   value: "false", type: "boolean", label: "Live Viewers Counter",     labelAr: "عداد المشاهدين الحاليين",     group: "conversion" },
    { key: "live_viewers_min",       value: "8",     type: "number",  label: "Min Viewers",              labelAr: "أقل عدد مشاهدين",            group: "conversion" },
    { key: "live_viewers_max",       value: "34",    type: "number",  label: "Max Viewers",              labelAr: "أعلى عدد مشاهدين",           group: "conversion" },
    { key: "sticky_cta_enabled",     value: "true",  type: "boolean", label: "Sticky Add to Cart",       labelAr: "زر الشراء الثابت",            group: "conversion" },
    { key: "cart_progress_enabled",  value: "false", type: "boolean", label: "Cart Progress Bar",        labelAr: "شريط تقدم السلة",             group: "conversion" },
    { key: "cart_progress_target",   value: "200",   type: "number",  label: "Progress Target (SAR)",    labelAr: "المبلغ المستهدف (ريال)",      group: "conversion" },
    { key: "cart_progress_reward",   value: "خصم 10%", type: "text", label: "Progress Reward",          labelAr: "المكافأة عند الوصول للهدف",  group: "conversion" },
    { key: "cart_progress_coupon",   value: "SAVE10", type: "text",  label: "Progress Coupon Code",     labelAr: "كود الكوبون",                 group: "conversion" },
    { key: "guarantee_enabled",      value: "true",  type: "boolean", label: "Guarantee Message",        labelAr: "رسالة الضمان",                group: "conversion" },
    { key: "guarantee_text",         value: "🛡 ضمان استرداد خلال 7 أيام إذا لم يعمل", type: "text", label: "Guarantee Text", labelAr: "نص رسالة الضمان", group: "conversion" },
    // Accounting
    { key: "tax_enabled",       value: "true",           type: "boolean", label: "Enable Tax (VAT)",      labelAr: "تفعيل ضريبة القيمة المضافة",   group: "accounting" },
    { key: "tax_rate",          value: "15",             type: "number",  label: "Tax Rate (%)",          labelAr: "نسبة الضريبة (%)",              group: "accounting" },
    { key: "tax_number",        value: "",               type: "text",    label: "Tax Registration No.",  labelAr: "الرقم الضريبي",                 group: "accounting" },
    { key: "company_address",   value: "المملكة العربية السعودية", type: "text", label: "Company Address", labelAr: "عنوان الشركة",                group: "accounting" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("✅ Settings created");

  // Admin Log
  await prisma.adminLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      entity: "System",
      details: { message: "Database seeded successfully" },
    },
  });

  console.log("✅ Admin logs created");
  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📧 Login credentials:");
  console.log("  Admin: admin@store.com / admin123");
  console.log("  Staff: staff@store.com / admin123");
  console.log("  Customer: customer@example.com / customer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
