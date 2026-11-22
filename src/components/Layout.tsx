import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "../lib/theme";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  BatteryCharging,
  Bell,
  CircleDollarSign,
  FileText,
  Home,
  Menu,
  Moon,
  PlugZap,
  ReceiptText,
  Search,
  Settings,
  Sun,
  Tags,
  X,
} from "lucide-react";
import { api } from "../api";
import { useApi } from "../hooks/useApi";
import { Toaster, cx, toast } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const ICON = { className: "size-[17px]", strokeWidth: 1.6 };

const NAV: { section?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/", label: "Início", icon: <Home {...ICON} />, end: true },
      { to: "/carregadores", label: "Carregadores", icon: <PlugZap {...ICON} /> },
      { to: "/recargas", label: "Recargas", icon: <BatteryCharging {...ICON} /> },
    ],
  },
  {
    section: "Financeiro",
    items: [
      { to: "/financeiro", label: "Resumo", icon: <CircleDollarSign {...ICON} />, end: true },
      { to: "/financeiro/conciliacoes", label: "Conciliações", icon: <ReceiptText {...ICON} /> },
      { to: "/financeiro/faturas", label: "Faturas", icon: <FileText {...ICON} /> },
    ],
  },
  {
    section: "Operação",
    items: [
      { to: "/precos", label: "Preços e regras", icon: <Tags {...ICON} /> },
      { to: "/configuracoes", label: "Configurações", icon: <Settings {...ICON} /> },
    ],
  },
];

/** Marca: só tipografia, com o ponto final no tom de acento. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("text-main text-[19px] leading-none tracking-[-0.035em]", className)}>
      <span className="font-semibold">eletro</span>
      <span className="text-muted font-light">dash</span>
      <span className="text-accent font-semibold">.</span>
    </span>
  );
}

function Workspace({ name, plan }: { name: string; plan: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="border-line bg-surface-2/60 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <div className="ring-accent/50 text-accent bg-surface grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold tracking-wide ring-1">
        {initials}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-main truncate text-sm font-medium">{name}</div>
        <div className="text-faint truncate text-[11px]">Plano {plan}</div>
      </div>
    </div>
  );
}

function Sidebar({
  onNavigate,
  workspace,
}: {
  onNavigate?: () => void;
  workspace?: { name: string; plan: string };
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6 pb-5">
        <Link to="/" onClick={onNavigate}>
          <Wordmark />
        </Link>
      </div>
      <div className="px-4">
        {workspace ? (
          <Workspace {...workspace} />
        ) : (
          <div className="skeleton h-[58px] rounded-xl" />
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        {NAV.map((group, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {group.section && (
              <div className="text-faint px-3 pb-2 text-[10.5px] font-medium tracking-[0.14em] uppercase">
                {group.section}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors duration-200",
                    isActive ? "bg-surface-2 text-main font-medium" : "text-muted hover:text-main",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="bg-accent absolute top-1/2 -left-4 h-5 w-[3px] -translate-y-1/2 rounded-r-full" />
                    )}
                    <span className={isActive ? "text-accent" : ""}>{item.icon}</span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-line text-faint border-t px-6 py-4 text-[11px] leading-relaxed">
        Uma plataforma <span className="text-muted">EletroPay</span>
        <br />
        Protótipo com dados fictícios
      </div>
    </div>
  );
}

const todayLabel = () => {
  const s = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function Layout() {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const account = useApi(() => api.getAccount(), []);
  const reloadAccount = account.reload;
  useEffect(() => {
    window.addEventListener("eletrodash:account", reloadAccount);
    return () => window.removeEventListener("eletrodash:account", reloadAccount);
  }, [reloadAccount]);
  const alerts = useApi(() => api.getAlerts(), [], 15_000);
  const active = useApi(() => api.getActiveSessions(), [], 10_000);
  const workspace = account.data
    ? { name: account.data.operatorName, plan: account.data.plan.name }
    : undefined;
  const owner = account.data?.owner;
  const liveCount = active.data?.length ?? 0;

  return (
    <div className="bg-app min-h-screen">
      <aside className="bg-surface border-line fixed inset-y-0 left-0 hidden w-64 border-r lg:block">
        <Sidebar workspace={workspace} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="rise bg-surface border-line absolute inset-y-0 left-0 w-72 border-r">
            <button
              onClick={() => setOpen(false)}
              className="text-muted absolute top-5 right-4"
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
            <Sidebar workspace={workspace} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="bg-app/75 sticky top-0 z-30 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-8">
            <button
              className="text-muted -ml-1 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <Link to="/" className="lg:hidden">
              <Wordmark className="text-[17px]" />
            </Link>

            <div className="hidden items-center gap-3 lg:flex">
              <span className="text-muted text-[13px]">{todayLabel()}</span>
              <span className="bg-line h-4 w-px" />
              <Link
                to="/recargas?status=charging&periodo=all"
                className="text-muted hover:text-main flex items-center gap-2 text-[13px]"
              >
                <span className="relative flex size-2">
                  <span className="live-ring bg-ok absolute inset-0 rounded-full" />
                  <span className="bg-ok relative size-2 rounded-full" />
                </span>
                Ao vivo
                <span className="text-main tabular font-medium">
                  {liveCount} {liveCount === 1 ? "recarga" : "recargas"} agora
                </span>
              </Link>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                className="border-line bg-surface text-faint hover:text-muted hidden h-9 w-64 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors md:flex"
                onClick={() => toast("Busca rápida chega na próxima versão")}
              >
                <Search className="size-4" strokeWidth={1.6} />
                Buscar…
                <kbd className="border-line ml-auto rounded border px-1.5 font-sans text-[10px]">
                  Ctrl K
                </kbd>
              </button>
              <Link
                to="/"
                className="text-muted hover:text-main hover:bg-surface relative grid size-9 place-items-center rounded-full transition-colors"
                aria-label="Alertas"
                title={`${alerts.data?.length ?? 0} alertas`}
              >
                <Bell className="size-[18px]" strokeWidth={1.6} />
                {!!alerts.data?.length && (
                  <span className="bg-accent ring-app absolute top-1.5 right-1.5 size-2 rounded-full ring-2" />
                )}
              </Link>
              <button
                onClick={toggle}
                className="text-muted hover:text-main hover:bg-surface grid size-9 place-items-center rounded-full transition-colors"
                aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
                title={dark ? "Tema claro" : "Tema escuro"}
              >
                {dark ? (
                  <Sun className="size-[18px]" strokeWidth={1.6} />
                ) : (
                  <Moon className="size-[18px]" strokeWidth={1.6} />
                )}
              </button>
              <div className="ml-1.5 flex items-center gap-2.5">
                <div className="hidden text-right leading-tight sm:block">
                  <div className="text-main text-[13px] font-medium">{owner?.name ?? "…"}</div>
                  <div className="text-faint text-[11px]">{owner?.role ?? ""}</div>
                </div>
                <div className="bg-accent/15 text-accent ring-accent/40 grid size-9 place-items-center rounded-full text-sm font-semibold ring-1">
                  {owner?.name.charAt(0) ?? ""}
                </div>
              </div>
            </div>
          </div>
          <div className="via-line h-px bg-gradient-to-r from-transparent to-transparent" />
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
