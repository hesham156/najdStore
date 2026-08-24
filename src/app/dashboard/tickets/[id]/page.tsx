import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TicketReplyForm } from "./TicketReplyForm";
import { SAFE_USER_SELECT } from "@/lib/users";

interface Props { params: { id: string } }

export default async function TicketDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user: { select: SAFE_USER_SELECT },
    },
  });

  if (!ticket) notFound();

  const { variant, label } = getStatusBadge(ticket.status);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <nav className="flex items-center gap-2 text-sm text-fg-subtle">
        <Link href="/dashboard" className="hover:text-primary-600 dark:hover:text-primary-400">لوحة التحكم</Link>
        <ArrowRight className="h-4 w-4" />
        <Link href="/dashboard/tickets" className="hover:text-primary-600 dark:hover:text-primary-400">التذاكر</Link>
        <ArrowRight className="h-4 w-4" />
        <span className="text-fg">{ticket.ticketNumber}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-fg">{ticket.subject}</h1>
          <p className="text-fg-subtle text-sm mt-1">{ticket.ticketNumber}</p>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>

      {/* Messages */}
      <Card>
        <div className="space-y-4">
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isStaff ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.isStaff
                    ? "bg-surface-sunken text-fg rounded-ss-none"
                    : "bg-primary-600 text-white rounded-se-none"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold opacity-70">
                    {msg.isStaff ? "فريق الدعم" : "أنت"}
                  </span>
                  <span className="text-xs opacity-50">{formatDateTime(msg.createdAt)}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reply Form */}
      {ticket.status !== "CLOSED" && (
        <TicketReplyForm ticketId={ticket.id} />
      )}

      {ticket.status === "CLOSED" && (
        <div className="text-center py-6 text-fg-subtle text-sm">
          هذه التذكرة مغلقة
        </div>
      )}
    </div>
  );
}
