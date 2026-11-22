import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Check, Copy, Loader2, Minus, Plus, PlugZap } from "lucide-react";
import {
  api,
  type Charger,
  type ConnectorType,
  type NewChargerInput,
  type NewChargerResult,
} from "../api";
import { pricePerKwh } from "../lib/format";
import { parseMoney, toMoneyInput } from "../lib/money";
import { Button, Field, Input, Modal, Segmented, SelectInput, cx, toast } from "./ui";

const POWERS = [7, 22, 40, 60, 120];
const TYPES: ConnectorType[] = ["CCS2", "Tipo 2", "CHAdeMO"];

function Steps({ step, labels }: { step: number; labels: string[] }) {
  return (
    <ol className="mb-6 flex items-center gap-2 px-0.5 py-0.5">
      {labels.map((l, i) => (
        <li key={l} className="flex flex-1 items-center gap-2">
          <span
            className={cx(
              "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors duration-300",
              i < step && "bg-accent text-surface",
              i === step && "border-accent text-accent border-2",
              i > step && "bg-surface-2 text-faint",
            )}
          >
            {i < step ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span
            className={cx(
              "hidden text-xs sm:block",
              i === step ? "text-main font-medium" : "text-faint",
            )}
          >
            {l}
          </span>
          {i < labels.length - 1 && (
            <span
              className={cx(
                "h-px flex-1 transition-colors duration-500",
                i < step ? "bg-accent" : "bg-line",
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="border-line bg-surface-2/60 flex items-center gap-3 rounded-xl border px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-faint text-[11px] tracking-wide uppercase">{label}</div>
        <div className={cx("text-main truncate font-mono text-[13px]", secret && "text-accent")}>
          {value}
        </div>
      </div>
      <button
        className="text-muted hover:text-main hover:bg-surface grid size-8 place-items-center rounded-lg"
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          toast(`${label} copiado`);
        }}
        aria-label={`Copiar ${label}`}
      >
        <Copy className="size-4" strokeWidth={1.6} />
      </button>
    </div>
  );
}

const emptyForm = () => ({
  name: "",
  location: "",
  visibility: "public" as "public" | "private",
  maxKw: 22,
  connectors: [{ type: "Tipo 2" as ConnectorType }],
  price: "1,59",
});

export function NewChargerWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<NewChargerResult | null>(null);
  const [live, setLive] = useState<Charger | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setForm(emptyForm());
      setResult(null);
      setLive(null);
    }
  }, [open]);

  // Passo "aguardando conexão": consulta até o carregador mandar o primeiro sinal.
  useEffect(() => {
    if (!result || (live && !live.pendingBoot)) return;
    const id = setInterval(async () => {
      const c = await api.getCharger(result.charger.id);
      if (c) setLive(c);
      if (c && !c.pendingBoot) {
        onCreated();
        toast(`${c.name} conectado à central`);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [result, live, onCreated]);

  const set = <K extends keyof ReturnType<typeof emptyForm>>(
    k: K,
    v: ReturnType<typeof emptyForm>[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const priceCents = parseMoney(form.price);
  const step0ok = form.name.trim().length >= 2 && form.location.trim().length >= 3;
  const step1ok = priceCents !== null && priceCents > 0;

  async function create() {
    if (priceCents === null) return;
    setSaving(true);
    try {
      const input: NewChargerInput = {
        name: form.name.trim(),
        location: form.location.trim(),
        visibility: form.visibility,
        maxKw: form.maxKw,
        connectors: form.connectors.map((c) => ({ type: c.type, maxKw: form.maxKw })),
        priceKwhCents: priceCents,
      };
      const r = await api.createCharger(input);
      setResult(r);
      setLive(r.charger);
      setStep(3);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  const connected = live && !live.pendingBoot;

  const footer =
    step === 0 ? (
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={!step0ok} onClick={() => setStep(1)}>
          Continuar
        </Button>
      </>
    ) : step === 1 ? (
      <>
        <Button variant="ghost" onClick={() => setStep(0)}>
          Voltar
        </Button>
        <Button variant="primary" disabled={!step1ok} onClick={() => setStep(2)}>
          Continuar
        </Button>
      </>
    ) : step === 2 ? (
      <>
        <Button variant="ghost" onClick={() => setStep(1)}>
          Voltar
        </Button>
        <Button variant="primary" disabled={saving} onClick={create}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Cadastrar carregador
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
        {connected && result && (
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              navigate(`/carregadores/${result.charger.id}`);
            }}
          >
            Abrir carregador
          </Button>
        )}
      </>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Novo carregador"
      subtitle="Cadastre o equipamento e conecte-o à central do EletroPay."
      footer={footer}
    >
      <Steps step={step} labels={["Dados", "Preço", "Revisão", "Conexão"]} />

      {step === 0 && (
        <div className="rise grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do carregador" className="sm:col-span-2">
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Shopping Sul 01"
            />
          </Field>
          <Field
            label="Local"
            className="sm:col-span-2"
            hint="Aparece para o motorista no WhatsApp."
          >
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Rua, número · ponto de referência"
            />
          </Field>
          <Field label="Acesso">
            <Segmented
              value={form.visibility}
              onChange={(v) => set("visibility", v)}
              options={[
                { value: "public", label: "Público" },
                { value: "private", label: "Privado (tag)" },
              ]}
            />
          </Field>
          <Field label="Potência máxima">
            <SelectInput
              value={form.maxKw}
              onChange={(e) => {
                const kw = Number(e.target.value);
                set("maxKw", kw);
                set("price", kw > 22 ? "1,99" : "1,59");
                set(
                  "connectors",
                  form.connectors.map(() => ({
                    type: (kw > 22 ? "CCS2" : "Tipo 2") as ConnectorType,
                  })),
                );
              }}
            >
              {POWERS.map((p) => (
                <option key={p} value={p}>
                  {p} kW {p > 22 ? "· DC rápido" : "· AC"}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <div className="text-muted mb-1.5 flex items-center justify-between text-[13px] font-medium">
              Conectores
              <div className="flex items-center gap-1">
                <button
                  className="border-line text-muted hover:text-main grid size-7 place-items-center rounded-full border disabled:opacity-40"
                  disabled={form.connectors.length <= 1}
                  onClick={() => set("connectors", form.connectors.slice(0, -1))}
                  aria-label="Remover conector"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="text-main w-6 text-center tabular">{form.connectors.length}</span>
                <button
                  className="border-line text-muted hover:text-main grid size-7 place-items-center rounded-full border disabled:opacity-40"
                  disabled={form.connectors.length >= 4}
                  onClick={() =>
                    set("connectors", [
                      ...form.connectors,
                      { type: form.connectors[0]?.type ?? "Tipo 2" },
                    ])
                  }
                  aria-label="Adicionar conector"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {form.connectors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-faint w-6 text-xs">#{i + 1}</span>
                  <SelectInput
                    value={c.type}
                    onChange={(e) =>
                      set(
                        "connectors",
                        form.connectors.map((x, j) =>
                          j === i ? { type: e.target.value as ConnectorType } : x,
                        ),
                      )
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </SelectInput>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="rise space-y-4">
          <Field label="Preço por kWh (R$)" hint="Você pode mudar depois em Preços e regras.">
            <Input
              autoFocus
              inputMode="decimal"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
          <div className="bg-surface-2 text-muted rounded-2xl p-4 text-sm">
            O motorista verá{" "}
            <b className="text-main">{step1ok ? pricePerKwh(priceCents ?? 0) : "—"}</b> e poderá
            escolher créditos de R$ 30, R$ 60 ou R$ 100 no WhatsApp. O que não for usado volta por
            Pix automaticamente.
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rise border-line divide-line divide-y rounded-2xl border">
          {[
            ["Nome", form.name],
            ["Local", form.location],
            ["Acesso", form.visibility === "public" ? "Público" : "Privado (tag)"],
            ["Potência", `${form.maxKw} kW`],
            ["Conectores", form.connectors.map((c, i) => `#${i + 1} ${c.type}`).join(" · ")],
            ["Preço", pricePerKwh(priceCents ?? 0)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <span className="text-faint">{k}</span>
              <span className="text-main text-right">{v}</span>
            </div>
          ))}
        </div>
      )}

      {step === 3 && result && (
        <div className="rise space-y-4">
          <p className="text-muted text-sm">
            Passe estes dados ao instalador. Ele digita no carregador, e esta tela avisa sozinha
            quando a primeira conexão chegar.
          </p>
          <div className="space-y-2">
            <CopyRow label="Endereço da central" value={result.ocppUrl} />
            <CopyRow label="ID da estação" value={result.charger.ocppId} />
            <CopyRow label="Token de autenticação" value={result.authToken} secret />
          </div>
          <p className="text-faint text-xs">
            O token aparece só agora. Guarde em lugar seguro; se perder, gere outro no detalhe do
            carregador.
          </p>
          <div
            className={cx(
              "flex items-center gap-3 rounded-2xl border p-4 transition-colors duration-500",
              connected ? "border-ok/30 bg-ok/8" : "border-line bg-surface-2/60",
            )}
          >
            {connected ? (
              <span className="bg-ok/15 text-ok grid size-9 place-items-center rounded-full">
                <Check className="size-4.5" strokeWidth={2.5} />
              </span>
            ) : (
              <span className="relative grid size-9 place-items-center">
                <span className="live-ring bg-accent/40 absolute inset-1 rounded-full" />
                <PlugZap className="text-accent relative size-4.5" strokeWidth={1.6} />
              </span>
            )}
            <div>
              <div className="text-main text-sm font-medium">
                {connected ? "Carregador conectado!" : "Aguardando a primeira conexão…"}
              </div>
              <div className="text-faint text-xs">
                {connected
                  ? `${live?.vendor} ${live?.model} · firmware ${live?.firmware} · código ${live?.code}`
                  : "No protótipo, a conexão é simulada em alguns segundos."}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function EditChargerModal({
  charger,
  open,
  onClose,
  onSaved,
}: {
  charger: Charger;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(charger.name);
  const [location, setLocation] = useState(charger.location);
  const [visibility, setVisibility] = useState(charger.visibility);
  const [price, setPrice] = useState(toMoneyInput(charger.priceKwhCents));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(charger.name);
      setLocation(charger.location);
      setVisibility(charger.visibility);
      setPrice(toMoneyInput(charger.priceKwhCents));
    }
  }, [open, charger]);

  const cents = parseMoney(price);
  const ok = name.trim().length >= 2 && location.trim().length >= 3 && cents !== null && cents > 0;

  async function save() {
    if (!ok || cents === null) return;
    setSaving(true);
    try {
      await api.updateCharger(charger.id, {
        name: name.trim(),
        location: location.trim(),
        visibility,
        priceKwhCents: cents,
      });
      toast("Carregador atualizado");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar carregador"
      subtitle={`${charger.code} · ${charger.ocppId}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!ok || saving} onClick={save}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Local">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Acesso">
          <Segmented
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: "public", label: "Público" },
              { value: "private", label: "Privado (tag)" },
            ]}
          />
        </Field>
        <Field
          label="Preço por kWh (R$)"
          hint="Vale para novos pagamentos. Recargas em andamento continuam com o preço antigo."
        >
          <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
