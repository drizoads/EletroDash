import { createContext, useContext, useState, type ReactNode } from "react";

// Protótipo: a "sessão" é só uma marca no navegador. Com a API real, aqui entra
// o login do EletroPay (token em cookie httpOnly, nunca em localStorage).
const KEY = "eletrodash-session";

interface AuthState {
  email: string | null;
  login: (email: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

function readEmail(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? "arthur@inovasolar.exemplo" : v || null;
  } catch {
    return "arthur@inovasolar.exemplo";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(readEmail);
  const save = (v: string) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* sem armazenamento: vale até recarregar */
    }
  };
  return (
    <Ctx.Provider
      value={{
        email,
        login: (e) => {
          save(e);
          setEmail(e);
        },
        logout: () => {
          save("");
          setEmail(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth precisa do AuthProvider");
  return v;
}
