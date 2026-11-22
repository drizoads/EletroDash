import { BrowserRouter, Link, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./lib/auth";
import { Login } from "./pages/Login";
import { Empty } from "./components/ui";
import { ChargerDetail } from "./pages/ChargerDetail";
import { Chargers } from "./pages/Chargers";
import { Finance } from "./pages/Finance";
import { Invoices } from "./pages/Invoices";
import { Ledger } from "./pages/Ledger";
import { Overview } from "./pages/Overview";
import { Pricing } from "./pages/Pricing";
import { SessionDetail } from "./pages/SessionDetail";
import { Sessions } from "./pages/Sessions";
import { Settings } from "./pages/Settings";

function NotFound() {
  return (
    <Empty>
      Página não encontrada.{" "}
      <Link to="/" className="text-accent underline">
        Voltar para a visão geral
      </Link>
    </Empty>
  );
}

function Routed() {
  const { email } = useAuth();
  if (!email) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="carregadores" element={<Chargers />} />
        <Route path="carregadores/:id" element={<ChargerDetail />} />
        <Route path="recargas" element={<Sessions />} />
        <Route path="recargas/:id" element={<SessionDetail />} />
        <Route path="financeiro" element={<Finance />} />
        <Route path="financeiro/conciliacoes" element={<Ledger />} />
        <Route path="financeiro/faturas" element={<Invoices />} />
        <Route path="precos" element={<Pricing />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routed />
      </BrowserRouter>
    </AuthProvider>
  );
}
