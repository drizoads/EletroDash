import { UserPlus } from "lucide-react";
import { api } from "../api";
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
} from "../components/ui";
import { useApi } from "../hooks/useApi";

const ASAAS = {
  approved: { label: "Aprovado", tone: "green" },
  pending: { label: "Em análise", tone: "amber" },
  rejected: { label: "Recusado", tone: "red" },
} as const;

export function Settings() {
  const account = useApi(() => api.getAccount(), []);
  const a = account.data;
  return (
    <>
      <PageHeader title="Configurações" subtitle="Dados da empresa, recebimento e equipe." />
      {!a ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title="Conta e recebimento"
            action={<Badge tone={ASAAS[a.asaasStatus].tone}>{ASAAS[a.asaasStatus].label}</Badge>}
          >
            <KeyValue
              items={[
                ["Nome do posto", a.operatorName],
                ["Razão social", a.legalName],
                ["CNPJ", a.cnpjMasked],
                ["Chave Pix de recebimento", a.pixKeyMasked],
                ["Cadastro no Asaas", ASAAS[a.asaasStatus].label],
              ]}
            />
          </Card>
          <Card
            title="Equipe"
            action={
              <Button
                variant="ghost"
                onClick={() => alert("Protótipo: convite por e-mail com escolha de perfil.")}
              >
                <UserPlus className="size-4" /> Convidar
              </Button>
            }
          >
            <Table>
              <thead>
                <tr>
                  <Th>Nome</Th>
                  <Th>Perfil</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {a.users.map((u) => (
                  <tr key={u.email}>
                    <Td>
                      <div>{u.name}</div>
                      <div className="text-faint text-xs">{u.email}</div>
                    </Td>
                    <Td muted>{u.role}</Td>
                    <Td>
                      <Badge tone={u.active ? "green" : "gray"}>
                        {u.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}
