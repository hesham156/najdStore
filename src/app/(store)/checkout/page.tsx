"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCartStore, cartLineKey } from "@/store/cart";
import { CartFieldSummary } from "@/components/store/CartFieldSummary";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCurrency } from "@/context/CurrencyContext";
import toast from "react-hot-toast";
import {
  CreditCard, Landmark, Wallet, Tag, CheckCircle2, Upload, Copy, AlertCircle,
} from "lucide-react";
import { cn, resolveCityFee, isValidSaudiPhone, normalizeSaudiPhone } from "@/lib/utils";
import { calculateOrderTotals, vatIncludedIn } from "@/lib/pricing";
import AdBanner from "@/components/store/AdBanner";
import { useLocale, useTranslations } from "next-intl";
import { pickText } from "@/lib/i18n-content";
import type { Locale } from "@/i18n/config";

/* ─── Types ─── */
interface BankTransfer { enabled: boolean; accountName: string; bankName: string; accountNumber: string; iban: string }
interface PayPalConfig  { enabled: boolean; mode: string }
interface TabbyConfig   { enabled: boolean; publicKey: string; merchantCode: string }
interface TamaraConfig  { enabled: boolean; installments: number; merchantUrl: string }
interface CreditCardConfig { enabled: boolean }
interface PaymentMethods { bankTransfer: BankTransfer; paypal: PayPalConfig; tabby: TabbyConfig; tamara: TamaraConfig; creditCard: CreditCardConfig }

/* ─── Copy helper ─── */
function CopyRow({ label, value }: { label: string; value: string }) {
  const t = useTranslations("checkout");
  const copy = () => { navigator.clipboard.writeText(value); toast.success(t("copiedLabel", { label })); };
  return (
    <div className="flex items-center justify-between rounded-control border border-info/25 bg-info/10 p-2.5">
      <div>
        <p className="text-xs text-info">{label}</p>
        <p className="font-semibold text-info text-sm font-mono">{value}</p>
      </div>
      <button onClick={copy} className="p-1.5 rounded-lg hover:bg-info/10 transition-colors">
        <Copy className="h-4 w-4 text-info" />
      </button>
    </div>
  );
}

/* ─── Field wrapper that shows a validation message under its control ─── */
function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
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
          : "border-line hover:border-line"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        selected ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" : "bg-surface-sunken text-fg-subtle"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className={cn("font-semibold text-sm", selected ? "text-primary-700 dark:text-primary-300" : "text-fg")}>
          {label}
        </p>
        <p className="text-xs text-fg-subtle mt-0.5">{desc}</p>
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
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;

  const [gateways, setGateways]             = useState<PaymentMethods | null>(null);
  const [gatewaysLoading, setGatewaysLoading] = useState(true);
  const [paymentMethod, setPaymentMethod]   = useState("");
  const [couponCode, setCouponCode]         = useState("");
  // `minOrderAmount` is carried so the discount is re-evaluated whenever the
  // basket changes — otherwise trimming the cart below the coupon's minimum
  // kept showing a discount the order API would refuse.
  const [coupon, setCoupon]                 = useState<{ discountType: string; discountValue: number; code: string; minOrderAmount?: number | null } | null>(null);
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
  const [cityRates, setCityRates]           = useState<{ city: string; cost: number }[]>([]);
  const [taxRate, setTaxRate]               = useState(0);
  const [fieldErrors, setFieldErrors]       = useState<Record<string, string>>({});
  // A ref, not state: it flips synchronously inside the click handler, so a
  // second click that lands before React re-renders the disabled button is
  // still turned away. Two orders from one impatient double-click is not a
  // mistake the customer can undo.
  const submitting = useRef(false);

  /* Fetch enabled gateways + public settings */
  useEffect(() => {
    Promise.all([
      fetch("/api/payment-methods").then((r) => r.json()),
      fetch("/api/settings/public").then((r) => r.json()),
      fetch("/api/shipping-rates").then((r) => r.json()),
    ]).then(([d, s, cr]) => {
      if (cr?.success && Array.isArray(cr.data)) setCityRates(cr.data);
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
        setTaxRate(parseFloat(String(s.data.tax_rate ?? 0)) || 0);
      }
    })
      // Without this a failed settings call rejected unhandled and the screen
      // silently settled on "no payment methods", which reads like a closed
      // shop rather than a temporary fault.
      .catch(() => toast.error(t("loadSettingsError")))
      .finally(() => setGatewaysLoading(false));
  }, []);

  /*
   * Pre-fill the shipping details for a logged-in customer so they don't retype
   * their name and phone on every order. We prefer the address they last shipped
   * to (repeat customers just confirm), and fall back to their account name and
   * phone. Fields are only filled while still empty — never overwriting what the
   * customer is typing — and stay editable, since the recipient may differ from
   * the account holder.
   */
  useEffect(() => {
    if (!session?.user?.id) return;
    Promise.all([
      fetch("/api/users/profile").then((r) => r.json()).catch(() => null),
      fetch("/api/orders").then((r) => r.json()).catch(() => null),
    ]).then(([prof, ord]) => {
      const p = prof?.success ? prof.data : null;
      const lastWithAddr =
        ord?.success && Array.isArray(ord.data)
          ? ord.data.find(
              (o: { shipName?: string; shipPhone?: string; shipCity?: string; shipAddress?: string }) =>
                o.shipName || o.shipPhone || o.shipCity || o.shipAddress,
            )
          : null;

      setShipName((cur) => cur || lastWithAddr?.shipName || p?.name || "");
      setShipPhone((cur) => cur || lastWithAddr?.shipPhone || p?.phone || "");
      setShipCity((cur) => cur || lastWithAddr?.shipCity || "");
      setShipAddress((cur) => cur || lastWithAddr?.shipAddress || "");
    });
  }, [session?.user?.id]);

  const shippingBase = resolveCityFee(shipCity, cityRates, shipFee);
  const hasShipping = shipFee > 0 || cityRates.length > 0;
  // Same function the order API uses, so the price shown here is the price charged.
  const { subtotal, discount, shippingCost, total } = calculateOrderTotals({
    subtotal: getTotalPrice(),
    coupon,
    shippingBase,
    freeShippingThreshold: shipFreeThreshold,
  });

  /* ── Guards ── */
  // Still loading session — wait
  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-fg-subtle text-sm">{tc("loading")}</div>
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
          <h1 className="text-2xl font-bold text-fg">{t("mustLogin")}</h1>
          <p className="text-fg-subtle text-sm">{t("mustLoginDesc")}</p>
          <Link href="/login?redirect=/checkout"><Button>{t("signIn")}</Button></Link>
        </div>
      </div>
    );
  }

if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🛒</div>
          <h1 className="text-2xl font-bold text-fg">{t("cartEmpty")}</h1>
          <Link href="/products"><Button>{t("browseProducts")}</Button></Link>
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
      if (data.success) { setCoupon(data.data); toast.success(t("couponApplied", { code: data.data.code })); }
      else toast.error(data.error || t("couponInvalid"));
    } catch { toast.error(t("genericError")); }
    finally { setCouponLoading(false); }
  };

  /**
   * Everything that must be true before an order may be sent.
   *
   * The shipping block used to be collected and posted without a single check,
   * so a printing order could reach the carrier with no recipient, no phone and
   * no address. Address fields are required only when the store actually ships
   * (a rate or a city table exists) — a purely digital catalogue still checks out
   * in two fields.
   */
  const validateCheckout = (): Record<string, string> => {
    const e: Record<string, string> = {};

    if (!paymentMethod) e.paymentMethod = t("selectPayment");

    if (!session) {
      if (!guestName.trim()) e.guestName = t("enterName");
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        e.guestEmail = t("enterValidEmail");
      }
    }

    if (hasShipping) {
      if (!shipName.trim()) e.shipName = t("enterRecipientName");
      if (!isValidSaudiPhone(shipPhone)) e.shipPhone = t("enterValidPhone");
      if (!shipCity.trim()) e.shipCity = t("selectCityError");
      if (shipAddress.trim().length < 8) e.shipAddress = t("enterAddress");
    }

    // The bank-transfer receipt is deliberately NOT required here: the order
    // page lets the customer attach it after making the transfer.

    return e;
  };

  const handleSubmit = async () => {
    // Synchronous latch — see the `submitting` ref above.
    if (submitting.current) return;

    const errors = validateCheckout();
    setFieldErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) { toast.error(firstError); return; }

    submitting.current = true;
    setLoading(true);
    try {
      let proofImageUrl: string | undefined;
      if (proofFile && paymentMethod === "BANK_TRANSFER") {
        const formData = new FormData();
        formData.append("file", proofFile);
        formData.append("purpose", "payment_proof");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData }).catch(() => null);
        const uploadData = uploadRes ? await uploadRes.json().catch(() => null) : null;
        if (!uploadData?.success) {
          // The receipt is the whole point of a bank transfer. Creating the
          // order without it used to happen silently, leaving the customer
          // certain they had attached proof they had not.
          toast.error(uploadData?.error || t("uploadProofError"));
          return;
        }
        proofImageUrl = uploadData.url;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price, variantLabel: i.variantLabel, variantId: i.variantId, customFields: i.customFields })),
          paymentMethod,
          couponCode: coupon?.code,
          notes,
          proofImageUrl,
          // Checked for equality against the server's own figure — never used
          // as a price. A mismatch means the catalogue moved under us.
          expectedTotal: total,
          // Shipping address (for carrier integrations)
          shipName: shipName.trim(),
          shipPhone: normalizeSaudiPhone(shipPhone) || shipPhone.trim(),
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
      } else if (data.code === "TOTAL_CHANGED") {
        // The server recomputed a different total. Drop the coupon if it no
        // longer applies and let the customer see the new figure before we
        // charge anything — silently billing the new amount is not an option.
        if (data.totals && Math.abs(Number(data.totals.discount) - discount) > 0.01) setCoupon(null);
        toast.error(data.error, { duration: 7000 });
        router.refresh();
      } else {
        toast.error(data.error || t("submitError"));
      }
    } catch {
      toast.error(t("connectionError"));
    }
    finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  /* Collect enabled methods for rendering */
  const enabledMethods: Array<{ value: string; label: string; desc: string; icon: React.ElementType }> = [];
  if (gateways?.creditCard?.enabled)   enabledMethods.push({ value: "CREDIT_CARD",   label: t("ccLabel"), desc: t("ccDesc"),                icon: CreditCard });
  if (gateways?.bankTransfer.enabled) enabledMethods.push({ value: "BANK_TRANSFER", label: t("bankLabel"),    desc: t("bankDesc"),   icon: Landmark });
  if (gateways?.paypal.enabled)        enabledMethods.push({ value: "PAYPAL",         label: "PayPal",         desc: t("paypalDesc"),             icon: Wallet  });
  if (gateways?.tabby.enabled)         enabledMethods.push({ value: "TABBY",          label: t("tabbyLabel"),  desc: t("tabbyDesc"),                    icon: CreditCard });
  if (gateways?.tamara.enabled)        enabledMethods.push({ value: "TAMARA",         label: t("tamaraLabel"), desc: t("tamaraDesc", { count: gateways.tamara.installments || 3 }), icon: CreditCard });

  const hasNoMethods = !gatewaysLoading && enabledMethods.length === 0;

  return (
    <div className="min-h-screen py-8">
      <AdBanner placement="CHECKOUT_TOP" />
      <div className="container-custom max-w-5xl mt-4">
        <h1 className="text-3xl font-bold text-fg mb-8">{t("title")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Payment Form ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* ── Guest Info (shown only when not logged in) ── */}
            {!session && guestCheckoutEnabled && (
              <div className="bg-surface rounded-2xl border border-line p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-fg text-lg">{t("yourInfo")}</h2>
                  <Link href="/login?redirect=/checkout" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    {t("haveAccount")}
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t("fullName")}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                  />
                  <Input
                    label={t("email")}
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>
                <p className="text-xs text-fg-subtle">
                  {t("emailHint")}
                </p>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="bg-surface rounded-2xl border border-line p-6">
              <h2 className="font-bold text-fg text-lg mb-4">{t("paymentMethod")}</h2>

              {gatewaysLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-surface-sunken" />)}
                </div>
              ) : hasNoMethods ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/25 text-warning">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm">{t("noMethodsAvailable")}</p>
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
              <div className="bg-info/10 border border-info/25 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-info flex items-center gap-2">
                  <Landmark className="h-5 w-5" />{t("bankDetails")}
                </h3>
                <div className="space-y-2">
                  {gateways.bankTransfer.bankName && (
                    <CopyRow label={t("bank")} value={gateways.bankTransfer.bankName} />
                  )}
                  {gateways.bankTransfer.accountName && (
                    <CopyRow label={t("beneficiary")} value={gateways.bankTransfer.accountName} />
                  )}
                  {gateways.bankTransfer.iban && (
                    <CopyRow label={t("iban")} value={gateways.bankTransfer.iban} />
                  )}
                  {gateways.bankTransfer.accountNumber && (
                    <CopyRow label={t("accountNumber")} value={gateways.bankTransfer.accountNumber} />
                  )}
                  <CopyRow label={t("amountDue")} value={formatAmount(total)} />
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-info mb-2">
                    <Upload className="inline h-4 w-4 me-1" />
                    {t("uploadProof")}
                  </label>
                  <input
                    type="file" accept="image/*,.pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="input-base text-sm"
                  />
                  {proofFile && <p className="text-xs text-info mt-1">✅ {proofFile.name}</p>}
                </div>
              </div>
            )}

            {/* ── PayPal notice ── */}
            {paymentMethod === "PAYPAL" && (
              <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5 space-y-2">
                <h3 className="font-bold text-brand flex items-center gap-2">
                  <Wallet className="h-5 w-5" />{t("paypalTitle")}
                </h3>
                <p className="text-sm text-brand">
                  {t("paypalNotice")}
                  {gateways?.paypal.mode === "sandbox" && (
                    <span className="ms-2 text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">{t("testEnv")}</span>
                  )}.
                </p>
              </div>
            )}

            {/* ── Tabby notice ── */}
            {paymentMethod === "TABBY" && (
              <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5 space-y-2">
                <h3 className="font-bold text-brand">
                  {t("tabbyTitle")}
                </h3>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="text-center p-2.5 rounded-xl bg-brand/10">
                      <p className="text-sm font-bold text-brand">{formatAmount(total / 4)}</p>
                      <p className="text-xs text-brand">{t("installment", { number: n })}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-brand mt-2">{t("tabbyRedirect")}</p>
              </div>
            )}

            {/* ── Tamara notice ── */}
            {paymentMethod === "TAMARA" && (() => {
              const n = gateways?.tamara.installments || 3;
              return (
                <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5 space-y-2">
                  <h3 className="font-bold text-brand">
                    {t("tamaraTitle", { count: n })}
                  </h3>
                  <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                    {Array.from({ length: n }, (_, i) => i + 1).map(p => (
                      <div key={p} className="text-center p-2.5 rounded-xl bg-brand/10">
                        <p className="text-sm font-bold text-brand">{formatAmount(total / n)}</p>
                        <p className="text-xs text-brand">{t("installment", { number: p })}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-brand mt-2">{t("tamaraRedirect")}</p>
                </div>
              );
            })()}

            {/* ── Coupon ── */}
            <div className="bg-surface rounded-2xl border border-line p-6">
              <h2 className="font-bold text-fg text-lg mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary-600" />{t("coupon")}
              </h2>
              {coupon ? (
                <div className="flex items-center justify-between bg-success/10 border border-success/25 rounded-xl p-3">
                  <div>
                    <p className="font-bold text-success">{coupon.code}</p>
                    <p className="text-sm text-success">
                      {t("discountValue", { value: coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : formatAmount(coupon.discountValue) })}
                    </p>
                  </div>
                  <button onClick={() => setCoupon(null)} className="text-danger hover:text-danger text-sm">{t("remove")}</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder={t("couponPlaceholder")} className="flex-1" />
                  <Button onClick={applyCoupon} loading={couponLoading} variant="outline">{t("apply")}</Button>
                </div>
              )}
            </div>

            {/* ── Shipping address ── */}
            <div className="bg-surface rounded-2xl border border-line p-6">
              <h2 className="font-bold text-fg text-lg mb-1">{t("shippingAddress")}</h2>
              <p className="text-sm text-fg-subtle mb-4">
                {session ? t("shipHintLoggedIn") : t("shipHintGuest")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field error={fieldErrors.shipName}>
                  <input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder={t("recipientName")} aria-label={t("recipientName")} className="input-base" />
                </Field>
                <Field error={fieldErrors.shipPhone}>
                  <input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} placeholder={t("recipientPhone")} aria-label={t("recipientPhone")} className="input-base" inputMode="tel" dir="ltr" />
                </Field>
                <Field error={fieldErrors.shipCity}>
                  {cityRates.length > 0 ? (
                    <select value={shipCity} onChange={(e) => setShipCity(e.target.value)} aria-label={t("city")} className="input-base">
                      <option value="">{t("selectCityPlaceholder")}</option>
                      {cityRates.map((r) => (
                        <option key={r.city} value={r.city}>
                          {r.city} ({r.cost > 0 ? t("shipCost", { cost: r.cost }) : t("freeShip")})
                        </option>
                      ))}
                      {shipFee > 0 && <option value="مدن أخرى">{t("otherCity", { fee: shipFee })}</option>}
                    </select>
                  ) : (
                    <input value={shipCity} onChange={(e) => setShipCity(e.target.value)} placeholder={t("city")} aria-label={t("city")} className="input-base" />
                  )}
                </Field>
                <Field error={fieldErrors.shipAddress}>
                  <input value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} placeholder={t("addressDetail")} aria-label={t("addressDetail")} className="input-base" />
                </Field>
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="bg-surface rounded-2xl border border-line p-6">
              <h2 className="font-bold text-fg text-lg mb-4">{t("notesTitle")}</h2>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")} rows={3} className="input-base resize-none" />
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-2xl border border-line p-6 sticky top-20 space-y-4">
              <h2 className="font-bold text-fg text-lg">{t("orderSummary")}</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={cartLineKey(item)} className="flex justify-between text-sm">
                    <div className="text-fg-muted min-w-0 pe-2">
                      <span>{pickText(locale, item.name, item.nameAr)} × {item.quantity}</span>
                      {item.variantLabel && <span className="block text-xs text-fg-subtle">{item.variantLabel}</span>}
                      <CartFieldSummary fields={item.customFields} />
                    </div>
                    <span className="font-semibold text-fg shrink-0">
                      {formatAmount(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-line pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-muted">{t("subtotal")}</span>
                  <span className="font-medium">{formatAmount(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>{t("couponDiscount")}</span>
                    <span>- {formatAmount(discount)}</span>
                  </div>
                )}
                {hasShipping && (
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">{t("shipping")}</span>
                    {shippingCost > 0
                      ? <span className="font-medium">{formatAmount(shippingCost)}</span>
                      : <span className="font-medium text-success">{t("free")}</span>}
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-line pt-2 mt-2">
                  <span className="text-fg">{t("total")}</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatAmount(total)}</span>
                </div>
                {/* Prices already include VAT, so this line explains the total
                    rather than adding to it. */}
                {vatIncludedIn(total, taxRate) > 0 && (
                  <p className="text-xs text-fg-muted text-start">
                    {t("vatIncluded", { rate: taxRate, amount: formatAmount(vatIncludedIn(total, taxRate)) })}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                loading={loading}
                fullWidth size="lg"
                disabled={hasNoMethods || !paymentMethod}
              >
                {hasNoMethods ? t("noPaymentMethods") : t("confirmOrder")}
              </Button>

              <p className="text-xs text-center text-fg-subtle">
                {t("agreeTerms")}{" "}
                <Link href="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">{t("terms")}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
