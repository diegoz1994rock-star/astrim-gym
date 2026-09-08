import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, initThemeBeforeRender } from "@/lib/theme/ThemeProvider";
import "./styles/globals.css";

// Aplica el tema guardado antes del primer render para evitar parpadeo.
initThemeBeforeRender();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
