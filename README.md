# EletroDash

Painel de gestão do **EletroPay** para o dono do posto: vendas, recargas,
carregadores em tempo real, conciliação financeira, preços e faturas.

> **Fase atual: protótipo visual.** Todos os dados são fictícios e gerados no
> navegador (`src/api/mock`). Nada se conecta ao EletroPay ainda.

## Como rodar (PowerShell)

```powershell
pnpm install
pnpm run dev
```

Abra http://localhost:5180.

Antes de commitar:

```powershell
pnpm run format
pnpm run check
```

## Telas

| Menu              | Rota                       |
| ----------------- | -------------------------- |
| Visão geral       | `/`                        |
| Carregadores      | `/carregadores` e `/:id`   |
| Recargas          | `/recargas` e `/:id`       |
| Financeiro        | `/financeiro`              |
| Conciliações      | `/financeiro/conciliacoes` |
| Faturas EletroPay | `/financeiro/faturas`      |
| Preços e regras   | `/precos`                  |
| Configurações     | `/configuracoes`           |

## Como plugar na API do EletroPay depois

O painel só conversa com a interface `EletroDashApi`, em
[`src/api/client.ts`](src/api/client.ts). Os formatos dos dados estão em
[`src/api/types.ts`](src/api/types.ts) e seguem as regras do EletroPay:

- dinheiro em **centavos inteiros**; energia em **Wh inteiros**; datas em ISO (UTC);
- nenhum CPF, token ou chave chega ao painel (telefone sempre mascarado).

Quando a API existir, crie uma implementação com `fetch` (por exemplo
`src/api/http/httpApi.ts`) e troque uma linha em [`src/api/index.ts`](src/api/index.ts).
Os tipos em `types.ts` servem de contrato para as rotas do EletroPay.

## Stack

Vite, React 19, TypeScript estrito, Tailwind CSS 4, React Router, Recharts e
ícones Lucide.
