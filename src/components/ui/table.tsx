import { cn } from "@/lib/utils";

export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("scroll-thin w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />;
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-slate-50/80", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-slate-100", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-slate-100 last:border-0", className)} {...props} />;
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle text-slate-700", className)} {...props} />;
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const link =
    "inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50";
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-3 text-xs text-slate-500">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <a className={link} href={buildHref(prev)}>
            Anterior
          </a>
        ) : (
          <span className={cn(link, "pointer-events-none opacity-40")}>Anterior</span>
        )}
        {page < totalPages ? (
          <a className={link} href={buildHref(next)}>
            Siguiente
          </a>
        ) : (
          <span className={cn(link, "pointer-events-none opacity-40")}>Siguiente</span>
        )}
      </div>
    </div>
  );
}
