import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Aplica o tema antes do primeiro desenho para não piscar.
try {
  document.documentElement.classList.toggle(
    "dark",
    localStorage.getItem("eletrodash-theme") !== "light",
  );
} catch {
  document.documentElement.classList.add("dark");
}

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
