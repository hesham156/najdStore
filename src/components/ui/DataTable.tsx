"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, X } from "lucide-react";
import { EmptyState, ErrorState } from "./States";
import { Button } from "./Button";

/* ═══════════════════════════════════════════════════════════
   DataTable
   • sticky header, sortable columns, row selection + bulk bar
   • collapses to stacked cards on small screens
   • first-class loading / empty / error states
   ═══════════════════════════════════════════════════════════ */

export interface Column<T> {
  key: string;
  title: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  /** Header alignment + cell alignment hint. */
  align?: "start" | "center" | "end";
  /** Hide below `lg` — use for secondary data that fits in the card view. */
  hideOnMobile?: boolean;
  /** Renders as the card title on small screens. */
  primary?: boolean;
  /** Keeps the column out of the stacked card view (e.g. the actions column). */
  cardHidden?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Full custom empty state — takes precedence over `emptyMessage`. */
  empty?: React.ReactNode;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  /** Enables checkboxes + the bulk action bar. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: React.ReactNode;
  /** Called when a row body (not an interactive child) is clicked. */
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
  /** Sticks the header while the page scrolls. */
  stickyHeader?: boolean;
  /** Rows rendered by the loading skeleton. */
  skeletonRows?: number;
}

const alignClass = (align?: Column<unknown>["align"]) =>
  align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start";

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyMessage = "لا توجد بيانات",
  empty,
  onSort,
  sortKey,
  sortDirection,
  selectable,
  selectedIds = [],
  onSelectionChange,
  bulkActions,
  onRowClick,
  rowClassName,
  className,
  stickyHeader = true,
  skeletonRows = 6,
}: DataTableProps<T>) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = data.length > 0 && data.every((r) => selectedSet.has(r.id));
  const someSelected = !allSelected && data.some((r) => selectedSet.has(r.id));

  const toggleAll = () => onSelectionChange?.(allSelected ? [] : data.map((r) => r.id));
  const toggleRow = (id: string) =>
    onSelectionChange?.(selectedSet.has(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key, sortKey === key && sortDirection === "asc" ? "desc" : "asc");
  };

  const cellValue = (row: T, col: Column<T>) =>
    col.render ? col.render((row as Record<string, unknown>)[col.key], row) : String((row as Record<string, unknown>)[col.key] ?? "");

  const colSpan = columns.length + (selectable ? 1 : 0);

  /* ── Non-row states occupy the whole table body ── */
  const bodyState = error ? (
    <tr>
      <td colSpan={colSpan}>
        <ErrorState onRetry={onRetry} size="sm" />
      </td>
    </tr>
  ) : loading ? (
    Array.from({ length: skeletonRows }).map((_, i) => (
      <tr key={`sk-${i}`} className="border-t border-line">
        {selectable && (
          <td className="px-4 py-3.5">
            <div className="skeleton h-4 w-4 rounded" />
          </td>
        )}
        {columns.map((col, j) => (
          <td key={col.key} className={cn("px-4 py-3.5", col.hideOnMobile && "hidden lg:table-cell")}>
            <div className="skeleton h-4" style={{ width: j === 0 ? "70%" : `${40 + ((i * 7 + j * 13) % 40)}%` }} />
          </td>
        ))}
      </tr>
    ))
  ) : data.length === 0 ? (
    <tr>
      <td colSpan={colSpan}>{empty ?? <EmptyState size="sm" title={emptyMessage} />}</td>
    </tr>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      {/* Bulk action bar replaces the toolbar while rows are selected */}
      {selectable && selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-control border border-primary-200 bg-primary-50 px-4 py-2.5 dark:border-primary-500/25 dark:bg-primary-500/10 animate-fade-in">
          <span className="text-[13px] font-semibold text-primary-800 dark:text-primary-200">
            تم تحديد {selectedIds.length} عنصر
          </span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions}</div>
          <button
            type="button"
            onClick={() => onSelectionChange?.([])}
            className="ms-auto inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            إلغاء التحديد
          </button>
        </div>
      )}

      {/* ── Table (md and up) ── */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr className={cn("bg-surface-muted", stickyHeader && "sticky top-[var(--header-h)] z-10")}>
              {selectable && (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="تحديد كل الصفوف"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-line-strong bg-surface text-primary-600"
                  />
                </th>
              )}
              {columns.map((col) => {
                const sorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={sorted ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "whitespace-nowrap border-b border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-fg-muted",
                      alignClass(col.align),
                      col.hideOnMobile && "hidden lg:table-cell",
                      col.className
                    )}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded transition-colors hover:text-fg",
                          sorted && "text-fg"
                        )}
                      >
                        {col.title}
                        {sorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5 text-primary-600" aria-hidden />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-primary-600" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      col.title
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {bodyState ??
              data.map((row) => {
                const selected = selectedSet.has(row.id);
                return (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-t border-line transition-colors",
                      selected ? "bg-primary-50/60 dark:bg-primary-500/10" : "hover:bg-surface-hover",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row)
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="تحديد الصف"
                          checked={selected}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 cursor-pointer rounded border-line-strong bg-surface text-primary-600"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 align-middle text-fg",
                          alignClass(col.align),
                          col.hideOnMobile && "hidden lg:table-cell",
                          col.className
                        )}
                      >
                        {cellValue(row, col)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ── Stacked cards (below md) ── */}
      <div className="space-y-2.5 md:hidden">
        {error ? (
          <div className="rounded-card border border-line bg-surface">
            <ErrorState onRetry={onRetry} size="sm" />
          </div>
        ) : loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`mk-${i}`} className="space-y-2.5 rounded-card border border-line bg-surface p-4">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="rounded-card border border-line bg-surface">
            {empty ?? <EmptyState size="sm" title={emptyMessage} />}
          </div>
        ) : (
          data.map((row) => {
            const primaryCol = columns.find((c) => c.primary) ?? columns[0];
            const rest = columns.filter((c) => c !== primaryCol && !c.cardHidden);
            const actionCol = columns.find((c) => c.cardHidden);
            const selected = selectedSet.has(row.id);
            return (
              <div
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "rounded-card border bg-surface p-4 shadow-card transition-colors",
                  selected ? "border-primary-300 bg-primary-50/50 dark:border-primary-500/40 dark:bg-primary-500/10" : "border-line",
                  onRowClick && "cursor-pointer active:bg-surface-hover"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    {selectable && (
                      <input
                        type="checkbox"
                        aria-label="تحديد العنصر"
                        checked={selected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleRow(row.id)}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong bg-surface text-primary-600"
                      />
                    )}
                    <div className="min-w-0 flex-1">{cellValue(row, primaryCol)}</div>
                  </div>
                  {actionCol && (
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {cellValue(row, actionCol)}
                    </div>
                  )}
                </div>
                {rest.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
                    {rest.map((col) => (
                      <div key={col.key} className="min-w-0">
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">{col.title}</dt>
                        <dd className="mt-0.5 truncate text-[13px] text-fg">{cellValue(row, col)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Pagination
   ═══════════════════════════════════════════════════════════ */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
  showGoTo?: boolean;
  showTotalItems?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showGoTo = true,
  showTotalItems = true,
}: PaginationProps) {
  const [goToValue, setGoToValue] = useState("");

  if (totalPages <= 0) return null;

  const visiblePages = ((): (number | "…")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (currentPage > 3) pages.push("…");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  })();

  const from = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const to = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  const handleGoTo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const page = parseInt(goToValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setGoToValue("");
    }
  };

  const navBtn =
    "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg disabled:pointer-events-none disabled:opacity-35";

  return (
    <nav
      aria-label="ترقيم الصفحات"
      className="mt-3 flex select-none flex-wrap items-center justify-between gap-3 px-0.5"
    >
      {showTotalItems && totalItems !== undefined && (
        <p className="text-xs text-fg-muted">
          {totalItems > 0 ? (
            <>
              عرض <span className="font-semibold tnum text-fg">{from}</span>–
              <span className="font-semibold tnum text-fg">{to}</span> من{" "}
              <span className="font-semibold tnum text-fg">{totalItems}</span>
            </>
          ) : (
            "لا توجد عناصر"
          )}
        </p>
      )}

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={navBtn}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
          <span className="hidden sm:inline">السابق</span>
        </button>

        {visiblePages.map((page, idx) =>
          page === "…" ? (
            <span key={`gap-${idx}`} className="px-1.5 text-sm text-fg-subtle" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "h-8 min-w-8 rounded-lg px-2 text-[13px] font-semibold tnum transition-colors",
                page === currentPage
                  ? "bg-primary-600 text-white"
                  : "text-fg-muted hover:bg-surface-hover hover:text-fg"
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={navBtn}
          aria-label="الصفحة التالية"
        >
          <span className="hidden sm:inline">التالي</span>
          <ChevronLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {showGoTo && totalPages > 1 && (
          <div className="hidden items-center gap-1.5 text-xs text-fg-muted sm:flex">
            <label htmlFor="goto-page" className="whitespace-nowrap">
              اذهب إلى
            </label>
            <input
              id="goto-page"
              type="number"
              min={1}
              max={totalPages}
              value={goToValue}
              onChange={(e) => setGoToValue(e.target.value)}
              onKeyDown={handleGoTo}
              placeholder="#"
              className={cn(
                "h-8 w-14 rounded-lg border border-line bg-surface px-2 text-center text-[13px] font-medium text-fg",
                "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30",
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              )}
            />
          </div>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <>
            <label htmlFor="page-size" className="sr-only">
              عدد العناصر في الصفحة
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className={cn(
                "h-8 cursor-pointer rounded-lg border border-line bg-surface px-2 text-xs font-medium text-fg-muted",
                "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              )}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / صفحة
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </nav>
  );
}

/** Backwards-compatible export — the table now renders its own skeleton. */
export { EmptyState } from "./States";
