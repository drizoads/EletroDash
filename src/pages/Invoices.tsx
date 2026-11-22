import { Copy } from "lucide-react";
import { api, type InvoiceStatus } from "../api";
import {
  Badge,
  Button,
  Card,
  KeyValue,
  Loading,
  PageHeader,
  Table,
  Td,
  Th,
  toast,
  MobileRow,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { date, money } from "../lib/format";

const STATUS: Record<InvoiceStatus, { label: string; tone: "green" | "violet" | "red" }> = {
  paid: { label: "Paga", tone: "green" },
  open: { label: "Em aberto", tone: "violet" },
  overdue: { label: "Vencida", tone: "red" },
};

const monthName = (ref: string) => {
  const [y, m] = ref.split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

export function Invoices() {
  const invoices = useApi(() => api.listInvoices(), []);
  const account = useApi(() => api.getAccount(), []);
  const open = invoices.data?.find((i) => i.status !== "paid");
  const plan = account.data?.plan;

  return (
    <>
      <PageHeader
        title="Faturas EletroPay"
        subtitle="Mensalidade por carregador ativo no mês. As taxas por recarga já são descontadas na hora."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Seu plano">
          {!plan ? (
            <Loading />
          ) : (
            <KeyValue
              items={[
                ["Plano", plan.name],
                ["Mensalidade", `${money(plan.monthlyPerChargerCents)} por carregador ativo`],
                ["Taxa por recarga", `${(plan.pixFeeBps / 100).toLocaleString("pt-BR")}%`],
                ["Vencimento", "Dia 5 do mês seguinte, por Pix"],
              ]}
            />
          )}
        </Card>
        <Card title="Fatura em aberto" className="lg:col-span-2">
          {!invoices.data ? (
            <Loading />
          ) : !open ? (
            <p className="text-muted text-sm">Nenhuma fatura em aberto. Tudo em dia.</p>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-muted text-sm capitalize">
                  {monthName(open.referenceMonth)}
                </div>
                <div className="text-main text-3xl font-semibold tabular">
                  {money(open.totalCents)}
                </div>
                <div className="text-faint text-xs">
                  {open.activeChargers} carregadores × {money(open.monthlyPerChargerCents)} · vence
                  em {date(open.dueDate)}
                </div>
              </div>
              <Button variant="primary" onClick={() => toast("Pix copia e cola copiado")}>
                <Copy className="size-4" /> Copiar Pix copia e cola
              </Button>
            </div>
          )}
        </Card>
      </div>
      <Card className="mt-4" title="Histórico">
        {!invoices.data ? (
          <Loading />
        ) : (
          <Table
            mobile={invoices.data.map((i) => (
              <MobileRow
                key={i.id}
                title={<span className="capitalize">{monthName(i.referenceMonth)}</span>}
                subtitle={`${i.activeChargers} carregadores · vence ${date(i.dueDate)}`}
                right={money(i.totalCents)}
                rightSub={<Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>}
              />
            ))}
          >
            <thead>
              <tr>
                <Th>Mês</Th>
                <Th right>Carregadores ativos</Th>
                <Th right>Mensalidade</Th>
                <Th right>Taxas do mês (informativo)</Th>
                <Th>Vencimento</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.data.map((i) => (
                <tr key={i.id}>
                  <Td className="capitalize">{monthName(i.referenceMonth)}</Td>
                  <Td right muted>
                    {i.activeChargers}
                  </Td>
                  <Td right className="font-medium">
                    {money(i.totalCents)}
                  </Td>
                  <Td right muted>
                    {money(i.feesCents)}
                  </Td>
                  <Td muted>{date(i.dueDate)}</Td>
                  <Td>
                    <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
