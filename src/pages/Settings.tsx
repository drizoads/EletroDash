import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Bell,
  Building2,
  Check,
  Landmark,
  Laptop,
  Loader2,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  api,
  type Account,
  type AccountPatch,
  type NotificationEvent,
  type NotificationPrefs,
  type TeamRole,
} from "../api";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  KeyValue,
  Loading,
  Modal,
  PageHeader,
  SelectInput,
  Table,
  Td,
  Th,
  Toggle,
  cx,
  stagger,
  toast,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { money } from "../lib/format";
import { ACCENTS, useTheme, type AccentName, type ThemeMode } from "../lib/theme";

type TabKey = "empresa" | "recebimento" | "equipe" | "notificacoes" | "aparencia";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "empresa", label: "Empresa", icon: <Building2 className="size-4" strokeWidth={1.6} /> },
  {
    key: "recebimento",
    label: "Recebimento e plano",
    icon: <Landmark className="size-4" strokeWidth={1.6} />,
  },
  { key: "equipe", label: "Equipe", icon: <Users className="size-4" strokeWidth={1.6} /> },
  {
    key: "notificacoes",
    label: "Notificações",
    icon: <Bell className="size-4" strokeWidth={1.6} />,
  },
  { key: "aparencia", label: "Aparência", icon: <Palette className="size-4" strokeWidth={1.6} /> },
];

/** Avisa o header de que os dados da conta mudaram. */
const announceAccount = () => window.dispatchEvent(new Event("eletrodash:account"));

/* ---------------- Empresa ---------------- */

function CompanyTab({ account, onSaved }: { account: Account; onSaved: () => void }) {
  const initial: Required<AccountPatch> = {
    operatorName: account.operatorName,
    legalName: account.legalName,
    contactEmail: account.contactEmail,
    supportWhatsapp: account.supportWhatsapp,
    address: account.address,
    city: account.city,
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = (Object.keys(initial) as (keyof AccountPatch)[]).some(
    (k) => form[k] !== initial[k],
  );
  const valid = form.operatorName.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.contactEmail);
  const set = (k: keyof AccountPatch) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    try {
      await api.updateAccount(form);
      toast("Dados da empresa salvos");
      announceAccount();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Dados da empresa">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome do posto" hint="Aparece no painel e no WhatsApp do motorista.">
          <Input value={form.operatorName} onChange={set("operatorName")} />
        </Field>
        <Field label="Razão social">
          <Input value={form.legalName} onChange={set("legalName")} />
        </Field>
        <Field label="CNPJ" hint="Para alterar o CNPJ, fale com o suporte EletroPay.">
          <Input value={account.cnpjMasked} disabled />
        </Field>
        <Field label="E-mail de contato">
          <Input type="email" value={form.contactEmail} onChange={set("contactEmail")} />
        </Field>
        <Field label="WhatsApp de atendimento" hint="Para onde o motorista é enviado se precisar.">
          <Input value={form.supportWhatsapp} onChange={set("supportWhatsapp")} />
        </Field>
        <Field label="Cidade">
          <Input value={form.city} onChange={set("city")} />
        </Field>
        <Field label="Endereço principal" className="sm:col-span-2">
          <Input value={form.address} onChange={set("address")} />
        </Field>
      </div>
      <div className="mt-6 flex items-center justify-end gap-2">
        {dirty && (
          <Button variant="ghost" onClick={() => setForm(initial)}>
            Descartar
          </Button>
        )}
        <Button variant="primary" disabled={!dirty || !valid || saving} onClick={save}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Recebimento e plano ---------------- */

const ASAAS = {
  approved: { label: "Aprovado", tone: "green" },
  pending: { label: "Em análise", tone: "amber" },
  rejected: { label: "Recusado", tone: "red" },
} as const;

function PayoutTab({ account }: { account: Account }) {
  const p = account.plan;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card
        title="Conta de recebimento"
        action={
          <Badge tone={ASAAS[account.asaasStatus].tone}>{ASAAS[account.asaasStatus].label}</Badge>
        }
      >
        <KeyValue
          items={[
            ["Titular", account.legalName],
            ["CNPJ", account.cnpjMasked],
            ["Chave Pix", account.pixKeyMasked],
            ["Conta bancária", account.bankAccountMasked],
            ["Cadastro no Asaas", ASAAS[account.asaasStatus].label],
            ["Repasse do Pix", "Dia útil seguinte"],
          ]}
        />
        <div className="border-line bg-surface-2/60 mt-5 flex gap-3 rounded-xl border p-3.5 text-xs">
          <ShieldCheck className="text-accent size-4 shrink-0" strokeWidth={1.6} />
          <span className="text-muted">
            Por segurança, trocar a conta de recebimento exige confirmação em duas etapas e fica
            registrado no histórico de auditoria.
          </span>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => toast("Pedido enviado: confirme pelo código no seu WhatsApp")}>
            Solicitar alteração
          </Button>
        </div>
      </Card>
      <Card title="Seu plano">
        <div className="text-main text-2xl font-semibold tracking-[-0.02em]">{p.name}</div>
        <div className="text-faint mt-1 text-sm">Cobrado no dia 5 de cada mês, por Pix.</div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-surface-2 rounded-xl p-4">
            <div className="text-faint text-xs">Mensalidade</div>
            <div className="text-main mt-1 font-semibold tabular">
              {money(p.monthlyPerChargerCents)}
            </div>
            <div className="text-faint text-xs">por carregador ativo</div>
          </div>
          <div className="bg-surface-2 rounded-xl p-4">
            <div className="text-faint text-xs">Taxa por recarga</div>
            <div className="text-main mt-1 font-semibold tabular">
              {(p.pixFeeBps / 100).toLocaleString("pt-BR")}%
            </div>
            <div className="text-faint text-xs">já inclui o custo do Pix</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            to="/financeiro/faturas"
            className="text-accent text-sm font-medium hover:underline"
          >
            Ver faturas
          </Link>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Equipe ---------------- */

const ROLES: { value: TeamRole; label: string; description: string }[] = [
  { value: "Dono", label: "Dono", description: "Acesso total, inclusive conta de recebimento" },
  { value: "Financeiro", label: "Financeiro", description: "Vendas, repasses, faturas e estornos" },
  { value: "Suporte", label: "Suporte", description: "Recargas, comandos remotos e motoristas" },
  { value: "Leitura", label: "Leitura", description: "Só visualiza, sem alterar nada" },
];

function TeamTab({ account, onChange }: { account: Account; onChange: () => void }) {
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Suporte");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email);

  async function invite() {
    setSaving(true);
    setError("");
    try {
      await api.inviteUser({ name: name.trim(), email: email.trim(), role });
      toast(`Convite enviado para ${email.trim()}`);
      setInviting(false);
      setName("");
      setEmail("");
      setRole("Suporte");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível convidar.");
    } finally {
      setSaving(false);
    }
  }

  async function update(email: string, patch: { role?: TeamRole; active?: boolean }) {
    await api.updateUser(email, patch);
    toast("Equipe atualizada");
    onChange();
  }

  async function remove(email: string, name: string) {
    if (!window.confirm(`Remover ${name} da equipe? A pessoa perde o acesso ao painel.`)) return;
    await api.removeUser(email);
    toast(`${name} removido da equipe`);
    onChange();
  }

  const self = account.owner.name;

  return (
    <Card
      title="Equipe"
      action={
        <Button variant="primary" onClick={() => setInviting(true)}>
          <UserPlus className="size-4" strokeWidth={1.6} /> Convidar pessoa
        </Button>
      }
    >
      <p className="text-faint mb-2 text-sm">
        Cada pessoa entra com o próprio e-mail e só vê o que o perfil permite.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Pessoa</Th>
            <Th>Perfil</Th>
            <Th>Acesso</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {account.users.map((u) => {
            const isSelf = u.name === self && u.role === "Dono";
            return (
              <tr key={u.email}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/12 text-accent grid size-8 place-items-center rounded-full text-xs font-semibold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {u.name}
                        {isSelf && <span className="text-faint text-xs">(você)</span>}
                      </div>
                      <div className="text-faint text-xs">{u.email}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  {isSelf ? (
                    <span className="text-muted">Dono</span>
                  ) : (
                    <SelectInput
                      className="h-8 w-36"
                      value={u.role}
                      onChange={(e) => update(u.email, { role: e.target.value as TeamRole })}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </SelectInput>
                  )}
                </Td>
                <Td>
                  {isSelf ? (
                    <Badge tone="green">Ativo</Badge>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <Toggle checked={u.active} onChange={(v) => update(u.email, { active: v })} />
                      <span className="text-muted text-xs">{u.active ? "Ativo" : "Bloqueado"}</span>
                    </div>
                  )}
                </Td>
                <Td right>
                  {!isSelf && (
                    <button
                      onClick={() => remove(u.email, u.name)}
                      className="text-faint hover:text-bad hover:bg-bad/10 grid size-8 place-items-center rounded-lg"
                      aria-label={`Remover ${u.name}`}
                    >
                      <Trash2 className="size-4" strokeWidth={1.6} />
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal
        open={inviting}
        onClose={() => setInviting(false)}
        title="Convidar pessoa"
        subtitle="Ela recebe um e-mail para criar a senha e entrar no painel."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviting(false)}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={!valid || saving} onClick={invite}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enviar convite
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div>
            <div className="text-muted mb-1.5 text-[13px] font-medium">Perfil</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLES.filter((r) => r.value !== "Dono").map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cx(
                    "rounded-xl border p-3 text-left transition-colors",
                    role === r.value
                      ? "border-accent/50 bg-accent/8"
                      : "border-line hover:bg-surface-2",
                  )}
                >
                  <div className="text-main flex items-center justify-between text-sm font-medium">
                    {r.label}
                    {role === r.value && <Check className="text-accent size-4" />}
                  </div>
                  <div className="text-faint mt-0.5 text-xs">{r.description}</div>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-bad text-sm">{error}</p>}
        </div>
      </Modal>
    </Card>
  );
}

/* ---------------- Notificações ---------------- */

const EVENTS: { key: NotificationEvent; label: string; description: string }[] = [
  { key: "offline", label: "Carregador offline", description: "Quando para de se comunicar" },
  { key: "faulted", label: "Conector em falha", description: "Erro informado pelo carregador" },
  { key: "session_done", label: "Recarga concluída", description: "A cada recarga encerrada" },
  {
    key: "refund",
    label: "Devoluções e estornos",
    description: "Quando dinheiro volta ao motorista",
  },
  {
    key: "daily_summary",
    label: "Resumo do dia",
    description: "Vendas e energia, todo dia às 22h",
  },
  { key: "invoice", label: "Fatura EletroPay", description: "Fatura nova e aviso de vencimento" },
];

function NotificationsTab() {
  const prefs = useApi(() => api.getNotifications(), []);
  const [p, setP] = useState<NotificationPrefs | null>(null);
  useEffect(() => {
    if (prefs.data) setP(prefs.data);
  }, [prefs.data]);

  async function save(next: NotificationPrefs) {
    setP(next);
    await api.updateNotifications(next);
    toast("Preferências salvas");
  }

  if (!p) return <Loading />;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.4fr]">
      <Card title="Onde avisar">
        <div className="divide-line divide-y">
          <Toggle
            label="E-mail"
            description="contato cadastrado em Empresa"
            checked={p.email}
            onChange={(v) => save({ ...p, email: v })}
          />
          <Toggle
            label="WhatsApp"
            description="número de atendimento"
            checked={p.whatsapp}
            onChange={(v) => save({ ...p, whatsapp: v })}
          />
        </div>
        <Field label="Considerar offline depois de" className="mt-4">
          <SelectInput
            value={p.offlineAfterMin}
            onChange={(e) => save({ ...p, offlineAfterMin: Number(e.target.value) })}
          >
            {[5, 10, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutos sem sinal
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>
      <Card title="Sobre o que avisar">
        <div className="divide-line divide-y">
          {EVENTS.map((e) => (
            <Toggle
              key={e.key}
              label={e.label}
              description={e.description}
              checked={p.events[e.key]}
              onChange={(v) => save({ ...p, events: { ...p.events, [e.key]: v } })}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Aparência ---------------- */

function ModePreview({ dark, accent }: { dark: boolean; accent: string }) {
  const bg = dark ? "#0b0b0c" : "#f6f5f2";
  const surface = dark ? "#18181a" : "#ffffff";
  const line = dark ? "#2a2a2d" : "#e8e5de";
  const text = dark ? "#3a3a3e" : "#e3e0d8";
  return (
    <div className="h-20 w-full overflow-hidden rounded-lg" style={{ background: bg }}>
      <div className="flex h-full gap-1.5 p-2">
        <div className="w-1/4 rounded" style={{ background: surface, border: `1px solid ${line}` }}>
          <div className="m-1.5 h-1 w-3/4 rounded-full" style={{ background: accent }} />
          <div className="mx-1.5 h-1 w-1/2 rounded-full" style={{ background: text }} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div
            className="h-1/2 rounded"
            style={{ background: surface, border: `1px solid ${line}` }}
          >
            <div className="m-1.5 h-1.5 w-1/3 rounded-full" style={{ background: accent }} />
          </div>
          <div className="flex h-1/2 gap-1.5">
            <div
              className="flex-1 rounded"
              style={{ background: surface, border: `1px solid ${line}` }}
            />
            <div
              className="flex-1 rounded"
              style={{ background: surface, border: `1px solid ${line}` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { mode, accent, dark, setMode, setAccent } = useTheme();
  const accentHex = (a: AccentName, d: boolean) => {
    const x = ACCENTS.find((y) => y.value === a);
    return (d ? x?.dark : x?.light) ?? "#999";
  };
  const modes: { value: ThemeMode; label: string; icon: ReactNode; previewDark: boolean }[] = [
    {
      value: "light",
      label: "Claro",
      icon: <Sun className="size-4" strokeWidth={1.6} />,
      previewDark: false,
    },
    {
      value: "dark",
      label: "Escuro",
      icon: <Moon className="size-4" strokeWidth={1.6} />,
      previewDark: true,
    },
    {
      value: "system",
      label: "Automático",
      icon: <Laptop className="size-4" strokeWidth={1.6} />,
      previewDark: dark,
    },
  ];

  async function reset() {
    if (!window.confirm("Apagar as alterações feitas no protótipo e voltar aos dados de exemplo?"))
      return;
    await api.resetDemo?.();
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <Card title="Tema">
        <p className="text-faint -mt-1 mb-4 text-sm">
          Automático segue a configuração do seu computador ou celular.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cx(
                "rounded-2xl border p-2.5 text-left transition-all duration-200",
                mode === m.value
                  ? "border-accent/60 ring-accent/20 ring-4"
                  : "border-line hover:border-accent/30",
              )}
            >
              <ModePreview dark={m.previewDark} accent={accentHex(accent, m.previewDark)} />
              <div className="text-main mt-2.5 flex items-center justify-between px-1 text-sm">
                <span className="flex items-center gap-2">
                  {m.icon}
                  {m.label}
                </span>
                {mode === m.value && <Check className="text-accent size-4" />}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Cor de destaque">
        <p className="text-faint -mt-1 mb-4 text-sm">
          Muda botões, gráficos e detalhes do painel. Vale só para você.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACCENTS.map((a) => {
            const c = accentHex(a.value, dark);
            const on = accent === a.value;
            return (
              <button
                key={a.value}
                onClick={() => setAccent(a.value)}
                className={cx(
                  "group rounded-2xl border p-4 text-left transition-all duration-200",
                  on ? "ring-4" : "border-line hover:-translate-y-0.5",
                )}
                style={
                  on
                    ? {
                        borderColor: `color-mix(in oklab, ${c} 60%, transparent)`,
                        boxShadow: `0 0 0 4px color-mix(in oklab, ${c} 18%, transparent)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className="size-8 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${accentHex(a.value, !dark)}, ${c})`,
                    }}
                  />
                  {on && <Check className="size-4" style={{ color: c }} />}
                </div>
                <div className="text-main mt-3 text-sm font-medium">{a.label}</div>
                <div className="text-faint text-xs">{a.value === "gold" ? "Padrão" : " "}</div>
                <div className="bg-surface-2 mt-3 h-1 overflow-hidden rounded-full">
                  <div className="h-full w-2/3 rounded-full" style={{ background: c }} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Dados de demonstração">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-sm">
            O que você cadastra ou edita no protótipo fica salvo neste navegador. Para começar do
            zero, volte aos dados de exemplo.
          </p>
          <Button onClick={reset}>
            <RotateCcw className="size-4" strokeWidth={1.6} /> Restaurar exemplo
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Página ---------------- */

export function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get("aba"))?.key ?? "empresa") as TabKey;
  const account = useApi(() => api.getAccount(), []);
  const a = account.data;

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Empresa, recebimento, equipe, notificações e a aparência do seu painel."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav
          className="rise -mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:px-0"
          style={stagger(1)}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setParams({ aba: t.key }, { replace: true })}
              className={cx(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm whitespace-nowrap transition-colors",
                tab === t.key
                  ? "bg-surface border-line text-main border font-medium"
                  : "text-muted hover:text-main border border-transparent",
              )}
            >
              <span className={tab === t.key ? "text-accent" : ""}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div key={tab} className="min-w-0">
          {tab === "aparencia" ? (
            <AppearanceTab />
          ) : tab === "notificacoes" ? (
            <NotificationsTab />
          ) : !a ? (
            <Loading />
          ) : tab === "empresa" ? (
            <CompanyTab account={a} onSaved={account.reload} />
          ) : tab === "recebimento" ? (
            <PayoutTab account={a} />
          ) : (
            <TeamTab account={a} onChange={account.reload} />
          )}
        </div>
      </div>
    </>
  );
}
