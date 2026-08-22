import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Trailing element next to the title — a status badge, for example. */
  badge?: React.ReactNode;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The single page header used across every admin screen so titles,
 * breadcrumbs and primary actions always sit in the same place.
 */
export function PageHeader({ title, description, badge, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="مسار التنقل">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-fg-muted">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {crumb.href && !last ? (
                    <Link href={crumb.href} className="rounded transition-colors hover:text-primary-600">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn(last && "font-medium text-fg")} aria-current={last ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                  {!last && <ChevronLeft className="h-3.5 w-3.5 text-fg-subtle rtl:rotate-0 ltr:rotate-180" aria-hidden />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-fg sm:text-[1.375rem]">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-[13px] text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
