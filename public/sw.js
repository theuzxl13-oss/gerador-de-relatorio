/*
 * Service worker do sistema de ocorrências.
 * Objetivo único: permitir abrir "Nova ocorrência" e o início sem conexão (rondas).
 *  - Arquivos do site (/_next/static, logo): cache primeiro (nomes com hash, imutáveis).
 *  - Páginas /, /ocorrencias/nova e /ajuda: rede primeiro; sem rede, a última cópia guardada.
 *  - API e demais páginas: nunca guardadas (dados pessoais), sempre pela rede.
 * Ao sair do sistema, a tela apaga o cache de páginas.
 */
const ESTATICOS = "estaticos-v1";
const PAGINAS = "paginas-v1";
const PAGINAS_OFFLINE = ["/", "/ocorrencias/nova", "/ajuda"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== ESTATICOS && n !== PAGINAS).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/logo.png" || url.pathname === "/logo.svg") {
    e.respondWith(
      caches.open(ESTATICOS).then(async (c) => {
        const guardado = await c.match(req);
        if (guardado) return guardado;
        const r = await fetch(req);
        if (r.ok) c.put(req, r.clone());
        return r;
      }),
    );
    return;
  }

  if (req.mode === "navigate" && PAGINAS_OFFLINE.includes(url.pathname) && !url.search) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          // Só guarda a página de quem está logado (não guarda redirecionamentos para o login).
          if (r.ok && !r.redirected) caches.open(PAGINAS).then((c) => c.put(url.pathname, r.clone()));
          return r;
        })
        .catch(async () => (await caches.match(url.pathname)) || Response.error()),
    );
  }
});
