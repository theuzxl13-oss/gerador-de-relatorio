"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-cliente";
import { EVENTO_FILA, enviarFila, listarFila, removerDaFila, type ItemFila } from "@/lib/offline";
import { useConexao } from "./useConexao";
import { useUsuario } from "./UsuarioContexto";

/**
 * Faixa com os relatórios guardados neste aparelho (preenchidos sem conexão).
 * Envia automaticamente quando a conexão volta e a cada minuto.
 */
export function FilaOffline() {
  const usuario = useUsuario();
  const online = useConexao();
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const recarregar = useCallback(async () => {
    if (!usuario || usuario.trocarSenha) return;
    try {
      setItens(await listarFila(usuario.id));
    } catch {
      /* IndexedDB indisponível (navegação privada): sem fila offline */
    }
  }, [usuario]);

  const enviar = useCallback(
    async (incluirComErro = false) => {
      if (!usuario || usuario.trocarSenha || !navigator.onLine) return;
      setEnviando(true);
      try {
        const r = await enviarFila(usuario.id, api, { incluirComErro });
        if (r.enviados) setMensagem(`${r.enviados} relatório(s) guardado(s) no aparelho foram enviados.`);
      } catch {
        /* tenta de novo na próxima vez */
      } finally {
        setEnviando(false);
        recarregar();
      }
    },
    [usuario, recarregar],
  );

  useEffect(() => {
    recarregar();
    const aoMudar = () => recarregar();
    window.addEventListener(EVENTO_FILA, aoMudar);
    return () => window.removeEventListener(EVENTO_FILA, aoMudar);
  }, [recarregar]);

  useEffect(() => {
    if (!online) return;
    enviar();
    const t = setInterval(() => enviar(), 60_000);
    return () => clearInterval(t);
  }, [online, enviar]);

  if (!itens.length && !mensagem) return null;
  const comErro = itens.filter((i) => i.erro);

  return (
    <div className="nao-imprimir border-b border-amber-200 bg-amber-50 text-sm text-amber-950" role="status">
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-2">
        {mensagem && !itens.length && (
          <div className="flex items-center justify-between gap-2">
            <span>{mensagem}</span>
            <button type="button" className="text-xs underline" onClick={() => setMensagem("")}>Fechar</button>
          </div>
        )}
        {itens.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>{itens.length} relatório(s)</strong> guardado(s) neste aparelho{" "}
              {online ? (enviando ? "– enviando..." : comErro.length ? "– alguns precisam de atenção" : "– enviando em instantes") : "– serão enviados quando a conexão voltar"}.
            </span>
            {online && !enviando && (
              <button type="button" className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700" onClick={() => enviar(true)}>
                Enviar agora
              </button>
            )}
          </div>
        )}
        {comErro.map((i) => (
          <div key={i.id} className="rounded-md border border-red-200 bg-white px-3 py-2 text-red-900">
            <div className="font-medium">{i.resumo}</div>
            <div className="text-xs">Não enviado: {i.erro}</div>
            <div className="mt-1 flex gap-3 text-xs">
              <button type="button" className="underline" onClick={() => enviar(true)}>Tentar de novo</button>
              <button
                type="button"
                className="underline"
                onClick={async () => {
                  if (confirm(`Descartar o relatório guardado "${i.resumo}"? Ele não foi enviado e será apagado deste aparelho.`)) await removerDaFila(i.id);
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
