import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider, applyTheme, initialTheme } from "./lib/theme";
import "./index.css";

// Aplica o tema antes do primeiro desenho para não piscar.
const t = initialTheme();
applyTheme(t.mode, t.accent);

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
