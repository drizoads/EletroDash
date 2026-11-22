import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Wordmark } from "../components/Layout";
import { Field, Input, Toaster, toast } from "../components/ui";
import { useAuth } from "../lib/auth";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("arthur@inovasolar.exemplo");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 1;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    // Protótipo: qualquer senha entra. A senha não é guardada em lugar nenhum.
    setTimeout(() => login(email.trim()), 700);
  }

  return (
    <div className="bg-app relative flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="rise relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Wordmark className="text-[26px]" />
          <p className="text-muted mt-3 text-sm">Entre no painel da sua operação.</p>
        </div>
        <form
          onSubmit={submit}
          className="bg-surface border-line space-y-4 rounded-3xl border p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,.35)]"
        >
          <Field label="E-mail">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Senha">
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-faint hover:text-main absolute inset-y-0 right-0 grid w-11 place-items-center"
                aria-label={show ? "Esconder senha" : "Mostrar senha"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <button
            type="submit"
            disabled={!valid || loading}
            className="bg-accent hover:opacity-90 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50 dark:text-black"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Entrar
          </button>
          <button
            type="button"
            onClick={() => toast("Enviamos um link de redefinição para o seu e-mail (simulação)")}
            className="text-muted hover:text-main w-full text-center text-xs"
          >
            Esqueci minha senha
          </button>
        </form>
        <p className="text-faint mt-6 text-center text-[11px]">
          Protótipo com dados fictícios · qualquer senha entra
          <br />
          Uma plataforma EletroPay
        </p>
      </div>
      <Toaster />
    </div>
  );
}
