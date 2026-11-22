import { Info, Pencil } from "lucide-react";
import { api } from "../api";
import { Badge, Button, Card, Loading, PageHeader } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { date, money, pricePerKwh } from "../lib/format";

export function Pricing() {
  const tariffs = useApi(() => api.listTariffs(), []);
  return (
    <>
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
          {tariffs.data.map((t) => (
            <Card
              key={t.id}
              title={
                <span className="flex items-center gap-2">
                  {t.name}
                  <Badge>v{t.version}</Badge>
                </span>
              }
              action={
                <Button
                  variant="ghost"
                  onClick={() => alert("Protótipo: edição de preço com nova versão.")}
                >
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
