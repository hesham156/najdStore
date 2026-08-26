"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Mail, Phone, MessageSquare, Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        toast.success(t("sentToast"));
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(data.error || t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-fg mb-3">{t("title")}</h1>
          <p className="text-fg-subtle text-lg">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-5">
            {[
              {
                icon: Mail, title: t("infoEmailTitle"),
                lines: ["support@store.com", t("infoEmailReply")],
                color: "bg-info/10 text-info",
              },
              {
                icon: Phone, title: t("infoPhoneTitle"),
                lines: ["+966 50 123 4567", t("infoHoursWeekdays")],
                color: "bg-success/10 text-success",
              },
              {
                icon: MessageSquare, title: t("infoTicketTitle"),
                lines: [t("infoTicketLine1"), t("infoTicketLine2")],
                color: "bg-brand/10 text-brand",
              },
              {
                icon: Clock, title: t("infoHoursTitle"),
                lines: [t("infoHoursWeekdays"), t("infoHoursFriday")],
                color: "bg-warning/10 text-warning",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-4 rounded-2xl bg-surface border border-line">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-fg text-sm">{item.title}</p>
                  {item.lines.map((line) => (
                    <p key={line} className="text-sm text-fg-subtle">{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-2xl border border-line p-8">
              {sent ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-fg mb-2">{t("sentTitle")}</h2>
                  <p className="text-fg-subtle">{t("sentDesc")}</p>
                  <Button className="mt-6" onClick={() => setSent(false)} variant="outline">
                    {t("sendAnother")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-xl font-bold text-fg mb-6">{t("formTitle")}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label={t("labelName")} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("placeholderName")} />
                    <Input label={t("labelEmail")} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" />
                  </div>
                  <Input label={t("labelSubject")} required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t("placeholderSubject")} />
                  <Textarea label={t("labelMessage")} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t("placeholderMessage")} rows={5} />
                  <Button type="submit" loading={loading} fullWidth size="lg">
                    {t("submit")}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
