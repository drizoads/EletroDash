import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";
import type { ConnectorStatus, PaymentMethod, SessionStatus } from "../api";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Atraso em cascata para a animação de entrada (`.rise`). */
export const stagger = (i: number, step = 60): CSSProperties => ({
  animationDelay: `${i * step}ms`,
});

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="rise mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <div className="text-faint mb-2 text-[11px] font-medium tracking-[0.14em] uppercase">
            {eyebrow}
          </div>
        )}
        <h1 className="text-main text-[1.85rem] leading-tight font-semibold tracking-[-0.025em]">
          {title}
        </h1>
        {subtitle && <p className="text-muted mt-2.5 max-w-2xl text-sm">{subtitle}</p>}
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
  style,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section
      style={style}
      className={cx("rise bg-surface border-line rounded-2xl border", className)}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4 pb-2 sm:px-5">
          <h2 className="text-main text-sm font-medium">{title}</h2>
          {action}
        </header>
      )}
      <div
        className={cx(
          padded && "px-4 pb-4 sm:px-5 sm:pb-5",
          padded && !title && !action && "pt-4 sm:pt-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Número que "rola" até o valor novo. */
export function AnimatedNumber({
  value,
  format,
  duration = 1100,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      shownRef.current = value;
      return;
    }
    from.current = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from.current + (value - from.current) * easeOutExpo(t);
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(Math.round(shown))}</>;
}

export function DeltaTag({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cx(
        "tabular inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-ok" : "text-bad",
      )}
      title="Comparado ao período anterior"
    >
      <Icon className="size-3.5" />
      {Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  );
}

/** Mini gráfico de linha para os cards. */
export function Sparkline({
  values,
  className,
  color = "var(--accent)",
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  const id = useRef(`spk-${Math.random().toString(36).slice(2)}`).current;
  if (values.length < 2) return <div className={className} />;
  const w = 120;
  const h = 32;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - (v / max) * (h - 4)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x?.toFixed(1)},${y?.toFixed(1)}`).join("");
  const area = `${line}L${w},${h}L0,${h}Z`;
  const last = pts[pts.length - 1] ?? [w, h];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        className="spark-line"
        pathLength={1}
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  format,
  hint,
  delta,
  icon,
  onClick,
  spark,
  featured,
  style,
}: {
  label: string;
  /** Valor numérico (animado) ou undefined enquanto carrega. */
  value: number | undefined;
  format: (n: number) => string;
  hint?: ReactNode;
  delta?: number | null;
  icon?: ReactNode;
  onClick?: () => void;
  spark?: number[];
  featured?: boolean;
  style?: CSSProperties;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      style={style}
      className={cx(
        "rise group bg-surface border-line relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 text-left transition-[border-color,transform] duration-300 sm:p-5",
        onClick && "hover:border-accent/40 cursor-pointer hover:-translate-y-0.5",
        featured && "halo",
      )}
    >
      {featured && (
        <span className="via-accent/60 absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      )}
      <div className="text-muted flex items-center justify-between gap-2 text-[12.5px] sm:text-[13px]">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cx("shrink-0", featured ? "text-accent" : "text-faint")}>{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        {value !== undefined && delta !== undefined && (
          <span className="hidden sm:inline-flex">
            <DeltaTag value={delta} />
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3 sm:mt-3">
        <div className="text-main text-[1.22rem] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap tabular min-[400px]:text-[1.35rem] sm:text-[1.75rem]">
          {value === undefined ? (
            <div className="skeleton h-7 w-36" />
          ) : (
            <AnimatedNumber value={value} format={format} />
          )}
        </div>
        {spark && value !== undefined && (
          <Sparkline
            values={spark}
            className="hidden h-8 w-full max-w-24 min-w-10 opacity-90 sm:block"
          />
        )}
      </div>
      {spark && value !== undefined && (
        <Sparkline values={spark} className="mt-3 h-7 w-full opacity-90 sm:hidden" />
      )}
      <div className="text-faint mt-2.5 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular sm:mt-3 sm:flex-nowrap">
        {value === undefined ? (
          <div className="skeleton h-3 w-28" />
        ) : (
          <>
            {delta !== undefined && (
              <span className="shrink-0 sm:hidden">
                <DeltaTag value={delta} />
              </span>
            )}
            <span className="min-w-0 basis-full text-[11px] leading-snug sm:basis-auto sm:truncate sm:text-xs">
              {hint}
            </span>
          </>
        )}
      </div>
    </Tag>
  );
}

type Tone = "green" | "blue" | "amber" | "red" | "gray" | "violet";
const TONE_VAR: Record<Tone, string> = {
  green: "var(--ok)",
  blue: "var(--info)",
  amber: "var(--warn)",
  red: "var(--bad)",
  gray: "var(--idle)",
  violet: "var(--accent)",
};
/** Cor de cada tom, como valor CSS (serve também para os gráficos). */
export const TONE_HEX = TONE_VAR;

export function Badge({
  tone = "gray",
  children,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  const c = TONE_VAR[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{
        color: c,
        backgroundColor: `color-mix(in oklab, ${c} 13%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${c} 22%, transparent)`,
      }}
    >
      <span
        className={cx("size-1.5 rounded-full", dot && "live-dot")}
        style={{ backgroundColor: c }}
      />
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
    <div className="bg-surface-2 border-line inline-flex max-w-full overflow-x-auto rounded-full border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-200",
            value === o.value
              ? "bg-surface text-main shadow-[0_1px_2px_rgba(0,0,0,.12)]"
              : "text-muted hover:text-main",
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
        className="bg-surface border-line text-main focus:ring-accent/40 h-9 rounded-lg border px-2.5 text-sm outline-none focus:ring-2"
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
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-accent/12 text-accent ring-accent/35 hover:bg-accent/20 ring-1 ring-inset",
        variant === "secondary" && "bg-surface border-line text-main hover:bg-surface-2 border",
        variant === "danger" && "border-bad/30 bg-bad/10 text-bad hover:bg-bad/20 border",
        variant === "ghost" && "text-muted hover:text-main hover:bg-surface-2",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Placeholder animado enquanto os dados chegam. */
export function Loading({ rows = 4, chart }: { rows?: number; chart?: boolean }) {
  if (chart) {
    return (
      <div className="flex h-[260px] items-end gap-2 pt-6" aria-label="Carregando">
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className="skeleton flex-1"
            style={{ height: `${30 + ((i * 37) % 60)}%`, animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3 py-2" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.15 }}>
          <div className="skeleton size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3" style={{ width: `${70 - i * 8}%` }} />
            <div className="skeleton h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="text-faint flex flex-col items-center justify-center gap-2 py-10 text-sm">
      <Inbox className="size-6" strokeWidth={1.5} />
      {children}
    </div>
  );
}

/**
 * Tabela no computador. Com `mobile`, o celular mostra essa lista no lugar
 * (tabela larga no celular vira rolagem lateral, que fica ruim de usar).
 */
export function Table({ children, mobile }: { children: ReactNode; mobile?: ReactNode }) {
  return (
    <>
      {mobile && <div className="divide-line divide-y sm:hidden">{mobile}</div>}
      <div className={cx("-mx-5 overflow-x-auto", mobile ? "hidden sm:block" : "")}>
        <table className="w-full min-w-max text-sm">{children}</table>
      </div>
    </>
  );
}

export function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return (
    <th
      className={cx(
        "text-faint border-line border-b px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] whitespace-nowrap uppercase",
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
        right && "tabular text-right",
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

/* ---------- Formulários ---------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="fade-in absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "pop-in bg-surface border-line relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border shadow-2xl sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div>
            <h2 className="text-main text-lg font-semibold tracking-[-0.01em]">{title}</h2>
            {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-faint hover:text-main hover:bg-surface-2 -mt-1 -mr-2 grid size-8 place-items-center rounded-full"
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-6 sm:px-6">{children}</div>
        {footer && (
          <footer className="border-line flex justify-end gap-2 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-muted text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-faint text-xs">{hint}</span>}
    </label>
  );
}

const INPUT =
  "bg-surface border-line text-main placeholder:text-faint focus:ring-accent/35 focus:border-accent/50 h-10 w-full rounded-xl border px-3 text-sm outline-none transition-shadow focus:ring-4 disabled:opacity-60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(INPUT, props.className)} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(INPUT, "pr-8", props.className)} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
}) {
  const sw = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-300",
        checked ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
  if (!label) return sw;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-main text-sm">{label}</div>
        {description && <div className="text-faint text-xs">{description}</div>}
      </div>
      {sw}
    </div>
  );
}

/* ---------- Avisos rápidos ---------- */

type ToastItem = { id: number; text: string; tone: "ok" | "bad" };
let toastSeq = 0;
const listeners = new Set<(t: ToastItem) => void>();

export function toast(text: string, tone: "ok" | "bad" = "ok") {
  const t = { id: ++toastSeq, text, tone };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const on = (t: ToastItem) => {
      setItems((xs) => [...xs, t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3200);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
      {items.map((t) => (
        <div
          key={t.id}
          className="pop-in bg-surface border-line text-main flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-xl"
        >
          <span className={cx("size-2 rounded-full", t.tone === "ok" ? "bg-ok" : "bg-bad")} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Linha de lista usada no celular no lugar das tabelas. */
export function MobileRow({
  title,
  subtitle,
  right,
  rightSub,
  leading,
  onClick,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  rightSub?: ReactNode;
  leading?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="active:bg-surface-2 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors"
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="text-main truncate text-[14px] font-medium">{title}</div>
        {subtitle && <div className="text-faint mt-0.5 truncate text-xs">{subtitle}</div>}
      </div>
      {(right || rightSub) && (
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {right && <div className="text-main text-sm font-medium tabular">{right}</div>}
          {rightSub}
        </div>
      )}
    </Tag>
  );
}
