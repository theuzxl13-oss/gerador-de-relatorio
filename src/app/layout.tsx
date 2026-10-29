import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Cabecalho } from "@/components/Cabecalho";
import { ProvedorUsuario } from "@/components/UsuarioContexto";
import { FilaOffline } from "@/components/FilaOffline";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import { usuarioAtual } from "@/server/auth";

export const metadata: Metadata = {
  title: "Ocorrências – Fazenda da Ilha",
  description: "Sistema de registro de ocorrências e geração de relatórios da Associação Fazenda da Ilha.",
  icons: { icon: "/logo.svg", apple: "/logo.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b4740",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual().catch(() => null);
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <ProvedorUsuario usuario={usuario}>
          <Cabecalho usuario={usuario} />
          {usuario && <FilaOffline />}
          {usuario && <RegistrarServiceWorker />}
          <main className="area-impressao mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
          <footer className="nao-imprimir mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-gray-500">
            Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha · Embu-Guaçu – SP
          </footer>
        </ProvedorUsuario>
      </body>
    </html>
  );
}
