export default function TermsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-3xl">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">الشروط والأحكام</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10">آخر تحديث: يناير 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          {[
            {
              title: "1. القبول بالشروط",
              content: "باستخدامك لموقعنا وخدماتنا، فأنت توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام الموقع.",
            },
            {
              title: "2. طبيعة الخدمة",
              content: "نقدم خدمة بيع المنتجات والخدمات عبر متجرنا الإلكتروني. يتم عرض تفاصيل كل منتج على صفحته الخاصة، ويُسلَّم حسب طريقة التسليم الموضّحة.",
            },
            {
              title: "3. سياسة الدفع",
              content: "نقبل التحويل البنكي والعملات الرقمية وPayPal. جميع المدفوعات نهائية بعد الموافقة عليها وتسليم المنتج. يجب على المشتري رفع إثبات الدفع في حالة التحويل البنكي.",
            },
            {
              title: "4. سياسة الاسترداد",
              content: "نوفر ضماناً كاملاً في الحالات التالية:\n• في حالة عدم مطابقة المنتج المُسلَّم للوصف\n• في حالة عدم تسليم المنتج بعد مرور 24 ساعة من اعتماد الدفع\n• في حالة وجود عيب في المنتج عند التسليم\n\nلا يُقبل الاسترداد في الحالات التالية:\n• إذا تم استخدام المنتج بالفعل\n• إذا كان المنتج مطابقاً للوصف وسليماً",
            },
            {
              title: "5. الاستخدام المقبول",
              content: "يجب استخدام المنتجات والخدمات بشكل شخصي ومشروع. يُحظر أي استخدام غير قانوني أو ينتهك حقوق الغير أو شروط الجهات المصنّعة/المزوّدة.",
            },
            {
              title: "6. الخصوصية وحماية البيانات",
              content: "نلتزم بحماية بياناتك الشخصية وفق أعلى معايير الأمان. لا نشارك بياناتك مع أطراف ثالثة دون موافقتك. بيانات طلباتك محمية ولا يمكن الوصول إليها إلا من قبلك.",
            },
            {
              title: "7. المسؤولية",
              content: "نحن غير مسؤولين عن أي خسائر ناجمة عن سوء استخدام المنتجات. نحن ملتزمون بتسليم المنتجات كما هي موصوفة في الموقع.",
            },
            {
              title: "8. تعديل الشروط",
              content: "نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تعديلات جوهرية عبر البريد الإلكتروني أو الإشعارات.",
            },
          ].map((section) => (
            <div key={section.title} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{section.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{section.content}</p>
            </div>
          ))}
        </div>

        <div id="refund" className="mt-10 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">سياسة الاسترداد المفصلة</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
            نضمن رضاك التام. إذا واجهت أي مشكلة مع طلبك، تواصل معنا خلال 24 ساعة من التسليم وسنعمل على حلها أو استرداد مبلغك كاملاً.
          </p>
          <a href="/contact" className="btn-primary inline-flex text-sm">
            تواصل معنا للاسترداد
          </a>
        </div>
      </div>
    </div>
  );
}
