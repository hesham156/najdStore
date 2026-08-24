"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronLeft, ExternalLink, MessageSquare, RefreshCw, Search, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { cn, formatDateTime, getPriorityLabel, getTicketStatusLabel } from "@/lib/utils";

interface Message {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string };
  messages: Message[];
  orderId?: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-fg-subtle",
  MEDIUM: "text-info",
  HIGH: "text-warning",
  URGENT: "text-danger",
};

const STATUS_VARIANT: Record<string, "warning" | "default" | "success" | "gray"> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CLOSED: "gray",
};

const STATUS_OPTIONS = [
  { value: "OPEN", label: "مفتوحة" },
  { value: "IN_PROGRESS", label: "قيد المعالجة" },
  { value: "RESOLVED", label: "محلولة" },
  { value: "CLOSED", label: "مغلقة" },
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Keeping only the id in state means the selected ticket always
     reflects the latest fetch without extra bookkeeping. */
  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) ?? null, [tickets, selectedId]);

  const fetchTickets = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      setError(false);
      try {
        const qs = statusFilter ? `?status=${statusFilter}` : "";
        const res = await fetch(`/api/admin/tickets${qs}`);
        const data = await res.json();
        if (data.success) setTickets(data.data);
        else setError(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    setLoading(true);
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, selectedId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (data.success) {
        setReply("");
        await fetchTickets(true);
      } else {
        toast.error(data.error || "تعذّر إرسال الرد");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success !== false) {
        toast.success("تم تحديث حالة التذكرة");
        await fetchTickets(true);
      } else {
        toast.error(data.error || "تعذّر تحديث الحالة");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.user.name.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const openCount = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div className="flex h-[calc(100vh-var(--header-h)-3rem)] overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {/* ══ Ticket list ══ */}
      <div className={cn("flex w-full shrink-0 flex-col border-e border-line md:w-80 lg:w-96", selected && "hidden md:flex")}>
        <div className="space-y-2.5 border-b border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-fg">تذاكر الدعم</h1>
              <p className="text-[11px] text-fg-muted">
                {openCount > 0 ? `${openCount} تذكرة مفتوحة تحتاج رداً` : "لا توجد تذاكر مفتوحة"}
              </p>
            </div>
            <IconButton
              label="تحديث القائمة"
              onClick={() => fetchTickets(true)}
              icon={<RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />}
            />
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-fg-subtle" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم التذكرة أو العميل..."
              aria-label="بحث في التذاكر"
              className={cn(
                "h-9 w-full rounded-control border border-line bg-surface-muted ps-9 pe-3 text-[13px] text-fg",
                "placeholder:text-fg-subtle focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              )}
            />
          </div>

          <Select
            aria-label="تصفية حسب الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            selectSize="sm"
            options={[{ value: "", label: "كل الحالات" }, ...STATUS_OPTIONS]}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 border-b border-line p-4">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))
          ) : error ? (
            <ErrorState size="sm" onRetry={() => fetchTickets()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              size="sm"
              icon={MessageSquare}
              title={search || statusFilter ? "لا توجد تذاكر مطابقة" : "لا توجد تذاكر"}
              description={
                search || statusFilter
                  ? "جرّب تعديل البحث أو اختيار حالة أخرى."
                  : "ستظهر تذاكر الدعم هنا عندما يتواصل معك العملاء."
              }
            />
          ) : (
            filtered.map((ticket) => {
              const lastMsg = ticket.messages[ticket.messages.length - 1];
              const active = selectedId === ticket.id;
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full border-b border-line p-4 text-start transition-colors",
                    active ? "bg-primary-50 dark:bg-primary-500/10" : "hover:bg-surface-hover"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[13px] font-bold text-white"
                      aria-hidden
                    >
                      {ticket.user.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-fg">{ticket.user.name}</span>
                        <span className="shrink-0 text-[11px] text-fg-subtle">
                          {new Date(ticket.updatedAt).toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh" })}
                        </span>
                      </div>
                      <p className="truncate text-[13px] text-fg-muted">{ticket.subject}</p>
                      {lastMsg && (
                        <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
                          {lastMsg.isStaff ? "أنت: " : ""}
                          {lastMsg.message}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[ticket.status]} size="sm">
                          {getTicketStatusLabel(ticket.status)}
                        </Badge>
                        <span className={cn("text-[11px] font-medium", PRIORITY_COLOR[ticket.priority])}>
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══ Conversation ══ */}
      {selected ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
            <IconButton
              label="العودة إلى القائمة"
              className="md:hidden"
              onClick={() => setSelectedId(null)}
              icon={<ChevronLeft className="h-5 w-5 rtl:rotate-180 ltr:rotate-0" />}
            />
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white"
              aria-hidden
            >
              {selected.user.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-fg">{selected.user.name}</p>
              <p className="truncate text-[11px] text-fg-muted">
                {selected.subject} · {selected.ticketNumber}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selected.orderId && (
                <Link
                  href={`/admin/orders/${selected.orderId}`}
                  className="hidden items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400 sm:inline-flex"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  عرض الطلب
                </Link>
              )}
              <Select
                aria-label="حالة التذكرة"
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                selectSize="sm"
                options={STATUS_OPTIONS}
                wrapperClassName="w-36"
              />
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted p-4">
            {selected.messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.isStaff ? "justify-end" : "justify-start")}>
                {!msg.isStaff && (
                  <span
                    className="mb-1 me-2 mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-line-strong text-[11px] font-bold text-fg"
                    aria-hidden
                  >
                    {selected.user.name.charAt(0)}
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-xs",
                    msg.isStaff
                      ? "rounded-tl-sm bg-primary-600 text-white"
                      : "rounded-tr-sm border border-line bg-surface text-fg"
                  )}
                >
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.message}</p>
                  <p className={cn("mt-1 text-[10px]", msg.isStaff ? "text-primary-100/80" : "text-fg-subtle")}>
                    {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-line bg-surface p-3">
            {selected.status === "CLOSED" ? (
              <p className="py-2 text-center text-[13px] text-fg-muted">
                هذه التذكرة مغلقة — غيّر حالتها من الأعلى لإعادة فتح المحادثة.
              </p>
            ) : (
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <label htmlFor="ticket-reply" className="sr-only">
                  نص الرد
                </label>
                <textarea
                  id="ticket-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="اكتب ردك… (Enter للإرسال، Shift+Enter لسطر جديد)"
                  rows={2}
                  className={cn(
                    "flex-1 resize-none rounded-control border border-line bg-surface-muted px-3 py-2.5 text-[13px] text-fg",
                    "placeholder:text-fg-subtle focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  )}
                />
                <Button
                  type="submit"
                  loading={sending}
                  disabled={!reply.trim()}
                  aria-label="إرسال الرد"
                  className="h-10 shrink-0 px-4"
                  icon={<Send className="h-4 w-4" />}
                />
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-surface-muted md:flex">
          <EmptyState
            icon={MessageSquare}
            title="اختر تذكرة لعرض المحادثة"
            description="اضغط على أي تذكرة من القائمة لقراءة رسائل العميل والرد عليه."
          />
        </div>
      )}
    </div>
  );
}
