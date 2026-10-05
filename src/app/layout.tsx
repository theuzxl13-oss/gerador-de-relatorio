import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = {
  title: "Ocorrências – Fazenda da Ilha",
  description: "Sistema de registro de ocorrências e geração de relatórios da Associação Fazenda da Ilha.",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b4740",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <Cabecalho />
        <main className="area-impressao mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="nao-imprimir mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-gray-500">
          Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha · Embu-Guaçu – SP
        </footer>
      </body>
    </html>
  );
}
