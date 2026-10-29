"use client";

import { Botao } from "./ui";

export function BotaoImprimir({ rotulo = "Imprimir manual" }: { rotulo?: string }) {
  return (
    <Botao variante="secundario" className="nao-imprimir" onClick={() => window.print()}>
      {rotulo}
    </Botao>
  );
}
