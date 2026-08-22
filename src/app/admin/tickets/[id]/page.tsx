import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getPriorityLabel, getTicketStatusLabel } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import AdminTicketActions from "./AdminTicketActions";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  RESOLVED: "success",
  CLOSED: "gray",
};

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  LOW: "gray",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export default async function AdminTicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/login");
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) notFound();

  const userIds = Array.from(new Set(ticket.messages.map((m) => m.userId)));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "تذاكر الدعم", href: "/admin/tickets" },
          { label: ticket.ticketNumber },
        ]}
        title={ticket.subject}
        description={`${ticket.ticketNumber} · ${ticket.user.name} · ${ticket.user.email}`}
        badge={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant={STATUS_VARIANT[ticket.status] ?? "gray"} dot>
              {getTicketStatusLabel(ticket.status)}
            </Badge>
            <Badge variant={PRIORITY_VARIANT[ticket.priority] ?? "gray"}>{getPriorityLabel(ticket.priority)}</Badge>
          </span>
        }
      />

      <Section title="المحادثة" description={`${ticket.messages.length} رسالة`} contentClassName="space-y-3 pt-0">
        {ticket.messages.map((msg) => {
          const isStaff = msg.isStaff;
          const senderName = userMap[msg.userId] ?? "مجهول";
          return (
            <div key={msg.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isStaff ? "rounded-tl-sm bg-primary-600 text-white" : "rounded-tr-sm border border-line bg-surface-muted text-fg"
                }`}
              >
                <p className={`mb-1 text-[11px] font-medium ${isStaff ? "text-primary-100" : "text-fg-muted"}`}>
                  {senderName} · {isStaff ? "الدعم" : "العميل"}
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.message}</p>
                <p className={`mt-1 text-[10px] ${isStaff ? "text-primary-100/80" : "text-fg-subtle"}`}>
                  {formatDateTime(msg.createdAt.toString())}
                </p>
              </div>
            </div>
          );
        })}
      </Section>

      <AdminTicketActions ticketId={ticket.id} status={ticket.status} />
    </div>
  );
}
