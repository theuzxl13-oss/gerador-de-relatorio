"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-cliente";
import { hojeISO, linhaLocalData } from "@/lib/relatorio";
import type { Configuracoes } from "@/lib/types";
import { AreaTexto, Aviso, Botao, Campo, Carregando, Cartao, Entrada, Selecao } from "@/components/ui";
import type { TermoSecao } from "@/lib/types";

export default function PaginaConfiguracoes() {
  const [cfg, setCfg] = useState<Configuracoes | null>(null);
  const [info, setInfo] = useState<{ armazenamento: string; permiteRestaurar: boolean } | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.configuracoes().then(setCfg).catch((e) => setMensagem({ tipo: "erro", texto: e.message }));
    api.infoDemonstracao().then(setInfo).catch(() => undefined);
  }, []);

  if (!cfg) return mensagem ? <Aviso tipo="erro">{mensagem.texto}</Aviso> : <Carregando />;

  const set = <K extends keyof Configuracoes>(k: K, v: Configuracoes[K]) => setCfg({ ...cfg, [k]: v });

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      setCfg(await api.salvarConfiguracoes(cfg!));
      setMensagem({ tipo: "sucesso", texto: "Configurações salvas." });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  async function restaurarDemo() {
    if (!confirm("ATENÇÃO: todas as ocorrências serão APAGADAS e a numeração de protocolos será reiniciada, recriando apenas os dados demonstrativos. Continuar?")) return;
    if (!confirm("Confirma a exclusão de TODAS as ocorrências registradas?")) return;
    try {
      await api.restaurarDemonstracao();
      setMensagem({ tipo: "sucesso", texto: "Dados demonstrativos restaurados." });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: (e as Error).message });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-600">Dados utilizados no cabeçalho e no texto dos relatórios.</p>
      </div>

      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}

      <Cartao titulo="Cabeçalho e rodapé do relatório">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome no cabeçalho" obrigatorio>
            <Entrada value={cfg.nomeCabecalho} onChange={(e) => set("nomeCabecalho", e.target.value)} />
          </Campo>
          <Campo rotulo="CNPJ">
            <Entrada value={cfg.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
          </Campo>
          <Campo rotulo="Frase do cabeçalho">
            <Entrada value={cfg.slogan} onChange={(e) => set("slogan", e.target.value)} />
          </Campo>
          <Campo rotulo="Nome completo da associação" obrigatorio>
            <Entrada value={cfg.nomeAssociacao} onChange={(e) => set("nomeAssociacao", e.target.value)} />
          </Campo>
          <Campo rotulo="Rodapé (endereço, contato e site)" className="sm:col-span-2">
            <AreaTexto rows={2} value={cfg.rodape} onChange={(e) => set("rodape", e.target.value)} />
          </Campo>
        </div>
      </Cartao>

      <Cartao titulo="Texto do relatório">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Cidade" obrigatorio ajuda={`Exemplo: ${linhaLocalData(cfg.cidade || "Cidade", hojeISO())}`}>
            <Entrada value={cfg.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </Campo>
          <Campo rotulo="Destinatário (A/C)" obrigatorio ajuda={`Aparece como "A/C: ${cfg.destinatario}"`}>
            <Entrada value={cfg.destinatario} onChange={(e) => set("destinatario", e.target.value)} />
          </Campo>
          <Campo rotulo="Assinatura – nome" ajuda="Em branco: “Responsável pelo registro”.">
            <Entrada value={cfg.responsavelNome} onChange={(e) => set("responsavelNome", e.target.value)} />
          </Campo>
          <Campo rotulo="Assinatura – cargo">
            <Entrada value={cfg.responsavelCargo} onChange={(e) => set("responsavelCargo", e.target.value)} />
          </Campo>
          <Campo
            rotulo="Como citar as seções do Regulamento"
            className="sm:col-span-2"
            ajuda={`Exemplo: “Item 8 do ${cfg.termoSecaoRegulamento} III – DAS PROIBIÇÕES do Regulamento Interno”`}
          >
            <Selecao value={cfg.termoSecaoRegulamento} onChange={(e) => set("termoSecaoRegulamento", e.target.value as TermoSecao)}>
              <option value="tópico">Item 8 do tópico III – DAS PROIBIÇÕES</option>
              <option value="Artigo">Item 8 do Artigo III – DAS PROIBIÇÕES (como no modelo antigo)</option>
            </Selecao>
          </Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={cfg.incluirTextoNormaPadrao} onChange={(e) => set("incluirTextoNormaPadrao", e.target.checked)} />
            Transcrever o texto da regra no relatório (padrão para novas ocorrências)
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar configurações"}</Botao>
        </div>
      </Cartao>

      <Cartao titulo="Sistema">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Armazenamento</dt>
            <dd className="text-right font-medium">
              {info?.armazenamento === "postgres" ? "PostgreSQL (DATABASE_URL)" : info?.armazenamento === "arquivo" ? "Arquivo local (dados/banco.json)" : "—"}
            </dd>
          </div>
        </dl>
        {info?.armazenamento === "arquivo" && (
          <div className="mt-3">
            <Aviso tipo="alerta">
              Os dados estão em arquivo local. Em servidores como o Render, o disco é apagado a cada reinício. Configure a variável DATABASE_URL (PostgreSQL) para guardar os relatórios com segurança.
            </Aviso>
          </div>
        )}
        {info?.permiteRestaurar && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm text-gray-600">
              Apaga todas as ocorrências e recria os dados demonstrativos. Use apenas na fase de testes. Para desativar este botão em produção, defina PERMITIR_RESTAURAR_DEMO=false.
            </p>
            <Botao variante="perigo" onClick={restaurarDemo}>Restaurar dados demonstrativos</Botao>
          </div>
        )}
      </Cartao>
    </div>
  );
}
