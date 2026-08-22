"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Card";
import { Select, Textarea } from "@/components/ui/Input";

interface Props {
  ticketId: string;
  status: string;
}

export default function AdminTicketActions({ ticketId, status }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [newStatus, setNewStatus] = useState(status);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("اكتب نص الرد أولاً");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إرسال الرد للعميل");
        setMessage("");
        router.refresh();
      } else {
        toast.error(data.error || "تعذّر إرسال الرد");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم تحديث حالة التذكرة");
        router.refresh();
      } else {
        toast.error(data.error || "تعذّر تحديث الحالة");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="حالة التذكرة" contentClassName="pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            label="تغيير الحالة"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: "OPEN", label: "مفتوحة" },
              { value: "IN_PROGRESS", label: "قيد المعالجة" },
              { value: "RESOLVED", label: "محلولة" },
              { value: "CLOSED", label: "مغلقة" },
            ]}
          />
          <Button
            onClick={handleStatusChange}
            variant="secondary"
            loading={savingStatus}
            disabled={newStatus === status}
            className="shrink-0"
          >
            حفظ الحالة
          </Button>
        </div>
      </Section>

      <Section title="الرد على العميل" contentClassName="pt-0">
        <form onSubmit={handleReply} className="space-y-3">
          <Textarea
            label="نص الرد"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="اكتب ردك هنا..."
            hint="سيصل الرد للعميل ويظهر في المحادثة أعلاه."
          />
          <div className="flex justify-end">
            <Button type="submit" loading={loading} icon={<Send className="h-4 w-4" />}>
              إرسال الرد
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
}
