import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
  /** Removes the drop shadow — for cards nested inside another surface. */
  flat?: boolean;
}

const PADDINGS = { none: "", sm: "p-4", md: "p-5", lg: "p-6" } as const;

export function Card({ children, className, hover, glass, flat, padding = "md", ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface text-fg",
        !flat && "shadow-card",
        hover && "transition-shadow duration-200 hover:shadow-card-hover cursor-pointer",
        glass && "bg-surface/80 backdrop-blur-sm",
        PADDINGS[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0 space-y-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-bold leading-tight text-fg", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs text-fg-muted", className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 border-t border-line px-5 py-3", className)}>{children}</div>
  );
}

/* ── Section: a titled block used to break long pages/forms apart ── */
export function Section({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card padding="none" className={className}>
      {(title || action) && (
        <CardHeader action={action}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn(!title && "pt-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/* ── StatsCard: legacy KPI card kept for compatibility (see StatCard) ── */
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: { value: number; label: string };
  color?: "primary" | "green" | "blue" | "orange" | "red" | "purple";
}

const STAT_COLORS = {
  primary: "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
} as const;

export function StatsCard({ title, value, icon, change, color = "primary" }: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium text-fg-muted">{title}</p>
          <p className="truncate text-2xl font-bold tnum text-fg">{value}</p>
          {change && (
            <p className={cn("mt-1 text-xs", change.value >= 0 ? "text-emerald-600" : "text-red-600")}>
              {change.value >= 0 ? "+" : ""}
              {change.value}% {change.label}
            </p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5", STAT_COLORS[color])}>{icon}</div>
      </div>
    </Card>
  );
}
