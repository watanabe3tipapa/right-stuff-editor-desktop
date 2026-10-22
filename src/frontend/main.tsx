import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@wterm/react/css";
import "./index.css";

const report = (level: "warn" | "error", message: string, detail?: string) => {
  void tiny?.api
    ?.call("clientLog", { level, message, detail })
    .catch(() => undefined);
};

window.addEventListener("error", (event) => {
  report("error", event.message, event.error instanceof Error ? event.error.stack : undefined);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  report(
    "error",
    reason instanceof Error ? reason.message : String(reason),
    reason instanceof Error ? reason.stack : undefined,
  );
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
