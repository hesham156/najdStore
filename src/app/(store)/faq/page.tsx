"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    category: "الطلبات والتسليم",
    items: [
      {
        q: "كيف يتم تسليم الطلبات؟",
        a: "بعد تأكيد الدفع، يتم تسليم المنتج تلقائياً في حال كان التسليم فورياً. ستظهر التفاصيل مباشرةً في صفحة تفاصيل الطلب بلوحة التحكم الخاصة بك. في حالة التسليم اليدوي، يتم التسليم خلال 1-24 ساعة.",
      },
      {
        q: "ما المدة الزمنية لمراجعة الدفع؟",
        a: "يتم مراجعة إثبات الدفع خلال 1-6 ساعات في أوقات العمل. بعد الموافقة يُسلَّم المنتج فوراً.",
      },
      {
        q: "هل يمكنني إلغاء طلبي؟",
        a: "يمكن إلغاء الطلب قبل مراجعة الدفع. بعد تسليم المنتج، لا يمكن الإلغاء.",
      },
    ],
  },
  {
    category: "الدفع",
    items: [
      {
        q: "ما طرق الدفع المتاحة؟",
        a: "نقبل التحويل البنكي، والعملات الرقمية (Bitcoin, USDT)، وPayPal.",
      },
      {
        q: "ماذا أفعل بعد التحويل البنكي؟",
        a: "بعد إتمام التحويل، ارفع صورة من إيصال الدفع في صفحة الطلب. سيتم مراجعته وتأكيده خلال ساعات.",
      },
      {
        q: "هل هناك رسوم إضافية على الدفع؟",
        a: "لا توجد رسوم إضافية. المبلغ الظاهر في الموقع هو ما تدفعه فعلياً.",
      },
    ],
  },
  {
    category: "المنتجات والجودة",
    items: [
      {
        q: "هل المنتجات أصلية؟",
        a: "نعم، جميع منتجاتنا أصلية 100% ومضمونة الجودة.",
      },
      {
        q: "ماذا أفعل إذا واجهت مشكلة في المنتج؟",
        a: "افتح تذكرة دعم فني فوراً مع ذكر رقم طلبك. سيتم حل المشكلة أو استبدال المنتج خلال ساعات.",
      },
      {
        q: "هل تفاصيل المنتج دقيقة؟",
        a: "نعم، نحرص على عرض تفاصيل دقيقة لكل منتج. تحقق دائماً من صفحة تفاصيل المنتج قبل الشراء.",
      },
    ],
  },
  {
    category: "الدعم والاسترداد",
    items: [
      {
        q: "هل يمكنني الحصول على استرداد؟",
        a: "نعم، في حالة المنتجات المعيبة أو غير الصالحة يتم الاسترداد الكامل. راجع سياسة الاسترداد للتفاصيل.",
      },
      {
        q: "كيف أتواصل مع الدعم؟",
        a: "يمكنك فتح تذكرة دعم من لوحة التحكم، أو التواصل معنا عبر البريد الإلكتروني support@store.com",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-start hover:bg-surface-sunken transition-colors"
      >
        <span className="font-semibold text-fg">{q}</span>
        <ChevronDown className={cn("h-5 w-5 text-fg-subtle shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-fg-muted leading-relaxed border-t border-line pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-fg mb-3">الأسئلة الشائعة</h1>
          <p className="text-fg-subtle text-lg">إجابات على أكثر الأسئلة شيوعاً</p>
        </div>

        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-lg font-bold text-fg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-400" />
                </span>
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-8">
          <h3 className="font-bold text-fg text-lg mb-2">لم تجد إجابتك؟</h3>
          <p className="text-fg-muted mb-4">تواصل مع فريق الدعم الفني</p>
          <a href="/contact" className="btn-primary inline-flex">تواصل معنا</a>
        </div>
      </div>
    </div>
  );
}
