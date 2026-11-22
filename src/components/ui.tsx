import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Inbox, Loader2 } from "lucide-react";
import type { ConnectorStatus, PaymentMethod, SessionStatus } from "../api";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-main text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cx("bg-surface border-line rounded-2xl border", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 className="text-main text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={cx(padded && "px-5 pb-5", padded && !title && !action && "pt-5")}>
        {children}
      </div>
    </section>
  );
}

export function DeltaTag({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular",
        up
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
      title="Comparado ao período anterior"
    >
      <Icon className="size-3" />
      {Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: number | null;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cx(
        "bg-surface border-line flex flex-col gap-2 rounded-2xl border p-5 text-left",
        onClick && "hover:border-brand-500/50 transition-colors",
      )}
    >
      <div className="text-muted flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        {delta !== undefined && <DeltaTag value={delta} />}
      </div>
      <div className="text-main text-2xl font-semibold tracking-tight tabular">{value}</div>
      {hint && <div className="text-faint text-xs tabular">{hint}</div>}
    </Tag>
  );
}

type Tone = "green" | "blue" | "amber" | "red" | "gray" | "violet";
const TONE: Record<Tone, string> = {
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  blue: "bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-500/25",
  amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  red: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25",
  gray: "bg-slate-500/12 text-slate-600 dark:text-slate-300 ring-slate-500/25",
  violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/25",
};
export const TONE_HEX: Record<Tone, string> = {
  green: "#10b981",
  blue: "#0ea5e9",
  amber: "#f59e0b",
  red: "#f43f5e",
  gray: "#64748b",
  violet: "#8b5cf6",
};

export function Badge({
  tone = "gray",
  children,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE[tone],
      )}
    >
      {dot && (
        <span
          className="live-dot size-1.5 rounded-full"
          style={{ backgroundColor: TONE_HEX[tone] }}
        />
      )}
      {children}
    </span>
  );
}

export const CONNECTOR_STATUS: Record<ConnectorStatus, { label: string; tone: Tone }> = {
  available: { label: "Disponível", tone: "green" },
  charging: { label: "Carregando", tone: "blue" },
  occupied: { label: "Ocupado", tone: "amber" },
  faulted: { label: "Em falha", tone: "red" },
  offline: { label: "Offline", tone: "gray" },
};

export function ConnectorBadge({ status }: { status: ConnectorStatus }) {
  const s = CONNECTOR_STATUS[status];
  return (
    <Badge tone={s.tone} dot={status === "charging"}>
      {s.label}
    </Badge>
  );
}

export const SESSION_STATUS: Record<SessionStatus, { label: string; tone: Tone }> = {
  starting: { label: "Iniciando", tone: "violet" },
  charging: { label: "Em andamento", tone: "blue" },
  completed: { label: "Concluída", tone: "green" },
  failed: { label: "Falhou", tone: "red" },
  cancelled: { label: "Cancelada", tone: "gray" },
  refunded: { label: "Estornada", tone: "amber" },
};

export function SessionBadge({ status }: { status: SessionStatus }) {
  const s = SESSION_STATUS[status];
  return (
    <Badge tone={s.tone} dot={status === "charging"}>
      {s.label}
    </Badge>
  );
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão",
  tag: "Tag",
  free: "Gratuita",
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="bg-surface-2 border-line inline-flex max-w-full overflow-x-auto rounded-xl border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-[10px] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            value === o.value ? "bg-surface text-main shadow-sm" : "text-muted hover:text-main",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-faint text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border-line text-main focus:ring-brand-500/40 h-9 rounded-lg border px-2.5 text-sm outline-none focus:ring-2"
      >
        {children}
      </select>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand-600 hover:bg-brand-700 text-white",
        variant === "secondary" && "bg-surface border-line text-main hover:bg-surface-2 border",
        variant === "danger" &&
          "border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-300",
        variant === "ghost" && "text-muted hover:text-main hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="text-muted flex items-center justify-center gap-2 py-12 text-sm">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="text-faint flex flex-col items-center justify-center gap-2 py-10 text-sm">
      <Inbox className="size-6" />
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-max text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return (
    <th
      className={cx(
        "text-faint border-line border-b px-5 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap uppercase first:pl-5",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  muted,
  className,
}: {
  children?: ReactNode;
  right?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cx(
        "border-line border-b px-5 py-3 whitespace-nowrap",
        right && "text-right tabular",
        muted ? "text-muted" : "text-main",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Pagination({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  const end = Math.min(total, offset + limit);
  return (
    <div className="text-muted flex items-center justify-between pt-4 text-sm">
      <span className="tabular">
        {total === 0 ? "0" : `${offset + 1}–${end}`} de {total.toLocaleString("pt-BR")}
      </span>
      <div className="flex gap-2">
        <Button disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          Anterior
        </Button>
        <Button disabled={end >= total} onClick={() => onChange(offset + limit)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5">
          <dt className="text-faint text-xs">{k}</dt>
          <dd className="text-main text-sm tabular">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
