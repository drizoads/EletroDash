import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertTriangle,
  BatteryCharging,
  Bell,
  CheckCheck,
  FileText,
  Landmark,
  LogOut,
  Moon,
  Palette,
  PlugZap,
  Settings,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  Unplug,
} from "lucide-react";
import { api, type Notice, type NoticeKind } from "../api";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../lib/auth";
import { since } from "../lib/format";
import { useTheme } from "../lib/theme";
import { cx } from "./ui";

/** Fecha ao clicar fora ou apertar Esc. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/** Painel que abre embaixo do botão; no celular ocupa a largura da tela. */
function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "pop-in bg-surface border-line fixed inset-x-3 top-[calc(3.75rem+env(safe-area-inset-top))] z-50 overflow-hidden rounded-2xl border shadow-2xl sm:absolute sm:inset-x-auto sm:top-12 sm:right-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

const KIND: Record<NoticeKind, { icon: ReactNode; color: string }> = {
  faulted: { icon: <AlertTriangle className="size-4" strokeWidth={1.7} />, color: "var(--bad)" },
  offline: { icon: <Unplug className="size-4" strokeWidth={1.7} />, color: "var(--idle)" },
  idle: { icon: <PlugZap className="size-4" strokeWidth={1.7} />, color: "var(--warn)" },
  session: {
    icon: <BatteryCharging className="size-4" strokeWidth={1.7} />,
    color: "var(--ok)",
  },
  payout: { icon: <Landmark className="size-4" strokeWidth={1.7} />, color: "var(--accent)" },
  invoice: { icon: <FileText className="size-4" strokeWidth={1.7} />, color: "var(--accent)" },
  summary: { icon: <TrendingUp className="size-4" strokeWidth={1.7} />, color: "var(--info)" },
};

export function NotificationsMenu({ className }: { className?: string }) {
  const { open, setOpen, ref } = usePopover();
  const navigate = useNavigate();
  const notices = useApi(() => api.listNotices(), [], 20_000);
  const [readLocal, setReadLocal] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"all" | "unread">("all");

  const list = (notices.data ?? []).map((n) => (readLocal.has(n.id) ? { ...n, read: true } : n));
  const unread = list.filter((n) => !n.read);
  const shown = tab === "unread" ? unread : list;

  function markAll() {
    const ids = unread.map((n) => n.id);
    setReadLocal((s) => new Set([...s, ...ids]));
    void api.markNoticesRead(ids);
  }

  function openNotice(n: Notice) {
    setReadLocal((s) => new Set([...s, n.id]));
    void api.markNoticesRead([n.id]);
    setOpen(false);
    navigate(n.to);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cx(className, open && "bg-surface text-main")}
        aria-label={`Notificações${unread.length ? `, ${unread.length} novas` : ""}`}
        aria-expanded={open}
      >
        <Bell className="size-[19px]" strokeWidth={1.6} />
        {unread.length > 0 && (
          <span className="bg-accent ring-app absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px] font-semibold text-white ring-2">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {open && (
        <Panel className="sm:w-[380px]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="text-main text-[15px] font-semibold">Notificações</div>
            {unread.length > 0 && (
              <button
                onClick={markAll}
                className="text-accent flex items-center gap-1.5 text-xs font-medium"
              >
                <CheckCheck className="size-3.5" /> Marcar como lidas
              </button>
            )}
          </div>
          <div className="flex gap-1 px-4 pb-2">
            {(
              [
                ["all", "Todas"],
                ["unread", `Não lidas${unread.length ? ` (${unread.length})` : ""}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cx(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  tab === k ? "bg-surface-2 text-main" : "text-faint hover:text-main",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[min(60vh,440px)] overflow-y-auto px-2 pb-2">
            {!notices.data ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-12" />
                ))}
              </div>
            ) : shown.length === 0 ? (
              <div className="text-faint flex flex-col items-center gap-2 py-10 text-sm">
                <CheckCheck className="size-6" strokeWidth={1.5} />
                Tudo em dia por aqui.
              </div>
            ) : (
              shown.map((n) => {
                const k = KIND[n.kind];
                return (
                  <button
                    key={n.id}
                    onClick={() => openNotice(n)}
                    className="hover:bg-surface-2 active:bg-surface-2 flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-full"
                      style={{
                        color: k.color,
                        background: `color-mix(in oklab, ${k.color} 13%, transparent)`,
                      }}
                    >
                      {k.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cx(
                          "block text-[13.5px] leading-snug",
                          n.read ? "text-muted" : "text-main font-medium",
                        )}
                      >
                        {n.title}
                      </span>
                      <span className="text-faint block truncate text-xs">{n.detail}</span>
                      <span className="text-faint mt-0.5 block text-[11px]">{since(n.at)}</span>
                    </span>
                    {!n.read && <span className="bg-accent mt-1.5 size-2 shrink-0 rounded-full" />}
                  </button>
                );
              })
            )}
          </div>
          <Link
            to="/configuracoes?aba=notificacoes"
            onClick={() => setOpen(false)}
            className="border-line text-muted hover:text-main flex items-center justify-center gap-2 border-t px-4 py-3 text-xs font-medium"
          >
            <SlidersHorizontal className="size-3.5" /> Preferências de notificação
          </Link>
        </Panel>
      )}
    </div>
  );
}

export function UserMenu({ name, role, email }: { name?: string; role?: string; email?: string }) {
  const { open, setOpen, ref } = usePopover();
  const { dark, toggle } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const item =
    "text-main hover:bg-surface-2 active:bg-surface-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors";

  return (
    <div ref={ref} className="relative ml-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full"
        aria-label="Menu da conta"
        aria-expanded={open}
      >
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-main text-[13px] font-medium">{name ?? "…"}</div>
          <div className="text-faint text-[11px]">{role ?? ""}</div>
        </div>
        <div
          className={cx(
            "bg-accent/15 text-accent ring-accent/40 grid size-9 place-items-center rounded-full text-sm font-semibold ring-1 transition-shadow",
            open && "ring-accent/30 ring-4",
          )}
        >
          {name?.charAt(0) ?? ""}
        </div>
      </button>
      {open && (
        <Panel className="sm:w-64">
          <div className="border-line flex items-center gap-3 border-b px-4 py-4">
            <div className="bg-accent/15 text-accent grid size-10 place-items-center rounded-full font-semibold">
              {name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-main truncate text-sm font-medium">{name}</div>
              <div className="text-faint truncate text-xs">{email}</div>
            </div>
          </div>
          <div className="p-1.5">
            <button className={item} onClick={() => go("/configuracoes")}>
              <Settings className="text-muted size-4" strokeWidth={1.6} /> Configurações
            </button>
            <button className={item} onClick={() => go("/configuracoes?aba=aparencia")}>
              <Palette className="text-muted size-4" strokeWidth={1.6} /> Tema e cores
            </button>
            <button className={item} onClick={toggle}>
              {dark ? (
                <Sun className="text-muted size-4" strokeWidth={1.6} />
              ) : (
                <Moon className="text-muted size-4" strokeWidth={1.6} />
              )}
              {dark ? "Usar tema claro" : "Usar tema escuro"}
            </button>
          </div>
          <div className="border-line border-t p-1.5">
            <button
              className={cx(
                item.replace("text-main ", ""),
                "text-bad hover:bg-bad/10 active:bg-bad/10",
              )}
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="size-4" strokeWidth={1.6} /> Sair da conta
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
