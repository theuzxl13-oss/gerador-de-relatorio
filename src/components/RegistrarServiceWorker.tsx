"use client";

import { useEffect } from "react";

/** Registra o service worker que permite abrir a tela de nova ocorrência sem conexão (só em produção). */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
