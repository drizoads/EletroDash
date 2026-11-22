import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  BatteryCharging,
  CornerDownLeft,
  FileText,
  Palette,
  PlugZap,
  ReceiptText,
  Search,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { api, type Charger, type ChargingSession } from "../api";
import { dateTime, money } from "../lib/format";
import { SessionBadge, cx } from "./ui";

interface Result {
  key: string;
  group: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon: ReactNode;
  right?: ReactNode;
  to: string;
}

const I = { className: "size-4", strokeWidth: 1.6 };

const SHORTCUTS: { title: string; words: string; to: string; icon: ReactNode }[] = [
  {
    title: "Recargas em andamento",
    words: "ativas agora ao vivo carregando",
    to: "/recargas?status=charging&periodo=all",
    icon: <BatteryCharging {...I} />,
  },
  {
    title: "Novo carregador",
    words: "cadastrar adicionar carregador",
    to: "/carregadores",
    icon: <PlugZap {...I} />,
  },
  {
    title: "Conciliações",
    words: "extrato entradas saídas repasse",
    to: "/financeiro/conciliacoes",
    icon: <ReceiptText {...I} />,
  },
  {
    title: "Faturas EletroPay",
    words: "mensalidade fatura plano",
    to: "/financeiro/faturas",
    icon: <FileText {...I} />,
  },
  {
    title: "Preços e regras",
    words: "preço tarifa kwh ociosidade",
    to: "/precos",
    icon: <Tags {...I} />,
  },
  {
    title: "Equipe",
    words: "usuários convidar pessoa perfil",
    to: "/configuracoes?aba=equipe",
    icon: <Users {...I} />,
  },
  {
    title: "Tema e cores",
    words: "aparência roxo azul verde escuro claro",
    to: "/configuracoes?aba=aparencia",
    icon: <Palette {...I} />,
  },
  {
    title: "Configurações da empresa",
    words: "empresa cnpj endereço whatsapp",
    to: "/configuracoes",
    icon: <Settings {...I} />,
  },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca rápida: carregadores, recargas (ID, telefone ou tag) e atalhos do painel. */
export function QuickSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    void api.listChargers().then(setChargers);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSessions([]);
      return;
    }
    const t = setTimeout(() => {
      void api
        .listSessions({ search: term }, { offset: 0, limit: 5 })
        .then((p) => setSessions(p.items));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo<Result[]>(() => {
    const term = norm(q.trim());
    const out: Result[] = [];
    const ch = chargers.filter(
      (c) => !term || norm(`${c.name} ${c.code} ${c.location} ${c.ocppId}`).includes(term),
    );
    for (const c of ch.slice(0, term ? 5 : 3)) {
      out.push({
        key: c.id,
        group: "Carregadores",
        title: c.name,
        subtitle: `${c.code} · ${c.location}`,
        icon: <PlugZap {...I} />,
        to: `/carregadores/${c.id}`,
      });
    }
    if (term) {
      for (const s of sessions) {
        out.push({
          key: s.id,
          group: "Recargas",
          title: `${s.chargerName} · ${money(s.grossCents)}`,
          subtitle: `${dateTime(s.startAt)} · ${s.driverLabel}`,
          icon: <BatteryCharging {...I} />,
          right: <SessionBadge status={s.status} />,
          to: `/recargas/${s.id}`,
        });
      }
    }
    for (const sc of SHORTCUTS.filter(
      (x) => !term || norm(`${x.title} ${x.words}`).includes(term),
    ).slice(0, term ? 4 : 5)) {
      out.push({
        key: sc.to + sc.title,
        group: "Atalhos",
        title: sc.title,
        icon: sc.icon,
        to: sc.to,
      });
    }
    return out;
  }, [q, chargers, sessions]);

  useEffect(() => setSel(0), [q]);

  function go(r: Result | undefined) {
    if (!r) return;
    onClose();
    navigate(r.to);
  }

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:p-6 sm:pt-[12vh]">
      <div className="fade-in absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="pop-in bg-surface border-line relative flex h-full w-full flex-col overflow-hidden border-b shadow-2xl sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-3xl sm:border"
      >
        <div className="border-line flex items-center gap-3 border-b px-4 pt-[max(env(safe-area-inset-top),0px)] sm:px-5">
          <Search className="text-faint size-5 shrink-0" strokeWidth={1.6} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                go(results[sel]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Carregador, recarga, telefone ou tag…"
            className="text-main placeholder:text-faint h-14 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button
            onClick={onClose}
            className="text-muted hover:text-main text-sm font-medium sm:hidden"
          >
            Cancelar
          </button>
          <kbd className="border-line text-faint hidden rounded border px-1.5 py-0.5 text-[10px] sm:block">
            Esc
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-faint px-4 py-10 text-center text-sm">
              Nada encontrado para “{q}”.
            </div>
          ) : (
            results.map((r, i) => {
              const header = r.group !== lastGroup;
              lastGroup = r.group;
              return (
                <div key={r.key}>
                  {header && (
                    <div className="text-faint px-3 pt-3 pb-1.5 text-[10.5px] font-medium tracking-[0.12em] uppercase">
                      {r.group}
                    </div>
                  )}
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(r)}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      i === sel ? "bg-surface-2" : "",
                    )}
                  >
                    <span
                      className={cx(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        i === sel ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted",
                      )}
                    >
                      {r.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-main block truncate text-sm">{r.title}</span>
                      {r.subtitle && (
                        <span className="text-faint block truncate text-xs">{r.subtitle}</span>
                      )}
                    </span>
                    {r.right}
                    {i === sel ? (
                      <CornerDownLeft className="text-faint hidden size-4 sm:block" />
                    ) : (
                      <ArrowRight className="text-faint size-4 opacity-0" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="border-line text-faint hidden gap-4 border-t px-5 py-2.5 text-[11px] sm:flex">
          <span>↑↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc fechar</span>
        </div>
      </div>
    </div>
  );
}
