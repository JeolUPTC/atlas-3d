// Punto de entrada — Sesión 43. Hasta la Sesión 42 era main.ts: 649 líneas que buscaban elementos
// con querySelector y les enganchaban oyentes. Ahora solo monta el árbol de React en #root.
import "./style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
