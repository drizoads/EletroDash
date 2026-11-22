import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  BatteryCharging,
  CircleDollarSign,
  FileText,
  Home,
  LogOut,
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
import { NotificationsMenu, UserMenu } from "./HeaderMenus";
import { QuickSearch } from "./QuickSearch";
import { Toaster, cx } from "./ui";

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
  const { logout } = useAuth();
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
      <div className="border-line border-t px-4 py-3">
        <button
          onClick={logout}
          className="text-muted hover:text-bad hover:bg-bad/8 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors"
        >
          <LogOut className="size-[17px]" strokeWidth={1.6} />
          Sair da conta
        </button>
        <div className="text-faint px-3 pt-2 text-[11px] leading-relaxed">
          Uma plataforma <span className="text-muted">EletroPay</span> · protótipo
        </div>
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

const TABBAR: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: "/", label: "Início", icon: <Home {...ICON} />, end: true },
  { to: "/carregadores", label: "Carregadores", icon: <PlugZap {...ICON} /> },
  { to: "/recargas", label: "Recargas", icon: <BatteryCharging {...ICON} /> },
  { to: "/financeiro", label: "Financeiro", icon: <CircleDollarSign {...ICON} /> },
];

/** Barra de abas fixa no rodapé, só no celular. */
function TabBar({ onMore }: { onMore: () => void }) {
  const { pathname } = useLocation();
  const moreActive = pathname.startsWith("/precos") || pathname.startsWith("/configuracoes");
  const isOn = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
  const item =
    "flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10.5px] font-medium transition-colors";
  return (
    <nav className="bg-surface/85 border-line fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md">
        {TABBAR.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cx(item, isOn(t.to) ? "text-accent" : "text-faint")}
          >
            <span
              className={cx(
                "grid h-7 w-12 place-items-center rounded-full transition-colors duration-300",
                isOn(t.to) && "bg-accent/14",
              )}
            >
              {t.icon}
            </span>
            {t.label}
          </Link>
        ))}
        <button onClick={onMore} className={cx(item, moreActive ? "text-accent" : "text-faint")}>
          <span
            className={cx(
              "grid h-7 w-12 place-items-center rounded-full",
              moreActive && "bg-accent/14",
            )}
          >
            <Menu {...ICON} />
          </span>
          Mais
        </button>
      </div>
    </nav>
  );
}

export function Layout() {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  // Ctrl+K (ou Cmd+K) abre a busca de qualquer tela.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const account = useApi(() => api.getAccount(), []);
  const reloadAccount = account.reload;
  useEffect(() => {
    window.addEventListener("eletrodash:account", reloadAccount);
    return () => window.removeEventListener("eletrodash:account", reloadAccount);
  }, [reloadAccount]);
  const active = useApi(() => api.getActiveSessions(), [], 10_000);
  const workspace = account.data
    ? { name: account.data.operatorName, plan: account.data.plan.name }
    : undefined;
  const owner = account.data?.owner;
  const liveCount = active.data?.length ?? 0;

  const iconBtn =
    "text-muted hover:text-main hover:bg-surface relative grid size-10 place-items-center rounded-full transition-colors sm:size-9";

  return (
    <div className="bg-app min-h-screen">
      <aside className="bg-surface border-line fixed inset-y-0 left-0 hidden w-64 border-r lg:block">
        <Sidebar workspace={workspace} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="slide-in bg-surface border-line absolute inset-y-0 left-0 w-[82%] max-w-80 border-r pb-[env(safe-area-inset-bottom)]">
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
        <header className="bg-app/80 sticky top-0 z-30 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:h-16 sm:px-8">
            <Link to="/" className="lg:hidden">
              <Wordmark className="text-[18px]" />
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

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
              <button
                className="border-line bg-surface text-faint hover:text-muted hidden h-9 w-64 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors md:flex"
                onClick={() => setSearching(true)}
              >
                <Search className="size-4" strokeWidth={1.6} />
                Buscar…
                <kbd className="border-line ml-auto rounded border px-1.5 font-sans text-[10px]">
                  Ctrl K
                </kbd>
              </button>
              <button
                className={cx(iconBtn, "md:hidden")}
                onClick={() => setSearching(true)}
                aria-label="Buscar"
              >
                <Search className="size-[19px]" strokeWidth={1.6} />
              </button>
              <NotificationsMenu className={iconBtn} />
              <button
                onClick={toggle}
                className={cx(iconBtn, "hidden sm:grid")}
                aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
                title={dark ? "Tema claro" : "Tema escuro"}
              >
                {dark ? (
                  <Sun className="size-[18px]" strokeWidth={1.6} />
                ) : (
                  <Moon className="size-[18px]" strokeWidth={1.6} />
                )}
              </button>
              <UserMenu
                name={owner?.name}
                role={owner?.role}
                email={account.data?.users.find((u) => u.role === "Dono")?.email}
              />
            </div>
          </div>
          <div className="via-line h-px bg-gradient-to-r from-transparent to-transparent" />
        </header>
        <main className="mx-auto max-w-[1400px] px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-8 lg:py-10">
          <Outlet />
        </main>
      </div>
      <TabBar onMore={() => setOpen(true)} />
      <QuickSearch open={searching} onClose={() => setSearching(false)} />
      <Toaster />
    </div>
  );
}
