import { useEffect, useState } from "react";
import { Info, Loader2, Pencil } from "lucide-react";
import { api, type Tariff } from "../api";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  stagger,
  toast,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { date, money, pricePerKwh } from "../lib/format";
import { parseMoney, toMoneyInput } from "../lib/money";

function EditTariffModal({
  tariff,
  onClose,
  onSaved,
}: {
  tariff: Tariff | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [grace, setGrace] = useState("");
  const [idle, setIdle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tariff) return;
    setName(tariff.name);
    setPrice(toMoneyInput(tariff.priceKwhCents));
    setGrace(String(tariff.idleGraceMin));
    setIdle(toMoneyInput(tariff.idlePriceMinCents));
  }, [tariff]);

  const priceC = parseMoney(price);
  const idleC = parseMoney(idle);
  const graceN = Number(grace);
  const ok =
    name.trim().length >= 2 &&
    priceC !== null &&
    priceC > 0 &&
    idleC !== null &&
    Number.isInteger(graceN) &&
    graceN >= 0;

  async function save() {
    if (!tariff || !ok || priceC === null || idleC === null) return;
    setSaving(true);
    try {
      const t = await api.updateTariff(tariff.id, {
        name: name.trim(),
        priceKwhCents: priceC,
        idleGraceMin: graceN,
        idlePriceMinCents: idleC,
      });
      toast(`Preço salvo · versão ${t.version}`);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!tariff}
      onClose={onClose}
      title="Editar preço"
      subtitle={tariff ? `Aplica-se a: ${tariff.appliesTo}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!ok || saving} onClick={save}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvar nova versão
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Preço por kWh (R$)" className="sm:col-span-2">
          <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Tolerância (min)" hint="Tempo parado sem cobrança após a recarga.">
          <Input inputMode="numeric" value={grace} onChange={(e) => setGrace(e.target.value)} />
        </Field>
        <Field label="Ociosidade (R$/min)" hint="Use 0 para não cobrar.">
          <Input inputMode="decimal" value={idle} onChange={(e) => setIdle(e.target.value)} />
        </Field>
      </div>
      <div className="bg-surface-2 text-muted mt-5 rounded-2xl p-4 text-sm">
        O motorista verá: <b className="text-main">{priceC ? pricePerKwh(priceC) : "—"}</b>
        {!!idleC && (
          <>
            , tolerância de {graceN || 0} min, depois {money(idleC)} por minuto parado
          </>
        )}
        . Recargas em andamento continuam com o preço antigo.
      </div>
    </Modal>
  );
}

export function Pricing() {
  const tariffs = useApi(() => api.listTariffs(), []);
  const [editing, setEditing] = useState<Tariff | null>(null);
  return (
    <>
      <EditTariffModal tariff={editing} onClose={() => setEditing(null)} onSaved={tariffs.reload} />
      <PageHeader
        title="Preços e regras"
        subtitle="Preço por kWh, ociosidade e créditos oferecidos no WhatsApp."
      />
      <div className="mb-4 flex gap-3 rounded-2xl border border-info/25 bg-info/8 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-muted">
          O preço vale o do <b className="text-main">momento do pagamento</b>. Se você mudar o preço
          com uma recarga em andamento, ela continua com o valor antigo. Cada mudança cria uma nova
          versão, e o histórico fica guardado.
        </p>
      </div>
      {!tariffs.data ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tariffs.data.map((t, i) => (
            <Card
              key={t.id}
              style={stagger(i + 1)}
              title={
                <span className="flex items-center gap-2">
                  {t.name}
                  <Badge>v{t.version}</Badge>
                </span>
              }
              action={
                <Button variant="ghost" onClick={() => setEditing(t)}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
              }
            >
              <div className="text-faint mb-3 text-xs">Aplica-se a: {t.appliesTo}</div>
              <div className="text-main text-3xl font-semibold tabular">
                {pricePerKwh(t.priceKwhCents)}
              </div>
              <dl className="text-muted mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-faint text-xs">Tolerância</dt>
                  <dd className="text-main tabular">{t.idleGraceMin} min</dd>
                </div>
                <div>
                  <dt className="text-faint text-xs">Ociosidade</dt>
                  <dd className="text-main tabular">
                    {t.idlePriceMinCents ? `${money(t.idlePriceMinCents)}/min` : "Sem cobrança"}
                  </dd>
                </div>
                <div>
                  <dt className="text-faint text-xs">Créditos no WhatsApp</dt>
                  <dd className="text-main tabular">
                    {t.creditOptionsCents.length
                      ? t.creditOptionsCents.map((c) => money(c)).join(" · ")
                      : "Só tag"}
                  </dd>
                </div>
                <div>
                  <dt className="text-faint text-xs">Vigente desde</dt>
                  <dd className="text-main tabular">{date(t.validFrom)}</dd>
                </div>
              </dl>
              <div className="bg-surface-2 text-muted mt-4 rounded-xl p-3 text-xs">
                O motorista verá: <b className="text-main">{pricePerKwh(t.priceKwhCents)}</b>
                {t.idlePriceMinCents > 0 && (
                  <>
                    , tolerância de {t.idleGraceMin} min, depois {money(t.idlePriceMinCents)} por
                    minuto parado
                  </>
                )}
                .
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
