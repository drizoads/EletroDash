import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import {
  BadgeDollarSign,
  BatteryCharging,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  PlugZap,
  ReceiptText,
  Settings,
  Sun,
  Tags,
  X,
  Zap,
} from "lucide-react";
import { cx } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV: { section?: string; items: NavItem[] }[] = [
  {
    items: [
      {
        to: "/",
        label: "Visão geral",
        icon: <LayoutDashboard className="size-4" />,
        end: true,
      },
      { to: "/carregadores", label: "Carregadores", icon: <PlugZap className="size-4" /> },
      { to: "/recargas", label: "Recargas", icon: <BatteryCharging className="size-4" /> },
    ],
  },
  {
    section: "Financeiro",
    items: [
      {
        to: "/financeiro",
        label: "Resumo",
        icon: <BadgeDollarSign className="size-4" />,
        end: true,
      },
      {
        to: "/financeiro/conciliacoes",
        label: "Conciliações",
        icon: <ReceiptText className="size-4" />,
      },
      {
        to: "/financeiro/faturas",
        label: "Faturas EletroPay",
        icon: <FileText className="size-4" />,
      },
    ],
  },
  {
    section: "Operação",
    items: [
      { to: "/precos", label: "Preços e regras", icon: <Tags className="size-4" /> },
      { to: "/configuracoes", label: "Configurações", icon: <Settings className="size-4" /> },
    ],
  },
];

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("eletrodash-theme") !== "light";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("eletrodash-theme", dark ? "dark" : "light");
    } catch {
      /* armazenamento indisponível: segue sem lembrar */
    }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {NAV.map((group, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {group.section && (
            <div className="text-faint px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-500/12 text-brand-700 dark:text-brand-300"
                    : "text-muted hover:text-main hover:bg-surface-2",
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-brand-500/15 text-brand-500 grid size-8 place-items-center rounded-lg">
        <Zap className="size-4.5" fill="currentColor" />
      </div>
      <div className="leading-tight">
        <div className="text-main text-sm font-semibold">EletroDash</div>
        <div className="text-faint text-[11px]">Painel de gestão</div>
      </div>
    </div>
  );
}

export function Layout() {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="bg-app min-h-screen">
      {/* Menu lateral fixo (telas grandes) */}
      <aside className="bg-surface border-line fixed inset-y-0 left-0 hidden w-60 flex-col border-r lg:flex">
        <div className="border-line flex h-16 items-center border-b px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
        <div className="border-line text-faint border-t px-5 py-3 text-[11px]">
          Conectado ao EletroPay · <span className="text-amber-500">dados de exemplo</span>
        </div>
      </aside>

      {/* Menu lateral em gaveta (celular) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="bg-surface border-line absolute inset-y-0 left-0 w-64 border-r">
            <div className="border-line flex h-16 items-center justify-between border-b px-5">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                className="text-muted"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="bg-app/80 border-line sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
          <button
            className="text-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-amber-500/25 ring-inset sm:inline dark:text-amber-300">
              Protótipo · dados fictícios
            </span>
            <button
              onClick={toggle}
              className="text-muted hover:text-main hover:bg-surface-2 grid size-9 place-items-center rounded-lg"
              aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
              title={dark ? "Tema claro" : "Tema escuro"}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="border-line bg-surface flex items-center gap-2 rounded-lg border py-1 pr-2 pl-1">
              <div className="bg-brand-600 grid size-7 place-items-center rounded-md text-xs font-semibold text-white">
                EE
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-main text-xs font-medium">Eletroposto Exemplo</div>
                <div className="text-faint text-[11px]">Dono</div>
              </div>
              <ChevronDown className="text-faint size-3.5" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
