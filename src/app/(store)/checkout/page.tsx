"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCurrency } from "@/context/CurrencyContext";
import toast from "react-hot-toast";
import {
  CreditCard, Landmark, Wallet, Tag, CheckCircle2, Upload, Copy, AlertCircle,
} from "lucide-react";
import { cn, computeShipping } from "@/lib/utils";
import AdBanner from "@/components/store/AdBanner";

/* ─── Types ─── */
interface BankTransfer { enabled: boolean; accountName: string; bankName: string; accountNumber: string; iban: string }
interface PayPalConfig  { enabled: boolean; mode: string }
interface TabbyConfig   { enabled: boolean; publicKey: string; merchantCode: string }
interface TamaraConfig  { enabled: boolean; installments: number; merchantUrl: string }
interface CreditCardConfig { enabled: boolean }
interface PaymentMethods { bankTransfer: BankTransfer; paypal: PayPalConfig; tabby: TabbyConfig; tamara: TamaraConfig; creditCard: CreditCardConfig }

/* ─── Copy helper ─── */
function CopyRow({ label, value }: { label: string; value: string }) {
  const copy = () => { navigator.clipboard.writeText(value); toast.success(`تم نسخ ${label}`); };
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 dark:bg-gray-900/50 border border-blue-100 dark:border-blue-800">
      <div>
        <p className="text-xs text-blue-600 dark:text-blue-400">{label}</p>
        <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm font-mono">{value}</p>
      </div>
      <button onClick={copy} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
        <Copy className="h-4 w-4 text-blue-500" />
      </button>
    </div>
  );
}

/* ─── Payment method button ─── */
function MethodButton({
  value, label, desc, icon: Icon, selected, onClick,
}: {
  value: string; label: string; desc: string;
  icon: React.ElementType; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-start w-full",
        selected
          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        selected ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className={cn("font-semibold text-sm", selected ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white")}>
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
      {selected && <CheckCircle2 className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />}
    </button>
  );
}

/* ══════════════════════ PAGE ══════════════════════ */
export default function CheckoutPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { formatAmount } = useCurrency();

  const [gateways, setGateways]             = useState<PaymentMethods | null>(null);
  const [gatewaysLoading, setGatewaysLoading] = useState(true);
  const [paymentMethod, setPaymentMethod]   = useState("");
  const [couponCode, setCouponCode]         = useState("");
  const [coupon, setCoupon]                 = useState<{ discountType: string; discountValue: number; code: string } | null>(null);
  const [couponLoading, setCouponLoading]   = useState(false);
  const [notes, setNotes]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [proofFile, setProofFile]           = useState<File | null>(null);
  // Guest checkout
  const [guestCheckoutEnabled, setGuestCheckoutEnabled] = useState(false);
  const [guestName, setGuestName]           = useState("");
  const [guestEmail, setGuestEmail]         = useState("");
  const [shipName, setShipName]             = useState("");
  const [shipPhone, setShipPhone]           = useState("");
  const [shipCity, setShipCity]             = useState("");
  const [shipAddress, setShipAddress]       = useState("");
  const [shipFee, setShipFee]               = useState(0);
  const [shipFreeThreshold, setShipFreeThreshold] = useState(0);

  /* Fetch enabled gateways + public settings */
  useEffect(() => {
    Promise.all([
      fetch("/api/payment-methods").then((r) => r.json()),
      fetch("/api/settings/public").then((r) => r.json()),
    ]).then(([d, s]) => {
      if (d.success) {
        setGateways(d.data);
        const g: PaymentMethods = d.data;
        if (g.creditCard?.enabled)  setPaymentMethod("CREDIT_CARD");
        else if (g.bankTransfer.enabled) setPaymentMethod("BANK_TRANSFER");
        else if (g.paypal.enabled)  setPaymentMethod("PAYPAL");
        else if (g.tabby.enabled)   setPaymentMethod("TABBY");
        else if (g.tamara.enabled)  setPaymentMethod("TAMARA");
      }
      if (s.success) {
        setGuestCheckoutEnabled(s.data.guest_checkout === true);
        setShipFee(parseFloat(String(s.data.shipping_fee ?? 0)) || 0);
        setShipFreeThreshold(parseFloat(String(s.data.shipping_free_threshold ?? 0)) || 0);
      }
    }).finally(() => setGatewaysLoading(false));
  }, []);

  const subtotal = getTotalPrice();
  const discount = coupon
    ? coupon.discountType === "PERCENTAGE"
      ? subtotal * (coupon.discountValue / 100)
      : coupon.discountValue
    : 0;
  const shippingCost = computeShipping(subtotal, shipFee, shipFreeThreshold);
  const total = Math.max(0, subtotal - discount) + shippingCost;

  /* ── Guards ── */
  // Still loading session — wait
  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">جاري التحميل...</div>
      </div>
    );
  }

  // No session + guest checkout disabled → force login
  // Wait for gateways to finish loading before showing "must login" — prevents
  // false-positive flash while guest_checkout setting is still being fetched.
  if (!session && !gatewaysLoading && !guestCheckoutEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">يجب تسجيل الدخول أولاً</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">سجّل دخولك لإتمام عملية الشراء</p>
          <Link href="/login?redirect=/checkout"><Button>تسجيل الدخول</Button></Link>
        </div>
      </div>
    );
  }

if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">السلة فارغة</h1>
          <Link href="/products"><Button>تصفح المنتجات</Button></Link>
        </div>
      </div>
    );
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, total: subtotal }),
      });
      const data = await res.json();
      if (data.success) { setCoupon(data.data); toast.success(`تم تطبيق الكوبون: ${data.data.code}`); }
      else toast.error(data.error || "كوبون غير صالح");
    } catch { toast.error("حدث خطأ. حاول مرة أخرى"); }
    finally { setCouponLoading(false); }
  };

  const handleSubmit = async () => {
    if (!paymentMethod) { toast.error("اختر طريقة دفع أولاً"); return; }
    // Validate guest fields if not logged in
    if (!session) {
      if (!guestName.trim()) { toast.error("أدخل اسمك الكامل"); return; }
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        toast.error("أدخل بريد إلكتروني صحيح"); return;
      }
    }
    setLoading(true);
    try {
      let proofImageUrl: string | undefined;
      if (proofFile && paymentMethod === "BANK_TRANSFER") {
        const formData = new FormData();
        formData.append("file", proofFile);
        formData.append("purpose", "payment_proof");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) proofImageUrl = uploadData.url;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price, variantLabel: i.variantLabel, variantId: i.variantId })),
          paymentMethod,
          couponCode: coupon?.code,
          notes,
          proofImageUrl,
          // Shipping address (for carrier integrations)
          shipName: shipName.trim(),
          shipPhone: shipPhone.trim(),
          shipCity: shipCity.trim(),
          shipAddress: shipAddress.trim(),
          // Guest fields
          ...(!session && { guestName: guestName.trim(), guestEmail: guestEmail.trim().toLowerCase() }),
        }),
      });

      const data = await res.json();
      if (data.success) {
        clearCart();
        if (data.paypalApproveLink) {
          window.location.href = data.paypalApproveLink;
        } else if (data.tamaraCheckoutUrl) {
          window.location.href = data.tamaraCheckoutUrl;
        } else if (data.moyasarUrl) {
          window.location.href = data.moyasarUrl;
        } else {
          // Redirect everyone to the unified thank-you page
          router.push(
            `/thank-you?order=${data.data.id}&num=${encodeURIComponent(data.data.orderNumber)}`
          );
        }
      } else {
        toast.error(data.error || "حدث خطأ في إرسال الطلب");
      }
    } catch { toast.error("حدث خطأ. حاول مرة أخرى"); }
    finally { setLoading(false); }
  };

  /* Collect enabled methods for rendering */
  const enabledMethods: Array<{ value: string; label: string; desc: string; icon: React.ElementType }> = [];
  if (gateways?.creditCard?.enabled)   enabledMethods.push({ value: "CREDIT_CARD",   label: "بطاقة مدى / فيزا", desc: "دفع فوري وآمن بالبطاقة",                icon: CreditCard });
  if (gateways?.bankTransfer.enabled) enabledMethods.push({ value: "BANK_TRANSFER", label: "تحويل بنكي",    desc: "تحويل عبر البنك مع رفع إثبات الدفع",   icon: Landmark });
  if (gateways?.paypal.enabled)        enabledMethods.push({ value: "PAYPAL",         label: "PayPal",         desc: "بطاقات ائتمانية ودفع دولي",             icon: Wallet  });
  if (gateways?.tabby.enabled)         enabledMethods.push({ value: "TABBY",          label: "Tabby — تابي",  desc: "4 دفعات بدون فوائد",                    icon: CreditCard });
  if (gateways?.tamara.enabled)        enabledMethods.push({ value: "TAMARA",         label: "تمارا — Tamara", desc: `${gateways.tamara.installments || 3} دفعات بدون فوائد`, icon: CreditCard });

  const hasNoMethods = !gatewaysLoading && enabledMethods.length === 0;

  return (
    <div className="min-h-screen py-8">
      <AdBanner placement="CHECKOUT_TOP" />
      <div className="container-custom max-w-5xl mt-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">إتمام الشراء</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Payment Form ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* ── Guest Info (shown only when not logged in) ── */}
            {!session && guestCheckoutEnabled && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">بياناتك</h2>
                  <Link href="/login?redirect=/checkout" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    لديك حساب؟ سجّل دخولك
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="الاسم الكامل"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="محمد أحمد"
                  />
                  <Input
                    label="البريد الإلكتروني"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  📩 سيتم إرسال تفاصيل طلبك على هذا البريد الإلكتروني
                </p>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-4">طريقة الدفع</h2>

              {gatewaysLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-gray-700" />)}
                </div>
              ) : hasNoMethods ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm">لا توجد طرق دفع متاحة حالياً. يرجى التواصل مع الدعم.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enabledMethods.map((m) => (
                    <MethodButton key={m.value} {...m} selected={paymentMethod === m.value} onClick={() => setPaymentMethod(m.value)} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Bank Transfer Details ── */}
            {paymentMethod === "BANK_TRANSFER" && gateways?.bankTransfer && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Landmark className="h-5 w-5" />بيانات الحساب البنكي
                </h3>
                <div className="space-y-2">
                  {gateways.bankTransfer.bankName && (
                    <CopyRow label="البنك" value={gateways.bankTransfer.bankName} />
                  )}
                  {gateways.bankTransfer.accountName && (
                    <CopyRow label="اسم المستفيد" value={gateways.bankTransfer.accountName} />
                  )}
                  {gateways.bankTransfer.iban && (
                    <CopyRow label="رقم الآيبان (IBAN)" value={gateways.bankTransfer.iban} />
                  )}
                  {gateways.bankTransfer.accountNumber && (
                    <CopyRow label="رقم الحساب" value={gateways.bankTransfer.accountNumber} />
                  )}
                  <CopyRow label="المبلغ المطلوب" value={formatAmount(total)} />
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                    <Upload className="inline h-4 w-4 me-1" />
                    رفع إثبات الدفع (اختياري — يمكنك رفعه لاحقاً)
                  </label>
                  <input
                    type="file" accept="image/*,.pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="input-base text-sm"
                  />
                  {proofFile && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">✅ {proofFile.name}</p>}
                </div>
              </div>
            )}

            {/* ── PayPal notice ── */}
            {paymentMethod === "PAYPAL" && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 space-y-2">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                  <Wallet className="h-5 w-5" />الدفع عبر PayPal
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">
                  بعد تأكيد الطلب ستُعاد توجيهك لإتمام الدفع عبر PayPal
                  {gateways?.paypal.mode === "sandbox" && (
                    <span className="ms-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">بيئة اختبار</span>
                  )}.
                </p>
              </div>
            )}

            {/* ── Tabby notice ── */}
            {paymentMethod === "TABBY" && (
              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 space-y-2">
                <h3 className="font-bold text-teal-900 dark:text-teal-300">
                  Tabby — 4 دفعات بدون فوائد
                </h3>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="text-center p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/40">
                      <p className="text-sm font-bold text-teal-800 dark:text-teal-300">{formatAmount(total / 4)}</p>
                      <p className="text-xs text-teal-600 dark:text-teal-500">دفعة {n}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">سيتم تحويلك لصفحة Tabby لإتمام الطلب.</p>
              </div>
            )}

            {/* ── Tamara notice ── */}
            {paymentMethod === "TAMARA" && (() => {
              const n = gateways?.tamara.installments || 3;
              return (
                <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-2xl p-5 space-y-2">
                  <h3 className="font-bold text-cyan-900 dark:text-cyan-300">
                    تمارا — {n} دفعات بدون فوائد
                  </h3>
                  <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                    {Array.from({ length: n }, (_, i) => i + 1).map(p => (
                      <div key={p} className="text-center p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
                        <p className="text-sm font-bold text-cyan-800 dark:text-cyan-300">{formatAmount(total / n)}</p>
                        <p className="text-xs text-cyan-600 dark:text-cyan-500">دفعة {p}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2">سيتم تحويلك لصفحة تمارا لإتمام الدفع.</p>
                </div>
              );
            })()}

            {/* ── Coupon ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary-600" />كوبون خصم
              </h2>
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                  <div>
                    <p className="font-bold text-green-700 dark:text-green-300">{coupon.code}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      خصم {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : formatAmount(coupon.discountValue)}
                    </p>
                  </div>
                  <button onClick={() => setCoupon(null)} className="text-red-500 hover:text-red-600 text-sm">إزالة</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="أدخل كود الكوبون" className="flex-1" />
                  <Button onClick={applyCoupon} loading={couponLoading} variant="outline">تطبيق</Button>
                </div>
              )}
            </div>

            {/* ── Shipping address ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-1">عنوان الشحن</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">لشحن طلبك عبر شركات التوصيل</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder="اسم المستلم" className="input-base" />
                <input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} placeholder="جوال المستلم" className="input-base" inputMode="tel" />
                <input value={shipCity} onChange={(e) => setShipCity(e.target.value)} placeholder="المدينة" className="input-base" />
                <input value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} placeholder="العنوان التفصيلي" className="input-base" />
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-4">ملاحظات (اختياري)</h2>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية للطلب..." rows={3} className="input-base resize-none" />
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sticky top-20 space-y-4">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">ملخص الطلب</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.id}-${item.variantLabel}`} className="flex justify-between text-sm">
                    <div className="text-gray-600 dark:text-gray-400 truncate pe-2">
                      <span>{item.nameAr} × {item.quantity}</span>
                      {item.variantLabel && <span className="block text-xs text-gray-400">{item.variantLabel}</span>}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white shrink-0">
                      {formatAmount(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">المجموع الفرعي</span>
                  <span className="font-medium">{formatAmount(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>خصم الكوبون</span>
                    <span>- {formatAmount(discount)}</span>
                  </div>
                )}
                {shipFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">الشحن</span>
                    {shippingCost > 0
                      ? <span className="font-medium">{formatAmount(shippingCost)}</span>
                      : <span className="font-medium text-green-600 dark:text-green-400">مجاني</span>}
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <span className="text-gray-900 dark:text-white">الإجمالي</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatAmount(total)}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                loading={loading}
                fullWidth size="lg"
                disabled={hasNoMethods || !paymentMethod}
              >
                {hasNoMethods ? "لا توجد طرق دفع" : "تأكيد الطلب"}
              </Button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                بالمتابعة توافق على{" "}
                <Link href="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">الشروط والأحكام</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
