import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { NewTicketModal } from "./NewTicketModal";

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">تذاكر الدعم</h1>
          <p className="text-fg-subtle text-sm mt-1">{tickets.length} تذكرة</p>
        </div>
        <NewTicketModal />
      </div>

      {tickets.length === 0 ? (
        <Card className="text-center py-16">
          <MessageSquare className="h-14 w-14 text-fg-subtle mx-auto mb-4" />
          <h2 className="font-bold text-fg mb-2">لا توجد تذاكر دعم</h2>
          <p className="text-fg-subtle text-sm mb-6">
            لديك مشكلة؟ افتح تذكرة وسيساعدك فريقنا
          </p>
          <NewTicketModal />
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const { variant, label } = getStatusBadge(ticket.status);
            const lastMsg = ticket.messages[0];
            return (
              <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}>
                <Card hover>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-5 w-5 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-fg text-sm">{ticket.subject}</p>
                          <Badge variant={variant} className="text-xs">{label}</Badge>
                        </div>
                        <p className="text-xs text-fg-subtle">{ticket.ticketNumber}</p>
                        {lastMsg && (
                          <p className="text-xs text-fg-subtle mt-1 truncate max-w-xs">
                            {lastMsg.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-fg-subtle shrink-0">{formatDate(ticket.updatedAt)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
